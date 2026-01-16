def _auth_headers(client, role="provider"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@consent.example.com",
            "full_name": "Consent User",
            "password": "securepass",
            "role": role,
            "organization_name": "ConsentOrg",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_consent_provenance_create_and_list(client):
    headers = _auth_headers(client)
    payload = {
        "subject_type": "telehealth_session",
        "subject_id": "session-123",
        "policy_hash": "policy-v1",
        "context": "telehealth_intake",
        "metadata": {"accepted": True},
    }
    response = client.post("/api/consent", json=payload, headers=headers)
    assert response.status_code == 201

    response = client.get(
        "/api/consent?subject_type=telehealth_session&subject_id=session-123",
        headers=headers,
    )
    assert response.status_code == 200
    records = response.json()
    assert records
