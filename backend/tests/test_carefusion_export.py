from core.database import SessionLocal
from models.exports import CarefusionExportSnapshot


def _register_user(client, email, role="billing", organization_name="CarefusionOrg"):
    payload = {
        "email": email,
        "full_name": "CareFusion User",
        "password": "securepass",
        "role": role,
        "organization_name": organization_name,
    }
    response = client.post("/api/auth/register", json=payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_session(client, headers):
    payload = {"title": "CareFusion Intake", "host_name": "Dr. Fusion"}
    response = client.post("/api/telehealth/sessions", json=payload, headers=headers)
    return response.json()["session_uuid"]


def _prep_session_for_export(client, session_uuid, headers):
    client.post(
        f"/api/telehealth/sessions/{session_uuid}/participants",
        json={"name": "Care Patient", "role": "patient"},
        headers=headers,
    )
    client.post(
        f"/api/telehealth/sessions/{session_uuid}/messages",
        json={"sender": "system", "message": "Telehealth intake complete"},
        headers=headers,
    )
    client.post(f"/api/telehealth/sessions/{session_uuid}/start", headers=headers)
    client.post(f"/api/telehealth/sessions/{session_uuid}/end", headers=headers)


def test_carefusion_export_requires_ready_session(client):
    provider_headers = _register_user(client, "provider-carefusion@example.com", role="provider")
    session_uuid = _create_session(client, provider_headers)
    billing_headers = _register_user(client, "carefusion@example.com", role="billing")
    response = client.post(f"/api/exports/carefusion/{session_uuid}", headers=billing_headers)
    assert response.status_code == 409
    assert response.json()["detail"]["message"] == "session_not_ready"


def test_carefusion_export_success_persists_snapshot(client):
    provider_headers = _register_user(client, "provider-carefusion@example.com", role="provider")
    session_uuid = _create_session(client, provider_headers)
    _prep_session_for_export(client, session_uuid, provider_headers)
    billing_headers = _register_user(client, "carefusion-ok@example.com", role="billing")
    response = client.post(f"/api/exports/carefusion/{session_uuid}", headers=billing_headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    export_packet = payload["export"]
    assert export_packet["session"]["session_uuid"] == session_uuid
    assert export_packet["participants"]
    assert payload["snapshot_id"]
    with SessionLocal() as session:
        snapshot = (
            session.query(CarefusionExportSnapshot)
            .filter(CarefusionExportSnapshot.telehealth_session_uuid == session_uuid)
            .first()
        )
    assert snapshot is not None
    events = client.get("/api/events", headers=billing_headers).json()
    assert any(event["event_type"] == "carefusion.export.generated" for event in events)
