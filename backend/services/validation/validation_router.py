from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.user import User, UserRole
from models.validation import DataValidationIssue
from utils.tenancy import scoped_query
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot

router = APIRouter(
    prefix="/api/validation",
    tags=["Validation"],
    dependencies=[Depends(require_module("VALIDATION"))],
)


class ValidationScan(BaseModel):
    entity_type: str
    entity_id: str
    patient_name: str | None = None
    date_of_birth: str | None = None
    insurance_id: str | None = None
    encounter_code: str | None = None
    claim_amount: float | None = None


@router.post("/scan", status_code=status.HTTP_201_CREATED)
def scan_payload(
    payload: ValidationScan,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider)),
):
    issues = []
    if not payload.patient_name:
        issues.append("Missing patient name")
    if not payload.date_of_birth:
        issues.append("Missing date of birth")
    if not payload.insurance_id:
        issues.append("Missing insurance ID")
    if not payload.encounter_code:
        issues.append("Missing encounter code")
    if payload.claim_amount is not None and payload.claim_amount <= 0:
        issues.append("Claim amount must be greater than zero")

    stored = []
    for issue in issues:
        record = DataValidationIssue(
            org_id=user.org_id,
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            severity="High" if "Missing" in issue else "Medium",
            issue=issue,
        )
        apply_training_mode(record, request)
        db.add(record)
        stored.append(record)

    db.commit()
    for record in stored:
        audit_and_event(
            db=db,
            request=request,
            user=user,
            action="create",
            resource="validation_issue",
            classification=record.classification,
            after_state=model_snapshot(record),
            event_type="RECORD_WRITTEN",
            event_payload={"issue_id": record.id},
        )
    return {"issues": issues, "count": len(issues)}


@router.get("/issues")
def list_issues(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    return scoped_query(
        db, DataValidationIssue, user.org_id, request.state.training_mode
    ).order_by(DataValidationIssue.created_at.desc()).all()
