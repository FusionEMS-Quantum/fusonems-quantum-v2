from __future__ import annotations

from sqlalchemy.orm import Session

from core.config import settings
from core.database import SessionLocal
from models.epcr import Patient
from models.telnyx import TelnyxCallSummary
from models.user import UserRole
from tests.utils import create_test_user


def _create_patient(org_id: int) -> int:
    with SessionLocal() as db:
        patient = Patient(
            org_id=org_id,
            first_name="Telnyx",
            last_name="Tester",
            date_of_birth="1985-04-05",
            incident_number="TEL-100",
            chart_locked=True,
            address="",
            phone="",
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient.id


def test_call_summary_returns_412_when_disabled(client):
    headers, _, _ = create_test_user("ivr-disabled@example.com", "BillingOrg", role=UserRole.billing)
    response = client.post(
        "/api/telnyx/call-summary",
        json={
            "call_sid": "abc",
            "intent": "claim_inquiry",
            "ai_response": {"status": "ok"},
        },
        headers=headers,
    )
    assert response.status_code == 412
    assert "Telnyx integration is disabled" in response.json()["detail"]


def test_call_summary_creates_record(client):
    headers, org_id, _ = create_test_user("ivr@example.com", "BillingOrg", role=UserRole.billing)
    previous_flag = settings.TELNYX_ENABLED
    settings.TELNYX_ENABLED = True
    try:
        response = client.post(
            "/api/telnyx/call-summary",
            json={
                "call_sid": "abc",
                "intent": "payment_status",
                "ai_response": {"status": "ok"},
                "resolution": "responded",
            },
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "responded"
        with SessionLocal() as db:
            summary = (
                db.query(TelnyxCallSummary)
                .filter(TelnyxCallSummary.org_id == org_id)
                .order_by(TelnyxCallSummary.id.desc())
                .first()
            )
            assert summary is not None
            assert summary.intent == "payment_status"
    finally:
        settings.TELNYX_ENABLED = previous_flag


def test_facesheet_request_when_disabled(client):
    headers, _, _ = create_test_user("facesheet-disabled@example.com", "BillingOrg", role=UserRole.billing)
    response = client.post("/api/billing/facesheet/request", json={"epcr_patient_id": 1}, headers=headers)
    assert response.status_code == 412
    assert "Telnyx integration is disabled" in response.json()["detail"]


def test_facesheet_request_triggers_workflow(client):
    headers, org_id, _ = create_test_user("facesheet@example.com", "BillingOrg", role=UserRole.billing)
    patient_id = _create_patient(org_id)
    previous_flag = settings.TELNYX_ENABLED
    settings.TELNYX_ENABLED = True
    try:
        response = client.post("/api/billing/facesheet/request", json={"epcr_patient_id": patient_id}, headers=headers)
        assert response.status_code == 200
        assert response.json()["status"] == "requested"
        # status endpoint should reflect missing fields
        status_resp = client.get(f"/api/billing/facesheet/status/{patient_id}", headers=headers)
        assert status_resp.status_code == 200
        assert status_resp.json()["present"] is False
    finally:
        settings.TELNYX_ENABLED = previous_flag
