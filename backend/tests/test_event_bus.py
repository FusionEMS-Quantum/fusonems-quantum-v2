def _auth_headers(client, role="dispatcher"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@example.com",
            "full_name": "Event User",
            "password": "securepass",
            "role": role,
            "organization_name": "EventOrg",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_event_publish_and_replay(client):
    headers = _auth_headers(client, role="dispatcher")
    payload = {"event_type": "RUN_CREATED", "payload": {"call_id": 1001}}
    response = client.post("/api/events", json=payload, headers=headers)
    assert response.status_code == 201

    admin_headers = _auth_headers(client, role="admin")
    response = client.post("/api/events/replay", json={}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["count"] >= 1
