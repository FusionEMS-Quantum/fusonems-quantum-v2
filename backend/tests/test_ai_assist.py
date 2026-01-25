from __future__ import annotations

from core.database import SessionLocal
from models.billing_ai import BillingAiInsight
from models.billing_claims import BillingClaim
from models.epcr import Patient
from models.user import UserRole
from tests.utils import create_test_user


def _seed_patient_and_claim(org_id: int) -> tuple[int, int]:
    with SessionLocal() as db:
        patient = Patient(
            org_id=org_id,
            first_name="Aria",
            last_name="Lee",
            date_of_birth="1992-03-18",
            incident_number="INC-AI-200",
            chart_locked=True,
            narrative="Patient complains of respiratory distress with wheezing.",
            vitals={"spo2": 92, "hr": 110},
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        claim = BillingClaim(
            org_id=org_id,
            epcr_patient_id=patient.id,
            payer_name="Blue Shield",
            status="ready",
            demographics_snapshot={},
            medical_necessity_snapshot={},
            denial_risk_flags=[],
        )
        db.add(claim)
        db.commit()
        db.refresh(claim)
        return patient.id, claim.id


def test_ai_code_endpoint_when_disabled(client):
    headers, org_id, _ = create_test_user("ai-code@example.com", "BillingOrg", role=UserRole.billing)
    patient_id, _ = _seed_patient_and_claim(org_id)
    response = client.post("/api/billing/ai/code", json={"epcr_patient_id": patient_id}, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["insight_type"] == "coding"
    assert body["status"] == "disabled"
    with SessionLocal() as db:
        record = (
            db.query(BillingAiInsight)
            .filter(BillingAiInsight.org_id == org_id, BillingAiInsight.insight_type == "coding")
            .order_by(BillingAiInsight.id.desc())
            .first()
        )
        assert record is not None
        assert record.output_payload["insight_type"] == "coding"


def test_ai_scrub_persists_record(client):
    headers, org_id, _ = create_test_user("ai-scrub@example.com", "BillingOrg", role=UserRole.billing)
    patient_id, claim_id = _seed_patient_and_claim(org_id)
    payload = {
        "epcr_patient_id": patient_id,
        "claim_id": claim_id,
        "claim_payload": {"procedures": ["99285"], "notes": "Example scrub"},
    }
    response = client.post("/api/billing/ai/scrub", json=payload, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["insight_type"] == "scrub"
    with SessionLocal() as db:
        record = (
            db.query(BillingAiInsight)
            .filter(BillingAiInsight.insight_type == "scrub", BillingAiInsight.epcr_patient_id == patient_id)
            .first()
        )
        assert record is not None
        assert record.input_payload["claim_id"] == claim_id
