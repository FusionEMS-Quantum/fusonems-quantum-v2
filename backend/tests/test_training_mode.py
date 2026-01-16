def _auth_headers(client, role="admin"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@example.com",
            "full_name": "Training Admin",
            "password": "securepass",
            "role": role,
            "organization_name": "TrainingOrg",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_training_mode_toggle_and_seed(client):
    headers = _auth_headers(client, role="admin")
    response = client.post("/api/training/org", json={"enabled": True}, headers=headers)
    assert response.status_code == 200
    assert response.json()["training_mode"] == "ENABLED"

    response = client.post("/api/training/seed", headers=headers)
    assert response.status_code == 201
