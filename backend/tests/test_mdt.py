from core.database import SessionLocal
import core.security as core_security
import services.auth.auth_router as auth_router
from models.cad import Dispatch


def _noop_hash(password: str) -> str:
    return password[:60]


core_security.hash_password = _noop_hash
core_security.verify_password = lambda password, hashed: True
auth_router.hash_password = _noop_hash
auth_router.verify_password = lambda password, hashed: True


def _register_user(client, email, org_name, role="dispatcher"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": "MDT User",
            "password": "securepass",
            "role": role,
            "organization_name": org_name,
        },
    )
    data = response.json()
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _list_events(client, headers):
    response = client.get("/api/events", headers=headers)
    assert response.status_code == 200
    return response.json()


def _list_audits(client, headers):
    response = client.get("/api/compliance/forensic", headers=headers)
    assert response.status_code == 200
    return response.json()


def _has_event(events, event_type):
    return any(event.get("event_type") == event_type for event in events)


def _has_audit(audits, resource, action="create"):
    return any(
        audit.get("resource") == resource and audit.get("action") == action for audit in audits
    )


def _setup_dispatch(client, headers):
    call = client.post(
        "/api/cad/calls",
        json={
            "caller_name": "Dispatch Caller",
            "caller_phone": "555-2020",
            "location_address": "120 Dispatch Way",
            "latitude": 39.0,
            "longitude": -75.0,
            "priority": "High",
        },
        headers=headers,
    )
    assert call.status_code == 201
    call_id = call.json()["id"]
    unit = client.post(
        "/api/cad/units",
        json={
            "unit_identifier": "MDT-1",
            "status": "Available",
            "latitude": 39.1,
            "longitude": -75.1,
        },
        headers=headers,
    )
    assert unit.status_code == 201
    unit_id = unit.json()["id"]
    dispatch = client.post(
        "/api/cad/dispatch",
        json={"call_id": call_id, "unit_identifier": "MDT-1"},
        headers=headers,
    )
    assert dispatch.status_code == 200
    session = SessionLocal()
    try:
        record = (
            session.query(Dispatch)
            .filter(Dispatch.call_id == call_id, Dispatch.unit_id == unit_id)
            .order_by(Dispatch.created_at.desc())
            .first()
        )
        assert record
        return call_id, unit_id, record.id
    finally:
        session.close()


def test_mdt_status_event_flow(client):
    headers = _register_user(client, "mdt_user@example.com", "MDT Org")
    _, unit_id, dispatch_id = _setup_dispatch(client, headers)

    response = client.post(
        "/api/mdt/events",
        json={
            "dispatch_id": dispatch_id,
            "unit_id": unit_id,
            "status": "enroute",
            "notes": "Heading to scene",
        },
        headers=headers,
    )
    assert response.status_code == 201
    timeline = client.get(f"/api/mdt/dispatches/{dispatch_id}/timeline", headers=headers)
    assert timeline.status_code == 200
    entries = timeline.json()
    assert entries and entries[0]["status"] == "enroute"

    events = _list_events(client, headers)
    assert _has_event(events, "mdt.event.status.enroute")

    audits = _list_audits(client, headers)
    assert _has_audit(audits, "mdt_event")


def test_mdt_obd_ingest_computes_derived_values(client):
    headers = _register_user(client, "mdt_obd@example.com", "MDT Org")
    _, unit_id, dispatch_id = _setup_dispatch(client, headers)

    first = client.post(
        "/api/mdt/obd",
        json={
            "dispatch_id": dispatch_id,
            "unit_id": unit_id,
            "mileage": 100.0,
            "ignition_on": True,
            "lights_sirens_active": False,
        },
        headers=headers,
    )
    assert first.status_code == 201

    second = client.post(
        "/api/mdt/obd",
        json={
            "dispatch_id": dispatch_id,
            "unit_id": unit_id,
            "mileage": 130.0,
            "ignition_on": True,
            "lights_sirens_active": True,
        },
        headers=headers,
    )
    assert second.status_code == 201

    obds = client.get(f"/api/mdt/dispatches/{dispatch_id}/obd", headers=headers)
    assert obds.status_code == 200
    records = obds.json()
    assert len(records) == 2
    assert records[1]["leg_mileage"] == 30.0
    assert records[1]["transport_distance"] == 30.0

    events = _list_events(client, headers)
    assert _has_event(events, "mdt.obd.ingested")


def test_mdt_cad_sync_records_event(client):
    headers = _register_user(client, "mdt_sync@example.com", "MDT Org")
    _, unit_id, dispatch_id = _setup_dispatch(client, headers)

    sync_response = client.post(
        "/api/mdt/cad-sync",
        json={
            "direction": "cad_to_mdt",
            "event_type": "dispatch.status.update",
            "dispatch_id": dispatch_id,
            "payload": {"status": "confirmed"},
        },
        headers=headers,
    )
    assert sync_response.status_code == 201

    events = _list_events(client, headers)
    assert _has_event(events, "mdt.cad.sync")
