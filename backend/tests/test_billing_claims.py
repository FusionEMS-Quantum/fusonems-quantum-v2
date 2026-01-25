from .utils import create_test_user


def _register_user(client, email, role="billing", organization_name="BillingOrg"):
    headers, _, _ = create_test_user(email=email, org_name=organization_name, role=role)
    return headers


def _create_patient_record(client, headers, **overrides):
    payload = {
        "first_name": "Jamie",
        "last_name": "Lane",
        "date_of_birth": "1988-06-15",
        "incident_number": "INC-9999",
        "vitals": {"hr": 88},
        "narrative": overrides.pop("narrative", "Patient stable"),
    }
    payload.update(overrides)
    response = client.post("/api/epcr/patients", json=payload, headers=headers)
    return response.json()["id"]


def _lock_chart(client, headers, patient_id):
    response = client.post(f"/api/epcr/patients/{patient_id}/lock", headers=headers)
    assert response.status_code == 200


def _seed_qa_review(client, patient_id, organization_name="BillingOrg"):
    md_headers = _register_user(
        client, "md@example.com", role="medical_director", organization_name=organization_name
    )
    case_resp = client.post(
        "/api/qa/cases",
        json={"linked_patient_id": patient_id},
        headers=md_headers,
    )
    case_id = case_resp.json()["id"]
    client.post(
        "/api/qa/reviews",
        json={"case_id": case_id, "scores": {"completeness": 95}},
        headers=md_headers,
    )


def _create_validation_issue(client, headers, patient_id):
    response = client.post(
        "/api/validation/scan",
        json={
            "entity_type": "epcr_patient",
            "entity_id": str(patient_id),
            "patient_name": "Jamie Lane",
        },
        headers=headers,
    )
    assert response.status_code == 201


def test_ready_check_requires_locked_chart(client):
    headers = _register_user(client, "bill-ready@example.com")
    patient_id = _create_patient_record(client, headers, narrative="Stable transport.")
    response = client.get(
        "/api/billing/claims/ready_check",
        params={"epcr_patient_id": patient_id},
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert not payload["pass"]
    assert any(reason["code"] == "chart_unlocked" for reason in payload["reasons"])


def test_ready_check_blocks_validation_issues(client):
    headers = _register_user(client, "bill-validate@example.com")
    patient_id = _create_patient_record(client, headers, narrative="Focused narrative.")
    _lock_chart(client, headers, patient_id)
    _create_validation_issue(client, headers, patient_id)
    response = client.get(
        "/api/billing/claims/ready_check",
        params={"epcr_patient_id": patient_id},
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert not payload["pass"]
    assert any(reason["code"] == "validation_block" for reason in payload["reasons"])


def test_ready_check_requires_qa_and_narrative(client):
    headers = _register_user(client, "bill-qa@example.com")
    patient_id = _create_patient_record(client, headers, narrative="")
    _lock_chart(client, headers, patient_id)
    response = client.get(
        "/api/billing/claims/ready_check",
        params={"epcr_patient_id": patient_id},
        headers=headers,
    )
    payload = response.json()
    assert not payload["pass"]
    assert any(reason["code"] == "medical_narrative_missing" for reason in payload["reasons"])
    assert any(reason["code"] == "qa_low_score" for reason in payload["reasons"])


def test_export_blocked_when_chart_not_ready(client):
    headers = _register_user(client, "bill-export@example.com")
    patient_id = _create_patient_record(client, headers, narrative="Detailed summary.")
    claim_resp = client.post(
        "/api/billing/claims",
        json={
            "epcr_patient_id": patient_id,
            "payer_name": "Medicare",
            "total_charge_cents": 12000,
        },
        headers=headers,
    )
    claim_id = claim_resp.json()["id"]
    response = client.get(
        f"/api/billing/claims/{claim_id}/export/office_ally",
        headers=headers,
    )
    assert response.status_code == 409


def test_export_success_with_ready_chart(client):
    headers = _register_user(client, "bill-ready-export@example.com")
    patient_id = _create_patient_record(client, headers, narrative="Transport documentation.")
    _lock_chart(client, headers, patient_id)
    _seed_qa_review(client, patient_id)
    claim_resp = client.post(
        "/api/billing/claims",
        json={
            "epcr_patient_id": patient_id,
            "payer_name": "Medicare",
            "total_charge_cents": 15000,
        },
        headers=headers,
    )
    claim_id = claim_resp.json()["id"]
    response = client.get(
        f"/api/billing/claims/{claim_id}/export/office_ally",
        headers=headers,
    )
    assert response.status_code == 200
    export = response.json()["export"]
    assert export["demographics"]["first_name"] == "Jamie"
    assert export["coding"]["icd10"]["primary_icd10"]["code"]


def test_status_updates_emit_events(client):
    headers = _register_user(client, "bill-status@example.com")
    patient_id = _create_patient_record(client, headers, narrative="Narrative present.")
    _lock_chart(client, headers, patient_id)
    _seed_qa_review(client, patient_id)
    claim_id = client.post(
        "/api/billing/claims",
        json={
            "epcr_patient_id": patient_id,
            "payer_name": "Medicare",
            "total_charge_cents": 11000,
        },
        headers=headers,
    ).json()["id"]
    response = client.post(
        f"/api/billing/claims/{claim_id}/status",
        json={"status": "submitted"},
        headers=headers,
    )
    assert response.status_code == 200
    events = client.get("/api/events", headers=headers).json()
    assert any(event["event_type"] == "billing.submitted" for event in events)


def test_assist_endpoint_and_refresh(client):
    headers = _register_user(client, "bill-assist@example.com")
    patient_id = _create_patient_record(client, headers, narrative="Assist narrative.")
    response = client.get(
        f"/api/billing/assist/{patient_id}",
        headers=headers,
    )
    snapshot = response.json()["snapshot"]
    assert "coding_suggestions" in snapshot
    refresh_resp = client.get(
        f"/api/billing/assist/{patient_id}",
        params={"refresh": True},
        headers=headers,
    )
    assert refresh_resp.json()["snapshot"]["generated_at"] != snapshot["generated_at"]
