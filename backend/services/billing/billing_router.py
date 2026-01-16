from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.billing import BillingRecord
from models.business_ops import BusinessOpsTask
from models.user import User, UserRole
from utils.legal import enforce_legal_hold
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot
from utils.tenancy import get_scoped_record, scoped_query


router = APIRouter(
    prefix="/api/billing",
    tags=["Billing"],
    dependencies=[Depends(require_module("BILLING"))],
)


class BillingCreate(BaseModel):
    patient_name: str
    invoice_number: str
    payer: str
    amount_due: float
    status: str = "Open"
    claim_payload: dict = {}


class BillingResponse(BillingCreate):
    id: int

    class Config:
        from_attributes = True


class BusinessOpsCreate(BaseModel):
    title: str
    owner: str
    priority: str = "Normal"
    metadata: dict = {}


@router.post("/invoices", response_model=BillingResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: BillingCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    enforce_legal_hold(db, user.org_id, "billing_record", payload.invoice_number, "create")
    record = BillingRecord(**payload.dict(), org_id=user.org_id)
    apply_training_mode(record, request)
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="billing_record",
        classification=record.classification,
        after_state=model_snapshot(record),
        event_type="CLAIM_SUBMITTED",
        event_payload={"invoice_id": record.id, "invoice_number": record.invoice_number},
    )
    return record


@router.get("/invoices", response_model=list[BillingResponse])
def list_invoices(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    return scoped_query(db, BillingRecord, user.org_id, request.state.training_mode).order_by(
        BillingRecord.created_at.desc()
    ).all()


@router.post("/office-ally/submit")
def submit_claims(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    if request.state.training_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="TRAINING_MODE_EXPORT_BLOCKED",
        )
    enforce_legal_hold(db, user.org_id, "billing_export", "office-ally", "export")
    if not settings.OFFICEALLY_FTP_HOST:
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="Office Ally FTP not configured",
        )
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="export",
        resource="billing_office_ally",
        classification="BILLING_SENSITIVE",
        event_type="CLAIM_SUBMITTED",
        event_payload={"provider": "Office Ally"},
    )
    return {"status": "queued", "provider": "Office Ally"}


@router.post("/business-ops/tasks", status_code=status.HTTP_201_CREATED)
def create_business_task(
    payload: BusinessOpsCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.founder)),
):
    task = BusinessOpsTask(
        **payload.dict(exclude={"metadata"}),
        task_metadata=payload.metadata,
        org_id=user.org_id,
    )
    apply_training_mode(task, request)
    db.add(task)
    db.commit()
    db.refresh(task)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="business_ops_task",
        classification=task.classification,
        after_state=model_snapshot(task),
        event_type="RECORD_WRITTEN",
        event_payload={"task_id": task.id},
    )
    return task
