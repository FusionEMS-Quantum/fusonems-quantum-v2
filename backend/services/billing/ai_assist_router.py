from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.billing_ai import BillingAiInsight
from models.billing_claims import BillingAssistResult, BillingClaim
from models.epcr import Patient
from models.user import User, UserRole
from utils.tenancy import get_scoped_record, scoped_query
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot
from services.billing.assist_service import (
    BillingAssistEngine,
    OllamaBillingCoder,
    OllamaClaimScrubber,
    OllamaClient,
    OllamaDenialPredictor,
    OllamaAppealGenerator,
)


router = APIRouter(
    prefix="/api/billing/ai",
    tags=["Billing", "AI"],
    dependencies=[Depends(require_module("BILLING"))],
)


class AiBaseRequest(BaseModel):
    epcr_patient_id: int
    context: dict[str, Any] = {}


class AiCodeRequest(AiBaseRequest):
    pass


class AiDenialRequest(AiBaseRequest):
    claim_id: int | None = None
    denial_reason: str | None = None


class AiAppealRequest(AiBaseRequest):
    claim_id: int
    denial_reason: str
    notes: str | None = None


class AiScrubRequest(AiBaseRequest):
    claim_id: int
    claim_payload: dict[str, Any] = {}


def _get_patient(request: Request, db: Session, user: User, patient_id: int) -> Patient:
    patient = (
        get_scoped_record(db, request, Patient, patient_id, user, resource_label="epcr")
        if patient_id
        else None
    )
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="patient_not_found")
    return patient


def _get_claim(request: Request, db: Session, user: User, claim_id: int) -> BillingClaim:
    claim = scoped_query(db, BillingClaim, user.org_id, request.state.training_mode).filter(
        BillingClaim.id == claim_id
    ).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="claim_not_found")
    return claim


def _latest_assist_snapshot(db: Session, user: User, patient: Patient, training: bool) -> dict[str, Any]:
    snapshot = (
        scoped_query(db, BillingAssistResult, user.org_id, training)
        .filter(BillingAssistResult.epcr_patient_id == patient.id)
        .order_by(BillingAssistResult.created_at.desc())
        .first()
    )
    return snapshot.snapshot_json if snapshot else {}


def _persist_insight(
    db: Session,
    request: Request,
    user: User,
    insight_type: str,
    patient_id: int,
    input_payload: dict[str, Any],
    output_payload: dict[str, Any],
) -> None:
    record = BillingAiInsight(
        org_id=user.org_id,
        epcr_patient_id=patient_id,
        insight_type=insight_type,
        description=insight_type,
        input_payload=input_payload,
        output_payload=output_payload,
    )
    apply_training_mode(record, request)
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="billing_ai_insight",
        classification=record.classification,
        after_state=model_snapshot(record),
        event_type="billing.ai_insight_generated",
        event_payload={"patient_id": patient_id, "insight_type": insight_type},
    )


@router.post("/code")
def ai_code(
    payload: AiCodeRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    patient = _get_patient(request, db, user, payload.epcr_patient_id)
    snapshot = _latest_assist_snapshot(db, user, patient, request.state.training_mode)
    client = OllamaClient()
    insight = OllamaBillingCoder(client).generate(patient, snapshot, context=payload.context)
    _persist_insight(db, request, user, "coding", patient.id, payload.dict(), insight)
    return insight


@router.post("/denial-risk")
def ai_denial(
    payload: AiDenialRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    patient = _get_patient(request, db, user, payload.epcr_patient_id)
    claim = _get_claim(request, db, user, payload.claim_id) if payload.claim_id else None
    client = OllamaClient()
    insight = OllamaDenialPredictor(client).generate(
        patient, claim, denial_reason=payload.denial_reason, context=payload.context
    )
    _persist_insight(
        db,
        request,
        user,
        "denial_risk",
        patient.id,
        payload.dict(),
        insight,
    )
    return insight


@router.post("/appeal-draft")
def ai_appeal(
    payload: AiAppealRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    patient = _get_patient(request, db, user, payload.epcr_patient_id)
    claim = _get_claim(request, db, user, payload.claim_id)
    client = OllamaClient()
    insight = OllamaAppealGenerator(client).generate(
        patient,
        claim,
        payload.denial_reason,
        context={**payload.context, "notes": payload.notes or ""},
    )
    _persist_insight(
        db,
        request,
        user,
        "appeal",
        patient.id,
        payload.dict(),
        insight,
    )
    return insight


@router.post("/scrub")
def ai_scrub(
    payload: AiScrubRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    patient = _get_patient(request, db, user, payload.epcr_patient_id)
    claim = _get_claim(request, db, user, payload.claim_id)
    client = OllamaClient()
    insight = OllamaClaimScrubber(client).generate(
        patient,
        claim,
        payload=payload.claim_payload,
        context=payload.context,
    )
    _persist_insight(
        db,
        request,
        user,
        "scrub",
        patient.id,
        payload.dict(),
        insight,
    )
    return insight
