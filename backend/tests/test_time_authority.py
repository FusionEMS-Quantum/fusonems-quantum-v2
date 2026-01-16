def _auth_headers(client, role="dispatcher"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@example.com",
            "full_name": "Time User",
            "password": "securepass",
            "role": role,
            "organization_name": "TimeOrg",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_time_endpoint(client):
    headers = _auth_headers(client)
    response = client.get("/api/time", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["server_time"]
