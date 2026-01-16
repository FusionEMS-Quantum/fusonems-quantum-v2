def _auth_headers(client, role="dispatcher"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@example.com",
            "full_name": "AI User",
            "password": "securepass",
            "role": role,
            "organization_name": "AIOrg",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_ai_registry_create_and_replay(client):
    headers = _auth_headers(client, role="dispatcher")
    payload = {
        "model_name": "quantum-ai",
        "model_version": "v1",
        "prompt": "test prompt",
        "output_text": "AI advisory output",
        "advisory_level": "ADVISORY",
        "classification": "OPS",
        "input_refs": [{"resource": "test", "id": "1"}],
        "config_snapshot": {"temperature": 0},
    }
    response = client.post("/api/ai-registry", json=payload, headers=headers)
    assert response.status_code == 201
    output_id = response.json()["id"]

    response = client.get(f"/api/ai-registry/{output_id}/replay", headers=headers)
    assert response.status_code == 200
    assert response.json()["output_id"] == output_id
