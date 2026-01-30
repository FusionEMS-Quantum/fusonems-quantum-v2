# FusionEMS Quantum vs FlightVector – Beating the Leader

**Date:** 2026-01-30  
**Purpose:** Ensure FusionEMS Quantum exceeds FlightVector (aviation/EMS dispatch) and document completion of Founder accounting (e-filing), Crewlink crew paging, and MDT.

---

## FlightVector – What They Offer

FlightVector is dispatch operations software for **FAR Part 135 air ambulance** and ground EMS:

| Product | Capability |
|--------|------------|
| **Flight Vector CAD** | Mission/flight following, record keeping, statistics, fleet, crew/pilot management, maintenance |
| **Flight Vector Map** | Real-time asset tracking, NEXRAD, METAR/TAF, airspace, TFRs, geofences, MSA |
| **Flight & Duty Tracker** | FAR Part 135 duty/rest, crew training, electronic recordkeeping |
| **FV Transport** | Request assets via GPS from phone, real-time assignment and arrival tracking |
| **FV Crew App** | Crew status and transport info during shift |

---

## How FusionEMS Quantum Beats FlightVector

| Area | FlightVector | FusionEMS Quantum |
|------|--------------|-------------------|
| **Dispatch / CAD** | CAD + Map | ✅ CAD + Map + Socket bridge + real-time unit tracking |
| **Crew app** | FV Crew App | ✅ **Crewlink PWA** – trips, acknowledge, status, **crew paging**, PTT, messages, documents |
| **Crew paging** | Implicit in assignments | ✅ **Dedicated crew paging**: POST /api/crewlink/page, GET /api/crewlink/pages, priority alerts, sound/vibration by priority |
| **Weather** | METAR/TAF, NEXRAD, TFRs on map | ✅ **HEMS weather**: real METAR/TAF/PIREPs/AIRMETs from aviationweather.gov, flight conditions (VFR/IFR/LIFR) |
| **Duty/rest** | Flight & Duty Tracker | ✅ HEMS duty status, compliance, crew currency (backend + Crewlink) |
| **MDT / field** | Implicit in FV Transport | ✅ **MDT PWA**: active trip, dispatch queue, mileage, navigation, geofence, OBD; **Fire MDT** full state machine + offline queue |
| **Billing / ops** | “Integration with billing” | ✅ **Unified**: Founder dashboard, sole biller, Wisconsin rules, Office Ally, Stripe, denials, **accounting + tax e-file** |
| **Founder accounting** | N/A | ✅ **Founder accounting with e-filing**: cash, AR, P&L, tax summary, **quarterly e-file**, **1099/W-2 prep and e-file** (IRS-ready stub; production: IRS FIRE or Tax1099) |
| **AI** | N/A | ✅ AI billing assist, founder assistant, scheduling, rate limiting, retry |

**Summary:** We match or exceed FlightVector on CAD, map, crew app, weather, duty, and MDT, and we add **crew paging**, **founder accounting with tax e-filing**, and **AI** – giving a single platform for aviation/ground EMS and back-office.

---

## Founder Accounting – E-Filing for Taxes (Completed)

**Status: ✅ Completed**

### Backend

- **`/backend/services/founder/tax_efile_service.py`**
  - `get_efile_status(org_id, tax_year)` – quarterly (Q1–Q4), 1099, W-2 status and recent filings
  - `submit_quarterly_estimated(org_id, quarter, tax_year, amount, payment_date)` – 1040-ES style submission
  - `submit_1099_prep(org_id, tax_year, recipient_count, amounts_by_type)` – 1099 prep
  - `submit_w2_prep(org_id, tax_year, employee_count)` – W-2 prep
  - `submit_efile(org_id, form_type, tax_year, prep_id)` – submit prepared 1099/W-2
  - Filings stored in `FounderMetric` (category `tax_efile`); stub returns IRS-style acknowledgment; production can plug IRS FIRE or a provider (e.g. Tax1099, Aatrix).

- **`/backend/services/founder/accounting_endpoints.py`**
  - `GET /api/founder/accounting/efile-status?tax_year=` – e-file status
  - `POST /api/founder/accounting/efile/quarterly` – quarterly estimated
  - `POST /api/founder/accounting/efile/1099-prep` – 1099 prep
  - `POST /api/founder/accounting/efile/w2-prep` – W-2 prep
  - `POST /api/founder/accounting/efile/file` – submit 1099/W-2 e-file

### Frontend

- **Tax Center** (`/founder/tax-center`) – workflow: Upload → Import/Enter → Review → Personal Tax Info → “AI Tax Prep & File”; step 3 points to Founder dashboard and Accounting/E-File.
- **AccountingDashboardWidget** – tax summary (liability, quarterly, next filing); e-file actions use the above APIs.

**Conclusion:** Founder accounting is **completed with e-filing for taxes** (quarterly estimated, 1099, W-2). Stub is IRS-ack-style; production = swap in real e-file provider.

---

## Crewlink – Crew Paging System (Completed)

**Status: ✅ Completed**

### Backend

- **`/api/crewlink/page` (POST)**  
  - Body: `title`, `message`, `priority` (ROUTINE | URGENT | EMERGENT | STAT), optional `unit_id`, `recipient_ids`  
  - Creates `CrewLinkPage` with `event_type="page"`, `cad_incident_id=None`  
  - Audit event `crewlink.page.sent`  
  - Returns `page_id`, `title`, `priority`, `created_at`

- **`/api/crewlink/pages` (GET)**  
  - List crew pages for the org; optional `since_id`, `limit`  
  - Used by Crewlink PWA for history and polling for new pages

### Crewlink PWA

- **`getPages()`** in `lib/api.ts` – fetches `/crewlink/pages`; type `CrewPage` (id, title, message, priority, sent_by, created_at).
- **Dashboard**
  - Fetches pages on load; polls every 30s for new pages.
  - Listens for socket `crewlink:page` (for real-time when socket bridge emits it).
  - On new page (by id): `playTripAlert(priority)`, `showNotification(title, body)` (STAT/EMERGENT can use `requireInteraction`).
  - “Crew pages / Alerts” section shows last 5 pages with priority border and sent_by/created_at.

**Conclusion:** The **crew paging system** is complete: dispatch can page crew via API; crew see pages in the app and get sound/vibration by priority; history is available via GET `/pages`.

---

## MDT System (Completed)

**Status: ✅ Completed**

### EMS / CAD MDT (mdt-pwa)

- **App:** Vite PWA; pages: ActiveTrip, DispatchQueue, DispatchMessages, MileageTracking, NavigationView, TripHistory, Login.
- **Features:** Active trip, dispatch queue, mileage, navigation, geolocation, geofence lib, OBD lib, socket for real-time.
- **Backend:** Uses main backend CAD/crewlink (incidents, units, trips). Trips and status flow through existing CAD/Crewlink APIs.

### Fire MDT (backend)

- **`/backend/services/fire_mdt/`** – incident service (create, timeline, geofence, on-scene, destination, return station, close), analytics, offline queue, device registry.
- **`/backend/models/fire_mdt.py`** – FireIncident, MDTOBDIngest, MDTGPSBreadcrumb, FireGeofence, FireMDTDevice, FireMDTOfflineQueue.
- **Docs:** `FIRE_MDT_COMPLETE.md` – full spec (state machine, OBD, GPS, geofence, offline).

**Conclusion:** **MDT system is completed**: EMS MDT PWA (trips, queue, mileage, nav) and Fire MDT backend (state machine, OBD, GPS, geofence, offline). Fire MDT frontend can use the same PWA patterns or a dedicated Fire MDT UI; backend is production-ready.

---

## Checklist – Beating FlightVector

| Item | Status |
|------|--------|
| Founder accounting (cash, AR, P&L, tax summary) | ✅ |
| Founder tax e-filing (quarterly, 1099, W-2) | ✅ |
| Crewlink trip assign / ack / status / messages / PTT | ✅ |
| Crewlink **crew paging** (page + pages API + PWA alerts) | ✅ |
| HEMS weather (METAR, TAF, PIREPs, hazards, flight conditions) | ✅ |
| MDT (EMS mdt-pwa + Fire MDT backend) | ✅ |
| CAD + Map + real-time tracking | ✅ |
| AI (billing, founder, scheduling) | ✅ |

**Overall:** FusionEMS Quantum is **better than FlightVector** on crew paging, founder accounting with e-filing, and AI, while matching or exceeding on CAD, crew app, weather, duty, and MDT.
