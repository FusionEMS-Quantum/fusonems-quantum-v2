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
from models.fire_scheduling import (
    FireScheduleShift,
    FireScheduleAssignment,
    FireScheduleRequest,
    FireScheduleTimeline,
)
from models.user import User, UserRole
from utils.tenancy import get_scoped_record, scoped_query
from utils.legal import enforce_legal_hold
from utils.time import utc_now
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot

router = APIRouter(
    prefix="/api/fire",
    tags=["Fire-Scheduling"],
    dependencies=[Depends(require_module("FIRE"))],
)


class FireScheduleShiftCreate(BaseModel):
    shift_type: str
    shift_name: str
    start_time: datetime
    end_time: datetime
    station_id: str
    station_name: str
    capacity: int = 0
    recurring: bool = False
    recurrence_pattern: str = ""
    notes: str = ""


class FireScheduleShiftUpdate(BaseModel):
    shift_name: Optional[str] = None
    shift_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    capacity: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class FireScheduleAssignmentCreate(BaseModel):
    shift_id: int
    personnel_id: int
    personnel_name: str
    role: str = "Firefighter"


class FireScheduleRequestCreate(BaseModel):
    personnel_id: int
    personnel_name: str
    request_type: str
    start_date: datetime
    end_date: datetime
    reason: str


class FireScheduleRequestApprove(BaseModel):
    approved_by: str
    notes: str = ""


def record_timeline_event(
    db: Session,
    request: Request,
    user: User,
    shift: FireScheduleShift,
    event_type: str,
    notes: str = "",
    event_data: dict | None = None,
) -> FireScheduleTimeline:
    entry = FireScheduleTimeline(
        org_id=user.org_id,
        shift_id=shift.id,
        shift_identifier=shift.shift_id,
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
        resource="fire_schedule_timeline",
        classification=entry.classification,
        after_state=model_snapshot(entry),
        event_type=f"fire.schedule.timeline.{event_type}",
        event_payload={
            "shift_id": shift.shift_id,
            "event_id": entry.id,
        },
    )
    return entry


@router.post("/schedule/shifts", status_code=status.HTTP_201_CREATED)
def create_shift(
    payload: FireScheduleShiftCreate,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    duration = (payload.end_time - payload.start_time).total_seconds() / 3600
    shift = FireScheduleShift(
        org_id=user.org_id,
        shift_id=f"SFT-{uuid4().hex[:10].upper()}",
        shift_type=payload.shift_type,
        shift_name=payload.shift_name,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_hours=int(duration),
        station_id=payload.station_id,
        station_name=payload.station_name,
        capacity=payload.capacity,
        recurring=payload.recurring,
        recurrence_pattern=payload.recurrence_pattern,
        notes=payload.notes,
        created_by=user.email,
    )
    apply_training_mode(shift, request)
    db.add(shift)
    db.commit()
    db.refresh(shift)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="fire_schedule_shift",
        classification=shift.classification,
        after_state=model_snapshot(shift),
        event_type="fire.schedule.shift_created",
        event_payload={
            "shift_id": shift.shift_id,
            "shift_name": shift.shift_name,
        },
    )
    record_timeline_event(
        db=db,
        request=request,
        user=user,
        shift=shift,
        event_type="created",
        notes="Shift created",
    )
    return model_snapshot(shift)


@router.get("/schedule/shifts")
def list_shifts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    station_id: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, FireScheduleShift, user.org_id, request.state.training_mode)
    if start_date:
        query = query.filter(FireScheduleShift.start_time >= start_date)
    if end_date:
        query = query.filter(FireScheduleShift.end_time <= end_date)
    if station_id:
        query = query.filter(FireScheduleShift.station_id == station_id)
    return query.order_by(FireScheduleShift.start_time.asc()).all()


@router.get("/schedule/shifts/{shift_id}")
def get_shift(
    shift_id: str,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles()),
):
    shift = get_scoped_record(
        db,
        request,
        FireScheduleShift,
        shift_id,
        user,
        id_field="shift_id",
        resource_label="fire-schedule-shift",
    )
    assignments = (
        scoped_query(db, FireScheduleAssignment, user.org_id, request.state.training_mode)
        .filter(FireScheduleAssignment.shift_id == shift.id)
        .all()
    )
    return {
        **model_snapshot(shift),
        "assignments": [model_snapshot(a) for a in assignments],
    }


@router.patch("/schedule/shifts/{shift_id}")
def update_shift(
    shift_id: str,
    payload: FireScheduleShiftUpdate,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    shift = get_scoped_record(
        db,
        request,
        FireScheduleShift,
        shift_id,
        user,
        id_field="shift_id",
        resource_label="fire-schedule-shift",
    )
    enforce_legal_hold(db, user.org_id, "fire_schedule_shift", shift.shift_id, "update")
    before = model_snapshot(shift)
    changes = payload.model_dump(exclude_none=True)
    
    if "start_time" in changes and "end_time" in changes:
        duration = (changes["end_time"] - changes["start_time"]).total_seconds() / 3600
        shift.duration_hours = int(duration)
    elif "start_time" in changes:
        duration = (changes["start_time"] - shift.end_time).total_seconds() / 3600
        shift.duration_hours = int(abs(duration))
    elif "end_time" in changes:
        duration = (shift.start_time - changes["end_time"]).total_seconds() / 3600
        shift.duration_hours = int(abs(duration))
    
    for field, value in changes.items():
        setattr(shift, field, value)
    shift.updated_at = utc_now()
    db.commit()
    db.refresh(shift)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="fire_schedule_shift",
        classification=shift.classification,
        before_state=before,
        after_state=model_snapshot(shift),
        event_type="fire.schedule.shift_updated",
        event_payload={"shift_id": shift.shift_id},
    )
    if changes:
        record_timeline_event(
            db=db,
            request=request,
            user=user,
            shift=shift,
            event_type="updated",
            notes="Shift updated",
            event_data={"fields": list(changes.keys())},
        )
    return shift


@router.post("/schedule/shifts/{shift_id}/assign", status_code=status.HTTP_201_CREATED)
def assign_personnel_to_shift(
    shift_id: str,
    payload: FireScheduleAssignmentCreate,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    shift = get_scoped_record(
        db,
        request,
        FireScheduleShift,
        shift_id,
        user,
        id_field="shift_id",
        resource_label="fire-schedule-shift",
    )
    if len(shift.assigned_personnel) >= shift.capacity and shift.capacity > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Shift is at capacity.",
        )
    
    assignment = FireScheduleAssignment(
        org_id=user.org_id,
        assignment_id=f"ASN-{uuid4().hex[:10].upper()}",
        shift_id=shift.id,
        shift_identifier=shift.shift_id,
        personnel_id=payload.personnel_id,
        personnel_name=payload.personnel_name,
        role=payload.role,
    )
    apply_training_mode(assignment, request)
    db.add(assignment)
    
    shift.assigned_personnel.append({
        "personnel_id": payload.personnel_id,
        "personnel_name": payload.personnel_name,
        "role": payload.role,
    })
    shift.updated_at = utc_now()
    db.commit()
    db.refresh(assignment)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="assign",
        resource="fire_schedule_assignment",
        classification=assignment.classification,
        after_state=model_snapshot(assignment),
        event_type="fire.schedule.personnel_assigned",
        event_payload={
            "assignment_id": assignment.assignment_id,
            "shift_id": shift.shift_id,
            "personnel_id": payload.personnel_id,
        },
    )
    record_timeline_event(
        db=db,
        request=request,
        user=user,
        shift=shift,
        event_type="personnel_assigned",
        notes=f"{payload.personnel_name} assigned",
        event_data={"personnel_id": payload.personnel_id},
    )
    return model_snapshot(assignment)


@router.delete("/schedule/assignments/{assignment_id}")
def remove_assignment(
    assignment_id: str,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    assignment = (
        scoped_query(db, FireScheduleAssignment, user.org_id, request.state.training_mode)
        .filter(FireScheduleAssignment.assignment_id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    shift = db.query(FireScheduleShift).filter(FireScheduleShift.id == assignment.shift_id).first()
    before = model_snapshot(assignment)
    db.delete(assignment)
    db.commit()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="delete",
        resource="fire_schedule_assignment",
        classification=assignment.classification,
        before_state=before,
        after_state={},
        event_type="fire.schedule.personnel_removed",
        event_payload={
            "assignment_id": assignment_id,
            "shift_id": shift.shift_id,
        },
    )
    return {"status": "removed", "assignment_id": assignment_id}


@router.post("/schedule/requests", status_code=status.HTTP_201_CREATED)
def create_request(
    payload: FireScheduleRequestCreate,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider)),
):
    req = FireScheduleRequest(
        org_id=user.org_id,
        request_id=f"REQ-{uuid4().hex[:10].upper()}",
        personnel_id=payload.personnel_id,
        personnel_name=payload.personnel_name,
        request_type=payload.request_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
    )
    apply_training_mode(req, request)
    db.add(req)
    db.commit()
    db.refresh(req)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="fire_schedule_request",
        classification=req.classification,
        after_state=model_snapshot(req),
        event_type="fire.schedule.request_created",
        event_payload={
            "request_id": req.request_id,
            "personnel_id": payload.personnel_id,
        },
    )
    return model_snapshot(req)


@router.get("/schedule/requests")
def list_requests(
    status_filter: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, FireScheduleRequest, user.org_id, request.state.training_mode)
    if status_filter:
        query = query.filter(FireScheduleRequest.status == status_filter)
    return query.order_by(FireScheduleRequest.created_at.desc()).all()


@router.post("/schedule/requests/{request_id}/approve")
def approve_request(
    request_id: str,
    payload: FireScheduleRequestApprove,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    req = (
        scoped_query(db, FireScheduleRequest, user.org_id, request.state.training_mode)
        .filter(FireScheduleRequest.request_id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    
    before = model_snapshot(req)
    req.status = "Approved"
    req.approved_by = payload.approved_by
    req.approved_at = utc_now()
    req.notes = payload.notes
    db.commit()
    db.refresh(req)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="approve",
        resource="fire_schedule_request",
        classification=req.classification,
        before_state=before,
        after_state=model_snapshot(req),
        event_type="fire.schedule.request_approved",
        event_payload={"request_id": req.request_id},
    )
    return req


@router.post("/schedule/requests/{request_id}/deny")
def deny_request(
    request_id: str,
    payload: FireScheduleRequestApprove,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    req = (
        scoped_query(db, FireScheduleRequest, user.org_id, request.state.training_mode)
        .filter(FireScheduleRequest.request_id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    
    before = model_snapshot(req)
    req.status = "Denied"
    req.notes = payload.notes
    db.commit()
    db.refresh(req)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="deny",
        resource="fire_schedule_request",
        classification=req.classification,
        before_state=before,
        after_state=model_snapshot(req),
        event_type="fire.schedule.request_denied",
        event_payload={"request_id": req.request_id},
    )
    return req


@router.get("/schedule/shifts/{shift_id}/timeline")
def get_shift_timeline(
    shift_id: str,
    request: Request,
    db: Session = Depends(get_fire_db),
    user: User = Depends(require_roles()),
):
    shift = get_scoped_record(
        db,
        request,
        FireScheduleShift,
        shift_id,
        user,
        id_field="shift_id",
        resource_label="fire-schedule-shift",
    )
    return (
        scoped_query(db, FireScheduleTimeline, user.org_id, request.state.training_mode)
        .filter(FireScheduleTimeline.shift_id == shift.id)
        .order_by(FireScheduleTimeline.recorded_at.asc())
        .all()
    )
