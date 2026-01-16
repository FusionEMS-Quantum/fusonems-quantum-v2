def _auth_headers(client, role="admin"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@workflow.example.com",
            "full_name": "Workflow User",
            "password": "securepass",
            "role": role,
            "organization_name": "WorkflowOrg",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_workflow_lifecycle(client):
    headers = _auth_headers(client)
    payload = {
        "workflow_key": "hems_mission_acceptance",
        "resource_type": "hems_mission",
        "resource_id": "101",
        "status": "started",
        "last_step": "intake",
    }
    response = client.post("/api/workflows", json=payload, headers=headers)
    assert response.status_code == 201
    workflow_id = response.json()["id"]

    response = client.post(
        f"/api/workflows/{workflow_id}/status",
        json={"status": "interrupted", "last_step": "dispatch"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

    response = client.post(f"/api/workflows/{workflow_id}/resume", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
