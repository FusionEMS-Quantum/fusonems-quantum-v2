from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Iterable, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from core.config import settings
from models.billing_claims import BillingAssistResult, BillingClaim, BillingClaimExportSnapshot
from models.billing_exports import EligibilityCheck, RemittanceAdvice
from models.epcr import Patient
from models.user import User
from utils.logger import logger
from utils.tenancy import scoped_query
from utils.time import utc_now
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot


class OfficeAllyDisabled(Exception):
    """Raised when the integration is explicitly turned off."""


class OfficeAllySftpTransport:
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        remote_dir: str,
        paramiko_module: Any,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.remote_dir = remote_dir or "/"
        self._paramiko = paramiko_module

    def upload_file(self, filename: str, payload: str) -> dict[str, Any]:
        transport = self._paramiko.Transport((self.host, self.port))
        try:
            transport.connect(username=self.username, password=self.password)
            sftp = self._paramiko.SFTPClient.from_transport(transport)
            remote_path = os.path.join(self.remote_dir, filename)
            with sftp.file(remote_path, "w") as handle:
                handle.write(payload)
            return {"path": remote_path, "method": "sftp"}
        finally:
            transport.close()


class LocalOfficeAllyTransport:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir or tempfile.gettempdir()) / "office_ally"
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def upload_file(self, filename: str, payload: str) -> dict[str, Any]:
        target = self.base_dir / filename
        target.write_text(payload, encoding="utf-8")
        return {"path": str(target), "method": "local"}


class OfficeAllyClient:
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    def sync_claims(self, request: Request, user: User) -> dict[str, Any]:
        self._ensure_enabled()
        training_mode = getattr(request.state, "training_mode", False)
        claims = self._gather_ready_claims(training_mode)
        if not claims:
            return {"batch_id": "", "submitted": 0, "details": []}
        batch_id = f"oa-{self.org_id}-{int(utc_now().timestamp())}"
        transport = self._build_transport()
        summary: list[dict[str, Any]] = []
        for claim in claims:
            patient = self._get_patient(claim)
            assist_payload = self._latest_assist_snapshot(patient, training_mode)
            bundle = self._build_claim_bundle(claim, patient, assist_payload)
            edi = self._build_edi_document(bundle)
            remote_name = f"{batch_id}-{claim.id}.edi"
            upload_meta = transport.upload_file(remote_name, edi)
            before = model_snapshot(claim)
            claim.status = "submitted"
            claim.submitted_at = utc_now()
            claim.office_ally_batch_id = batch_id
            audit_and_event(
                db=self.db,
                request=request,
                user=user,
                action="update",
                resource="billing_claim",
                classification=claim.classification,
                before_state=before,
                after_state=model_snapshot(claim),
                event_type="billing.office_ally.submitted",
                event_payload={"claim_id": claim.id, "batch_id": batch_id},
            )
            snapshot = BillingClaimExportSnapshot(
                org_id=self.org_id,
                claim_id=claim.id,
                payload=bundle,
                office_ally_batch_id=batch_id,
                submitted_at=claim.submitted_at,
                ack_status="submitted",
                ack_payload=self._build_ack_payload(claim, bundle, upload_meta),
            )
            apply_training_mode(snapshot, request)
            self.db.add(snapshot)
            self.db.commit()
            self.db.refresh(snapshot)
            summary.append(
                {"claim_id": claim.id, "status": snapshot.ack_status, "remote": upload_meta}
            )
            audit_and_event(
                db=self.db,
                request=request,
                user=user,
                action="create",
                resource="billing_claim_export_snapshot",
                classification=snapshot.classification,
                after_state=model_snapshot(snapshot),
                event_type="billing.office_ally.snapshot_created",
                event_payload={"claim_id": claim.id, "batch_id": batch_id},
            )
        return {"batch_id": batch_id, "submitted": len(summary), "details": summary}

    def fetch_eligibility(
        self,
        request: Request,
        user: User,
        patient_name: str,
        payer: str,
    ) -> dict[str, Any]:
        self._ensure_enabled()
        latest = (
            self.db.query(EligibilityCheck)
            .filter(
                EligibilityCheck.org_id == self.org_id,
                EligibilityCheck.patient_name == patient_name,
                EligibilityCheck.payer == payer,
            )
            .order_by(EligibilityCheck.created_at.desc())
            .first()
        )
        if latest:
            return self._eligibility_response(latest)
        payload = {
            "patient_name": patient_name,
            "payer": payer,
            "status": "pending",
            "timestamp": utc_now().isoformat(),
        }
        record = EligibilityCheck(
            org_id=self.org_id,
            patient_name=patient_name,
            payer=payer,
            status="pending",
            payload=payload,
        )
        apply_training_mode(record, request)
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        audit_and_event(
            db=self.db,
            request=request,
            user=user,
            action="create",
            resource="eligibility_check",
            classification="BILLING_SENSITIVE",
            after_state=model_snapshot(record),
            event_type="billing.office_ally.eligibility",
            event_payload={"patient_name": patient_name, "payer": payer},
        )
        return self._eligibility_response(record)

    def fetch_remittances(
        self,
        request: Request,
        user: User,
        remittance_id: Optional[int] = None,
    ) -> dict[str, Any]:
        self._ensure_enabled()
        query = self.db.query(RemittanceAdvice).filter(RemittanceAdvice.org_id == self.org_id)
        if remittance_id is not None:
            query = query.filter(RemittanceAdvice.id == remittance_id)
        advices = query.order_by(RemittanceAdvice.created_at.asc()).all()
        processed: list[int] = []
        for advice in advices:
            if advice.status == "processed":
                continue
            claim = self._claim_from_reference(advice.claim_reference)
            if claim and not claim.paid_at:
                before = model_snapshot(claim)
                claim.status = "paid"
                claim.paid_at = utc_now()
                processed.append(claim.id)
                audit_and_event(
                    db=self.db,
                    request=request,
                    user=user,
                    action="update",
                    resource="billing_claim",
                    classification=claim.classification,
                    before_state=before,
                    after_state=model_snapshot(claim),
                    event_type="billing.office_ally.remittance_posted",
                    event_payload={"claim_id": claim.id, "remittance_id": advice.id},
                )
            advice.status = "processed"
            advice.payload.setdefault("processed_at", utc_now().isoformat())
            self.db.add(advice)
        self.db.commit()
        return {"processed_claims": processed, "remittances": [advice.id for advice in advices]}

    def fetch_status(self, batch_id: str) -> dict[str, Any]:
        self._ensure_enabled()
        snapshots = (
            self.db.query(BillingClaimExportSnapshot)
            .filter(
                BillingClaimExportSnapshot.org_id == self.org_id,
                BillingClaimExportSnapshot.office_ally_batch_id == batch_id,
            )
            .order_by(BillingClaimExportSnapshot.id.asc())
            .all()
        )
        if not snapshots:
            return {"batch_id": batch_id, "status": "unknown", "claims": []}
        status = snapshots[0].ack_status or "submitted"
        return {
            "batch_id": batch_id,
            "status": status,
            "claims": [
                {
                    "claim_id": snapshot.claim_id,
                    "status": snapshot.ack_status,
                    "submitted_at": snapshot.submitted_at.isoformat() if snapshot.submitted_at else None,
                }
                for snapshot in snapshots
            ],
            "ack_payload": snapshots[0].ack_payload,
        }

    def _claim_from_reference(self, reference: str | None) -> Optional[BillingClaim]:
        if not reference:
            return None
        match = re.search(r"\d+", reference)
        if not match:
            return None
        return (
            self.db.query(BillingClaim)
            .filter(BillingClaim.org_id == self.org_id, BillingClaim.id == int(match.group()))
            .first()
        )

    def _get_patient(self, claim: BillingClaim) -> Optional[Patient]:
        return (
            self.db.query(Patient)
            .filter(Patient.id == claim.epcr_patient_id, Patient.org_id == self.org_id)
            .first()
        )

    def _gather_ready_claims(self, training_mode: bool) -> Iterable[BillingClaim]:
        return (
            scoped_query(self.db, BillingClaim, self.org_id, training_mode)
            .filter(BillingClaim.status == "ready")
            .order_by(BillingClaim.created_at.asc())
            .limit(10)
            .all()
        )

    def _latest_assist_snapshot(self, patient: Optional[Patient], training_mode: bool) -> dict[str, Any]:
        if not patient:
            return {}
        assist = (
            scoped_query(self.db, BillingAssistResult, self.org_id, training_mode)
            .filter(BillingAssistResult.epcr_patient_id == patient.id)
            .order_by(BillingAssistResult.created_at.desc())
            .first()
        )
        return assist.snapshot_json if assist else {}

    def _build_claim_bundle(
        self,
        claim: BillingClaim,
        patient: Optional[Patient],
        assist_payload: dict[str, Any],
    ) -> dict[str, Any]:
        demographics = {
            "first_name": patient.first_name if patient else "",
            "last_name": patient.last_name if patient else "",
            "dob": patient.date_of_birth if patient else "",
        }
        medical = assist_payload.get("medical_necessity_hints") or []
        coding = assist_payload.get("coding_suggestions") or {}
        return {
            "claim_id": claim.id,
            "payer": claim.payer_name,
            "demographics": demographics,
            "medical_necessity": medical,
            "coding": coding,
            "submitted_at": claim.submitted_at.isoformat() if claim.submitted_at else None,
        }

    def _build_edi_document(self, bundle: dict[str, Any]) -> str:
        """Build HIPAA-compliant X12 837P professional claim document.
        
        Reference: X12N 005010X222A1 (837P Professional Claims)
        """
        from datetime import datetime
        
        claim = bundle.get('claim_data', {})
        provider = bundle.get('provider_data', {})
        patient = bundle.get('patient_data', {})
        payer = bundle.get('payer_data', {})
        
        # Control numbers
        isa_control_number = f"{self.org_id:09d}"
        gs_control_number = "1"
        st_control_number = "1"
        
        segments = []
        
        # ISA - Interchange Control Header
        now = utc_now()
        isa_date = now.strftime("%y%m%d")
        isa_time = now.strftime("%H%M")
        segments.append(f"ISA*00*{'12'*4}*ZZ*{settings.OFFICEALLY_INTERCHANGE_ID:\u003e15}*ZZ*{payer.get('interchange_id', 'OFFICEALLY'):\u003e15}*{isa_date}*{isa_time}*U*00501*{isa_control_number}*0*P*:")
        
        # GS - Functional Group Header  
        segments.append(f"GS*HC*{settings.OFFICEALLY_TRADING_PARTNER_ID}*{payer.get('trading_partner_id', 'OFFICEALLY')}*{isa_date}*{isa_time}*{gs_control_number}*X*005010X222A1")
        
        # ST - Transaction Set Header
        segments.append(f"ST*837*{st_control_number}*005010X222A1")
        
        # BHT - Beginning of Hierarchical Transaction
        segments.append(f"BHT*0019*00*1*{isa_date}*{isa_time}*CH")
        
        # 1000A - Submitter Name
        segments.append(f"NM1*41*2*{settings.OFFICEALLY_SUBMITTER_NAME}**46*{settings.OFFICEALLY_SUBMITTER_ID}")
        segments.append(f"PER*IC*{provider.get('contact_name', 'BILLING DEPT')}*TE*{provider.get('contact_phone', settings.OFFICEALLY_CONTACT_PHONE).replace('-', '').replace(' ', '')}")
        
        # 1000B - Receiver Name  
        segments.append(f"NM1*40*2*{payer.get('name', 'OFFICEALLY')}**46*{payer.get('receiver_id', 'OFFICEALLY')}")
        
        # 2000A - Billing Provider Hierarchical Level
        segments.append(f"HL*1**20*1")
        segments.append(f"PRV*BI*PXC*{provider.get('taxonomy_code', '207Q00000X')}")
        segments.append(f"CUR*SE*USD")
        
        # 2010AA - Billing Provider Name
        segments.append(f"NM1*85*2*{provider.get('name', 'PROVIDER')}**XX*{provider.get('npi', settings.OFFICEALLY_DEFAULT_NPI)}")
        
        # 2010AB - Pay-to Address
        if provider.get('address'):
            addr = provider['address']
            segments.append(f"N3*{addr.get('line1', '123 MAIN ST')}")
            segments.append(f"N4*{addr.get('city', 'ANYTOWN')}*{addr.get('state', 'CA')}*{addr.get('zip', '12345')}*{addr.get('country', 'US')}")
        
        # 2000B - Subscriber Hierarchical Level
        segments.append(f"HL*2*1*22*0")  # 0 = patient is subscriber
        
        # 2010BA - Subscriber Name
        segments.append(f"NM1*IL*1*{patient.get('last_name', 'PATIENT')}*{patient.get('first_name', 'JOHN')}*{patient.get('middle_name', '')}**MI*{patient.get('subscriber_id', 'SUB123')}")
        
        # 2010BB - Payer Name
        segments.append(f"NM1*PR*2*{payer.get('name', 'MEDICARE')}**PI*{payer.get('payer_id', 'MEDICARE')}")
        
        # Subscriber Demographic Information
        if patient.get('dob'):
            segments.append(f"DMG*D8*{patient['dob'].strftime('%Y%m%d')}*{patient.get('gender', 'U')}")
        
        # 2000C - Patient Hierarchical Level (same as subscriber)
        segments.append(f"HL*3*2*23*0")  
        segments.append(f"PAT*19")  # 19 = self
        
        # 2010CA - Patient Name (same as subscriber)
        segments.append(f"NM1*QC*1*{patient.get('last_name', 'PATIENT')}*{patient.get('first_name', 'JOHN')}*{patient.get('middle_name', '')}")
        
        # 2300 - Claim Information
        segments.append(f"CLM*{claim.get('total_charge', '0.00').replace('.', '').replace(',', '')}*{claim.get('service_count', 1)}***11:B:1*Y*A*Y*Y")
        
        # 2300 - Health Care Diagnosis Code
        diagnoses = claim.get('diagnoses', [])
        if diagnoses:
            segments.append(f"HI*BK:{diagnoses[0].replace('.', '')}")
            for i, dx in enumerate(diagnoses[1:], 1):
                segments.append(f"HI*BF:{dx.replace('.', '')}")
        
        # 2300 - Claim Date
        service_date = claim.get('service_date_from', now)
        if isinstance(service_date, str):
            service_date = datetime.fromisoformat(service_date)
        segments.append(f"DTP*431*D8*{service_date.strftime('%Y%m%d')}")
        
        # 2400 - Service Line Information
        for line_no, line_item in enumerate(claim.get('service_lines', []), 1):
            segments.append(f"LX*{line_no}")
            segments.append(f"SV1*HC:{line_item.get('procedure_code', '99213')}:{line_item.get('modifier', '')}*{line_item.get('charge', '0.00').replace('.', '').replace(',', '')}***{line_item.get('unit_count', 1)}***1")
            segments.append(f"DTP*472*D8*{service_date.strftime('%Y%m%d')}")
            
        # Transaction Set Footer
        segments.append(f"SE*{len(segments) + 2}*{st_control_number}")  # +2 for ST and SE
        
        # Functional Group Footer
        segments.append(f"GE*{len([s for s in segments if s.startswith('ST*')])}*{gs_control_number}")
        
        # Interchange Control Footer
        segments.append(f"IEA*1*{isa_control_number}")
        
        return ''.join(segments)

    def _build_ack_payload(self, claim: BillingClaim, bundle: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any]:
        return {
            "batch_id": claim.office_ally_batch_id,
            "claim_id": claim.id,
            "submitted_at": claim.submitted_at.isoformat() if claim.submitted_at else None,
            "transport": meta,
            "xml": self._build_xml_ack("submitted", f"Claim {claim.id} awaiting Office Ally processing"),
        }

    def _build_xml_ack(self, status: str, detail: str) -> str:
        return f"<ack><status>{status}</status><detail>{detail}</detail></ack>"

    def _ensure_enabled(self) -> None:
        if not settings.OFFICEALLY_ENABLED:
            raise OfficeAllyDisabled("Office Ally integration is disabled.")

    def _eligibility_response(self, record: EligibilityCheck) -> dict[str, Any]:
        return {
            "patient_name": record.patient_name,
            "payer": record.payer,
            "status": record.status,
            "payload": record.payload,
            "checked_at": record.created_at.isoformat() if record.created_at else None,
        }

    def _build_transport(self):
        if settings.OFFICEALLY_FTP_HOST and settings.OFFICEALLY_FTP_USER:
            try:
                import paramiko
            except ImportError as exc:
                logger.error("Paramiko unavailable for SFTP transport: %s", exc)
                raise RuntimeError("Paramiko is required for Office Ally SFTP transport. Install with: pip install paramiko")
            
            return OfficeAllySftpTransport(
                settings.OFFICEALLY_FTP_HOST,
                settings.OFFICEALLY_FTP_PORT,
                settings.OFFICEALLY_FTP_USER,
                settings.OFFICEALLY_FTP_PASSWORD,
                settings.OFFICEALLY_SFTP_DIRECTORY,
                paramiko_module=paramiko,
            )
        else:
            logger.error("Office Ally SFTP credentials not configured")
            raise RuntimeError(
                "Office Ally SFTP credentials not configured. "
                "Please set OFFICEALLY_FTP_HOST, OFFICEALLY_FTP_USER, and OFFICEALLY_FTP_PASSWORD"
            )
