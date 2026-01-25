from __future__ import annotations


from core.config import settings
from core.database import SessionLocal
from models.billing_claims import BillingClaim, BillingClaimExportSnapshot
from models.epcr import Patient
from models.user import UserRole
from tests.utils import create_test_user


def _create_ready_claim(org_id: int) -> None:
    with SessionLocal() as db:
        patient = Patient(
            org_id=org_id,
            first_name="Morgan",
            last_name="Case",
            date_of_birth="1990-01-01",
            incident_number="INC-100",
            chart_locked=True,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        claim = BillingClaim(
            org_id=org_id,
            epcr_patient_id=patient.id,
            payer_name="Medicaid",
            status="ready",
            demographics_snapshot={},
            medical_necessity_snapshot={},
            denial_risk_flags=[],
        )
        db.add(claim)
        db.commit()


def test_office_ally_sync_returns_412_when_disabled(client):
    headers, _, _ = create_test_user("ally-disabled@example.com", "BillingOrg", role=UserRole.billing)
    response = client.post("/api/billing/office-ally/sync", headers=headers)
    assert response.status_code == 412
    assert response.json()["detail"].startswith("Office Ally integration")


def test_office_ally_sync_creates_snapshot(client):
    headers, org_id, _ = create_test_user("ally@example.com", "BillingOrg", role=UserRole.billing)
    previous_flag = settings.OFFICEALLY_ENABLED
    settings.OFFICEALLY_ENABLED = True
    try:
        _create_ready_claim(org_id)
        response = client.post("/api/billing/office-ally/sync", headers=headers)
        assert response.status_code == 200
        body = response.json()
        assert body["submitted"] == 1
        batch_id = body["batch_id"]
        assert batch_id.startswith("oa-")
        with SessionLocal() as db:
            snapshot = (
                db.query(BillingClaimExportSnapshot)
                .filter(BillingClaimExportSnapshot.org_id == org_id)
                .order_by(BillingClaimExportSnapshot.id.desc())
                .first()
            )
            assert snapshot is not None
            assert snapshot.office_ally_batch_id == batch_id
            assert snapshot.ack_status == "submitted"
            claim = db.query(BillingClaim).filter(BillingClaim.id == snapshot.claim_id).first()
            assert claim is not None
            assert claim.status == "submitted"
    finally:
        settings.OFFICEALLY_ENABLED = previous_flag
