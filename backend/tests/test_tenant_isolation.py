def _register(client, email, org_name, role="dispatcher"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": "Tenant User",
            "password": "securepass",
            "role": role,
            "organization_name": org_name,
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_cross_tenant_access_blocked_and_audited(client):
    org_a = _register(client, "a@example.com", "OrgA", role="provider")
    org_b = _register(client, "b@example.com", "OrgB", role="provider")

    payload = {
        "first_name": "Jamie",
        "last_name": "Lee",
        "date_of_birth": "1988-09-01",
        "incident_number": "INC-2222",
    }
    response = client.post("/api/epcr/patients", json=payload, headers=org_a)
    assert response.status_code == 201
    patient_id = response.json()["id"]

    response = client.get(f"/api/epcr/patients/{patient_id}", headers=org_b)
    assert response.status_code == 403

    response = client.get("/api/compliance/forensic", headers=org_b)
    assert response.status_code == 200
    assert response.json()
