from core.config import settings
from core.database import SessionLocal
from models.support import SupportInteraction
from .utils import create_test_user


def _register_user(client, email, role="admin"):
    headers, org_id, _ = create_test_user(email=email, org_name="TelnyxOrg", role=role)
    return headers, org_id


def _create_patient(client, headers, **overrides):
    payload = {
        "first_name": "Case",
        "last_name": "Tester",
        "date_of_birth": "1990-01-01",
        "incident_number": "TEL-100",
        "vitals": {"hr": 95},
        "narrative": overrides.pop("narrative", "Patient stable."),
    }
    payload.update(overrides)
    response = client.post("/api/epcr/patients", json=payload, headers=headers)
    return response.json()["id"]


def _lock_chart(client, headers, patient_id):
    response = client.post(f"/api/epcr/patients/{patient_id}/lock", headers=headers)
    assert response.status_code == 200


def _create_ready_patient(client, headers):
    patient_id = _create_patient(client, headers)
    _lock_chart(client, headers, patient_id)
    return patient_id


def test_telnyx_webhook_records_interactions(client):
    headers, org_id = _register_user(client, "telnyx-inbound@example.com", role="billing")
    patient_id = _create_ready_patient(client, headers)
    payload = {
        "data": {
            "event_type": "message.received",
            "payload": {
                "from": "+15551230000",
                "to": "+15551239999",
                "text": "What is the status of my claim?",
                "direction": "inbound",
                "metadata": {"org_id": org_id, "epcr_patient_id": patient_id},
            },
        }
    }
    response = client.post("/api/telnyx/webhook", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "intent" in body
    assert any(step for step in body["call_script"])

    with SessionLocal() as session:
        interactions = (
            session.query(SupportInteraction)
            .filter(SupportInteraction.org_id == org_id)
            .all()
        )
    assert any(entry.direction == "inbound" for entry in interactions)
    assert any(entry.direction == "outbound" for entry in interactions)
    events = client.get("/api/events", headers=headers).json()
    assert any(event["event_type"] == "support.telnyx_message_received" for event in events)
    assert any(event["event_type"] == "support.telnyx_response_sent" for event in events)


def test_telnyx_signature_enforced_when_enabled(client, monkeypatch):
    monkeypatch.setattr(settings, "TELNYX_PUBLIC_KEY", "fakekey", raising=False)
    original = settings.TELNYX_REQUIRE_SIGNATURE
    settings.TELNYX_REQUIRE_SIGNATURE = True
    response = client.post("/api/telnyx/webhook", json={"data": {"event_type": "call.initiated"}})
    settings.TELNYX_REQUIRE_SIGNATURE = original
    assert response.status_code in {401, 412}


def test_support_sms_send_logs_interaction(client, monkeypatch):
    monkeypatch.setattr(
        "services.mail.mail_router._send_telnyx_message",
        lambda payload: "telnyx-outbound",
    )
    monkeypatch.setattr(settings, "TELNYX_API_KEY", "fake-key", raising=False)
    monkeypatch.setattr(settings, "TELNYX_FROM_NUMBER", "+15551230001", raising=False)
    headers, org_id = _register_user(client, "ops-sms@example.com", role="ops_admin")
    response = client.post(
        "/api/support/sms/send",
        json={"recipient": "+15551239999", "body": "Billing update"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["telnyx_id"] == "telnyx-outbound"
    with SessionLocal() as session:
        interactions = (
            session.query(SupportInteraction)
            .filter(SupportInteraction.org_id == org_id)
            .all()
        )
    assert any(entry.direction == "outbound" for entry in interactions)
    events = client.get("/api/events", headers=headers).json()
    assert any(event["event_type"] == "support.telnyx_response_sent" for event in events)


def test_call_assist_returns_script_and_is_role_protected(client):
    headers, _ = _register_user(client, "ops-call@example.com", role="ops_admin")
    patient_id = _create_ready_patient(client, headers)
    response = client.post(
        "/api/support/call/assist",
        json={"epcr_patient_id": patient_id},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert "call_script" in body
    assert body["assist_snapshot"]
    assert any(event["event_type"] == "support.call_assist.generated" for event in client.get("/api/events", headers=headers).json())

    unauthorized, _ = _register_user(client, "provider-call@example.com", role="provider")
    forbidden = client.post(
        "/api/support/call/assist",
        json={"epcr_patient_id": patient_id},
        headers=unauthorized,
    )
    assert forbidden.status_code == 403
