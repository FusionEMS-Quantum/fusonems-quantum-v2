# FusionEMS Crew Scheduling & Personnel & Operations

## Product separation

- **FusionEMS Crew Scheduling** is the canonical scheduling product. It lives at `/scheduling` and uses `/api/v1/scheduling`. It is **standalone**: usable without HR, payroll, time tracking, or personnel modules.
- **Personnel & Operations** (formerly HR) is the HR system of record: personnel, payroll, leave, certifications. HR-side scheduling pages (`/hr/scheduling`, `/hr/smart-scheduler`) are **read/write views** into the same Crew Scheduling system—they consume `/api/v1/scheduling`, not separate logic.

UI copy must clearly differentiate **Scheduling** from **HR & Payroll** so Scheduling is not positioned as a full HR system.

---

## What Crew Scheduling does (for EMS Manager users)

Crew Scheduling provides:

- **Shift definitions** — Name, code, times, duration, station/unit, min/max staff, required certs/skills, pay multiplier, break.
- **Period-based schedules** — Schedule periods with publish deadlines and status.
- **Scheduled shifts** — Shifts by date/time, station, unit, required staff, open/overtime/critical flags.
- **Assignments** — Assign people to shifts; assignment status; acknowledgment.
- **Availability & time-off** — Crew availability types and time-off requests (with conflict detection).
- **Swaps** — Shift swap requests and approval flow.
- **Coverage rules** — Coverage requirements and scheduling policies.
- **Fatigue & overtime indicators** — Overtime tracking and fatigue indicators.
- **Predictive / AI recommendations** — AI scheduling recommendations and optimization.
- **Fire-specific schedules** — Fire scheduling (e.g. `/fire/schedule`) uses the same system.
- **Exports** — PDF and ICS export.

That’s more than EMS Manager—without saying it arrogantly.

---

## What Crew Scheduling does NOT do (critical for support)

Crew Scheduling does **not**:

- Run payroll
- Calculate paychecks
- Enforce union rules
- Act as an HR system of record
- Replace payroll providers
- Guarantee labor compliance

State this in docs and in UI tooltips to prevent support hell.

---

## API and pages

| Area | Path | API | Notes |
|------|------|-----|------|
| Canonical scheduling | `/scheduling` | `/api/v1/scheduling` | Main dashboard; fully wired to API. |
| Scheduling portal | `/portals/scheduling/*` | `/api/v1/scheduling` | Real data. |
| Fire scheduling | `/fire/schedule` | `/api/v1/scheduling` (or fire scheduling router) | Real data. |
| Personnel & Ops schedule view | `/hr/scheduling` | `/api/v1/scheduling` | Read/write into Crew Scheduling. |
| Smart Scheduler | `/hr/smart-scheduler` | `/api/v1/scheduling` | Read-only + recommendations at first. |

Scheduling must be usable without HR, payroll, time tracking, or personnel modules enabled. HR modules are platform features and are not required for standalone Scheduling customers.

---

## Pricing (positioning)

Two clear products:

**FusionEMS Crew Scheduling (standalone)**  
- $500 / agency / month  
- Unlimited users  
- No HR required  

**FusionEMS Platform (Core + HR + Billing)**  
- Core: $2,000 / month  
- Scheduling bundle: $400 / month  
- HR modules unlocked  

This is how EMS Manager users convert: “We’ll start with scheduling.”

---

## Implementation priorities

1. **Priority 1 (selling)**  
   - `/scheduling` → fully wired to `/api/v1/scheduling`  
   - Scheduling portal → real data  
   - Fire scheduling → real data  

2. **Priority 2 (cleanup)**  
   - `/hr/scheduling` → read/write from `/api/v1/scheduling`  
   - `/hr/smart-scheduler` → read-only + recommendations at first  

3. **Priority 3 (later)**  
   - Payroll ↔ time tracking integration  
   - Leave ↔ scheduling enforcement  
