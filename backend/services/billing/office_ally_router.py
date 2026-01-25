from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.user import User, UserRole
from services.billing.office_ally_sync import (
    OfficeAllyClient,
    OfficeAllyDisabled,
)


router = APIRouter(
    prefix="/api/billing/office-ally",
    tags=["Billing", "OfficeAlly"],
    dependencies=[Depends(require_module("BILLING"))],
)


class RemittancePost(BaseModel):
    remittance_id: int | None = None


def _require_office_ally_enabled() -> None:
    if not settings.OFFICEALLY_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="Office Ally integration is disabled. Set OFFICEALLY_ENABLED=true and provide FTP credentials.",
        )


def _handle_disabled(exc: OfficeAllyDisabled) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_412_PRECONDITION_FAILED,
        detail=str(exc) or "Office Ally integration is not configured.",
    )


@router.post("/sync")
def sync_claims(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    _require_office_ally_enabled()
    client = OfficeAllyClient(db=db, org_id=user.org_id)
    try:
        result = client.sync_claims(request, user)
    except OfficeAllyDisabled as exc:
        raise _handle_disabled(exc)
    return result


@router.get("/status/{batch_id}")
def fetch_status(
    batch_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    _require_office_ally_enabled()
    client = OfficeAllyClient(db=db, org_id=user.org_id)
    try:
        return client.fetch_status(batch_id)
    except OfficeAllyDisabled as exc:
        raise _handle_disabled(exc)


@router.get("/eligibility")
def check_eligibility(
    patient_name: str,
    payer: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    _require_office_ally_enabled()
    client = OfficeAllyClient(db=db, org_id=user.org_id)
    try:
        return client.fetch_eligibility(request, user, patient_name, payer)
    except OfficeAllyDisabled as exc:
        raise _handle_disabled(exc)


@router.post("/post-payment")
def post_remittances(
    payload: RemittancePost,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    _require_office_ally_enabled()
    client = OfficeAllyClient(db=db, org_id=user.org_id)
    try:
        return client.fetch_remittances(request, user, remittance_id=payload.remittance_id)
    except OfficeAllyDisabled as exc:
        raise _handle_disabled(exc)
