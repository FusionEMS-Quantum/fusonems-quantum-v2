# Phase 1 Billing Runbook

## Backend build & migration

- `docker compose build` (from repo root) to ensure every service is rebuilt with the latest Python/Node changes.
- `docker compose up -d` to launch all platform services; check `docker compose logs backend` for health.
- Inside the backend container (or locally): `./backend/venv/bin/python -m alembic upgrade head` to apply the latest migrations, including the Office Ally snapshot schema updates.

## Feature toggles

- **Office Ally sync**  
  Set `OFFICEALLY_ENABLED=true` plus `OFFICEALLY_FTP_HOST`, `OFFICEALLY_FTP_USER`, `OFFICEALLY_FTP_PASSWORD`, and (optionally) `OFFICEALLY_SFTP_DIRECTORY` before triggering `/api/billing/office-ally/sync`. When the toggle is `false` (default) all Office Ally routes return HTTP 412.
- **Telnyx provisioning**  
  The Telnyx integration is gated by `TELNYX_ENABLED` (default `false`); enable only after configuring `TELNYX_API_KEY`, `TELNYX_FROM_NUMBER`/`TELNYX_NUMBER`, and any required webhook keys. Webhooks should remain publicly accessible while the toggle is `true`.
- **Ollama AI**  
  When Ollama is running locally, set `OLLAMA_ENABLED=true` along with `OLLAMA_SERVER_URL` (default `http://127.0.0.1:11434`). The billing AI assistant and Telnyx IVR features will read from this host to route prompts to the self-hosted models.
- **Facesheet retrieval**  
  Trigger `/api/billing/facesheet/request` whenever required demographics are missing; check `/api/billing/facesheet/status/{patient_id}` and `/api/telnyx/call-history` to monitor progress. Fax webhooks land on `/api/telnyx/fax-received` (signature-protected) and automatically notify billing users.
- **Prior authorization**  
  Use `/api/billing/prior-auth/request` to log submitted auths, `/api/billing/prior-auth/status/{patient_id}` to inspect outstanding requests, and `/api/billing/prior-auth/{auth_id}` (DELETE) to mark them as expired/used. Records are audited via `billing.prior_auth.*` events.

## Verification

- Use the new `/api/billing/office-ally/*` endpoints to trigger manual syncs, check eligibility, and post remittances. The new snapshots are stored on `billing_claim_export_snapshots` for auditing.
- Observe `/api/events` or the audit log to confirm `billing.office_ally.*` events and writes are emitted during Office Ally operations.
