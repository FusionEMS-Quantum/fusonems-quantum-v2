from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.cad import Call, Dispatch, Unit
from models.mdt import MdtCadSyncEvent, MdtEvent, MdtObdIngest
from models.user import User, UserRole
from utils.tenancy import get_scoped_record, scoped_query
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot

MDT_STATUSES = (
    "enroute",
    "on_scene",
    "patient_contact",
    "transport",
    "at_destination",
    "available",
)


class MdtEventPayload(BaseModel):
    dispatch_id: int
    unit_id: int
    status: Literal[
        "enroute",
        "on_scene",
        "patient_contact",
        "transport",
        "at_destination",
        "available",
    ]
    call_id: int | None = None
    notes: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class MdtObdPayload(BaseModel):
    dispatch_id: int
    unit_id: int
    mileage: float
    ignition_on: bool
    lights_sirens_active: bool
    call_id: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class MdtCadSyncPayload(BaseModel):
    direction: Literal["cad_to_mdt", "mdt_to_cad"]
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    dispatch_id: int | None = None
    call_id: int | None = None
    unit_id: int | None = None


router = APIRouter(
    prefix="/api/mdt",
    tags=["MDT"],
    dependencies=[Depends(require_module("MDT"))],
)


def _ensure_unit(db: Session, user: User, request: Request, unit_id: int) -> Unit:
    return get_scoped_record(db, request, Unit, unit_id, user, resource_label="cad_unit")


def _ensure_dispatch(db: Session, user: User, request: Request, dispatch_id: int) -> Dispatch:
    return get_scoped_record(db, request, Dispatch, dispatch_id, user, resource_label="cad_dispatch")


def _ensure_call(db: Session, user: User, request: Request, call_id: int) -> Call:
    return get_scoped_record(db, request, Call, call_id, user, resource_label="cad_call")


def _compute_leg_mileage(
    db: Session,
    org_id: int,
    dispatch_id: int,
    unit_id: int,
    mileage: float,
) -> float:
    previous = (
        db.query(MdtObdIngest)
        .filter(
            MdtObdIngest.org_id == org_id,
            MdtObdIngest.dispatch_id == dispatch_id,
            MdtObdIngest.unit_id == unit_id,
            MdtObdIngest.mileage.isnot(None),
        )
        .order_by(MdtObdIngest.recorded_at.desc())
        .first()
    )
    if not previous or previous.mileage is None:
        return 0.0
    return max(0.0, mileage - previous.mileage)


def _compute_transport_distance(
    db: Session,
    org_id: int,
    dispatch_id: int,
    mileage: float,
) -> float:
    aggregate = (
        db.query(
            func.min(MdtObdIngest.mileage).label("min_mileage"),
            func.max(MdtObdIngest.mileage).label("max_mileage"),
        )
        .filter(
            MdtObdIngest.org_id == org_id,
            MdtObdIngest.dispatch_id == dispatch_id,
            MdtObdIngest.mileage.isnot(None),
        )
        .first()
    )
    min_mileage = aggregate.min_mileage if aggregate and aggregate.min_mileage is not None else mileage
    max_mileage = aggregate.max_mileage if aggregate and aggregate.max_mileage is not None else mileage
    if mileage is not None:
        min_mileage = min(min_mileage, mileage)
        max_mileage = max(max_mileage, mileage)
    if min_mileage is None or max_mileage is None:
        return 0.0
    return max(0.0, max_mileage - min_mileage)


@router.post("/events", status_code=status.HTTP_201_CREATED)
def ingest_status_event(
    payload: MdtEventPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)
    ),
):
    unit = _ensure_unit(db, user, request, payload.unit_id)
    dispatch = _ensure_dispatch(db, user, request, payload.dispatch_id)
    call = _ensure_call(db, user, request, payload.call_id) if payload.call_id else None
    event = MdtEvent(
        org_id=user.org_id,
        dispatch_id=dispatch.id,
        unit_id=unit.id,
        call_id=call.id if call else None,
        status=payload.status,
        notes=payload.notes,
        payload={"status": payload.status, "metadata": payload.metadata},
    )
    apply_training_mode(event, request)
    db.add(event)
    db.commit()
    db.refresh(event)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="mdt_event",
        classification=event.classification,
        after_state=model_snapshot(event),
        event_type=f"mdt.event.status.{payload.status}",
        event_payload={
            "dispatch_id": dispatch.id,
            "unit_id": unit.id,
            "status": payload.status,
        },
    )
    return {"status": "recorded", "event_id": event.id}


@router.get("/dispatches/{dispatch_id}/timeline")
def timeline(
    dispatch_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)
    ),
):
    _ensure_dispatch(db, user, request, dispatch_id)
    entries = (
        scoped_query(db, MdtEvent, user.org_id, request.state.training_mode)
        .filter(MdtEvent.dispatch_id == dispatch_id)
        .order_by(MdtEvent.recorded_at.asc())
        .all()
    )
    return [model_snapshot(entry) for entry in entries]


@router.post("/obd", status_code=status.HTTP_201_CREATED)
def ingest_obd(
    payload: MdtObdPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)
    ),
):
    unit = _ensure_unit(db, user, request, payload.unit_id)
    dispatch = _ensure_dispatch(db, user, request, payload.dispatch_id)
    call = _ensure_call(db, user, request, payload.call_id) if payload.call_id else None
    leg_mileage = _compute_leg_mileage(db, user.org_id, dispatch.id, unit.id, payload.mileage)
    transport_distance = _compute_transport_distance(
        db, user.org_id, dispatch.id, payload.mileage
    )
    record = MdtObdIngest(
        org_id=user.org_id,
        dispatch_id=dispatch.id,
        unit_id=unit.id,
        call_id=call.id if call else None,
        mileage=payload.mileage,
        ignition_on=payload.ignition_on,
        lights_sirens_active=payload.lights_sirens_active,
        raw_payload={
            "metadata": payload.metadata,
            "mileage": payload.mileage,
            "ignition_on": payload.ignition_on,
            "lights_sirens_active": payload.lights_sirens_active,
        },
        leg_mileage=leg_mileage,
        transport_distance=transport_distance,
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
        resource="mdt_obd_ingest",
        classification=record.classification,
        after_state=model_snapshot(record),
        event_type="mdt.obd.ingested",
        event_payload={
            "dispatch_id": dispatch.id,
            "unit_id": unit.id,
            "mileage": payload.mileage,
        },
    )
    return {"status": "ingested", "ingest_id": record.id}


@router.get("/dispatches/{dispatch_id}/obd")
def list_obd(
    dispatch_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)
    ),
):
    _ensure_dispatch(db, user, request, dispatch_id)
    records = (
        scoped_query(db, MdtObdIngest, user.org_id, request.state.training_mode)
        .filter(MdtObdIngest.dispatch_id == dispatch_id)
        .order_by(MdtObdIngest.recorded_at.asc())
        .all()
    )
    return [model_snapshot(item) for item in records]


@router.post("/cad-sync", status_code=status.HTTP_201_CREATED)
def record_cad_sync_event(
    payload: MdtCadSyncPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)
    ),
):
    call = _ensure_call(db, user, request, payload.call_id) if payload.call_id else None
    dispatch = (
        _ensure_dispatch(db, user, request, payload.dispatch_id)
        if payload.dispatch_id
        else None
    )
    unit = _ensure_unit(db, user, request, payload.unit_id) if payload.unit_id else None
    record = MdtCadSyncEvent(
        org_id=user.org_id,
        direction=payload.direction,
        event_type=payload.event_type,
        call_id=call.id if call else None,
        dispatch_id=dispatch.id if dispatch else None,
        unit_id=unit.id if unit else None,
        payload=payload.payload,
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
        resource="mdt_cad_sync_event",
        classification=record.classification,
        after_state=model_snapshot(record),
        event_type="mdt.cad.sync",
        event_payload={
            "direction": payload.direction,
            "event_type": payload.event_type,
            "dispatch_id": dispatch.id if dispatch else None,
        },
    )
    return {"status": "synced", "sync_id": record.id}
