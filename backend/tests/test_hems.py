from datetime import datetime, timedelta, timezone


def _auth_headers(client, role="admin", organization_name="HEMSOrg", email=None):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email or f"{role}@example.com",
            "full_name": "HEMS User",
            "password": "securepass",
            "role": role,
            "organization_name": organization_name,
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_hems_mission_lifecycle(client):
    admin_headers = _auth_headers(client, role="admin")
    pilot_headers = _auth_headers(client, role="pilot")

    mission_payload = {
        "mission_type": "scene",
        "requesting_party": "Ground EMS",
        "pickup_location": "LZ Alpha",
        "destination_location": "Trauma Center",
    }
    response = client.post("/api/hems/missions", json=mission_payload, headers=admin_headers)
    assert response.status_code == 201
    mission_id = response.json()["id"]

    response = client.post(
        f"/api/hems/missions/{mission_id}/status",
        json={"status": "lifted", "notes": "Lifted from base"},
        headers=pilot_headers,
    )
    assert response.status_code == 200

    risk_payload = {"weather_summary": "Clear", "risk_score": 0.1, "constraints": {"nvg": False}}
    response = client.post(
        f"/api/hems/missions/{mission_id}/risk", json=risk_payload, headers=pilot_headers
    )
    assert response.status_code == 201


def _create_shifted_crew(client, headers, hours_back=2):
    crew = client.post(
        "/api/hems/crew", json={"full_name": "Shift Pilot", "role": "Pilot"}, headers=headers
    ).json()
    shift_start = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).isoformat()
    client.patch(
        f"/api/hems/crew/{crew['id']}",
        json={"current_status": "Active", "duty_start": shift_start},
        headers=headers,
    )
    return crew


def _create_flight_request(client, headers, linked_cad_incident_id=None):
    payload = {
        "request_source": "hospital",
        "requesting_facility": "County Hospital",
        "sending_location": "Helipad 1",
        "receiving_facility": "Trauma Center",
        "priority": "High",
    }
    if linked_cad_incident_id:
        payload["linked_cad_incident_id"] = linked_cad_incident_id
    response = client.post("/api/hems/requests", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


def test_hems_duty_time_blocks_accept(client):
    headers = _auth_headers(client, role="hems_supervisor")
    crew = _create_shifted_crew(client, headers, hours_back=15)
    flight_request = _create_flight_request(client, headers)
    response = client.post(
        f"/api/hems/requests/{flight_request['id']}/accept",
        json={"crew_id": crew["id"]},
        headers=headers,
    )
    assert response.status_code == 409
    timeline = client.get(
        f"/api/hems/requests/{flight_request['id']}/timeline", headers=headers
    ).json()
    assert any(entry["event_type"] == "accept_refused" for entry in timeline)


def test_hems_cad_linkage_appends_timeline(client):
    headers = _auth_headers(client, role="hems_supervisor")
    cad_headers = headers
    cad_payload = {
        "requesting_facility": "A Hospital",
        "receiving_facility": "B Hospital",
        "transport_type": "CCT",
    }
    cad_response = client.post("/api/cad/incidents", json=cad_payload, headers=cad_headers)
    assert cad_response.status_code == 201
    cad_incident_id = cad_response.json()["id"]
    crew = _create_shifted_crew(client, headers, hours_back=1)
    flight_request = _create_flight_request(client, headers, linked_cad_incident_id=cad_incident_id)
    accept_response = client.post(
        f"/api/hems/requests/{flight_request['id']}/accept",
        json={"crew_id": crew["id"]},
        headers=headers,
    )
    assert accept_response.status_code == 200
    incident_payload = client.get(f"/api/cad/incidents/{cad_incident_id}", headers=cad_headers).json()
    assert any(entry["status"] == "hems.accepted" for entry in incident_payload["timeline_entries"])


def test_hems_weather_stub(client):
    headers = _auth_headers(client)
    response = client.get("/api/hems/weather?lat=40&lng=-73", headers=headers)
    assert response.status_code == 200
    data = response.json()
    for key in ("metar", "taf", "hazards", "tfrs", "generated_at"):
        assert key in data


def test_hems_flight_request_tenant_isolation(client):
    headers_one = _auth_headers(client, organization_name="FirstHEMS")
    headers_two = _auth_headers(client, role="hems_supervisor", organization_name="SecondHEMS", email="second@example.com")
    flight_request = _create_flight_request(client, headers_one)
    response = client.get(f"/api/hems/requests/{flight_request['id']}", headers=headers_two)
    assert response.status_code == 403
