from core.database import SessionLocal
from models.event import EventLog


def _auth_headers(client, role="dispatcher", organization_name="TestOrg"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@example.com",
            "full_name": "Fire User",
            "password": "securepass",
            "role": role,
            "organization_name": organization_name,
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_fire_incident(client):
    headers = _auth_headers(client)
    payload = {
        "incident_type": "Structure",
        "location": "12 Main St",
        "narrative": "AI assisted summary pending",
    }
    response = client.post("/api/fire/incidents", json=payload, headers=headers)
    assert response.status_code == 201
    incident_id = response.json()["incident_id"]

    response = client.get(f"/api/fire/incidents/{incident_id}", headers=headers)
    assert response.status_code == 200


def test_assign_fire_resources(client):
    headers = _auth_headers(client)
    incident = client.post(
        "/api/fire/incidents",
        json={"incident_type": "Vehicle", "location": "45 Pine Ave"},
        headers=headers,
    ).json()
    apparatus = client.post(
        "/api/fire/apparatus",
        json={"apparatus_id": "E-12", "apparatus_type": "Engine"},
        headers=headers,
    ).json()
    personnel = client.post(
        "/api/fire/personnel",
        json={"full_name": "Alex Rivera", "role": "Captain"},
        headers=headers,
    ).json()

    response = client.post(
        f"/api/fire/incidents/{incident['incident_id']}/assign-apparatus",
        json={"apparatus_id": apparatus["id"]},
        headers=headers,
    )
    assert response.status_code == 201

    response = client.post(
        f"/api/fire/incidents/{incident['incident_id']}/assign-personnel",
        json={"personnel_id": personnel["id"]},
        headers=headers,
    )
    assert response.status_code == 201

    response = client.get(
        f"/api/fire/incidents/{incident['incident_id']}/assignments", headers=headers
    )
    assert response.status_code == 200


def test_fire_timeline_records_events(client):
    headers = _auth_headers(client)
    incident = client.post(
        "/api/fire/incidents",
        json={"incident_type": "Structure", "location": "77 Elm St"},
        headers=headers,
    ).json()
    apparatus = client.post(
        "/api/fire/apparatus",
        json={"apparatus_id": "E-77", "apparatus_type": "Engine"},
        headers=headers,
    ).json()
    personnel = client.post(
        "/api/fire/personnel",
        json={"full_name": "Jordan Pike", "role": "Lieutenant"},
        headers=headers,
    ).json()
    client.post(
        f"/api/fire/incidents/{incident['incident_id']}/assign-apparatus",
        json={"apparatus_id": apparatus["id"]},
        headers=headers,
    )
    client.post(
        f"/api/fire/incidents/{incident['incident_id']}/assign-personnel",
        json={"personnel_id": personnel["id"]},
        headers=headers,
    )
    timeline = client.get(
        f"/api/fire/incidents/{incident['incident_id']}/timeline", headers=headers
    ).json()
    event_types = {entry["event_type"] for entry in timeline}
    assert "created" in event_types
    assert "unit_assigned" in event_types


def test_fire_unit_added_and_removed_timeline(client):
    headers = _auth_headers(client)
    incident = client.post(
        "/api/fire/incidents",
        json={"incident_type": "Structure", "location": "22 Maple St"},
        headers=headers,
    ).json()
    apparatus = client.post(
        "/api/fire/apparatus",
        json={"apparatus_id": "E-22", "apparatus_type": "Engine"},
        headers=headers,
    ).json()
    assignment = client.post(
        f"/api/fire/incidents/{incident['incident_id']}/assign-apparatus",
        json={"apparatus_id": apparatus["id"]},
        headers=headers,
    ).json()
    timeline = client.get(
        f"/api/fire/incidents/{incident['incident_id']}/timeline", headers=headers
    ).json()
    event_types = {entry["event_type"] for entry in timeline}
    assert "unit_added" in event_types
    assert "unit_assigned" in event_types
    removed = client.delete(
        f"/api/fire/incidents/{incident['incident_id']}/assign-apparatus/{assignment['id']}",
        headers=headers,
    )
    assert removed.status_code == 200
    timeline = client.get(
        f"/api/fire/incidents/{incident['incident_id']}/timeline", headers=headers
    ).json()
    assert any(entry["event_type"] == "unit_removed" for entry in timeline)


def test_fire_export_generates_event(client):
    headers = _auth_headers(client)
    incident = client.post(
        "/api/fire/incidents",
        json={"incident_type": "Structure", "location": "300 Birch St"},
        headers=headers,
    ).json()
    client.post(f"/api/fire/incidents/{incident['incident_id']}/export", headers=headers)
    with SessionLocal() as db:
        events = (
            db.query(EventLog)
            .filter(EventLog.event_type == "fire.export.generated")
            .all()
        )
        assert any(event.payload.get("incident_id") == incident["incident_id"] for event in events)


def test_fire_structured_export_and_snapshot(client):
    headers = _auth_headers(client)
    incident = client.post(
        "/api/fire/incidents",
        json={"incident_type": "Structure", "location": "88 Pine St"},
        headers=headers,
    ).json()
    payload = client.post(
        f"/api/fire/incidents/{incident['incident_id']}/export", headers=headers
    ).json()
    assert payload["status"] == "exported"
    assert payload["export"]["format"] == "NERIS"
    history = client.get("/api/fire/exports/history", headers=headers).json()
    assert history
    assert any(record["export_type"] == "NERIS" for record in history)


def test_fire_close_blocks_updates_until_reopen(client):
    headers = _auth_headers(client)
    incident = client.post(
        "/api/fire/incidents",
        json={"incident_type": "Wildland", "location": "95 Forest Rd"},
        headers=headers,
    ).json()
    response = client.post(
        f"/api/fire/incidents/{incident['incident_id']}/close", headers=headers
    )
    assert response.status_code == 200
    blocked = client.patch(
        f"/api/fire/incidents/{incident['incident_id']}",
        json={"location": "Updated Address"},
        headers=headers,
    )
    assert blocked.status_code == 409
    reopen = client.patch(
        f"/api/fire/incidents/{incident['incident_id']}",
        json={"status": "Open"},
        headers=headers,
    )
    assert reopen.status_code == 200
    update = client.patch(
        f"/api/fire/incidents/{incident['incident_id']}",
        json={"location": "Updated Address"},
        headers=headers,
    )
    assert update.status_code == 200


def test_fire_inventory_hook_records_timeline(client):
    headers = _auth_headers(client)
    incident = client.post(
        "/api/fire/incidents",
        json={"incident_type": "Structure", "location": "111 Lakeview Dr"},
        headers=headers,
    ).json()
    hook = client.post(
        f"/api/fire/incidents/{incident['incident_id']}/inventory_hooks",
        json={"equipment_type": "SCBA", "quantity": 2},
        headers=headers,
    )
    assert hook.status_code == 201
    timeline = client.get(
        f"/api/fire/incidents/{incident['incident_id']}/timeline", headers=headers
    ).json()
    assert any(entry["event_type"] == "inventory_recorded" for entry in timeline)


def test_fire_tenant_isolation(client):
    headers_org1 = _auth_headers(client, organization_name="AlphaFire")
    incident = client.post(
        "/api/fire/incidents",
        json={"incident_type": "Structure", "location": "12 Main St"},
        headers=headers_org1,
    ).json()
    headers_org2 = _auth_headers(client, role="provider", organization_name="BetaFire")
    public = client.get(
        f"/api/fire/incidents/{incident['incident_id']}", headers=headers_org2
    )
    assert public.status_code == 403
    timeline = client.get(
        f"/api/fire/incidents/{incident['incident_id']}/timeline", headers=headers_org2
    )
    assert timeline.status_code == 403
    hook = client.post(
        f"/api/fire/incidents/{incident['incident_id']}/inventory_hooks",
        json={"equipment_type": "SCBA"},
        headers=headers_org2,
    )
    assert hook.status_code == 403
