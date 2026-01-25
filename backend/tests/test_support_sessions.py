from datetime import datetime, timedelta, timezone

from core.database import SessionLocal
from models.support import SupportSession


SESSION_TOKEN_HEADER = "x-support-session-token"


def _register_user(client, email, org_name, role="ops_admin"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": "Support Tester",
            "password": "strongpassword",
            "role": role,
            "organization_name": org_name,
        },
    )
    data = response.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data["user"]["id"]


def test_support_session_lifecycle(client, monkeypatch):
    monkeypatch.setattr(
        "services.mail.mail_router._send_telnyx_message",
        lambda payload: "telnyx-consent",
    )
    ops_headers, _ = _register_user(client, "ops@example.com", "SupportOrg", role="ops_admin")
    support_headers, _ = _register_user(client, "support@example.com", "SupportOrg", role="support")
    target_headers, target_id = _register_user(client, "target@example.com", "SupportOrg", role="provider")
    create_resp = client.post(
        "/api/support/sessions",
        json={"target_user_id": target_id, "purpose": "mirror"},
        headers=ops_headers,
    )
    assert create_resp.status_code == 201
    session_data = create_resp.json()
    session_id = session_data["session_id"]

    consent_req = client.post(
        f"/api/support/sessions/{session_id}/request_consent",
        json={"phone": "+15551234567"},
        headers=ops_headers,
    )
    assert consent_req.status_code == 200

    consent_response = client.post(
        f"/api/support/sessions/{session_id}/consent",
        json={"approved": True},
        headers=target_headers,
    )
    assert consent_response.status_code == 200

    event_resp = client.post(
        f"/api/support/sessions/{session_id}/events",
        json={"event_type": "click", "payload": {"element": "consent-button"}},
        headers={SESSION_TOKEN_HEADER: session_data["session_token"]},
    )
    assert event_resp.status_code == 200

    list_resp = client.get(f"/api/support/sessions/{session_id}/events", headers=support_headers)
    events = list_resp.json()["events"]
    assert any(event["event_type"] == "click" for event in events)

    end_resp = client.post(f"/api/support/sessions/{session_id}/end", headers=ops_headers)
    assert end_resp.status_code == 200

    forensic = client.get("/api/compliance/forensic", headers=ops_headers).json()
    resources = {entry["resource"] for entry in forensic}
    assert "support_session" in resources
    assert "support_session_event" in resources


def test_support_session_ttl_and_cross_org(client, monkeypatch):
    monkeypatch.setattr(
        "services.mail.mail_router._send_telnyx_message",
        lambda payload: "telnyx-consent",
    )
    ops_a, _ = _register_user(client, "ops-a@example.com", "OrgA", role="ops_admin")
    ops_b, _ = _register_user(client, "ops-b@example.com", "OrgB", role="ops_admin")
    target_headers, target_id = _register_user(client, "target-b@example.com", "OrgB", role="provider")
    create_resp = client.post(
        "/api/support/sessions",
        json={"target_user_id": target_id, "purpose": "mirror"},
        headers=ops_b,
    )
    assert create_resp.status_code == 201
    session_data = create_resp.json()
    session_id = session_data["session_id"]
    with SessionLocal() as db:
        record = db.query(SupportSession).filter(SupportSession.id == session_id).first()
        record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        db.commit()

    expired_event = client.post(
        f"/api/support/sessions/{session_id}/events",
        json={"event_type": "click", "payload": {}},
        headers={SESSION_TOKEN_HEADER: session_data["session_token"]},
    )
    assert expired_event.status_code == 400

    support_headers, _ = _register_user(client, "support-b@example.com", "OrgB", role="support")
    cross_list = client.get(f"/api/support/sessions/{session_id}/events", headers=support_headers)
    assert cross_list.status_code == 403

    dispatcher_headers, _ = _register_user(client, "dispatcher@example.com", "OrgB", role="dispatcher")
    no_create = client.post(
        "/api/support/sessions",
        json={"target_user_id": target_id, "purpose": "workflow_replay"},
        headers=dispatcher_headers,
    )
    assert no_create.status_code == 403


def test_support_ocr_summary_and_reprocess(client):
    provider_headers, _ = _register_user(client, "provider@example.com", "OCROrg", role="provider")
    support_headers, _ = _register_user(client, "support-ocr@example.com", "OCROrg", role="support")
    patient_payload = {
        "first_name": "Test",
        "last_name": "Patient",
        "date_of_birth": "1990-01-01",
        "incident_number": "INC-123",
        "vitals": {},
        "interventions": [],
        "medications": [],
        "procedures": [],
        "labs": [],
        "cct_interventions": [],
        "ocr_snapshots": [
            {
                "device_type": "monitor",
                "fields": [
                    {"field": "heart_rate", "value": 72, "confidence": 0.98, "evidence_hash": "hash-hr"}
                ],
                "requires_review": False,
                "unknown_fields": [],
            }
        ],
    }
    patient_resp = client.post("/api/epcr/patients", json=patient_payload, headers=provider_headers)
    patient_id = patient_resp.json()["id"]

    summary = client.get(f"/api/support/ocr/{patient_id}/summary", headers=support_headers)
    assert summary.status_code == 200
    data = summary.json()
    assert data["snapshots"]
    assert "hash-hr" in data["evidence_links"]

    reprocess = client.post(f"/api/support/ocr/{patient_id}/reprocess", headers=support_headers)
    assert reprocess.status_code == 200
    assert reprocess.json()["status"] == "reprocessed"
