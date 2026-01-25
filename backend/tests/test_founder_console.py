from core.config import settings


def _register_user(client, email, org_name, role="founder"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": "Founder Tester",
            "password": "strongpassword",
            "role": role,
            "organization_name": org_name,
        },
    )
    data = response.json()
    return {"Authorization": f"Bearer {data['access_token']}"}


def _list_founder_audits(client, headers):
    response = client.get("/api/compliance/forensic", headers=headers)
    assert response.status_code == 200
    return [entry["resource"] for entry in response.json()]


def test_founder_overview_notifications_and_rbac(client, monkeypatch):
    monkeypatch.setattr(
        "services.mail.mail_router._send_telnyx_message",
        lambda payload: "telnyx-fake",
    )
    monkeypatch.setattr(settings, "POSTMARK_SERVER_TOKEN", "postmark-test", raising=False)
    monkeypatch.setattr(settings, "POSTMARK_SEND_DISABLED", True, raising=False)
    founder_headers = _register_user(client, "founder@example.com", "Quantum", role="founder")
    ops_headers = _register_user(client, "opsadmin@example.com", "Quantum", role="ops_admin")

    overview = client.get("/api/founder/overview", headers=founder_headers)
    assert overview.status_code == 200
    payload = overview.json()
    assert "module_health" in payload and "queue_summary" in payload
    assert any(org["name"] == "Quantum" for org in payload["orgs"])
    assert client.get("/api/founder/overview", headers=ops_headers).status_code == 200

    sms_response = client.post(
        "/api/founder/notify/sms",
        json={"recipient": "+15550000001", "message": "Status check"},
        headers=founder_headers,
    )
    assert sms_response.status_code == 200

    email_response = client.post(
        "/api/founder/notify/email",
        json={"to": "alerts@fusionems.app", "subject": "Alert", "body": "All good"},
        headers=founder_headers,
    )
    assert email_response.status_code == 200

    script_response = client.post(
        "/api/founder/notify/call_script",
        json={"recipient_name": "Ops Team", "reason": "platform refresh"},
        headers=founder_headers,
    )
    assert script_response.status_code == 200
    assert "script" in script_response.json()

    records = _list_founder_audits(client, founder_headers)
    assert "founder_overview" in records
    assert "founder_sms" in records
    assert "founder_email" in records
    assert "founder_call_script" in records

    dispatcher_headers = _register_user(client, "dispatcher@example.com", "Quantum", role="dispatcher")
    assert client.get("/api/founder/overview", headers=dispatcher_headers).status_code == 403


def test_founder_org_scope(client):
    founder_a = _register_user(client, "founder_a@example.com", "Alpha", role="founder")
    health = client.get("/api/founder/overview", headers=founder_a)
    org_id = health.json()["orgs"][0]["id"]
    users_response = client.get(f"/api/founder/orgs/{org_id}/users", headers=founder_a)
    assert users_response.status_code == 200

    founder_b = _register_user(client, "founder_b@example.com", "Beta", role="founder")
    forbidden_health = client.get(f"/api/founder/orgs/{org_id}/health", headers=founder_b)
    assert forbidden_health.status_code == 403
    forbidden_users = client.get(f"/api/founder/orgs/{org_id}/users", headers=founder_b)
    assert forbidden_users.status_code == 403
