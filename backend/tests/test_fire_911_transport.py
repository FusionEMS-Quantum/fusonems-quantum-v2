from core.database import SessionLocal
from models.event import EventLog


def _auth_headers(client, role="dispatcher", organization_name="FireTestOrg"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@firetest.com",
            "full_name": "Fire Medic",
            "password": "securepass",
            "role": role,
            "organization_name": organization_name,
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_fire_911_transport(client):
    headers = _auth_headers(client)
    payload = {
        "incident_id": "FIR-ABC123",
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "1985-03-15",
        "phone": "555-1234",
        "address": "123 Main St",
        "chief_complaint": "Chest pain",
        "chief_complaint_icd10": "R07.9",
        "vitals": {"heart_rate": 88, "bp": "140/90", "resp_rate": 16},
        "assessment": "Patient alert and oriented",
        "transport_decision": "Transport",
        "transport_destination": "Memorial Hospital",
    }
    response = client.post("/api/fire/911-transports", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["transport_id"]
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"
    assert data["status"] == "Draft"
    
    transport_id = data["transport_id"]
    response = client.get(f"/api/fire/911-transports/{transport_id}", headers=headers)
    assert response.status_code == 200


def test_list_911_transports_by_incident(client):
    headers = _auth_headers(client)
    incident_id = "FIR-XYZ789"
    
    for i in range(3):
        payload = {
            "incident_id": incident_id,
            "first_name": f"Patient{i}",
            "last_name": "Test",
            "date_of_birth": "1990-01-01",
            "chief_complaint": "Injury",
        }
        client.post("/api/fire/911-transports", json=payload, headers=headers)
    
    response = client.get(f"/api/fire/911-transports?incident_id={incident_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


def test_update_911_transport_data(client):
    headers = _auth_headers(client)
    transport = client.post(
        "/api/fire/911-transports",
        json={
            "incident_id": "FIR-001",
            "first_name": "Jane",
            "last_name": "Smith",
            "date_of_birth": "1992-06-20",
            "chief_complaint": "Shortness of breath",
        },
        headers=headers,
    ).json()
    
    update_payload = {
        "assessment": "RR elevated, SpO2 92%",
        "interventions": ["Oxygen 2L nasal cannula", "IV established"],
        "medications": [{"name": "Aspirin", "dose": "325mg"}],
    }
    response = client.patch(
        f"/api/fire/911-transports/{transport['transport_id']}", json=update_payload, headers=headers
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["assessment"] == "RR elevated, SpO2 92%"
    assert len(updated["interventions"]) == 2


def test_update_911_transport_timing(client):
    headers = _auth_headers(client)
    transport = client.post(
        "/api/fire/911-transports",
        json={
            "incident_id": "FIR-002",
            "first_name": "Bob",
            "last_name": "Johnson",
            "date_of_birth": "1988-11-10",
            "chief_complaint": "Trauma",
        },
        headers=headers,
    ).json()
    
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    timing_payload = {
        "transport_initiated_time": now.isoformat(),
        "arrival_at_hospital_time": now.isoformat(),
    }
    response = client.patch(
        f"/api/fire/911-transports/{transport['transport_id']}/timing", json=timing_payload, headers=headers
    )
    assert response.status_code == 200


def test_add_911_transport_narrative(client):
    headers = _auth_headers(client)
    transport = client.post(
        "/api/fire/911-transports",
        json={
            "incident_id": "FIR-003",
            "first_name": "Alice",
            "last_name": "Cooper",
            "date_of_birth": "1980-02-28",
            "chief_complaint": "Seizure",
        },
        headers=headers,
    ).json()
    
    narrative = {
        "narrative": "Patient found seizing at home. Bystander CPR in progress. Alert with post-ictal confusion. IV placed, glucose monitored. Transport to ED for evaluation."
    }
    response = client.post(
        f"/api/fire/911-transports/{transport['transport_id']}/narrative", json=narrative, headers=headers
    )
    assert response.status_code == 200
    updated = response.json()
    assert "Patient found seizing" in updated["narrative"]


def test_lock_and_unlock_911_transport(client):
    headers = _auth_headers(client)
    transport = client.post(
        "/api/fire/911-transports",
        json={
            "incident_id": "FIR-004",
            "first_name": "Charlie",
            "last_name": "Brown",
            "date_of_birth": "1995-07-14",
            "chief_complaint": "Fall",
        },
        headers=headers,
    ).json()
    
    response = client.post(
        f"/api/fire/911-transports/{transport['transport_id']}/lock", headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "locked"
    
    locked = client.get(f"/api/fire/911-transports/{transport['transport_id']}", headers=headers).json()
    assert locked["status"] == "Locked"
    
    update_attempt = client.patch(
        f"/api/fire/911-transports/{transport['transport_id']}",
        json={"assessment": "Updated"},
        headers=headers,
    )
    assert update_attempt.status_code == 409
    
    unlock = client.post(
        f"/api/fire/911-transports/{transport['transport_id']}/unlock", headers=headers
    )
    assert unlock.status_code == 200
    
    unlocked = client.get(f"/api/fire/911-transports/{transport['transport_id']}", headers=headers).json()
    assert unlocked["status"] == "Draft"


def test_submit_911_transport(client):
    headers = _auth_headers(client)
    transport = client.post(
        "/api/fire/911-transports",
        json={
            "incident_id": "FIR-005",
            "first_name": "Diana",
            "last_name": "Prince",
            "date_of_birth": "1988-09-19",
            "chief_complaint": "Medical emergency",
        },
        headers=headers,
    ).json()
    
    response = client.post(
        f"/api/fire/911-transports/{transport['transport_id']}/submit", headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "submitted"
    
    submitted = client.get(f"/api/fire/911-transports/{transport['transport_id']}", headers=headers).json()
    assert submitted["status"] == "Submitted"
    
    duplicate_submit = client.post(
        f"/api/fire/911-transports/{transport['transport_id']}/submit", headers=headers
    )
    assert duplicate_submit.status_code == 409


def test_911_transport_timeline_events(client):
    headers = _auth_headers(client)
    transport = client.post(
        "/api/fire/911-transports",
        json={
            "incident_id": "FIR-006",
            "first_name": "Eve",
            "last_name": "Adams",
            "date_of_birth": "1991-12-05",
            "chief_complaint": "Unknown",
        },
        headers=headers,
    ).json()
    
    client.patch(
        f"/api/fire/911-transports/{transport['transport_id']}",
        json={"assessment": "Patient stable"},
        headers=headers,
    )
    
    client.post(
        f"/api/fire/911-transports/{transport['transport_id']}/narrative",
        json={"narrative": "Standard transport"},
        headers=headers,
    )
    
    timeline = client.get(
        f"/api/fire/911-transports/{transport['transport_id']}/timeline", headers=headers
    ).json()
    
    event_types = {entry["event_type"] for entry in timeline}
    assert "created" in event_types
    assert "updated" in event_types
    assert "narrative_added" in event_types


def test_911_transport_tenant_isolation(client):
    headers_org1 = _auth_headers(client, organization_name="FireDeptA")
    transport = client.post(
        "/api/fire/911-transports",
        json={
            "incident_id": "FIR-ORG1",
            "first_name": "Frank",
            "last_name": "Wilson",
            "date_of_birth": "1986-04-12",
            "chief_complaint": "Complaint",
        },
        headers=headers_org1,
    ).json()
    
    headers_org2 = _auth_headers(client, role="provider", organization_name="FireDeptB")
    response = client.get(
        f"/api/fire/911-transports/{transport['transport_id']}", headers=headers_org2
    )
    assert response.status_code == 403
    
    response = client.patch(
        f"/api/fire/911-transports/{transport['transport_id']}",
        json={"assessment": "Hacked"},
        headers=headers_org2,
    )
    assert response.status_code == 403


def test_911_transport_event_emission(client):
    headers = _auth_headers(client)
    payload = {
        "incident_id": "FIR-EVENT",
        "first_name": "George",
        "last_name": "Harris",
        "date_of_birth": "1989-08-22",
        "chief_complaint": "Event test",
    }
    response = client.post("/api/fire/911-transports", json=payload, headers=headers)
    assert response.status_code == 201
    
    with SessionLocal() as db:
        events = (
            db.query(EventLog)
            .filter(EventLog.event_type == "fire.911_transport.created")
            .all()
        )
        assert any(event.payload.get("transport_id") for event in events)
