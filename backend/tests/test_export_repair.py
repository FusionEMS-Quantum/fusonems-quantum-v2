def _auth_headers(client, role="admin"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@example.com",
            "full_name": "Export User",
            "password": "securepass",
            "role": role,
            "organization_name": "ExportOrg",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_export_full(client):
    headers = _auth_headers(client, role="admin")
    response = client.post("/api/export/full", headers=headers)
    assert response.status_code == 201
    assert response.json()["export_hash"]


def test_repair_scan(client):
    headers = _auth_headers(client, role="admin")
    response = client.get("/api/repair/scan", headers=headers)
    assert response.status_code == 200
