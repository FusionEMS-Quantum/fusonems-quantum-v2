def _auth_headers(client, role="admin"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@example.com",
            "full_name": "HEMS User",
            "password": "securepass",
            "role": role,
            "organization_name": "HEMSOrg",
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
