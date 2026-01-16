def _auth_headers(client, role="provider"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"{role}@example.com",
            "full_name": "Legal User",
            "password": "securepass",
            "role": role,
            "organization_name": "LegalOrg",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_legal_hold_blocks_update_and_allows_addendum(client):
    provider_headers = _auth_headers(client, role="provider")
    admin_headers = _auth_headers(client, role="admin")

    response = client.post(
        "/api/epcr/patients",
        json={
            "first_name": "Ava",
            "last_name": "Stone",
            "date_of_birth": "1992-02-02",
            "incident_number": "INC-5000",
        },
        headers=provider_headers,
    )
    assert response.status_code == 201
    patient_id = response.json()["id"]

    response = client.post(
        "/api/legal-hold",
        json={"scope_type": "epcr_patient", "scope_id": str(patient_id), "reason": "QA review"},
        headers=admin_headers,
    )
    assert response.status_code == 201

    response = client.post(
        f"/api/epcr/patients/{patient_id}/lock", headers=provider_headers
    )
    assert response.status_code == 423

    response = client.post(
        "/api/legal-hold/addenda",
        json={
            "resource_type": "epcr_patient",
            "resource_id": str(patient_id),
            "note": "Addendum note",
        },
        headers=provider_headers,
    )
    assert response.status_code == 201
