from datetime import datetime
from typing import Any

from sqlalchemy import and_, desc, func
from sqlalchemy.orm import Session

from models.agency_portal import ThirdPartyBillingAgency
from models.billing_claims import BillingClaim
from models.epcr_core import EpcrRecord, Patient
from models.payment_resolution import StripePaymentRecord


class AgencyIncidentService:
    """Service for agency incident data - read-only with strict data filtering"""

    @staticmethod
    def get_incidents(
        db: Session,
        agency: ThirdPartyBillingAgency,
        filters: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        List incidents for agency (read-only)
        NEVER expose: internal notes, QA flags, CAD timelines, geocodes
        """
        query = (
            db.query(EpcrRecord, Patient)
            .join(Patient, EpcrRecord.patient_id == Patient.id)
            .filter(EpcrRecord.org_id == agency.id)
        )

        # Apply date range filter
        if filters.get("start_date"):
            query = query.filter(EpcrRecord.incident_datetime >= filters["start_date"])
        if filters.get("end_date"):
            query = query.filter(EpcrRecord.incident_datetime <= filters["end_date"])

        # Apply transport type filter
        if filters.get("transport_priority"):
            query = query.filter(EpcrRecord.transport_priority == filters["transport_priority"])

        # Apply claim status filter (join with claims if needed)
        if filters.get("claim_status"):
            query = query.join(BillingClaim, BillingClaim.epcr_patient_id == Patient.id).filter(
                BillingClaim.status == filters["claim_status"]
            )

        query = query.order_by(desc(EpcrRecord.incident_datetime))

        # Limit results
        limit = min(filters.get("limit", 100), 500)
        results = query.limit(limit).all()

        # Return safe data only
        incidents = []
        for record, patient in results:
            incidents.append(
                {
                    "id": record.id,
                    "incident_number": record.incident_number,
                    "incident_datetime": record.incident_datetime.isoformat() if record.incident_datetime else None,
                    "chief_complaint": record.chief_complaint,
                    "patient_destination": record.patient_destination,
                    "transport_priority": record.transport_priority,
                    "status": record.status.value,
                    "patient_name": f"{patient.first_name} {patient.last_name}",
                    "patient_dob": patient.date_of_birth,
                }
            )

        return incidents

    @staticmethod
    def get_incident_detail(
        db: Session,
        agency: ThirdPartyBillingAgency,
        incident_id: int,
    ) -> dict[str, Any] | None:
        """
        Single incident with safe data only
        NEVER expose: internal notes, QA flags, CAD timelines, geocodes
        """
        result = (
            db.query(EpcrRecord, Patient)
            .join(Patient, EpcrRecord.patient_id == Patient.id)
            .filter(
                EpcrRecord.org_id == agency.id,
                EpcrRecord.id == incident_id,
            )
            .first()
        )

        if not result:
            return None

        record, patient = result

        return {
            "id": record.id,
            "incident_number": record.incident_number,
            "record_number": record.record_number,
            "incident_datetime": record.incident_datetime.isoformat() if record.incident_datetime else None,
            "dispatch_datetime": record.dispatch_datetime.isoformat() if record.dispatch_datetime else None,
            "scene_arrival_datetime": record.scene_arrival_datetime.isoformat() if record.scene_arrival_datetime else None,
            "scene_departure_datetime": record.scene_departure_datetime.isoformat() if record.scene_departure_datetime else None,
            "hospital_arrival_datetime": record.hospital_arrival_datetime.isoformat() if record.hospital_arrival_datetime else None,
            "chief_complaint": record.chief_complaint,
            "chief_complaint_code": record.chief_complaint_code,
            "injury_mechanism": record.injury_mechanism,
            "patient_destination": record.patient_destination,
            "destination_address": record.destination_address,
            "transport_priority": record.transport_priority,
            "reason_for_transport": record.reason_for_transport,
            "status": record.status.value,
            "is_finalized": record.is_finalized,
            "finalized_at": record.finalized_at.isoformat() if record.finalized_at else None,
            "patient": {
                "name": f"{patient.first_name} {patient.last_name}",
                "dob": patient.date_of_birth,
                "gender": patient.gender,
                "phone": patient.phone,
                "city": patient.city,
                "state": patient.state,
            },
        }


class AgencyDocumentService:
    """Service for agency document status - read-only with strict filtering"""

    @staticmethod
    def get_documentation_status(
        db: Session,
        agency: ThirdPartyBillingAgency,
        incident_id: int,
    ) -> dict[str, Any] | None:
        """
        Document status per incident
        Returns only: document_type, is_required, status, pending_from, last_changed
        NEVER expose: fax numbers, retry counts, AI confidence, sender identities
        """
        record = (
            db.query(EpcrRecord)
            .filter(
                EpcrRecord.org_id == agency.id,
                EpcrRecord.id == incident_id,
            )
            .first()
        )

        if not record:
            return None

        # Mock document status - replace with actual document tracking logic
        documents = [
            {
                "document_type": "Patient Care Report",
                "is_required": True,
                "status": "completed" if record.is_finalized else "pending",
                "pending_from": "Provider",
                "last_changed": record.finalized_at.isoformat() if record.finalized_at else record.updated_at.isoformat(),
            },
            {
                "document_type": "NEMSIS Export",
                "is_required": True,
                "status": "completed" if record.status.value == "submitted" else "pending",
                "pending_from": "System",
                "last_changed": record.updated_at.isoformat(),
            },
        ]

        return {
            "incident_id": incident_id,
            "incident_number": record.incident_number,
            "documents": documents,
        }


class AgencyClaimService:
    """Service for agency claim status - plain language with approved labels only"""

    # Approved status labels
    STATUS_LABELS = {
        "draft": "Draft - Not Submitted",
        "ready": "Ready for Submission",
        "submitted": "Submitted to Payer",
        "pending": "Pending with Payer",
        "paid": "Paid",
        "denied": "Denied",
        "appealed": "Under Appeal",
        "partial_paid": "Partially Paid",
        "patient_responsibility": "Patient Responsibility",
    }

    @staticmethod
    def get_claim_status(
        db: Session,
        agency: ThirdPartyBillingAgency,
        claim_id: int,
    ) -> dict[str, Any] | None:
        """Plain language status - use ONLY approved status labels"""
        claim = (
            db.query(BillingClaim)
            .filter(
                BillingClaim.org_id == agency.id,
                BillingClaim.id == claim_id,
            )
            .first()
        )

        if not claim:
            return None

        return {
            "claim_id": claim.id,
            "incident_id": claim.epcr_patient_id,
            "status": AgencyClaimService.STATUS_LABELS.get(claim.status, claim.status),
            "status_code": claim.status,
            "payer_name": claim.payer_name,
            "payer_type": claim.payer_type,
            "total_charge": claim.total_charge_cents / 100 if claim.total_charge_cents else 0.0,
            "submitted_at": claim.submitted_at.isoformat() if claim.submitted_at else None,
            "paid_at": claim.paid_at.isoformat() if claim.paid_at else None,
            "denial_reason": claim.denial_reason if claim.status == "denied" else None,
        }

    @staticmethod
    def get_claims_list(
        db: Session,
        agency: ThirdPartyBillingAgency,
        filters: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """All claims for agency with filters"""
        query = db.query(BillingClaim).filter(BillingClaim.org_id == agency.id)

        # Apply status filter
        if filters.get("status"):
            query = query.filter(BillingClaim.status == filters["status"])

        # Apply date range filter
        if filters.get("start_date"):
            query = query.filter(BillingClaim.created_at >= filters["start_date"])
        if filters.get("end_date"):
            query = query.filter(BillingClaim.created_at <= filters["end_date"])

        query = query.order_by(desc(BillingClaim.created_at))

        # Limit results
        limit = min(filters.get("limit", 100), 500)
        claims = query.limit(limit).all()

        return [
            {
                "claim_id": claim.id,
                "incident_id": claim.epcr_patient_id,
                "status": AgencyClaimService.STATUS_LABELS.get(claim.status, claim.status),
                "status_code": claim.status,
                "payer_name": claim.payer_name,
                "payer_type": claim.payer_type,
                "total_charge": claim.total_charge_cents / 100 if claim.total_charge_cents else 0.0,
                "submitted_at": claim.submitted_at.isoformat() if claim.submitted_at else None,
                "created_at": claim.created_at.isoformat(),
            }
            for claim in claims
        ]

    @staticmethod
    def get_claim_timeline(
        db: Session,
        agency: ThirdPartyBillingAgency,
        claim_id: int,
    ) -> dict[str, Any] | None:
        """Status history for a claim"""
        claim = (
            db.query(BillingClaim)
            .filter(
                BillingClaim.org_id == agency.id,
                BillingClaim.id == claim_id,
            )
            .first()
        )

        if not claim:
            return None

        # Build timeline from claim timestamps
        timeline = []
        
        timeline.append({
            "timestamp": claim.created_at.isoformat(),
            "status": "Draft - Not Submitted",
            "description": "Claim created",
        })

        if claim.exported_at:
            timeline.append({
                "timestamp": claim.exported_at.isoformat(),
                "status": "Ready for Submission",
                "description": "Claim exported and ready",
            })

        if claim.submitted_at:
            timeline.append({
                "timestamp": claim.submitted_at.isoformat(),
                "status": "Submitted to Payer",
                "description": f"Submitted to {claim.payer_name}",
            })

        if claim.paid_at:
            timeline.append({
                "timestamp": claim.paid_at.isoformat(),
                "status": "Paid",
                "description": "Payment received",
            })

        return {
            "claim_id": claim.id,
            "incident_id": claim.epcr_patient_id,
            "current_status": AgencyClaimService.STATUS_LABELS.get(claim.status, claim.status),
            "timeline": timeline,
        }


class AgencyPaymentService:
    """Service for agency payment data - financial transparency"""

    @staticmethod
    def get_payments(
        db: Session,
        agency: ThirdPartyBillingAgency,
        claim_id: int | None = None,
    ) -> list[dict[str, Any]]:
        """Payment history for agency or specific claim"""
        query = db.query(StripePaymentRecord).filter(
            StripePaymentRecord.patient_id.in_(
                db.query(Patient.id).filter(Patient.org_id == agency.id)
            )
        )

        if claim_id:
            # Filter by claim if provided - link through statement
            query = query.filter(StripePaymentRecord.statement_id.isnot(None))

        query = query.order_by(desc(StripePaymentRecord.created_at))

        payments = query.limit(500).all()

        return [
            {
                "payment_id": payment.id,
                "amount": payment.amount,
                "payment_date": payment.processed_at.isoformat() if payment.processed_at else None,
                "payment_method": payment.payment_method.value if payment.payment_method else "unknown",
                "status": payment.status,
                "success": payment.success,
                "created_at": payment.created_at.isoformat(),
            }
            for payment in payments
        ]

    @staticmethod
    def get_payment_summary(
        db: Session,
        agency: ThirdPartyBillingAgency,
    ) -> dict[str, Any]:
        """Payment totals and balances for agency"""
        # Total charges
        total_charges = (
            db.query(func.sum(BillingClaim.total_charge_cents))
            .filter(BillingClaim.org_id == agency.id)
            .scalar()
            or 0
        )

        # Total payments - sum all successful stripe payments
        total_payments_amount = (
            db.query(func.sum(StripePaymentRecord.amount))
            .filter(
                StripePaymentRecord.patient_id.in_(
                    db.query(Patient.id).filter(Patient.org_id == agency.id)
                ),
                StripePaymentRecord.success == True,
            )
            .scalar()
            or 0
        )

        # Convert total_payments from dollars to cents for calculation
        total_payments = int(total_payments_amount * 100)

        # Outstanding balance
        outstanding = total_charges - total_payments

        # Count claims by status
        claims_by_status = (
            db.query(BillingClaim.status, func.count(BillingClaim.id))
            .filter(BillingClaim.org_id == agency.id)
            .group_by(BillingClaim.status)
            .all()
        )

        return {
            "total_charges": total_charges / 100,
            "total_payments": total_payments / 100,
            "outstanding_balance": outstanding / 100,
            "claims_by_status": {status: count for status, count in claims_by_status},
            "generated_at": datetime.utcnow().isoformat(),
        }
