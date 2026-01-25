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


def _register_user(client, email, org_name, role="admin"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": "Transport Admin",
            "password": "securepass",
            "role": role,
            "organization_name": org_name,
        },
    )
    data = response.json()
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_dispatch(client, headers):
    call = client.post(
        "/api/cad/calls",
        json={
            "caller_name": "Transport Caller",
            "caller_phone": "555-7000",
            "location_address": "1 Dispatch Plaza",
            "latitude": 40.0,
            "longitude": -75.0,
            "priority": "Routine",
        },
        headers=headers,
    )
    assert call.status_code == 201
    call_id = call.json()["id"]

    unit = client.post(
        "/api/cad/units",
        json={
            "unit_identifier": "TN-1",
            "status": "Available",
            "latitude": 40.1,
            "longitude": -75.1,
        },
        headers=headers,
    )
    assert unit.status_code == 201
    unit_id = unit.json()["id"]

    dispatch = client.post(
        "/api/cad/dispatch",
        json={"call_id": call_id, "unit_identifier": "TN-1"},
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


def _list_events(client, headers):
    response = client.get("/api/events", headers=headers)
    assert response.status_code == 200
    return response.json()


def _has_event(events, event_type):
    return any(event.get("event_type") == event_type for event in events)


def test_transport_trip_lifecycle(client):
    headers = _register_user(client, "transport_admin@example.com", "Transport Org")
    print("TEST: registered user", flush=True)
    call_id, unit_id, dispatch_id = _create_dispatch(client, headers)
    print("TEST: dispatch created", flush=True)

    patient = client.post(
        "/api/epcr/patients",
        json={
            "first_name": "Pat",
            "last_name": "Transit",
            "date_of_birth": "1970-01-01",
            "phone": "555-1234",
            "address": "1 Medic Way",
            "incident_number": "TRANS-0001",
        },
        headers=headers,
    )
    assert patient.status_code == 201
    patient_id = patient.json()["id"]

    master = client.post(
        "/api/master_patients",
        json={
            "first_name": "Pat",
            "last_name": "Transit",
            "date_of_birth": "1970-01-01",
        },
        headers=headers,
    )
    assert master.status_code == 201

    link = client.post(
        f"/api/epcr/patients/{patient_id}/link_master_patient",
        json={"master_patient_id": master.json()["id"], "provenance": "transport"},
        headers=headers,
    )
    assert link.status_code == 201

    trip_response = client.post(
        "/api/transport",
        json={
            "origin_facility": "Facility A",
            "origin_address": "100 Care Rd",
            "destination_facility": "Facility B",
            "destination_address": "200 Recovery Blvd",
            "transport_type": "ift",
            "call_id": call_id,
            "dispatch_id": dispatch_id,
            "unit_id": unit_id,
            "epcr_patient_id": patient_id,
        },
        headers=headers,
    )
    assert trip_response.status_code == 201
    trip_id = trip_response.json()["id"]

    completion_blocked = client.post(
        f"/api/transport/{trip_id}/complete",
        json={},
        headers=headers,
    )
    assert completion_blocked.status_code == 422

    mn_update = client.post(
        f"/api/transport/{trip_id}/medical_necessity",
        json={"medical_necessity_status": "approved", "pcs_provided": True, "pcs_reference": "PCS-001"},
        headers=headers,
    )
    assert mn_update.status_code == 200

    leg = client.post(
        "/api/transport/legs",
        json={
            "trip_id": trip_id,
            "leg_number": 1,
            "status": "enroute",
            "origin_facility": "Facility A",
            "origin_address": "100 Care Rd",
            "destination_facility": "Facility B",
            "destination_address": "200 Recovery Blvd",
            "distance_miles": 12.3,
            "call_id": call_id,
            "dispatch_id": dispatch_id,
            "unit_id": unit_id,
        },
        headers=headers,
    )
    assert leg.status_code == 201

    completion = client.post(
        f"/api/transport/{trip_id}/complete",
        json={},
        headers=headers,
    )
    assert completion.status_code == 200
    events = _list_events(client, headers)
    assert _has_event(events, "transport.trip.created")
    assert _has_event(events, "transport.trip.completed")


def test_transport_trip_requires_master_link(client):
    headers = _register_user(client, "transport_admin2@example.com", "Transport Org")
    _create_dispatch(client, headers)

    patient = client.post(
        "/api/epcr/patients",
        json={
            "first_name": "Solo",
            "last_name": "Rider",
            "date_of_birth": "1985-11-11",
            "phone": "555-9876",
            "address": "10 Lone St",
            "incident_number": "TRANS-0002",
        },
        headers=headers,
    )
    assert patient.status_code == 201
    patient_id = patient.json()["id"]

    trip_response = client.post(
        "/api/transport",
        json={
            "origin_facility": "Test A",
            "origin_address": "Test",
            "destination_facility": "Test B",
            "destination_address": "Test",
            "epcr_patient_id": patient_id,
        },
        headers=headers,
    )
    assert trip_response.status_code == 422
    assert trip_response.json()["detail"] == "Master patient link required"
