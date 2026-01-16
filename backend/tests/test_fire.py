def _auth_headers(client, role="dispatcher"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@example.com",
            "full_name": "Fire User",
            "password": "securepass",
            "role": role,
            "organization_name": "TestOrg",
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
