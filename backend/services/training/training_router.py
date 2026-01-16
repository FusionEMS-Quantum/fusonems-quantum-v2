from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.ai_console import AiInsight
from models.billing import BillingRecord
from models.cad import Call, Unit
from models.epcr import Patient
from models.organization import Organization
from models.scheduling import Shift
from models.user import User, UserRole
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot

router = APIRouter(
    prefix="/api/training",
    tags=["Training"],
    dependencies=[Depends(require_module("TRAINING"))],
)


class TrainingStatus(BaseModel):
    org_mode: str
    user_mode: bool


class TrainingToggle(BaseModel):
    enabled: bool


class TrainingUserToggle(BaseModel):
    user_id: int
    enabled: bool


@router.get("/status", response_model=TrainingStatus)
def training_status(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    return TrainingStatus(org_mode=org.training_mode, user_mode=user.training_mode)


@router.post("/org", status_code=status.HTTP_200_OK)
def set_org_training_mode(
    payload: TrainingToggle,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.founder)),
):
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    org.training_mode = "ENABLED" if payload.enabled else "DISABLED"
    db.commit()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="org_training_mode",
        classification="OPS",
        after_state={"training_mode": org.training_mode},
        event_type="RECORD_WRITTEN",
        event_payload={"training_mode": org.training_mode},
    )
    return {"status": "ok", "training_mode": org.training_mode}


@router.post("/user", status_code=status.HTTP_200_OK)
def set_user_training_mode(
    payload: TrainingUserToggle,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    target = db.query(User).filter(User.id == payload.user_id, User.org_id == user.org_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    target.training_mode = payload.enabled
    db.commit()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="user_training_mode",
        classification="OPS",
        after_state={"user_id": target.id, "training_mode": target.training_mode},
        event_type="RECORD_WRITTEN",
        event_payload={"user_id": target.id, "training_mode": target.training_mode},
    )
    return {"status": "ok", "user_id": target.id, "training_mode": target.training_mode}


@router.post("/seed", status_code=status.HTTP_201_CREATED)
def seed_training_data(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider)),
):
    if not request.state.training_mode:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="TRAINING_MODE_REQUIRED")

    call = Call(
        org_id=user.org_id,
        classification="TRAINING_ONLY",
        caller_name="Training Caller",
        caller_phone="000-0000",
        location_address="Training Bay 1",
        latitude=0.0,
        longitude=0.0,
        priority="Routine",
        status="Training",
    )
    unit = Unit(
        org_id=user.org_id,
        classification="TRAINING_ONLY",
        unit_identifier=f"TR-{datetime.utcnow().strftime('%H%M')}",
        status="Available",
        latitude=0.0,
        longitude=0.0,
    )
    patient = Patient(
        org_id=user.org_id,
        classification="TRAINING_ONLY",
        first_name="Training",
        last_name="Patient",
        date_of_birth="1990-01-01",
        incident_number="TR-EPCR-001",
        vitals={"bp": "120/80"},
        interventions=["Oxygen"],
        medications=["Saline"],
        procedures=["IV"],
    )
    shift = Shift(
        org_id=user.org_id,
        classification="TRAINING_ONLY",
        crew_name="Training Crew",
        shift_start=datetime.utcnow(),
        shift_end=datetime.utcnow(),
        status="Training",
        certifications=["BLS"],
    )
    invoice = BillingRecord(
        org_id=user.org_id,
        classification="TRAINING_ONLY",
        patient_name="Training Patient",
        invoice_number="TR-INV-001",
        payer="Training Payer",
        amount_due=0,
        status="Training",
        claim_payload={"demo": True},
    )
    insight = AiInsight(
        org_id=user.org_id,
        classification="TRAINING_ONLY",
        category="Training",
        prompt="Training insight",
        response="Training AI advisory output.",
        metrics={"mode": "training"},
    )

    for obj in [call, unit, patient, shift, invoice, insight]:
        apply_training_mode(obj, request)
        db.add(obj)

    db.commit()
    db.refresh(call)
    db.refresh(unit)
    db.refresh(patient)
    db.refresh(shift)
    db.refresh(invoice)
    db.refresh(insight)

    for obj, resource in [
        (call, "cad_call"),
        (unit, "cad_unit"),
        (patient, "epcr_patient"),
        (shift, "schedule_shift"),
        (invoice, "billing_record"),
        (insight, "ai_insight"),
    ]:
        audit_and_event(
            db=db,
            request=request,
            user=user,
            action="create",
            resource=resource,
            classification=obj.classification,
            after_state=model_snapshot(obj),
            event_type="RECORD_WRITTEN",
            event_payload={"resource": resource},
        )
    return {"status": "seeded"}
