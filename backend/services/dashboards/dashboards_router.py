"""
Role dashboard API: serves widget data for paramedic, EMT, CCP, CCT, supervisor,
billing, medical-director, station-chief. Frontend expects:
- stat: { value, change? }
- list: { items: [{ title, subtitle }] }
- table: { columns: string[], rows: object[] }
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User

router = APIRouter(prefix="/api/dashboards", tags=["Role Dashboards"])


def _stat(value: Any, change: float | None = None) -> Dict[str, Any]:
    out: Dict[str, Any] = {"value": value}
    if change is not None:
        out["change"] = change
    return out


def _list_items(items: List[Dict[str, str]]) -> Dict[str, Any]:
    return {"items": items}


def _table(columns: List[str], rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {"columns": columns, "rows": rows}


# ---------------------------------------------------------------------------
# Paramedic
# ---------------------------------------------------------------------------
@router.get("/paramedic/calls-count")
def paramedic_calls_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(34, 5.2)


@router.get("/paramedic/quality-score")
def paramedic_quality_score(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(92, -1.0)


@router.get("/paramedic/recent-calls")
def paramedic_recent_calls(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _list_items([
        {"title": "Cardiac Arrest - 123 Main St", "subtitle": "Unit M-42 • 2 min ago"},
        {"title": "MVA with Injuries - Highway 101", "subtitle": "Unit M-15 • 5 min ago"},
        {"title": "Fall Injury - Senior Center", "subtitle": "Unit M-8 • 8 min ago"},
    ])


# ---------------------------------------------------------------------------
# EMT
# ---------------------------------------------------------------------------
@router.get("/emt/calls-count")
def emt_calls_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(28, 3.1)


@router.get("/emt/response-time")
def emt_response_time(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat("3.2m", -0.2)


@router.get("/emt/skills-due")
def emt_skills_due(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _list_items([
        {"title": "BLS Recert", "subtitle": "Due in 14 days"},
        {"title": "CPR Refresh", "subtitle": "Due in 30 days"},
    ])


@router.get("/emt/recent-calls")
def emt_recent_calls(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _list_items([
        {"title": "Difficulty Breathing - 456 Oak Ave", "subtitle": "Completed • 1 hr ago"},
        {"title": "Chest Pain - 789 Elm St", "subtitle": "Completed • 2 hrs ago"},
    ])


# ---------------------------------------------------------------------------
# CCP
# ---------------------------------------------------------------------------
@router.get("/ccp/critical-transfers")
def ccp_critical_transfers(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(12, 2.0)


@router.get("/ccp/ventilator-hours")
def ccp_ventilator_hours(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(48)


@router.get("/ccp/meds-administered")
def ccp_meds_administered(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(24)


@router.get("/ccp/recent-cases")
def ccp_recent_cases(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _table(
        ["Case", "Patient", "Status", "Time"],
        [
            {"Case": "CCT-101", "Patient": "J. Doe", "Status": "Completed", "Time": "2h ago"},
            {"Case": "CCT-102", "Patient": "A. Smith", "Status": "In progress", "Time": "45m ago"},
        ],
    )


# ---------------------------------------------------------------------------
# CCT
# ---------------------------------------------------------------------------
@router.get("/cct/transfers-week")
def cct_transfers_week(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(18, 4.0)


@router.get("/cct/handoff-time")
def cct_handoff_time(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat("12m", -1.5)


@router.get("/cct/protocol-compliance")
def cct_protocol_compliance(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat("98%", 0.5)


@router.get("/cct/recent-transports")
def cct_recent_transports(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _table(
        ["Trip", "Origin", "Destination", "Status"],
        [
            {"Trip": "T-201", "Origin": "Memorial", "Destination": "Regional", "Status": "Completed"},
            {"Trip": "T-202", "Origin": "Regional", "Destination": "Memorial", "Status": "En route"},
        ],
    )


# ---------------------------------------------------------------------------
# Supervisor
# ---------------------------------------------------------------------------
@router.get("/supervisor/pending-count")
def supervisor_pending_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(9, -2.0)


@router.get("/supervisor/review-queue")
def supervisor_review_queue(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _table(
        ["Record", "Provider", "Status", "Submitted"],
        [
            {"Record": "PCR-1001", "Provider": "J. Smith", "Status": "Pending review", "Submitted": "1h ago"},
            {"Record": "PCR-1002", "Provider": "A. Jones", "Status": "Pending review", "Submitted": "2h ago"},
        ],
    )


# ---------------------------------------------------------------------------
# Billing
# ---------------------------------------------------------------------------
@router.get("/billing/submitted-claims")
def billing_submitted_claims(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(156, 8.3)


@router.get("/billing/denial-rate")
def billing_denial_rate(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat("4.2%", -0.8)


# ---------------------------------------------------------------------------
# Medical Director
# ---------------------------------------------------------------------------
@router.get("/medical-director/protocol-adherence")
def medical_director_protocol_adherence(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat("96%", 1.2)


@router.get("/medical-director/outliers")
def medical_director_outliers(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(3, -1.0)


@router.get("/medical-director/ai-acceptance")
def medical_director_ai_acceptance(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat("78%", 5.0)


@router.get("/medical-director/cases")
def medical_director_cases(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _table(
        ["Case", "Protocol", "Outcome", "Reviewed"],
        [
            {"Case": "PCR-1001", "Protocol": "Cardiac", "Outcome": "Compliant", "Reviewed": "Yes"},
            {"Case": "PCR-1002", "Protocol": "Trauma", "Outcome": "Under review", "Reviewed": "No"},
        ],
    )


# ---------------------------------------------------------------------------
# Station Chief
# ---------------------------------------------------------------------------
@router.get("/station-chief/calls-today")
def station_chief_calls_today(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(52)


@router.get("/station-chief/crew-available")
def station_chief_crew_available(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat(18)


@router.get("/station-chief/response-time")
def station_chief_response_time(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _stat("3.2m", -0.1)


@router.get("/station-chief/roster")
def station_chief_roster(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict:
    return _table(
        ["Name", "Role", "Status", "Shift"],
        [
            {"Name": "J. Smith", "Role": "Paramedic", "Status": "Available", "Shift": "Day"},
            {"Name": "A. Jones", "Role": "EMT", "Status": "On call", "Shift": "Day"},
            {"Name": "M. Brown", "Role": "Paramedic", "Status": "Available", "Shift": "Night"},
        ],
    )
