from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.billing_claims import BillingAssistResult, BillingClaim
from models.epcr import Patient
from models.telnyx import TelnyxCallSummary
from models.user import User, UserRole
from utils.time import utc_now


router = APIRouter(
    prefix="/api/billing/console",
    tags=["Billing", "Console"],
    dependencies=[Depends(require_module("BILLING"))],
)


def _counts(db: Session, org_id: int) -> dict[str, int]:
    total = (
        db.query(func.count(BillingClaim.id))
        .filter(BillingClaim.org_id == org_id)
        .scalar()
        or 0
    )
    pending = (
        db.query(func.count(BillingClaim.id))
        .filter(
            BillingClaim.org_id == org_id,
            BillingClaim.status.in_(["draft", "locked", "processing"]),
        )
        .scalar()
        or 0
    )
    ready = (
        db.query(func.count(BillingClaim.id))
        .filter(BillingClaim.org_id == org_id, BillingClaim.status == "ready")
        .scalar()
        or 0
    )
    submitted = (
        db.query(func.count(BillingClaim.id))
        .filter(BillingClaim.org_id == org_id, BillingClaim.status == "submitted")
        .scalar()
        or 0
    )
    denied = (
        db.query(func.count(BillingClaim.id))
        .filter(BillingClaim.org_id == org_id, BillingClaim.status == "denied")
        .scalar()
        or 0
    )
    paid_mtd = (
        db.query(func.count(BillingClaim.id))
        .filter(
            BillingClaim.org_id == org_id,
            BillingClaim.status == "paid",
            BillingClaim.paid_at >= utc_now().replace(day=1),
        )
        .scalar()
        or 0
    )
    return {
        "total": total,
        "pending": pending,
        "ready": ready,
        "submitted": submitted,
        "denied": denied,
        "paid_mtd": paid_mtd,
    }


@router.get("/summary")
def console_summary(user: User = Depends(require_roles(UserRole.admin, UserRole.billing)), db: Session = Depends(get_db)) -> dict[str, Any]:
    counts = _counts(db, user.org_id)
    facesheet_gaps = (
        db.query(func.count(Patient.id))
        .filter(
            Patient.org_id == user.org_id,
            (
                (Patient.first_name.is_(None))
                | (Patient.last_name.is_(None))
                | (Patient.date_of_birth.is_(None))
                | (Patient.address == "")
                | (Patient.phone == "")
            ),
        )
        .scalar()
        or 0
    )
    ai_insights = (
        db.query(BillingAssistResult)
        .filter(BillingAssistResult.org_id == user.org_id)
        .order_by(BillingAssistResult.created_at.desc())
        .limit(3)
        .all()
    )
    return {
        "counts": counts,
        "denial_rate": round(counts["denied"] / counts["total"], 2) if counts["total"] else 0,
        "facesheet_gaps": facesheet_gaps,
        "ai_insights": [
            {
                "id": insight.id,
                "type": insight.insight_type,
                "description": insight.description,
                "created_at": insight.created_at.isoformat() if insight.created_at else None,
            }
            for insight in ai_insights
        ],
    }


@router.get("/claims-ready")
def console_ready_claims(user: User = Depends(require_roles(UserRole.admin, UserRole.billing)), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    claims = (
        db.query(BillingClaim)
        .filter(BillingClaim.org_id == user.org_id, BillingClaim.status == "ready")
        .order_by(BillingClaim.created_at.desc())
        .limit(25)
        .all()
    )
    return [
        {
            "id": claim.id,
            "payer": claim.payer_name,
            "status": claim.status,
            "denial_risks": claim.denial_risk_flags,
            "office_ally_batch_id": claim.office_ally_batch_id,
            "patient_id": claim.epcr_patient_id,
            "created_at": claim.created_at.isoformat() if claim.created_at else None,
        }
        for claim in claims
    ]


@router.get("/denials")
def console_denials(user: User = Depends(require_roles(UserRole.admin, UserRole.billing)), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    claims = (
        db.query(BillingClaim)
        .filter(BillingClaim.org_id == user.org_id, BillingClaim.status == "denied")
        .order_by(BillingClaim.updated_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "id": claim.id,
            "payer": claim.payer_name,
            "denial_reason": claim.denial_reason,
            "created_at": claim.created_at.isoformat() if claim.created_at else None,
            "office_ally_batch_id": claim.office_ally_batch_id,
        }
        for claim in claims
    ]


@router.get("/call-queue")
def console_call_queue(user: User = Depends(require_roles(UserRole.admin, UserRole.billing)), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = (
        db.query(TelnyxCallSummary)
        .filter(TelnyxCallSummary.org_id == user.org_id)
        .order_by(TelnyxCallSummary.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": row.id,
            "intent": row.intent,
            "resolution": row.resolution,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.get("/analytics")
def console_analytics(user: User = Depends(require_roles(UserRole.admin, UserRole.billing)), db: Session = Depends(get_db)) -> dict[str, Any]:
    now = utc_now()
    month_start = now.replace(day=1)
    paid = (
        db.query(BillingClaim)
        .filter(
            BillingClaim.org_id == user.org_id,
            BillingClaim.status == "paid",
            BillingClaim.paid_at != None,
            BillingClaim.submitted_at != None,
        )
        .all()
    )
    days_to_pay = [
        (claim.paid_at - claim.submitted_at).days
        for claim in paid
        if claim.paid_at and claim.submitted_at
    ]
    payer_mix = (
        db.query(BillingClaim.payer_name, func.count(BillingClaim.id))
        .filter(BillingClaim.org_id == user.org_id)
        .group_by(BillingClaim.payer_name)
        .all()
    )
    aging = {}
    for bucket, days in [("30", 30), ("60", 60), ("90", 90)]:
        cutoff = now - timedelta(days=days)
        aging[bucket] = (
            db.query(func.count(BillingClaim.id))
            .filter(
                BillingClaim.org_id == user.org_id,
                BillingClaim.status.in_(["ready", "draft", "submitted"]),
                BillingClaim.created_at <= cutoff,
            )
            .scalar()
            or 0
        )
    return {
        "denial_rate": round(
            (
                db.query(func.count(BillingClaim.id))
                .filter(BillingClaim.org_id == user.org_id, BillingClaim.status == "denied")
                .scalar()
                or 0
            )
            / max(
                (
                    db.query(func.count(BillingClaim.id))
                    .filter(BillingClaim.org_id == user.org_id)
                    .scalar()
                    or 0
                ),
                1,
            ),
            2,
        ),
        "aging": aging,
        "payer_mix": [{"payer": payer or "Unknown", "count": count} for payer, count in payer_mix],
        "days_to_pay": round(sum(days_to_pay) / len(days_to_pay), 1) if days_to_pay else 0,
        "paid_month_to_date": len([claim for claim in paid if claim.paid_at >= month_start]),
    }
