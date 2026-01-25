# AUDIT REPORT

## Executive Summary
- The backend already wires every declared router, MQ model, and service (ePCR, MDT, CAD, Fire, HEMS, Billing, Telnyx, CareFusion, Founder/Ops, Support, Notifications) along with an extensive pytest suite, so the data model and APIs exist for every batch requirement.
- Stabilization and UI polish still lag: ports, Dockerfiles, env defaults, and the /healthz probe are wired, but Alembic is not run in Docker and the Next.js pages for ePCR/MDT/CAD/Fire/HEMS remain read-only placeholders with TODOs.

## Repo Inventory

### Backend tree (depth 3)
```
backend
  .env
  .env.example
  Dockerfile
  alembic.ini
  main.py
  requirements.txt
  setup_backend.sh
  start_dev.sh
  core/
    __init__.py
    config.py
    database.py
    guards.py
    logger.py
    modules.py
    security.py
    upgrade.py
  db/
    __init__.py
    models.py
  alembic/
    README
    env.py
    script.py.mako
    versions/
      3d4c5f6a7b8c_fire_neris.py
      4b9f1c2d3e4f_hems_flights.py
      8eca4622d09e_mdt_tables.py
      a1b2c3d4e5f6_carefusion_telehealth.py
      bd39170c3e32_initial.py
      c7a73b1050f9_billing_telnyx_support.py
      f3c2d1b4a6be_cad_incidents.py
      support_sessions_0001.py
      transportlink_0001.py
  models/
    __init__.py
    ai_console.py
    ai_registry.py
    analytics.py
    automation.py
    billing.py
    billing_accounts.py
    billing_claims.py
    billing_exports.py
    builders.py
    business_ops.py
    cad.py
    communications.py
    compliance.py
    consent.py
    device_trust.py
    documents.py
    email.py
    epcr.py
    event.py
    exports.py
    feature_flags.py
    fire.py
    fleet.py
    founder.py
    founder_ops.py
    hems.py
    inventory.py
    investor_demo.py
    jobs.py
    legal.py
    legal_portal.py
    mail.py
    mdt.py
    medication.py
    module_registry.py
    narcotics.py
    notifications.py
    organization.py
    patient_portal.py
    qa.py
    quantum_documents.py
    scheduling.py
    search.py
    support.py
    telehealth.py
    time.py
    training_center.py
    transportlink.py
    user.py
    validation.py
    workflow.py
  scripts/
    stripe_setup.py
  utils/
    ai_orchestrator.py
    ai_registry.py
    audit.py
    classification.py
    decision.py
    events.py
    helpers.py
    legal.py
    logger.py
    rate_limit.py
    retention.py
    storage.py
    tenancy.py
    time.py
    workflows.py
    write_ops.py
  .pytest_cache/
    .gitignore
    CACHEDIR.TAG
    README.md
    v/
      cache/
        lastfailed
        nodeids
  services/
    lob_webhook.py
    legal_portal/
      legal_portal_router.py
    auth/
      auth_router.py
      device_router.py
      oidc_router.py
    email/
      email_ingest_service.py
      email_router.py
      email_transport_service.py
    patient_portal/
      patient_portal_router.py
    fire/
      fire_router.py
    legal/
      legal_router.py
    documents/
      document_router.py
      quantum_documents_router.py
    fleet/
      fleet_router.py
    founder/
      founder_router.py
    training/
      training_center_router.py
      training_router.py
    hems/
      hems_router.py
    system/
      system_router.py
    compliance/
      compliance_router.py
    business_ops/
      business_ops_router.py
    inventory/
      inventory_router.py
    telehealth/
      telehealth_router.py
    export/
      carefusion_router.py
      export_router.py
    ai/
      __init__.py
      self_hosted_ai.py
    validation/
      validation_router.py
    feature_flags/
      feature_flags_router.py
    time/
      time_router.py
    cad/
      cad_router.py
      helpers.py
      incident_router.py
      tracking_router.py
    mail/
      mail_router.py
    notifications/
      __init__.py
      handlers.py
      notification_dispatcher.py
      notification_router.py
      notification_service.py
    analytics/
      analytics_router.py
    schedule/
      schedule_router.py
    epcr/
      epcr_router.py
      equipment_screen_ocr.py
      master_patient_router.py
      narrative_generator.py
      nemsis_mapper.py
      ocr_router.py
    investor_demo/
      investor_demo_router.py
    search/
      search_router.py
    communications/
      comms_router.py
    jobs/
      jobs_router.py
    consent/
      consent_router.py
    events/
      event_handlers.py
      event_router.py
    ai_console/
      ai_console_router.py
    medication/
      medication_router.py
    workflows/
      workflow_router.py
    builders/
      builder_router.py
    ai_registry/
      ai_registry_router.py
    automation/
      automation_router.py
    support/
      support_router.py
    transportlink/
      __init__.py
      transport_router.py
    narcotics/
      narcotics_router.py
    telnyx/
      __init__.py
      assistant.py
      telnyx_router.py
    mdt/
      __init__.py
      mdt_router.py
    founder_ops/
      founder_ops_router.py
    repair/
      repair_router.py
    billing/
      assist_service.py
      billing_router.py
      claims_router.py
      stripe_router.py
      stripe_service.py
    qa/
      qa_router.py
  venv/
    pyvenv.cfg
    lib/
      python3.12/
    bin/
      Activate.ps1
      alembic
      dotenv
      email_validator
      fastapi
      httpx
      mako-render
      normalizer
      pip
      pip3
      pip3.12
      py.test
      pygmentize
      pyrsa-decrypt
      pyrsa-encrypt
      pyrsa-keygen
      pyrsa-priv2pub
      pyrsa-sign
      pyrsa-verify
      pytest
      python
      python3
      python3.12
      uvicorn
      watchfiles
      websockets
      wheel
    include/
      python3.12/
      site/
  tests/
    __init__.py
    conftest.py
    test_ai_registry.py
    test_auth.py
    test_automation.py
    test_batch10_core.py
    test_batch11_legal.py
    test_batch12_tracking.py
    test_batch2_modules.py
    test_batch5_modules.py
    test_batch6_modules.py
    test_batch7_modules.py
    test_batch8_health.py
    test_batch9_ops.py
    test_billing_claims.py
    test_billing_exports.py
    test_cad.py
    test_cad_incidents.py
    test_carefusion_export.py
    test_compliance.py
    test_consent.py
    test_email_postmark.py
    test_epcr.py
    test_epcr_master_patient.py
    test_epcr_nemsis.py
    test_event_bus.py
    test_export_repair.py
    test_fire.py
    test_foundations.py
    test_founder_console.py
    test_hems.py
    test_legal_hold.py
    test_mdt.py
    test_notifications.py
    test_oidc.py
    test_quantum_documents.py
    test_quantum_voice.py
    test_smart_mode.py
    test_stripe_webhook_processing.py
    test_support_sessions.py
    test_system_health.py
    test_telehealth.py
    test_telnyx_support.py
    test_telnyx_webhook.py
    test_tenant_isolation.py
    test_tenant_isolation_modules.py
    test_time_authority.py
    test_training_mode.py
    test_transportlink.py
    test_validation.py
    test_workflows.py
    utils.py
```

### Src tree (depth 3)
```
src
  app/
    favicon.ico
    globals.css
    layout.tsx
    page.tsx
    fire/
      page.tsx
      [id]/
        page.tsx
    register/
      page.tsx
    founder/
      page.tsx
      [id]/
        page.tsx
      orgs/
    login/
      page.tsx
    api/
      comms/
    ops/
      support/
        page.tsx
    coming-soon/
      page.tsx
    dashboard/
      page.tsx
    hems/
      page.tsx
      [id]/
        page.tsx
    cad/
      page.tsx
      [id]/
        page.tsx
    epcr/
      page.tsx
      [id]/
        page.tsx
    support/
      consent/
    billing/
      page.tsx
      [id]/
        page.tsx
  lib/
    access.ts
    api.ts
    auth-context.tsx
    errorBus.ts
    protected-route.tsx
    core/
      audit.ts
      commsStore.ts
  components/
    AdvisoryPanel.jsx
    ChartPanel.jsx
    DataTable.jsx
    ErrorBanner.jsx
    Layout.jsx
    LegalHoldBanner.jsx
    ProtectedRoute.jsx
    SectionHeader.jsx
    Sidebar.jsx
    StatCard.jsx
    StatusBadge.jsx
    TopBar.jsx
    layout/
      PlatformPage.tsx
      Sidebar.tsx
      Topbar.tsx
    comms/
      CommsSubNav.tsx
  services/
    email/
      postmark.ts
      __tests__/
        postmark.test.ts
    comms/
      CommsError.ts
      telnyx.ts
      __tests__/
        telnyx.test.ts
```

### Routers mounted in `backend/main.py`
| Router | Prefix | File |
| --- | --- | --- |
| router | /api/ai_console | backend/services/ai_console/ai_console_router.py |
| router | /api/ai-registry | backend/services/ai_registry/ai_registry_router.py |
| router | /api/analytics | backend/services/analytics/analytics_router.py |
| router | /api/auth | backend/services/auth/auth_router.py |
| router | /api/auth/devices | backend/services/auth/device_router.py |
| router | /api/auth/oidc | backend/services/auth/oidc_router.py |
| router | /api/automation | backend/services/automation/automation_router.py |
| router | /api/billing | backend/services/billing/billing_router.py |
| claims_router | /api/billing/claims | backend/services/billing/claims_router.py |
| assist_router | /api/billing/assist | backend/services/billing/claims_router.py |
| router | /api/billing/stripe | backend/services/billing/stripe_router.py |
| router | /api/builders | backend/services/builders/builder_router.py |
| router | /api/business-ops | backend/services/business_ops/business_ops_router.py |
| router | /api/cad | backend/services/cad/cad_router.py |
| router | /api/cad/incidents | backend/services/cad/incident_router.py |
| router | /api/cad | backend/services/cad/tracking_router.py |
| router | /api/comms | backend/services/communications/comms_router.py |
| webhook_router | /api/comms/webhooks | backend/services/communications/comms_router.py |
| router | /api/compliance | backend/services/compliance/compliance_router.py |
| router | /api/consent | backend/services/consent/consent_router.py |
| router | /api/documents | backend/services/documents/document_router.py |
| router | /api/documents | backend/services/documents/quantum_documents_router.py |
| router | /api/email | backend/services/email/email_router.py |
| router | /api/epcr | backend/services/epcr/epcr_router.py |
| router | /api | backend/services/epcr/master_patient_router.py |
| router | /api/ocr | backend/services/epcr/ocr_router.py |
| router | /api/events | backend/services/events/event_router.py |
| router | /api/exports | backend/services/export/carefusion_router.py |
| router | /api/export | backend/services/export/export_router.py |
| router | /api/feature-flags | backend/services/feature_flags/feature_flags_router.py |
| router | /api/fire | backend/services/fire/fire_router.py |
| router | /api/fleet | backend/services/fleet/fleet_router.py |
| router | /api/founder | backend/services/founder/founder_router.py |
| router | /api/founder-ops | backend/services/founder_ops/founder_ops_router.py |
| router | /api/hems | backend/services/hems/hems_router.py |
| router | /api/inventory | backend/services/inventory/inventory_router.py |
| router | /api/investor_demo | backend/services/investor_demo/investor_demo_router.py |
| router | /api/jobs | backend/services/jobs/jobs_router.py |
| router | /api/legal-hold | backend/services/legal/legal_router.py |
| router | /api/legal-portal | backend/services/legal_portal/legal_portal_router.py |
| router | /api/lob | backend/services/lob_webhook.py |
| router | /api/mail | backend/services/mail/mail_router.py |
| router | /api/mdt | backend/services/mdt/mdt_router.py |
| router | /api/medication | backend/services/medication/medication_router.py |
| router | /api/narcotics | backend/services/narcotics/narcotics_router.py |
| router | /api/notifications | backend/services/notifications/notification_router.py |
| router | /api/patient-portal | backend/services/patient_portal/patient_portal_router.py |
| router | /api/qa | backend/services/qa/qa_router.py |
| router | /api/repair | backend/services/repair/repair_router.py |
| router | /api/schedule | backend/services/schedule/schedule_router.py |
| router | /api/search | backend/services/search/search_router.py |
| router | /api/support | backend/services/support/support_router.py |
| router | /api/system | backend/services/system/system_router.py |
| router | /api/telehealth | backend/services/telehealth/telehealth_router.py |
| router | /api/telnyx | backend/services/telnyx/telnyx_router.py |
| router | /api/time | backend/services/time/time_router.py |
| router | /api/training | backend/services/training/training_router.py |
| router | /api/training-center | backend/services/training/training_center_router.py |
| router | /api/transport | backend/services/transportlink/transport_router.py |
| router | /api/validation | backend/services/validation/validation_router.py |
| router | /api/workflows | backend/services/workflows/workflow_router.py |

### SQLAlchemy models & tables
`Base`, `FireBase`, `TelehealthBase`, and `HemsBase` gather all tables registered in `backend/models/__init__.py`. The tables exposed via that module are `AiInsight`, `AiOutputRegistry`, `WorkflowRule`, `WorkflowTask`, `BillingRecord`, `BillingCustomer`, `BillingInvoice`, `BillingInvoiceLine`, `BillingPayment`, `BillingLedgerEntry`, `BillingWebhookReceipt`, `ClaimSubmission`, `RemittanceAdvice`, `ClearinghouseAck`, `EligibilityCheck`, `ClaimStatusInquiry`, `PatientStatement`, `PaymentPosting`, `AppealPacket`, `BillingClaim`, `BillingAssistResult`, `BillingClaimExportSnapshot`, `BuilderRegistry`, `BuilderChangeLog`, `BusinessOpsTask`, `ConsentProvenance`, `Call`, `Dispatch`, `Unit`, `CADIncident`, `CADIncidentTimeline`, `CrewLinkPage`, `MdtEvent`, `MdtObdIngest`, `MdtCadSyncEvent`, `AccessAudit`, `ForensicAuditLog`, `ComplianceAlert`, `CommsThread`, `CommsMessage`, `CommsCallLog`, `CommsCallEvent`, `CommsPhoneNumber`, `CommsRoutingPolicy`, `CommsRingGroup`, `CommsRecording`, `CommsVoicemail`, `CommsTranscript`, `CommsBroadcast`, `CommsTask`, `EmailThread`, `EmailMessage`, `EmailLabel`, `EmailMessageLabel`, `EmailAttachmentLink`, `DocumentTemplate`, `DocumentRecord`, `DocumentFolder`, `DocumentFile`, `DocumentVersion`, `DocumentPermission`, `RetentionPolicy`, `DiscoveryExport`, `FeatureFlag`, `JobQueue`, `JobRun`, `EventLog`, `ModuleRegistry`, `TransportLeg`, `TransportTrip`, `DeviceClockDrift`, `DeviceTrust`, `LegalHold`, `Addendum`, `OverrideRequest`, `QARubric`, `QACase`, `QAReview`, `QARemediation`, `HemsMission`, `HemsMissionTimeline`, `HemsFlightRequest`, `HemsFlightRequestTimeline`, `HemsAircraft`, `HemsCrew`, `HemsAssignment`, `HemsRiskAssessment`, `HemsChart`, `HemsHandoff`, `HemsBillingPacket`, `HemsIncidentLink`, `HemsQualityReview`, `NarcoticItem`, `NarcoticCustodyEvent`, `NarcoticDiscrepancy`, `MedicationMaster`, `MedicationAdministration`, `MedicationFormularyVersion`, `InventoryItem`, `InventoryMovement`, `InventoryRigCheck`, `FleetVehicle`, `FleetMaintenance`, `FleetInspection`, `FleetTelemetry`, `PwaDistribution`, `PricingPlan`, `IncidentCommand`, `DataGovernanceRule`, `DataExportManifest`, `OrphanRepairAction`, `CarefusionExportSnapshot`, `Patient`, `MasterPatient`, `MasterPatientLink`, `MasterPatientMerge`, `FounderMetric`, `InvestorMetric`, `AnalyticsMetric`, `UsageEvent`, `WorkflowState`, `Message`, `Shift`, `SearchIndexEntry`, `SavedSearch`, `TrainingCourse`, `TrainingEnrollment`, `CredentialRecord`, `SkillCheckoff`, `CERecord`, `TelehealthMessage`, `TelehealthParticipant`, `TelehealthSession`, `User`, `UserRole`, `Organization`, `DataValidationIssue`, `ValidationRule`, `FireIncident`, `FireApparatus`, `FireApparatusInventory`, `FirePersonnel`, `FireIncidentApparatus`, `FireIncidentPersonnel`, `FireTrainingRecord`, `FirePreventionRecord`, `FireAuditLog`, `FireExportRecord`, `FireIncidentTimeline`, `FireInventoryHook`, `LegalCase`, `LegalEvidence`, `PatientPortalAccount`, `PatientPortalMessage`, `SupportInteraction`, `SupportMirrorEvent`, `SupportSession`, `InAppNotification`, and `NotificationPreference`.

### Alembic migrations
- `backend/alembic/versions` contains the historical heads `f3c2d1b4a6be` (CAD incidents), `4b9f1c2d3e4f` (HEMS flights), `a1b2c3d4e5f6` (CareFusion telehealth), `c7a73b1050f9` (Billing/Telnyx/Support), and `support_sessions_0001`. The earlier revisions (`bd39170c3e32`, `3d4c5f6a7b8c`, `transportlink_0001`, `8eca4622d09e`) branch from these heads.
- Both root `alembic.ini` and `backend/alembic.ini` exist; `env.py` honors `DATABASE_URL` and imports `core.database.Base` plus all models to keep metadata complete.
- Docker images (see `backend/Dockerfile`) never run `alembic upgrade head`; schema bootstrapping happens via `Base.metadata.create_all` inside `backend/main.py`, so manual migrations must be invoked when schema drift occurs.

## Batch A – Stabilization
| Item | Status | Evidence | Tests | Known breakpoints |
| --- | --- | --- | --- | --- |
| docker-compose ports alignment (backend host/internal, frontend API base) | ✅ | `docker-compose.yml` (backend ports `8000:8000`, frontend ports `5173:3000`, `NEXT_PUBLIC_API_URL=http://backend:8000`). | none | None beyond needing matching host port mapping. |
| Dockerfile & Dockerfile.frontend correctness | ✅ | `backend/Dockerfile` (installs `requirements.txt`, copies code, exposes 8000, runs `uvicorn main:app`) and `Dockerfile.frontend` (multi-stage build + `npm run build`, exposes 3000). | none | Backend image does not run `alembic upgrade head`; only `Base.metadata.create_all` executes on startup. |
| `.env` presence/examples & defaults | ✅ | `backend/.env` plus `.env.example` seed values (DB URL, JWT keys, Telnyx/Postmark defaults, storage keys). | none | Defaults (`change-me`) are insecure in prod; validation fires only when `ENV=production`. |
| `/healthz` route visibility | ✅ | `backend/main.py` defines `@app.get("/healthz")` returning status and logs; reachable on backend port 8000. | none | None. |
| Alembic workflow (upgrade head vs stamp, duplicate tables) | 🟡 | `backend/alembic/env.py` uses metadata compare + context, heads listed above, but `backend/main.py` relies on `Base.metadata.create_all` and migrations are not invoked in Docker. | none | Schema drift requires manual `alembic` runs. |

## Batch 1 – Intelligent ePCR Core
| Item | Status | Evidence | Tests | Known breakpoints |
| --- | --- | --- | --- | --- |
| MPI (master_patients, linking, merge, tenant isolation) | ✅ | `backend/services/epcr/master_patient_router.py` (`/master_patients`, `/merge`, scoping via `get_scoped_record`) plus `backend/models/epcr.py` (MasterPatient/Link/Merge tables). | `backend/tests/test_epcr_master_patient.py` | None; `get_scoped_record` enforces org isolation. |
| Coding tables (RxNorm/SNOMED/ICD suggestions, overrides, audits) | 🟡 | `backend/services/billing/assist_service.py` generates ICD-10 suggestions, medical necessity hints, denial flags, and `billing/claims_router.py` audits updates. | `backend/tests/test_billing_claims.py` (assist endpoint coverage) | SNOMED/RxNorm tables not present yet, so suggestions are limited to ICD heuristics. |
| NEMSIS validation engine (rules, stored results, lock gate) | 🟡 | `backend/services/epcr/epcr_router.py` (`/nemsis/validate`, conditional requirements for narrative/labs when chart locked or CCT), `NEMSISMapper` builds reports. | `backend/tests/test_epcr_nemsis.py` | `NEMSISValidationResult` model is declared but never populated, so structured results are not persisted for later queries. |
| OCR evidence (raw docs persistence, per-field confidence, evidence links, override history) | ✅ | `backend/services/epcr/ocr_router.py` stores `ocr_snapshots` with timestamps/confidence, `NEMSISMapper` tracks confidence/flags, `support_router.ocr_summary` surfaces evidence hashes and forensic overrides. | `backend/tests/test_support_sessions.py` (OCR summary/reprocess). | None beyond needing OCR hardware data. |
| Narrative/medical necessity deterministic generation | ✅ | `backend/services/epcr/narrative_generator.py` (deterministic prompts, edit tracking, `NarrativeVersion` persistence) and `billing/assist_service.py` (medical necessity hints, explanations). | `backend/tests/test_billing_claims.py` (ready_check uses medical necessity snapshot). | When `OPENAI_API_KEY` is missing, generator returns the fallback template (no failure). |
| QA scoring/high-risk flags/APIs | ✅ | `backend/services/qa/qa_router.py` (rubrics/cases/reviews), `billing/claims_router.py` (`_collect_ready_reasons` uses latest QAReview + thresholds). | `backend/tests/test_billing_claims.py` | QA thresholds are tied to `settings.QA_READY_THRESHOLD`; low scores block billing. |
| Locking read-only enforcement + billing-ready state + timeline | 🟡 | `backend/services/epcr/epcr_router.py` (`/patients/{id}/lock`), `billing/claims_router.py` (ready_check ensures `chart_locked` and validations), `models/epcr.py` defines `PatientStateTimeline`. | `backend/tests/test_billing_claims.py` | `PatientStateTimeline` table is never written, so an immutable timeline table remains empty despite the audit events. |
| Frontend `/epcr` surfaces (incident list, section editor, validation UI, OCR review, repeat overlay, QA indicator, read-only view) | 🟡 | `src/app/epcr/page.tsx` and `/epcr/[id]/page.tsx` render plain JSON dumps with `TODO` banners for timeline/audits/validation. | none | No interactive UI; TODO comments signal missing surfaces. |

## Batch 2 – MDT + TransportLink
| Item | Status | Evidence | Tests | Known breakpoints |
| --- | --- | --- | --- | --- |
| MDT backend (timestamps/events, OBD ingestion, CAD sync, scoped security) | ✅ | `backend/services/mdt/mdt_router.py` (`/events`, `/obd`, `/cad-sync`, `apply_training_mode`, role guard includes crew). | `backend/tests/test_mdt.py` | None. |
| MDT frontend (tablet-only UI) | ❌ | `src/app` tree has no `mdt` folder/page; only backend API exists. | none | No client surface to drive tablet workflows. |
| TransportLink workflow, multi-leg trips, PCS/necessity enforcement, broker data, CAD linking | ✅ | `backend/services/transportlink/transport_router.py` (Trip/Leg creation, medical necessity gating, `MasterPatientLink` validation, broker metadata) plus audit/event logging. | `backend/tests/test_transportlink.py` | Completion fails when PCS not approved or legs missing (expected enforcement). |

## Batch 3 – CAD (Interfacility only)
| Item | Status | Evidence | Tests | Known breakpoints |
| --- | --- | --- | --- | --- |
| CAD core (call/incident create, unit tracking, dispatch, timeline) | ✅ | `backend/services/cad/cad_router.py` (calls/units/dispatch), `incident_router.py` (incidents/timeline, `_record_timeline`). | `backend/tests/test_cad.py`, `backend/tests/test_cad_incidents.py` | `route_geometry` data is ready for OpenMaps, but no client map yet. |
| CrewLink integration (paging/messages/prealert) | ✅ | `services/cad/helpers.py` (`create_crewlink_page`), `incident_router.py` (assignment/status updates call it). | `backend/tests/test_cad_incidents.py` (asserts crewlink pages exist). | None. |
| Avoiding 911 scope creep | ✅ | `incident_router.py` restricts `transport_type` to `IFT/NEMT/CCT` and statuses to interfacility states, no 911 data. | none | None. |

## Batch 4 – Fire / HEMS / Specialty
| Item | Status | Evidence | Tests | Known breakpoints |
| --- | --- | --- | --- | --- |
| Fire module (NERIS export structure, inventory hooks, timeline/audit) | ✅ | `backend/services/fire/fire_router.py` (incident creation/assignment/export, `FireExportRecord`, `FireIncidentTimeline`, inventory hooks). | `backend/tests/test_fire.py` | None. |
| HEMS module (mission lifecycle, duty-time logic, weather stub, CAD hooks) | ✅ | `backend/services/hems/hems_router.py` (`/missions`, `/requests`, `/risk`, `/weather`, CAD timeline updates). | `backend/tests/test_hems.py` | Weather endpoint returns placeholder data (stub). |
| Specialty ePCR (CCT, pediatric checks, conditional validators, timeline/lock rules) | 🟡 | `backend/services/epcr/epcr_router.py` (`/patients/{id}/cct`, `_ensure_unit`), pediatric weight detection in `assist_service`, conditional validation when CCT interventions exist. | `backend/tests/test_support_sessions.py` (CCT/OCR coverage) | OB-specific sections/fields are absent and `PatientStateTimeline` is unused. |
| Frontend dashboards for Fire/HEMS/Specialty | 🟡 | `src/app/fire/page.tsx`, `src/app/hems/page.tsx`, `src/app/epcr/*` render static JSON dumps with `TODO` comments. | none | No interactive dashboards; visualizations still TODO. |

## Batch 5 – Billing + AI + Telnyx + CareFusion
| Item | Status | Evidence | Tests | Known breakpoints |
| --- | --- | --- | --- | --- |
| Office Ally integration (readiness gating, export bundle, status updates) | ✅ | `backend/services/billing/claims_router.py` (`ready_check`, `/export/office_ally`, `_build_export_bundle`, `BillingClaimExportSnapshot`). | `backend/tests/test_billing_claims.py` | `ready_check` explicitly blocks exports until QA/validation/narrative locked, as designed. |
| AI billing assist (coding suggestions, necessity hints, denial flags) | ✅ | `backend/services/billing/assist_service.py` (coding s and flags), `/billing/assist/{patient}` endpoint refreshing snapshots). | `backend/tests/test_billing_claims.py` (assist endpoint comparisons). | Heuristics rely solely on ICD snippets; no broader RxNorm/SNOMED dataset yet. |
| Telnyx support (webhook auth, SMS send, call scripts, audit/timeline, signature verification) | ✅ | `backend/services/telnyx/telnyx_router.py` (signature check, webhook, assist actions), `services/telnyx/assistant.py`, `services/mail/mail_router.py`, `services/communications/comms_router.py`. | `backend/tests/test_telnyx_support.py`, `backend/tests/test_telnyx_webhook.py` | `TELNYX_API_KEY`/from number are required; signature mode needs `PyNaCl` installed. |
| CareFusion (telehealth-only, separate DB + exports) | ✅ | `backend/services/export/carefusion_router.py` (uses `get_telehealth_db`, Telehealth models, gates on status `Ended`). | `backend/tests/test_carefusion_export.py` | Fails if telehealth DB URL absent; no fallback. |

## Batch 6 – Founder / Ops / Support
| Item | Status | Evidence | Tests | Known breakpoints |
| --- | --- | --- | --- | --- |
| Founder console endpoints + pages | ✅ | `backend/services/founder/founder_router.py` (`/overview`, `/orgs/{id}/health`, notify helpers) and `src/app/founder/*` Next.js shell. | `backend/tests/test_founder_console.py` | None. |
| Remote support mirroring (“see what user sees”) | ✅ | `backend/services/support/support_router.py` (session lifecycle, consent, events, TTL) and `/support/consent/[sessionId]/page.tsx`. | `backend/tests/test_support_sessions.py` | Sessions expire via TTL; cross-org access raises 403 as designed. |
| Support tools (OCR troubleshooting/reprocess, workflow replay, audits) | ✅ | `support_router.py` (`/ocr/{id}/summary`, `/ocr/{id}/reprocess`), `ALLOWED_PURPOSES` includes `workflow_replay`, `ForensicAuditLog` used for overrides. | `backend/tests/test_support_sessions.py` | Workflow replay events limited to allowed types; no replay player yet. |
| Notifications/comms system (models, dispatcher, handlers, API, tests) | ✅ | `backend/services/communications/comms_router.py`, `services/notifications/notification_router.py`, `notification_dispatcher.py`, `handlers.py`, `models/notifications.py`. | `backend/tests/test_notifications.py` | Email/SMS dispatch paths require Postmark/Telnyx credentials; otherwise dispatcher logs training-mode info. |

## Runtime Reality
### Required environment variables (driven by `core/config.py`)
- `DATABASE_URL`: primary DB (defaults to sqlite when unset but production requires a real Postgres URL; `settings` sanitizes hosts). 
- `JWT_SECRET_KEY`, `STORAGE_ENCRYPTION_KEY`, `DOCS_ENCRYPTION_KEY`: default to `change-me` but runtime validation with `ENV=production` raises if they remain unset.
- `ALLOWED_ORIGINS`, `ENV`, `AUTH_RATE_LIMIT_PER_MIN`, `DB_POOL_SIZE`/`DB_MAX_OVERFLOW`: configure cors and pooling defaults.
- `TELNYX_*` (API key, numbers, connection/messaging profile, public key, signature flag): required for SMS/call paths (`comm_router`, `support_router`, `mail_router`).
- `POSTMARK_SERVER_TOKEN`, `POSTMARK_DEFAULT_SENDER`, `POSTMARK_REQUIRE_SIGNATURE`, `POSTMARK_SEND_DISABLED`, `POSTMARK_API_BASE`: outbound and inbound email depend on the server token; signature enforcement raises HTTP 401 when missing.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ENV`: Stripe handlers call `_set_stripe_key` and fail with `RuntimeError` when the secret key is missing.
- `KEYCLOAK_*` or general OIDC vars (`OIDC_ENABLED`, `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, etc.): required when authentication is enabled; `_get_oidc_config` raises if `OIDC_ISSUER_URL` is empty.
- `TELEHEALTH_DATABASE_URL`, `FIRE_DATABASE_URL`, `HEMS_DATABASE_URL`: override other DB URLs when splitting workloads.

### External dependencies & failure modes
- **Postgres** (`docker-compose` `db` service at `5432`): app connects on start; missing DB causes `get_engine` to fail before routers load.
- **Telnyx** (`TELNYX_API_KEY`, `TELNYX_FROM_NUMBER`/`TELNYX_NUMBER`, `TELNYX_CONNECTION_ID`): SMS/call endpoints raise `HTTP 412` when the key or sender number is absent; signature enforcement requires PyNaCl.
- **Postmark** (`POSTMARK_SERVER_TOKEN`, `POSTMARK_REQUIRE_SIGNATURE`): inbound webhook rejects requests without a valid signature/token (`test_email_postmark.py` covers this); `send_outbound` raises `HTTP 412` without the token unless `POSTMARK_SEND_DISABLED`.
- **Stripe** (`STRIPE_SECRET_KEY`, optional `stripe_webhook_secret`): `_set_stripe_key` throws `RuntimeError` when the secret key is missing, so `/api/billing/stripe` checkout/webhook paths need that value.
- **Keycloak/OIDC** (`OIDC_*`): enabling OIDC kicks off HTTP calls to the issuer (`requests.get` in `oidc_router`); missing issuer/client setup yields HTTP 400/403.

### Docker ports & URLs (per `docker-compose.yml`)
- `db`: `postgres:16` exposed on host `5432`.
- `keycloak`: `quay.io/keycloak/keycloak:24.0` exposed on host `8080`.
- `backend`: built from `backend/Dockerfile`, env file `backend/.env`, exposes `8000` host-to-container for `uvicorn main:app --port 8000`; health probe at `http://localhost:8000/healthz`.
- `frontend`: `Dockerfile.frontend` runs `npm run build` + `npm run start` on port 3000, mapped to host `5173`; it uses `NEXT_PUBLIC_API_URL=http://backend:8000` inside the network.

## Tests & Quality Audit
### Test list (`backend/tests` directory)
- test_ai_registry.py
- test_auth.py
- test_automation.py
- test_batch10_core.py
- test_batch11_legal.py
- test_batch12_tracking.py
- test_batch2_modules.py
- test_batch5_modules.py
- test_batch6_modules.py
- test_batch7_modules.py
- test_batch8_health.py
- test_batch9_ops.py
- test_billing_claims.py
- test_billing_exports.py
- test_cad.py
- test_cad_incidents.py
- test_carefusion_export.py
- test_compliance.py
- test_consent.py
- test_email_postmark.py
- test_epcr.py
- test_epcr_master_patient.py
- test_epcr_nemsis.py
- test_event_bus.py
- test_export_repair.py
- test_fire.py
- test_foundations.py
- test_founder_console.py
- test_hems.py
- test_legal_hold.py
- test_mdt.py
- test_notifications.py
- test_oidc.py
- test_quantum_documents.py
- test_quantum_voice.py
- test_smart_mode.py
- test_stripe_webhook_processing.py
- test_support_sessions.py
- test_system_health.py
- test_telehealth.py
- test_telnyx_support.py
- test_telnyx_webhook.py
- test_tenant_isolation.py
- test_tenant_isolation_modules.py
- test_time_authority.py
- test_training_mode.py
- test_transportlink.py
- test_validation.py
- test_workflows.py

### Known hang/failure risks
- No automated reports from running `pytest` yet; test files rely on the FastAPI `TestClient`, so database accessibility and authentication (e.g., `/api/auth/register`) must succeed. `test_email_postmark.py` demonstrates port 412 when the Postmark token or signature is missing, and `test_telnyx_support.py` assumes stubbed Telnyx sends.
- Network dependencies (Telnyx, Postmark, Stripe webhooks) are stubbed or disabled, but enabling those services without proper credentials will promptly surface 412/401 errors as described in the code.

### Pytest instructions
- Install the backend dependencies with `pip install -r backend/requirements.txt` (includes `pytest`, `pytest-asyncio>=0.23.0`).
- Run `pytest` from the repo root; `pytest.ini` adds `addopts = -p no:asyncio` so the asyncio plugin is disabled.

### Smoke test commands
1. `pip install -r backend/requirements.txt && uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000` (with `DATABASE_URL` set, e.g., via `backend/.env`).
2. `curl http://localhost:8000/healthz` (should return `{"status":"online"}`).
3. In parallel, `npm install && npm run dev -- --hostname 0.0.0.0 --port 5173` to serve the Next.js shell and check `http://localhost:5173` loads the placeholder layouts.

## Evidence
- Backend APIs referenced above live under `backend/services/*` (ePCR, CAD, Fire, HEMS, billing, Telnyx, support, founder, notifications, etc.).
- Models and metadata live in `backend/models/*.py` and are aggregated via `backend/models/__init__.py` while `core/database.Base` exports the four schema bases.
- Tests that exercise these APIs live under `backend/tests/*.py` (the list above); CRM event handlers register in `services/notifications/handlers.py` and run via the shared `event_bus` imported in `backend/main.py`.
- Front-end shells reside in `src/app/*` (founder, epcr, cad, fire, hems, billing, support consent) and call `apiFetch` wrappers in `src/lib/api.ts`.

## Critical blockers
- Front-end surfaces for ePCR, MDT, CAD, Fire, and HEMS remain read-only JSON dumps with TODOs; there is no UI for incident editing, OCR review, QA indicators, tablet workflows, or Fire/HEMS dashboards yet.
- Docker images never run `alembic upgrade head` (only `Base.metadata.create_all`), so schema drift between versions requires manual Alembic execution before startup.
- `PatientStateTimeline` exists but is never written, meaning the long-lived immutable timeline table remains empty despite `audit_and_event` entries.

## Recommended next execution order
1. **Stabilize schema & env** – run Alembic heads in CI/CD, align `.env` defaults with production secrets, and document the health probe so deployments know which ports/URLs to monitor.
2. **Surface missing UIs** – replace the placeholder Next.js ePCR/CAD/MDT/Fire/HEMS shells with actual dashboards/forms that consume the backend endpoints (validation, OCR review, QA, transport data, crewlink feeds).
3. **Harden external dependencies** – wire up Telnyx/Postmark/Stripe with real credentials, ensure signature verification libraries (PyNaCl) are installed when required, and extend support/notification replay tooling so auditors can replay the stored events.
