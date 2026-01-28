from datetime import datetime, timezone
import json
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_fire_db
from core.guards import require_module
from core.security import require_roles
from models.fire import Fire911Transport, Fire911TransportTimeline
from models.user import User, UserRole
from utils.tenancy import get_scoped_record, scoped_query
from utils.legal import enforce_legal_hold
from utils.time import utc_now
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot

router = APIRouter(
    prefix="/api/fire",
    tags=["Fire-911-Transport"],
    dependencies=[Depends(require_module("FIRE"))],
)


class Fire911TransportCreate(BaseModel):
    incident_id: str
    first_name: str
    last_name: str
    date_of_birth: str
    phone: str = ""
    address: str = ""
    chief_complaint: str
    chief_complaint_icd10: str = ""
    vitals: dict = Field(default_factory=dict)
    assessment: str = ""
    interventions: list = Field(default_factory=list)
    medications: list = Field(default_factory=list)
    procedures: list = Field(default_factory=list)
    transport_decision: str = "Transport"
    transport_destination: str = ""
    transport_mode: str = "Ground"
    responding_unit: str = ""
    responding_personnel: list = Field(default_factory=list)
    scene_time: Optional[datetime] = None


class Fire911TransportUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    chief_complaint: Optional[str] = None
    chief_complaint_icd10: Optional[str] = None
    vitals: Optional[dict] = None
    assessment: Optional[str] = None
    interventions: Optional[list] = None
    medications: Optional[list] = None
    procedures: Optional[list] = None
    transport_decision: Optional[str] = None
    transport_destination: Optional[str] = None
    transport_mode: Optional[str] = None
    responding_unit: Optional[str] = None
    responding_personnel: Optional[list] = None
    narrative: Optional[str] = None
    status: Optional[str] = None


class Fire911TransportNarrative(BaseModel):
    narrative: str


class Fire911TransportTimingUpdate(BaseModel):
    scene_time: Optional[datetime] = None
    transport_initiated_time: Optional[datetime] = None
    arrival_at_hospital_time: Optional[datetime] = None


def record_timeline_event(
    db: Session,
    request: Request,
    user: User,
    transport: Fire911Transport,
    event_type: str,
    notes: str = "",
    event_data: dict | None = None,
) -> Fire911TransportTimeline:
    entry = Fire911TransportTimeline(
        org_id=user.org_id,
        transport_id=transport.id,
        transport_identifier=transport.transport_id,
        event_type=event_type,
        notes=notes,
        event_data=event_data or {},
    )
    apply_training_mode(entry, request)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="timeline",
        resource="fire_911_transport_timeline",
        classification=entry.classification,
        after_state=model_snapshot(entry),
        event_type=f"fire.911_transport.timeline.{event_type}",
        event_payload={
            "transport_id": transport.transport_id,
            "incident_id": transport.incident_id,
            "event_id": entry.id,
            "notes": notes,
        },
    )
    return entry


def ensure_transport_editable(transport: Fire911Transport) -> None:
    if transport.status in {"Locked", "Submitted"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transport is locked. Unlock to make updates.",
        )


@router.post("/911-transports", status_code=status.HTTP_201_CREATED)
def create_911_transport(
    payload: Fire911TransportCreate,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider)),
):
    transport = Fire911Transport(
        org_id=user.org_id,
        transport_id=f"FT-{uuid4().hex[:10].upper()}",
        incident_id=payload.incident_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        date_of_birth=payload.date_of_birth,
        phone=payload.phone,
        address=payload.address,
        chief_complaint=payload.chief_complaint,
        chief_complaint_icd10=payload.chief_complaint_icd10,
        vitals=payload.vitals,
        assessment=payload.assessment,
        interventions=payload.interventions,
        medications=payload.medications,
        procedures=payload.procedures,
        transport_decision=payload.transport_decision,
        transport_destination=payload.transport_destination,
        transport_mode=payload.transport_mode,
        responding_unit=payload.responding_unit,
        responding_personnel=payload.responding_personnel,
        scene_time=payload.scene_time or utc_now(),
    )
    apply_training_mode(transport, request)
    db.add(transport)
    db.commit()
    db.refresh(transport)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="fire_911_transport",
        classification=transport.classification,
        after_state=model_snapshot(transport),
        event_type="fire.911_transport.created",
        event_payload={
            "transport_id": transport.transport_id,
            "incident_id": transport.incident_id,
            "patient": f"{transport.first_name} {transport.last_name}",
        },
    )
    db.commit()
    record_timeline_event(
        db=db,
        request=request,
        user=user,
        transport=transport,
        event_type="created",
        notes="911 transport created",
    )
    return model_snapshot(transport)


@router.get("/911-transports")
def list_911_transports(
    incident_id: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, Fire911Transport, user.org_id, request.state.training_mode)
    if incident_id:
        query = query.filter(Fire911Transport.incident_id == incident_id)
    return query.order_by(Fire911Transport.created_at.desc()).all()


@router.get("/911-transports/{transport_id}")
def get_911_transport(
    transport_id: str,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles()),
):
    return get_scoped_record(
        db,
        request,
        Fire911Transport,
        transport_id,
        user,
        id_field="transport_id",
        resource_label="fire-911-transport",
    )


@router.get("/911-transports/{transport_id}/timeline")
def get_911_transport_timeline(
    transport_id: str,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles()),
):
    transport = get_scoped_record(
        db,
        request,
        Fire911Transport,
        transport_id,
        user,
        id_field="transport_id",
        resource_label="fire-911-transport",
    )
    return (
        scoped_query(db, Fire911TransportTimeline, user.org_id, request.state.training_mode)
        .filter(Fire911TransportTimeline.transport_id == transport.id)
        .order_by(Fire911TransportTimeline.recorded_at.asc())
        .all()
    )


@router.patch("/911-transports/{transport_id}")
def update_911_transport(
    transport_id: str,
    payload: Fire911TransportUpdate,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider)),
):
    transport = get_scoped_record(
        db,
        request,
        Fire911Transport,
        transport_id,
        user,
        id_field="transport_id",
        resource_label="fire-911-transport",
    )
    enforce_legal_hold(db, user.org_id, "fire_911_transport", transport.transport_id, "update")
    ensure_transport_editable(transport)
    before = model_snapshot(transport)
    changes = payload.model_dump(exclude_none=True)
    for field, value in changes.items():
        setattr(transport, field, value)
    transport.updated_at = utc_now()
    db.commit()
    db.refresh(transport)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="fire_911_transport",
        classification=transport.classification,
        before_state=before,
        after_state=model_snapshot(transport),
        event_type="fire.911_transport.updated",
        event_payload={
            "transport_id": transport.transport_id,
            "incident_id": transport.incident_id,
        },
    )
    if changes:
        record_timeline_event(
            db=db,
            request=request,
            user=user,
            transport=transport,
            event_type="updated",
            notes="Transport data updated",
            event_data={"fields": list(changes.keys())},
        )
    return transport


@router.patch("/911-transports/{transport_id}/timing")
def update_911_transport_timing(
    transport_id: str,
    payload: Fire911TransportTimingUpdate,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider)),
):
    transport = get_scoped_record(
        db,
        request,
        Fire911Transport,
        transport_id,
        user,
        id_field="transport_id",
        resource_label="fire-911-transport",
    )
    enforce_legal_hold(db, user.org_id, "fire_911_transport", transport.transport_id, "update")
    ensure_transport_editable(transport)
    before = model_snapshot(transport)
    changes = payload.model_dump(exclude_none=True)
    for field, value in changes.items():
        setattr(transport, field, value)
    transport.updated_at = utc_now()
    db.commit()
    db.refresh(transport)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="fire_911_transport",
        classification=transport.classification,
        before_state=before,
        after_state=model_snapshot(transport),
        event_type="fire.911_transport.timing_updated",
        event_payload={"transport_id": transport.transport_id},
    )
    if "transport_initiated_time" in changes:
        record_timeline_event(
            db=db,
            request=request,
            user=user,
            transport=transport,
            event_type="transport_initiated",
            notes="Transport initiated",
            event_data={"time": transport.transport_initiated_time.isoformat() if transport.transport_initiated_time else ""},
        )
    if "arrival_at_hospital_time" in changes:
        record_timeline_event(
            db=db,
            request=request,
            user=user,
            transport=transport,
            event_type="arrived_hospital",
            notes="Arrived at hospital",
            event_data={"time": transport.arrival_at_hospital_time.isoformat() if transport.arrival_at_hospital_time else ""},
        )
    return transport


@router.post("/911-transports/{transport_id}/narrative")
def update_911_transport_narrative(
    transport_id: str,
    payload: Fire911TransportNarrative,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider)),
):
    transport = get_scoped_record(
        db,
        request,
        Fire911Transport,
        transport_id,
        user,
        id_field="transport_id",
        resource_label="fire-911-transport",
    )
    enforce_legal_hold(db, user.org_id, "fire_911_transport", transport.transport_id, "update")
    ensure_transport_editable(transport)
    before = model_snapshot(transport)
    transport.narrative = payload.narrative
    transport.updated_at = utc_now()
    db.commit()
    db.refresh(transport)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="fire_911_transport",
        classification=transport.classification,
        before_state=before,
        after_state=model_snapshot(transport),
        event_type="fire.911_transport.narrative_updated",
        event_payload={"transport_id": transport.transport_id},
    )
    record_timeline_event(
        db=db,
        request=request,
        user=user,
        transport=transport,
        event_type="narrative_added",
        notes="Clinical narrative added",
    )
    return transport


@router.post("/911-transports/{transport_id}/lock")
def lock_911_transport(
    transport_id: str,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    transport = get_scoped_record(
        db,
        request,
        Fire911Transport,
        transport_id,
        user,
        id_field="transport_id",
        resource_label="fire-911-transport",
    )
    enforce_legal_hold(db, user.org_id, "fire_911_transport", transport.transport_id, "lock")
    before = model_snapshot(transport)
    transport.status = "Locked"
    transport.updated_at = utc_now()
    db.commit()
    db.refresh(transport)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="lock",
        resource="fire_911_transport",
        classification=transport.classification,
        before_state=before,
        after_state=model_snapshot(transport),
        event_type="fire.911_transport.locked",
        event_payload={"transport_id": transport.transport_id},
    )
    record_timeline_event(
        db=db,
        request=request,
        user=user,
        transport=transport,
        event_type="locked",
        notes="Transport locked for submission",
    )
    return {"status": "locked", "transport_id": transport.transport_id}


@router.post("/911-transports/{transport_id}/unlock")
def unlock_911_transport(
    transport_id: str,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    transport = get_scoped_record(
        db,
        request,
        Fire911Transport,
        transport_id,
        user,
        id_field="transport_id",
        resource_label="fire-911-transport",
    )
    enforce_legal_hold(db, user.org_id, "fire_911_transport", transport.transport_id, "unlock")
    before = model_snapshot(transport)
    transport.status = "Draft"
    transport.updated_at = utc_now()
    db.commit()
    db.refresh(transport)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="unlock",
        resource="fire_911_transport",
        classification=transport.classification,
        before_state=before,
        after_state=model_snapshot(transport),
        event_type="fire.911_transport.unlocked",
        event_payload={"transport_id": transport.transport_id},
    )
    record_timeline_event(
        db=db,
        request=request,
        user=user,
        transport=transport,
        event_type="unlocked",
        notes="Transport unlocked for editing",
    )
    return {"status": "unlocked", "transport_id": transport.transport_id}


@router.post("/911-transports/{transport_id}/submit")
def submit_911_transport(
    transport_id: str,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider)),
):
    transport = get_scoped_record(
        db,
        request,
        Fire911Transport,
        transport_id,
        user,
        id_field="transport_id",
        resource_label="fire-911-transport",
    )
    if transport.status == "Submitted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transport already submitted.",
        )
    before = model_snapshot(transport)
    transport.status = "Submitted"
    transport.updated_at = utc_now()
    db.commit()
    db.refresh(transport)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="submit",
        resource="fire_911_transport",
        classification=transport.classification,
        before_state=before,
        after_state=model_snapshot(transport),
        event_type="fire.911_transport.submitted",
        event_payload={
            "transport_id": transport.transport_id,
            "incident_id": transport.incident_id,
        },
    )
    record_timeline_event(
        db=db,
        request=request,
        user=user,
        transport=transport,
        event_type="submitted",
        notes="Transport submitted",
    )
    return {"status": "submitted", "transport_id": transport.transport_id}
