from __future__ import annotations

from sqlalchemy.orm import Session

from core.database import SessionLocal
from models.billing import PriorAuthRequest
from models.epcr import Patient
from models.user import UserRole
from tests.utils import create_test_user


def _seed_patient(org_id: int) -> int:
    with SessionLocal() as db:
        patient = Patient(
            org_id=org_id,
            first_name="Prior",
            last_name="Auth",
            date_of_birth="1990-01-01",
            incident_number="PA-100",
            chart_locked=True,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient.id


def test_prior_auth_request_and_list(client):
    headers, org_id, _ = create_test_user("prior@example.com", "BillingOrg", role=UserRole.billing)
    patient_id = _seed_patient(org_id)
    payload = {
        "epcr_patient_id": patient_id,
        "procedure_code": "A0428",
        "auth_number": "AUTH-123",
        "expiration_date": "2026-02-15T00:00:00Z",
        "notes": "Test prior auth",
    }
    response = client.post("/api/billing/prior-auth/request", json=payload, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["procedure_code"] == "A0428"
    assert body["status"] == "requested"
    status_resp = client.get(f"/api/billing/prior-auth/status/{patient_id}", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()
    assert status_resp.json()[0]["auth_number"] == "AUTH-123"


def test_prior_auth_update_status(client):
    headers, org_id, _ = create_test_user("prior-update@example.com", "BillingOrg", role=UserRole.billing)
    patient_id = _seed_patient(org_id)
    with SessionLocal() as db:
        record = PriorAuthRequest(
            org_id=org_id,
            epcr_patient_id=patient_id,
            procedure_code="99283",
            auth_number="AUTH-456",
            status="approved",
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    response = client.delete(
        f"/api/billing/prior-auth/{record.id}",
        json={"status": "expired"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "expired"
    with SessionLocal() as db:
        updated = db.query(PriorAuthRequest).filter(PriorAuthRequest.id == record.id).first()
        assert updated.status == "expired"
