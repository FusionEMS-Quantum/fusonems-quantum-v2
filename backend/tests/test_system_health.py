def _auth_headers(client, role="founder"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@health.example.com",
            "full_name": "Health User",
            "password": "securepass",
            "role": role,
            "organization_name": "HealthOrg",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_system_health_and_module_update(client):
    headers = _auth_headers(client)
    response = client.get("/api/system/health", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "online"

    modules_response = client.get("/api/system/modules", headers=headers)
    assert modules_response.status_code == 200
    modules = modules_response.json()
    assert modules

    module_key = modules[0]["module_key"]
    update_response = client.patch(
        f"/api/system/modules/{module_key}",
        json={"health_state": "DEGRADED"},
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "ok"
