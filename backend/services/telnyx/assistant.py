from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from models.billing_claims import BillingAssistResult, BillingClaim
from models.epcr import Patient
from services.billing.assist_service import BillingAssistEngine
from utils.write_ops import model_snapshot


class TelnyxAssistant:
    INTENT_KEYWORDS = [
        ("claim_status", ["claim status", "status", "claim update", "where is my claim", "my claim"]),
        ("invoice_question", ["invoice", "billing question", "charges", "billing summary", "bill"]),
        ("denial_reason", ["denied", "denial reason", "denied claim", "appeal"]),
        ("document_request", ["document", "report", "records", "upload", "attachments"]),
        ("payment_link_request", ["payment link", "pay", "payment", "link", "portal"]),
    ]

    INTENT_TEMPLATES = {
        "claim_status": "I can share the current status of the claim tied to {incident} for {patient_name}.",
        "invoice_question": "Let me walk you through the billing/invoice details for {patient_name}.",
        "denial_reason": "I see a denial on the claim; here is what was captured for {patient_name}.",
        "document_request": "We can deliver the requested documents for {incident} in the next message.",
        "payment_link_request": "A secure payment link can be pushed to your phone now for {patient_name}.",
        "general_inquiry": "I can help with your billing question for {patient_name}.",
    }

    INTENT_SCRIPTS = {
        "claim_status": "Confirm claimant identity and share the current status using the billing portal.",
        "invoice_question": "Highlight invoice details, amounts, and payer information before offering a copy of the invoice.",
        "denial_reason": "Walk through the denial reason and guide the caller to the support ticket if an appeal is needed.",
        "document_request": "Explain which documents are available and how they will be delivered.",
        "payment_link_request": "Offer to text a secure payment link and explain the payment options.",
        "general_inquiry": "Confirm the issue and loop in the right billing resource as needed.",
    }

    @classmethod
    def classify_intent(cls, payload: dict[str, Any]) -> Tuple[str, List[dict[str, Any]]]:
        metadata = payload.get("metadata") or {}
        forced_intent = metadata.get("intent")
        text = (payload.get("text") or payload.get("body") or "").strip().lower()
        evidence: List[dict[str, Any]] = []
        if forced_intent and forced_intent in cls.INTENT_TEMPLATES:
            evidence.append({"field": "metadata.intent", "value": forced_intent})
            return forced_intent, evidence
        for intent, keywords in cls.INTENT_KEYWORDS:
            for keyword in keywords:
                if keyword in text:
                    evidence.append({"field": "payload.text", "value": text, "match": keyword})
                    return intent, evidence
        evidence.append({"field": "payload.text", "value": text})
        return "general_inquiry", evidence

    @classmethod
    def build_response_template(
        cls, intent: str, patient: Optional[Patient], claim: Optional[BillingClaim]
    ) -> str:
        patient_name = f"{patient.first_name} {patient.last_name}" if patient else "this patient"
        incident = patient.incident_number if patient else "the incident"
        status = claim.status if claim else "draft"
        template = cls.INTENT_TEMPLATES.get(intent) or cls.INTENT_TEMPLATES["general_inquiry"]
        return template.format(patient_name=patient_name, incident=incident, status=status)

    @classmethod
    def build_actions(
        cls,
        intent: str,
        patient: Optional[Patient],
        claim: Optional[BillingClaim],
        snapshot: Optional[dict[str, Any]],
    ) -> List[dict[str, Any]]:
        actions: List[dict[str, Any]] = []
        if patient:
            actions.append(
                {
                    "type": "link",
                    "label": "View ePCR",
                    "url": f"/app/epcr/{patient.id}",
                    "details": "Open the patient chart to review vital signs.",
                }
            )
        if claim:
            actions.append(
                {
                    "type": "link",
                    "label": "Review claim",
                    "url": f"/app/billing/claims/{claim.id}",
                    "details": f"Status: {claim.status}",
                }
            )
        if intent == "payment_link_request":
            actions.append(
                {
                    "type": "action",
                    "label": "Send payment link",
                    "details": "Text a secure payment link and confirm receipt.",
                }
            )
        elif intent == "document_request":
            actions.append(
                {
                    "type": "action",
                    "label": "Deliver documents",
                    "details": "Queue OCR or PCR data export for the request.",
                }
            )
        elif intent == "denial_reason":
            actions.append(
                {
                    "type": "action",
                    "label": "Review denial",
                    "details": "Highlight the denial reason with QA or appeal teams.",
                }
            )
        else:
            actions.append(
                {
                    "type": "link",
                    "label": "Open billing workspace",
                    "url": "/billing",
                    "details": "Navigate to billing dashboard for deeper operations.",
                }
            )
        if snapshot and snapshot.get("denial_risk_flags"):
            actions.append(
                {
                    "type": "insight",
                    "label": "Denial risks",
                    "details": snapshot.get("denial_risk_flags"),
                }
            )
        return actions

    @classmethod
    def build_call_script(
        cls,
        patient: Optional[Patient],
        snapshot: Optional[dict[str, Any]],
        intent: str,
        intent_evidence: List[dict[str, Any]],
    ) -> List[dict[str, Any]]:
        script: List[dict[str, Any]] = []
        if patient:
            script.append(
                {
                    "section": "Verify identity",
                    "script": f"Confirm you are speaking with {patient.first_name} {patient.last_name} (DOB {patient.date_of_birth}).",
                    "evidence": [{"field": "patient.identity", "value": f"{patient.first_name} {patient.last_name}"}],
                }
            )
        intent_text = cls.INTENT_SCRIPTS.get(intent, cls.INTENT_SCRIPTS["general_inquiry"])
        script.append(
            {
                "section": "Intent context",
                "script": intent_text,
                "evidence": intent_evidence,
            }
        )
        if snapshot:
            for hint in snapshot.get("medical_necessity_hints", [])[:2]:
                script.append(
                    {
                        "section": "Medical necessity",
                        "script": f"{hint.get('reason')}: {hint.get('detail')}",
                        "evidence": hint.get("sources", []),
                    }
                )
            primary = snapshot.get("coding_suggestions", {}).get("primary_icd10", {})
            if primary:
                script.append(
                    {
                        "section": "Coding context",
                        "script": f"Code {primary.get('code')} - {primary.get('description')}",
                        "evidence": primary.get("sources", []),
                    }
                )
            for risk in snapshot.get("denial_risk_flags", [])[:2]:
                script.append(
                    {
                        "section": "Denial risk",
                        "script": f"Address risk flag: {risk}",
                        "evidence": [{"field": "denial_risk_flags", "value": risk}],
                    }
                )
        return script

    @classmethod
    def get_latest_claim(cls, db: Session, org_id: int, patient_id: int) -> Optional[BillingClaim]:
        return (
            db.query(BillingClaim)
            .filter(BillingClaim.org_id == org_id, BillingClaim.epcr_patient_id == patient_id)
            .order_by(BillingClaim.created_at.desc())
            .first()
        )

    @classmethod
    def get_latest_assist_result(
        cls, db: Session, org_id: int, patient_id: int
    ) -> Optional[BillingAssistResult]:
        return (
            db.query(BillingAssistResult)
            .filter(BillingAssistResult.org_id == org_id, BillingAssistResult.epcr_patient_id == patient_id)
            .order_by(BillingAssistResult.created_at.desc())
            .first()
        )

    @classmethod
    def get_or_generate_assist_result(cls, db: Session, patient: Patient) -> BillingAssistResult:
        existing = cls.get_latest_assist_result(db, patient.org_id, patient.id)
        if existing and existing.snapshot_json:
            return existing
        snapshot = BillingAssistEngine.generate(patient)
        payload = {"patient": model_snapshot(patient), "generated_at": snapshot.get("generated_at")}
        new_result = BillingAssistResult(
            org_id=patient.org_id,
            epcr_patient_id=patient.id,
            snapshot_json=snapshot,
            input_payload=payload,
        )
        db.add(new_result)
        db.commit()
        db.refresh(new_result)
        return new_result

