from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.legal import LegalHold


def get_active_hold(db: Session, org_id: int, scope_type: str, scope_id: str):
    return (
        db.query(LegalHold)
        .filter(
            LegalHold.org_id == org_id,
            LegalHold.scope_type == scope_type,
            LegalHold.scope_id == scope_id,
            LegalHold.status == "Active",
        )
        .first()
    )


def enforce_legal_hold(
    db: Session,
    org_id: int,
    scope_type: str,
    scope_id: str,
    action: str,
):
    hold = get_active_hold(db, org_id, scope_type, scope_id)
    if hold and action not in {"read", "addendum"}:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"LEGAL_HOLD_ACTIVE:{scope_type}:{scope_id}",
        )
