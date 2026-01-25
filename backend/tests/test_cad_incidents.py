from core.database import SessionLocal

from models.cad import CrewLinkPage
from models.transportlink import TransportTrip


def _register_user(client, email="incident@example.com", role="dispatcher"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": "CAD Incident User",
            "password": "securepass",
            "role": role,
            "organization_name": "IncidentOrg",
        },
    )
    data = response.json()
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}, data["user"]["id"]


def _create_transport_trip(client, headers):
    payload = {
        "transport_type": "ift",
        "origin_facility": "Facility A",
        "origin_address": "123 Origin Way",
        "destination_facility": "Facility B",
        "destination_address": "456 Destination Ave",
    }
    response = client.post("/api/transport", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()["id"]


def _create_unit(client, headers, identifier="CAD-1", unit_type="BLS"):
    response = client.post(
        "/api/cad/units",
        json={"unit_identifier": identifier, "unit_type": unit_type, "latitude": 40.0, "longitude": -75.0},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_incident_assignment_flow(client):
    headers, _ = _register_user(client)

    trip_id = _create_transport_trip(client, headers)
    unit_id = _create_unit(client, headers, identifier="CAD-BLSE")

    incident_payload = {
        "requesting_facility": "Hospital Alpha",
        "receiving_facility": "Hospital Beta",
        "transport_type": "IFT",
        "transport_link_trip_id": trip_id,
        "distance_meters": 12000,
    }
    incident_response = client.post("/api/cad/incidents", json=incident_payload, headers=headers)
    assert incident_response.status_code == 201
    incident_id = incident_response.json()["id"]

    assign_response = client.patch(
        f"/api/cad/incidents/{incident_id}/assign",
        json={"unit_id": unit_id},
        headers=headers,
    )
    assert assign_response.status_code == 200
    payload = assign_response.json()
    assert payload["assigned_unit_id"] == unit_id
    assert payload["status"] == "assigned"
    assert any(entry["status"] == "assigned" for entry in payload["timeline_entries"])
    assert payload["crewlink_messages"]

    session = SessionLocal()
    try:
        trip = session.query(TransportTrip).filter(TransportTrip.id == trip_id).first()
        assert trip is not None
        assert trip.unit_id == unit_id
        assert trip.status == "dispatched"
        crew_pages = session.query(CrewLinkPage).filter(CrewLinkPage.cad_incident_id == incident_id).all()
        assert crew_pages
    finally:
        session.close()


def test_incompatible_unit_assignment(client):
    headers, _ = _register_user(client, email="cct@example.com")

    trip_id = _create_transport_trip(client, headers)
    unit_id = _create_unit(client, headers, identifier="CCT-1", unit_type="CCT")

    incident_payload = {
        "requesting_facility": "Hospital East",
        "receiving_facility": "Hospital West",
        "transport_type": "NEMT",
        "transport_link_trip_id": trip_id,
    }
    incident_response = client.post("/api/cad/incidents", json=incident_payload, headers=headers)
    assert incident_response.status_code == 201
    incident_id = incident_response.json()["id"]

    assign_response = client.patch(
        f"/api/cad/incidents/{incident_id}/assign",
        json={"unit_id": unit_id},
        headers=headers,
    )
    assert assign_response.status_code == 422
    assert "Unit type CCT cannot serve transport type NEMT" in assign_response.json()["detail"]
