import asyncio
import io
from datetime import date, datetime, time, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles, get_current_user_ws
from models.user import User, UserRole
from services.scheduling.websocket_manager import get_scheduling_ws_manager
from services.scheduling.notification_service import SchedulingNotificationService
from models.scheduling_module import (
    ScheduleTemplate, ShiftDefinition, ScheduledShift, ShiftAssignment,
    SchedulePeriod, CrewAvailability, TimeOffRequest, ShiftSwapRequest,
    CoverageRequirement, SchedulingPolicy, SchedulingAlert, 
    AISchedulingRecommendation, OvertimeTracking, FatigueIndicator,
    SchedulingAuditLog, SchedulePublication, SchedulingSubscriptionFeature,
    ShiftStatus, AssignmentStatus, TimeOffType, RequestStatus,
    AvailabilityType, AlertSeverity
)
from utils.tenancy import scoped_query, get_scoped_record
from utils.write_ops import audit_and_event, model_snapshot


router = APIRouter(
    prefix="/api/v1/scheduling",
    tags=["Scheduling Module"],
    dependencies=[Depends(require_module("SCHEDULING"))],
)


class ShiftDefinitionCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    start_time: time
    end_time: time
    duration_hours: float
    shift_type: str = "regular"
    color: str = "#FF6B35"
    station_id: Optional[int] = None
    unit_id: Optional[int] = None
    min_staff: int = 1
    max_staff: Optional[int] = None
    required_certifications: List[str] = []
    required_skills: List[str] = []
    pay_multiplier: float = 1.0
    break_duration_minutes: int = 30


class ShiftDefinitionResponse(ShiftDefinitionCreate):
    id: int
    org_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ScheduledShiftCreate(BaseModel):
    definition_id: Optional[int] = None
    schedule_period_id: Optional[int] = None
    shift_date: date
    start_datetime: datetime
    end_datetime: datetime
    station_id: Optional[int] = None
    station_name: Optional[str] = None
    unit_id: Optional[int] = None
    unit_name: Optional[str] = None
    required_staff: int = 1
    notes: Optional[str] = None
    is_overtime: bool = False
    is_critical: bool = False


class ScheduledShiftResponse(BaseModel):
    id: int
    org_id: int
    definition_id: Optional[int]
    schedule_period_id: Optional[int]
    shift_date: date
    start_datetime: datetime
    end_datetime: datetime
    status: str
    station_id: Optional[int]
    station_name: Optional[str]
    unit_id: Optional[int]
    unit_name: Optional[str]
    required_staff: int
    assigned_count: int
    notes: Optional[str]
    is_open: bool
    is_overtime: bool
    is_critical: bool
    coverage_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class ShiftAssignmentCreate(BaseModel):
    shift_id: int
    user_id: int
    personnel_id: Optional[int] = None
    role: Optional[str] = None
    position: Optional[str] = None
    is_overtime: bool = False
    is_voluntary: bool = True
    notes: Optional[str] = None


class ShiftAssignmentResponse(BaseModel):
    id: int
    org_id: int
    shift_id: int
    user_id: int
    personnel_id: Optional[int]
    status: str
    role: Optional[str]
    position: Optional[str]
    is_primary: bool
    is_overtime: bool
    is_voluntary: bool
    acknowledgment_required: bool
    acknowledged_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AvailabilityCreate(BaseModel):
    date: date
    availability_type: str = "available"
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    all_day: bool = True
    recurrence_pattern: str = "none"
    recurrence_end: Optional[date] = None
    notes: Optional[str] = None


class AvailabilityResponse(AvailabilityCreate):
    id: int
    org_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TimeOffRequestCreate(BaseModel):
    request_type: str
    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    partial_day: bool = False
    total_hours: Optional[float] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class TimeOffRequestResponse(TimeOffRequestCreate):
    id: int
    org_id: int
    user_id: int
    status: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    review_notes: Optional[str]
    conflicts_detected: List[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class SchedulePeriodCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    publish_deadline: Optional[datetime] = None
    notes: Optional[str] = None


class SchedulePeriodResponse(SchedulePeriodCreate):
    id: int
    org_id: int
    status: str
    is_published: bool
    published_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class CoverageRequirementCreate(BaseModel):
    name: str
    description: Optional[str] = None
    station_id: Optional[int] = None
    station_name: Optional[str] = None
    unit_type: Optional[str] = None
    day_of_week: Optional[int] = None
    start_time: time
    end_time: time
    min_staff: int
    optimal_staff: Optional[int] = None
    max_staff: Optional[int] = None
    required_certifications: List[str] = []
    required_roles: List[str] = []
    priority: int = 1
    is_critical: bool = False


class SchedulingPolicyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    policy_type: str
    config: dict = {}
    max_hours_per_week: Optional[float] = None
    max_consecutive_days: Optional[int] = None
    min_rest_hours: Optional[float] = None
    max_overtime_hours: Optional[float] = None
    overtime_threshold_daily: float = 8
    overtime_threshold_weekly: float = 40
    enforce_certifications: bool = True
    enforce_rest_periods: bool = True
    enforce_max_hours: bool = True


class ShiftSwapRequestCreate(BaseModel):
    original_assignment_id: int
    target_user_id: Optional[int] = None
    target_assignment_id: Optional[int] = None
    swap_type: str = "swap"
    reason: Optional[str] = None


class CalendarViewResponse(BaseModel):
    date: date
    shifts: List[dict]
    coverage_status: dict
    alerts: List[dict]


class DashboardStats(BaseModel):
    total_shifts_this_week: int
    open_shifts: int
    pending_requests: int
    coverage_rate: float
    overtime_hours: float
    alerts_count: int


def _audit_log(
    db: Session,
    request: Request,
    user: User,
    action: str,
    resource_type: str,
    resource_id: int,
    before_state: Optional[dict] = None,
    after_state: Optional[dict] = None,
    ai_assisted: bool = False,
    ai_recommendation_id: Optional[int] = None,
):
    log = SchedulingAuditLog(
        org_id=user.org_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        user_id=user.id,
        before_state=before_state,
        after_state=after_state,
        ai_assisted=ai_assisted,
        ai_recommendation_id=ai_recommendation_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)


def _check_subscription_feature(db: Session, org_id: int, feature: str) -> bool:
    sub = db.query(SchedulingSubscriptionFeature).filter(
        SchedulingSubscriptionFeature.org_id == org_id
    ).first()
    if not sub:
        return False
    return getattr(sub, feature, False)


@router.get("/health")
def scheduling_health():
    return {"status": "healthy", "module": "scheduling", "version": "2.0.0"}


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.ops_admin)),
):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    total_shifts = scoped_query(db, ScheduledShift, user.org_id, request.state.training_mode).filter(
        ScheduledShift.shift_date.between(week_start, week_end)
    ).count()
    
    open_shifts = scoped_query(db, ScheduledShift, user.org_id, request.state.training_mode).filter(
        and_(
            ScheduledShift.shift_date >= today,
            ScheduledShift.is_open == True,
            ScheduledShift.status.in_(["draft", "scheduled", "published"])
        )
    ).count()
    
    pending_requests = scoped_query(db, TimeOffRequest, user.org_id, False).filter(
        TimeOffRequest.status == "pending"
    ).count()
    
    pending_swaps = scoped_query(db, ShiftSwapRequest, user.org_id, False).filter(
        ShiftSwapRequest.status == "pending"
    ).count()
    
    alerts_count = scoped_query(db, SchedulingAlert, user.org_id, False).filter(
        SchedulingAlert.is_resolved == False
    ).count()
    
    ot_records = db.query(func.sum(OvertimeTracking.overtime_hours)).filter(
        and_(
            OvertimeTracking.org_id == user.org_id,
            OvertimeTracking.period_start <= today,
            OvertimeTracking.period_end >= today
        )
    ).scalar() or 0
    
    total_required = scoped_query(db, ScheduledShift, user.org_id, request.state.training_mode).filter(
        ScheduledShift.shift_date.between(week_start, week_end)
    ).with_entities(func.sum(ScheduledShift.required_staff)).scalar() or 1
    
    total_assigned = scoped_query(db, ScheduledShift, user.org_id, request.state.training_mode).filter(
        ScheduledShift.shift_date.between(week_start, week_end)
    ).with_entities(func.sum(ScheduledShift.assigned_count)).scalar() or 0
    
    coverage_rate = min((total_assigned / total_required) * 100, 100) if total_required > 0 else 100
    
    return DashboardStats(
        total_shifts_this_week=total_shifts,
        open_shifts=open_shifts,
        pending_requests=pending_requests + pending_swaps,
        coverage_rate=round(coverage_rate, 1),
        overtime_hours=round(ot_records, 1),
        alerts_count=alerts_count,
    )


@router.post("/shift-definitions", response_model=ShiftDefinitionResponse, status_code=status.HTTP_201_CREATED)
def create_shift_definition(
    payload: ShiftDefinitionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    existing = db.query(ShiftDefinition).filter(
        and_(
            ShiftDefinition.org_id == user.org_id,
            ShiftDefinition.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Shift code '{payload.code}' already exists")
    
    shift_def = ShiftDefinition(**payload.model_dump(), org_id=user.org_id)
    db.add(shift_def)
    db.commit()
    db.refresh(shift_def)
    
    _audit_log(db, request, user, "create", "shift_definition", shift_def.id, after_state=model_snapshot(shift_def))
    db.commit()
    
    return shift_def


@router.get("/shift-definitions", response_model=List[ShiftDefinitionResponse])
def list_shift_definitions(
    request: Request,
    active_only: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, ShiftDefinition, user.org_id, False)
    if active_only:
        query = query.filter(ShiftDefinition.is_active == True)
    return query.order_by(ShiftDefinition.name).all()


@router.get("/shift-definitions/{definition_id}", response_model=ShiftDefinitionResponse)
def get_shift_definition(
    definition_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    return get_scoped_record(db, request, ShiftDefinition, definition_id, user, resource_label="shift_definition")


@router.put("/shift-definitions/{definition_id}", response_model=ShiftDefinitionResponse)
def update_shift_definition(
    definition_id: int,
    payload: ShiftDefinitionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    shift_def = get_scoped_record(db, request, ShiftDefinition, definition_id, user, resource_label="shift_definition")
    before = model_snapshot(shift_def)
    
    for field, value in payload.model_dump().items():
        setattr(shift_def, field, value)
    
    db.commit()
    db.refresh(shift_def)
    
    _audit_log(db, request, user, "update", "shift_definition", shift_def.id, before_state=before, after_state=model_snapshot(shift_def))
    db.commit()
    
    return shift_def


@router.delete("/shift-definitions/{definition_id}")
def delete_shift_definition(
    definition_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    shift_def = get_scoped_record(db, request, ShiftDefinition, definition_id, user, resource_label="shift_definition")
    before = model_snapshot(shift_def)
    
    shift_def.is_active = False
    db.commit()
    
    _audit_log(db, request, user, "deactivate", "shift_definition", shift_def.id, before_state=before, after_state=model_snapshot(shift_def))
    db.commit()
    
    return {"status": "ok", "message": "Shift definition deactivated"}


@router.post("/periods", response_model=SchedulePeriodResponse, status_code=status.HTTP_201_CREATED)
def create_schedule_period(
    payload: SchedulePeriodCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    period = SchedulePeriod(
        **payload.model_dump(),
        org_id=user.org_id,
        created_by=user.id,
    )
    db.add(period)
    db.commit()
    db.refresh(period)
    
    _audit_log(db, request, user, "create", "schedule_period", period.id, after_state=model_snapshot(period))
    db.commit()
    
    return period


@router.get("/periods", response_model=List[SchedulePeriodResponse])
def list_schedule_periods(
    request: Request,
    include_past: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, SchedulePeriod, user.org_id, False)
    if not include_past:
        query = query.filter(SchedulePeriod.end_date >= date.today())
    return query.order_by(SchedulePeriod.start_date).all()


@router.get("/periods/{period_id}", response_model=SchedulePeriodResponse)
def get_schedule_period(
    period_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    return get_scoped_record(db, request, SchedulePeriod, period_id, user, resource_label="schedule_period")


@router.post("/periods/{period_id}/publish")
def publish_schedule_period(
    period_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    notify_crew: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    period = get_scoped_record(db, request, SchedulePeriod, period_id, user, resource_label="schedule_period")
    
    if period.is_published:
        existing_pubs = db.query(SchedulePublication).filter(
            SchedulePublication.period_id == period_id
        ).count()
        version = existing_pubs + 1
    else:
        version = 1
        period.is_published = True
        period.published_at = datetime.utcnow()
        period.published_by = user.id
        period.status = "published"
    
    shifts = db.query(ScheduledShift).filter(
        and_(
            ScheduledShift.org_id == user.org_id,
            ScheduledShift.schedule_period_id == period_id
        )
    ).all()
    
    for shift in shifts:
        shift.status = "published"
        shift.published_at = datetime.utcnow()
        shift.published_by = user.id
    
    snapshot_data = {
        "period": model_snapshot(period),
        "shifts": [model_snapshot(s) for s in shifts],
        "published_at": datetime.utcnow().isoformat(),
    }
    
    publication = SchedulePublication(
        org_id=user.org_id,
        period_id=period_id,
        version=version,
        published_by=user.id,
        snapshot_data=snapshot_data,
        notification_sent=notify_crew,
        notification_sent_at=datetime.utcnow() if notify_crew else None,
    )
    db.add(publication)
    db.commit()
    
    _audit_log(db, request, user, "publish", "schedule_period", period.id, after_state={"version": version})
    db.commit()
    
    if notify_crew:
        background_tasks.add_task(_broadcast_schedule_published, user.org_id, {
            "period_id": period_id,
            "version": version,
            "start_date": period.start_date.isoformat(),
            "end_date": period.end_date.isoformat(),
            "shifts_count": len(shifts),
        })
        
        shift_ids = [s.id for s in shifts]
        assigned_user_ids = db.query(ShiftAssignment.user_id).filter(
            ShiftAssignment.shift_id.in_(shift_ids),
            ShiftAssignment.status.notin_(["declined", "swapped"])
        ).distinct().all()
        user_ids = [u[0] for u in assigned_user_ids]
        
        if user_ids:
            SchedulingNotificationService.notify_schedule_published(
                db=db,
                user_ids=user_ids,
                org_id=user.org_id,
                period_id=period_id,
                start_date=period.start_date.isoformat(),
                end_date=period.end_date.isoformat(),
                training_mode=request.state.training_mode,
            )
    
    return {
        "status": "ok",
        "period_id": period_id,
        "version": version,
        "shifts_published": len(shifts),
        "notification_sent": notify_crew,
    }


@router.post("/shifts", response_model=ScheduledShiftResponse, status_code=status.HTTP_201_CREATED)
def create_scheduled_shift(
    payload: ScheduledShiftCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.ops_admin)),
):
    shift = ScheduledShift(
        **payload.model_dump(),
        org_id=user.org_id,
        status="draft",
        created_by=user.id,
        training_mode=request.state.training_mode,
        classification="OPS",
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    
    _audit_log(db, request, user, "create", "scheduled_shift", shift.id, after_state=model_snapshot(shift))
    db.commit()
    
    background_tasks.add_task(_broadcast_shift_created, user.org_id, model_snapshot(shift))
    
    return shift


@router.get("/shifts", response_model=List[ScheduledShiftResponse])
def list_scheduled_shifts(
    request: Request,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    station_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    period_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, ScheduledShift, user.org_id, request.state.training_mode)
    
    if start_date:
        query = query.filter(ScheduledShift.shift_date >= start_date)
    if end_date:
        query = query.filter(ScheduledShift.shift_date <= end_date)
    if station_id:
        query = query.filter(ScheduledShift.station_id == station_id)
    if status_filter:
        query = query.filter(ScheduledShift.status == status_filter)
    if period_id:
        query = query.filter(ScheduledShift.schedule_period_id == period_id)
    
    return query.order_by(ScheduledShift.start_datetime).all()


@router.get("/shifts/{shift_id}", response_model=ScheduledShiftResponse)
def get_scheduled_shift(
    shift_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    return get_scoped_record(db, request, ScheduledShift, shift_id, user, resource_label="scheduled_shift")


@router.put("/shifts/{shift_id}", response_model=ScheduledShiftResponse)
def update_scheduled_shift(
    shift_id: int,
    payload: ScheduledShiftCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.ops_admin)),
):
    shift = get_scoped_record(db, request, ScheduledShift, shift_id, user, resource_label="scheduled_shift")
    before = model_snapshot(shift)
    
    for field, value in payload.model_dump().items():
        setattr(shift, field, value)
    
    db.commit()
    db.refresh(shift)
    
    _audit_log(db, request, user, "update", "scheduled_shift", shift.id, before_state=before, after_state=model_snapshot(shift))
    db.commit()
    
    background_tasks.add_task(_broadcast_shift_updated, user.org_id, model_snapshot(shift))
    
    return shift


@router.delete("/shifts/{shift_id}")
def delete_scheduled_shift(
    shift_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    shift = get_scoped_record(db, request, ScheduledShift, shift_id, user, resource_label="scheduled_shift")
    
    if shift.status == "published":
        raise HTTPException(status_code=400, detail="Cannot delete a published shift. Cancel it instead.")
    
    before = model_snapshot(shift)
    db.delete(shift)
    db.commit()
    
    _audit_log(db, request, user, "delete", "scheduled_shift", shift_id, before_state=before)
    db.commit()
    
    background_tasks.add_task(_broadcast_shift_deleted, user.org_id, shift_id)
    
    return {"status": "ok", "message": "Shift deleted"}


@router.post("/shifts/{shift_id}/cancel")
def cancel_scheduled_shift(
    shift_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    shift = get_scoped_record(db, request, ScheduledShift, shift_id, user, resource_label="scheduled_shift")
    before = model_snapshot(shift)
    
    shift.status = "cancelled"
    shift.notes = f"{shift.notes or ''}\n[CANCELLED] {reason or 'No reason provided'}"
    db.commit()
    
    _audit_log(db, request, user, "cancel", "scheduled_shift", shift.id, before_state=before, after_state=model_snapshot(shift))
    db.commit()
    
    background_tasks.add_task(_broadcast_shift_updated, user.org_id, model_snapshot(shift))
    
    return {"status": "ok", "message": "Shift cancelled"}


class ShiftMoveRequest(BaseModel):
    new_date: date
    new_start_datetime: datetime
    new_end_datetime: datetime


@router.post("/shifts/{shift_id}/move", response_model=ScheduledShiftResponse)
def move_scheduled_shift(
    shift_id: int,
    payload: ShiftMoveRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.ops_admin)),
):
    shift = get_scoped_record(db, request, ScheduledShift, shift_id, user, resource_label="scheduled_shift")
    
    if shift.status in ["published", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot move a {shift.status} shift")
    
    before = model_snapshot(shift)
    
    shift.shift_date = payload.new_date
    shift.start_datetime = payload.new_start_datetime
    shift.end_datetime = payload.new_end_datetime
    
    db.commit()
    db.refresh(shift)
    
    _audit_log(db, request, user, "move", "scheduled_shift", shift.id, before_state=before, after_state=model_snapshot(shift))
    db.commit()
    
    background_tasks.add_task(_broadcast_shift_updated, user.org_id, model_snapshot(shift))
    
    return shift


@router.post("/assignments", response_model=ShiftAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: ShiftAssignmentCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    validate_credentials: bool = True,
    enforce_credentials: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.ops_admin)),
):
    shift = get_scoped_record(db, request, ScheduledShift, payload.shift_id, user, resource_label="scheduled_shift")
    
    existing = db.query(ShiftAssignment).filter(
        and_(
            ShiftAssignment.shift_id == payload.shift_id,
            ShiftAssignment.user_id == payload.user_id,
            ShiftAssignment.status.notin_(["declined", "swapped"])
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already assigned to this shift")
    
    credential_warning = None
    if validate_credentials:
        from services.scheduling.credential_service import get_credential_validation_service
        credential_service = get_credential_validation_service()
        validation = credential_service.validate_shift_assignment(
            db, payload.user_id, payload.shift_id, enforce_credentials
        )
        
        if not validation.get("valid", True):
            if enforce_credentials:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "Credential requirements not met",
                        "validation": validation,
                    }
                )
            else:
                credential_warning = validation
    
    assignment = ShiftAssignment(
        **payload.model_dump(),
        org_id=user.org_id,
        status="pending",
        assigned_by=user.id,
        training_mode=request.state.training_mode,
        classification="OPS",
    )
    db.add(assignment)
    
    shift.assigned_count = shift.assigned_count + 1
    if shift.assigned_count >= shift.required_staff:
        shift.is_open = False
    
    db.commit()
    db.refresh(assignment)
    
    _audit_log(db, request, user, "create", "shift_assignment", assignment.id, after_state=model_snapshot(assignment))
    db.commit()
    
    background_tasks.add_task(_broadcast_assignment_created, user.org_id, payload.user_id, model_snapshot(assignment))
    
    SchedulingNotificationService.notify_shift_assigned(
        db=db,
        user_id=payload.user_id,
        org_id=user.org_id,
        shift_id=shift.id,
        shift_date=shift.shift_date.isoformat(),
        start_time=shift.start_datetime.strftime("%H:%M"),
        end_time=shift.end_datetime.strftime("%H:%M"),
        station=shift.station_name,
        training_mode=request.state.training_mode,
    )
    
    return assignment


@router.get("/assignments", response_model=List[ShiftAssignmentResponse])
def list_assignments(
    request: Request,
    shift_id: Optional[int] = None,
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, ShiftAssignment, user.org_id, request.state.training_mode)
    
    if shift_id:
        query = query.filter(ShiftAssignment.shift_id == shift_id)
    if user_id:
        query = query.filter(ShiftAssignment.user_id == user_id)
    if status_filter:
        query = query.filter(ShiftAssignment.status == status_filter)
    
    if start_date or end_date:
        query = query.join(ScheduledShift, ShiftAssignment.shift_id == ScheduledShift.id)
        if start_date:
            query = query.filter(ScheduledShift.shift_date >= start_date)
        if end_date:
            query = query.filter(ScheduledShift.shift_date <= end_date)
    
    return query.all()


@router.post("/assignments/{assignment_id}/acknowledge")
def acknowledge_assignment(
    assignment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    assignment = get_scoped_record(db, request, ShiftAssignment, assignment_id, user, resource_label="assignment")
    
    if assignment.user_id != user.id and user.role not in [UserRole.admin.value, UserRole.ops_admin.value]:
        raise HTTPException(status_code=403, detail="Can only acknowledge your own assignments")
    
    before = model_snapshot(assignment)
    assignment.status = "confirmed"
    assignment.acknowledged_at = datetime.utcnow()
    db.commit()
    
    _audit_log(db, request, user, "acknowledge", "shift_assignment", assignment.id, before_state=before, after_state=model_snapshot(assignment))
    db.commit()
    
    return {"status": "ok", "message": "Assignment acknowledged"}


@router.delete("/assignments/{assignment_id}")
def remove_assignment(
    assignment_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.ops_admin)),
):
    assignment = get_scoped_record(db, request, ShiftAssignment, assignment_id, user, resource_label="assignment")
    before = model_snapshot(assignment)
    assigned_user_id = assignment.user_id
    
    shift = db.query(ScheduledShift).filter(ScheduledShift.id == assignment.shift_id).first()
    shift_date = shift.shift_date.isoformat() if shift else "Unknown"
    shift_id = shift.id if shift else None
    
    if shift:
        shift.assigned_count = max(0, shift.assigned_count - 1)
        if shift.assigned_count < shift.required_staff:
            shift.is_open = True
    
    db.delete(assignment)
    db.commit()
    
    _audit_log(db, request, user, "delete", "shift_assignment", assignment_id, before_state=before)
    db.commit()
    
    background_tasks.add_task(_broadcast_assignment_removed, user.org_id, assigned_user_id, assignment_id)
    
    SchedulingNotificationService.notify_shift_unassigned(
        db=db,
        user_id=assigned_user_id,
        org_id=user.org_id,
        shift_id=shift_id or 0,
        shift_date=shift_date,
        training_mode=request.state.training_mode,
    )
    
    return {"status": "ok", "message": "Assignment removed"}


@router.get("/my-schedule", response_model=List[dict])
def get_my_schedule(
    request: Request,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    if not start_date:
        start_date = date.today()
    if not end_date:
        end_date = start_date + timedelta(days=30)
    
    assignments = db.query(ShiftAssignment).join(
        ScheduledShift, ShiftAssignment.shift_id == ScheduledShift.id
    ).filter(
        and_(
            ShiftAssignment.user_id == user.id,
            ShiftAssignment.org_id == user.org_id,
            ShiftAssignment.status.notin_(["declined", "swapped"]),
            ScheduledShift.shift_date.between(start_date, end_date)
        )
    ).all()
    
    result = []
    for a in assignments:
        shift = db.query(ScheduledShift).filter(ScheduledShift.id == a.shift_id).first()
        if shift:
            result.append({
                "assignment_id": a.id,
                "shift_id": shift.id,
                "date": shift.shift_date.isoformat(),
                "start_time": shift.start_datetime.isoformat(),
                "end_time": shift.end_datetime.isoformat(),
                "station": shift.station_name,
                "unit": shift.unit_name,
                "status": a.status,
                "role": a.role,
                "acknowledged": a.acknowledged_at is not None,
                "is_overtime": a.is_overtime,
            })
    
    return sorted(result, key=lambda x: x["start_time"])


@router.post("/availability", response_model=AvailabilityResponse, status_code=status.HTTP_201_CREATED)
def submit_availability(
    payload: AvailabilityCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    availability = CrewAvailability(
        **payload.model_dump(),
        org_id=user.org_id,
        user_id=user.id,
    )
    db.add(availability)
    db.commit()
    db.refresh(availability)
    
    return availability


@router.get("/availability", response_model=List[AvailabilityResponse])
def list_availability(
    request: Request,
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, CrewAvailability, user.org_id, False)
    
    if user.role == UserRole.crew.value:
        query = query.filter(CrewAvailability.user_id == user.id)
    elif user_id:
        query = query.filter(CrewAvailability.user_id == user_id)
    
    if start_date:
        query = query.filter(CrewAvailability.date >= start_date)
    if end_date:
        query = query.filter(CrewAvailability.date <= end_date)
    
    return query.order_by(CrewAvailability.date).all()


@router.delete("/availability/{availability_id}")
def delete_availability(
    availability_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    availability = get_scoped_record(db, request, CrewAvailability, availability_id, user, resource_label="availability")
    
    if availability.user_id != user.id and user.role not in [UserRole.admin.value, UserRole.ops_admin.value]:
        raise HTTPException(status_code=403, detail="Can only delete your own availability")
    
    db.delete(availability)
    db.commit()
    
    return {"status": "ok", "message": "Availability deleted"}


@router.post("/time-off", response_model=TimeOffRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_time_off_request(
    payload: TimeOffRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    conflicts = db.query(ShiftAssignment).join(
        ScheduledShift, ShiftAssignment.shift_id == ScheduledShift.id
    ).filter(
        and_(
            ShiftAssignment.user_id == user.id,
            ShiftAssignment.status.notin_(["declined", "swapped"]),
            ScheduledShift.shift_date.between(payload.start_date, payload.end_date)
        )
    ).all()
    
    conflicts_data = []
    for c in conflicts:
        shift = db.query(ScheduledShift).filter(ScheduledShift.id == c.shift_id).first()
        if shift:
            conflicts_data.append({
                "assignment_id": c.id,
                "shift_id": shift.id,
                "date": shift.shift_date.isoformat(),
            })
    
    time_off = TimeOffRequest(
        **payload.model_dump(),
        org_id=user.org_id,
        user_id=user.id,
        status="pending",
        conflicts_detected=conflicts_data,
    )
    db.add(time_off)
    db.commit()
    db.refresh(time_off)
    
    return time_off


@router.get("/time-off", response_model=List[TimeOffRequestResponse])
def list_time_off_requests(
    request: Request,
    user_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, TimeOffRequest, user.org_id, False)
    
    if user.role == UserRole.crew.value:
        query = query.filter(TimeOffRequest.user_id == user.id)
    elif user_id:
        query = query.filter(TimeOffRequest.user_id == user_id)
    
    if status_filter:
        query = query.filter(TimeOffRequest.status == status_filter)
    if start_date:
        query = query.filter(TimeOffRequest.start_date >= start_date)
    if end_date:
        query = query.filter(TimeOffRequest.end_date <= end_date)
    
    return query.order_by(TimeOffRequest.created_at.desc()).all()


@router.post("/time-off/{request_id}/approve")
def approve_time_off_request(
    request_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    time_off = get_scoped_record(db, request, TimeOffRequest, request_id, user, resource_label="time_off_request")
    
    if time_off.status != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    
    before = model_snapshot(time_off)
    requester_id = time_off.user_id
    start_date = time_off.start_date.isoformat()
    end_date = time_off.end_date.isoformat()
    request_type = time_off.request_type.value if hasattr(time_off.request_type, 'value') else str(time_off.request_type)
    
    time_off.status = "approved"
    time_off.reviewed_by = user.id
    time_off.reviewed_at = datetime.utcnow()
    time_off.review_notes = notes
    db.commit()
    
    _audit_log(db, request, user, "approve", "time_off_request", time_off.id, before_state=before, after_state=model_snapshot(time_off))
    db.commit()
    
    background_tasks.add_task(_broadcast_time_off_status, requester_id, {
        "request_id": request_id,
        "status": "approved",
        "notes": notes,
    })
    
    SchedulingNotificationService.notify_time_off_approved(
        db=db,
        user_id=requester_id,
        org_id=user.org_id,
        request_id=request_id,
        start_date=start_date,
        end_date=end_date,
        request_type=request_type,
        training_mode=request.state.training_mode,
    )
    
    return {"status": "ok", "message": "Time off request approved"}


@router.post("/time-off/{request_id}/deny")
def deny_time_off_request(
    request_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    reason: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    time_off = get_scoped_record(db, request, TimeOffRequest, request_id, user, resource_label="time_off_request")
    
    if time_off.status != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    
    before = model_snapshot(time_off)
    requester_id = time_off.user_id
    start_date = time_off.start_date.isoformat()
    end_date = time_off.end_date.isoformat()
    
    time_off.status = "denied"
    time_off.reviewed_by = user.id
    time_off.reviewed_at = datetime.utcnow()
    time_off.review_notes = reason
    db.commit()
    
    _audit_log(db, request, user, "deny", "time_off_request", time_off.id, before_state=before, after_state=model_snapshot(time_off))
    db.commit()
    
    background_tasks.add_task(_broadcast_time_off_status, requester_id, {
        "request_id": request_id,
        "status": "denied",
        "reason": reason,
    })
    
    SchedulingNotificationService.notify_time_off_denied(
        db=db,
        user_id=requester_id,
        org_id=user.org_id,
        request_id=request_id,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        training_mode=request.state.training_mode,
    )
    
    return {"status": "ok", "message": "Time off request denied"}


@router.post("/swap-requests", status_code=status.HTTP_201_CREATED)
def create_swap_request(
    payload: ShiftSwapRequestCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    original = get_scoped_record(db, request, ShiftAssignment, payload.original_assignment_id, user, resource_label="assignment")
    
    if original.user_id != user.id:
        raise HTTPException(status_code=403, detail="Can only request swaps for your own assignments")
    
    shift = db.query(ScheduledShift).filter(ScheduledShift.id == original.shift_id).first()
    shift_date = shift.shift_date.isoformat() if shift else "Unknown"
    
    swap_req = ShiftSwapRequest(
        org_id=user.org_id,
        requester_id=user.id,
        original_assignment_id=payload.original_assignment_id,
        target_user_id=payload.target_user_id,
        target_assignment_id=payload.target_assignment_id,
        swap_type=payload.swap_type,
        reason=payload.reason,
        status="pending",
        requester_approved=True,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(swap_req)
    db.commit()
    db.refresh(swap_req)
    
    if payload.target_user_id:
        background_tasks.add_task(_broadcast_swap_request, payload.target_user_id, {
            "swap_request_id": swap_req.id,
            "requester_id": user.id,
            "swap_type": payload.swap_type,
            "reason": payload.reason,
        })
        
        requester_name = f"{user.first_name} {user.last_name}" if user.first_name else user.email
        SchedulingNotificationService.notify_swap_request(
            db=db,
            target_user_id=payload.target_user_id,
            org_id=user.org_id,
            swap_request_id=swap_req.id,
            requester_name=requester_name,
            shift_date=shift_date,
            training_mode=request.state.training_mode,
        )
    
    return {"status": "ok", "swap_request_id": swap_req.id}


@router.get("/swap-requests")
def list_swap_requests(
    request: Request,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, ShiftSwapRequest, user.org_id, False)
    
    if user.role == UserRole.crew.value:
        query = query.filter(
            or_(
                ShiftSwapRequest.requester_id == user.id,
                ShiftSwapRequest.target_user_id == user.id
            )
        )
    
    if status_filter:
        query = query.filter(ShiftSwapRequest.status == status_filter)
    
    return query.order_by(ShiftSwapRequest.created_at.desc()).all()


@router.post("/swap-requests/{swap_id}/approve")
def approve_swap_request(
    swap_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    swap = get_scoped_record(db, request, ShiftSwapRequest, swap_id, user, resource_label="swap_request")
    
    if swap.status != "pending":
        raise HTTPException(status_code=400, detail="Swap request is not pending")
    
    swap.supervisor_approved = True
    swap.approved_by = user.id
    swap.approved_at = datetime.utcnow()
    swap.status = "approved"
    
    original_assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.id == swap.original_assignment_id
    ).first()
    
    if original_assignment:
        original_assignment.status = "swapped"
        if swap.target_user_id:
            new_assignment = ShiftAssignment(
                org_id=user.org_id,
                shift_id=original_assignment.shift_id,
                user_id=swap.target_user_id,
                status="pending",
                role=original_assignment.role,
                position=original_assignment.position,
                swapped_from_id=original_assignment.id,
                assigned_by=user.id,
            )
            db.add(new_assignment)
    
    db.commit()
    
    _audit_log(db, request, user, "approve_swap", "shift_swap_request", swap.id)
    db.commit()
    
    return {"status": "ok", "message": "Swap approved"}


@router.post("/coverage-requirements", status_code=status.HTTP_201_CREATED)
def create_coverage_requirement(
    payload: CoverageRequirementCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    req = CoverageRequirement(**payload.model_dump(), org_id=user.org_id)
    db.add(req)
    db.commit()
    db.refresh(req)
    
    return {"status": "ok", "requirement_id": req.id}


@router.get("/coverage-requirements")
def list_coverage_requirements(
    request: Request,
    station_id: Optional[int] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, CoverageRequirement, user.org_id, False)
    
    if active_only:
        query = query.filter(CoverageRequirement.is_active == True)
    if station_id:
        query = query.filter(CoverageRequirement.station_id == station_id)
    
    return query.all()


@router.get("/coverage-analysis")
def analyze_coverage(
    request: Request,
    start_date: date,
    end_date: date,
    station_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    shifts = scoped_query(db, ScheduledShift, user.org_id, request.state.training_mode).filter(
        ScheduledShift.shift_date.between(start_date, end_date)
    )
    if station_id:
        shifts = shifts.filter(ScheduledShift.station_id == station_id)
    shifts = shifts.all()
    
    total_required = sum(s.required_staff for s in shifts)
    total_assigned = sum(s.assigned_count for s in shifts)
    
    gaps = []
    for s in shifts:
        if s.assigned_count < s.required_staff:
            gaps.append({
                "shift_id": s.id,
                "date": s.shift_date.isoformat(),
                "station": s.station_name,
                "required": s.required_staff,
                "assigned": s.assigned_count,
                "shortage": s.required_staff - s.assigned_count,
            })
    
    return {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "total_shifts": len(shifts),
        "total_required_staff": total_required,
        "total_assigned_staff": total_assigned,
        "coverage_rate": round((total_assigned / total_required * 100) if total_required > 0 else 100, 1),
        "gaps": sorted(gaps, key=lambda x: x["date"]),
        "gap_count": len(gaps),
    }


@router.post("/policies", status_code=status.HTTP_201_CREATED)
def create_scheduling_policy(
    payload: SchedulingPolicyCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    policy = SchedulingPolicy(**payload.model_dump(), org_id=user.org_id)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    
    _audit_log(db, request, user, "create", "scheduling_policy", policy.id, after_state=model_snapshot(policy))
    db.commit()
    
    return {"status": "ok", "policy_id": policy.id}


@router.get("/policies")
def list_scheduling_policies(
    request: Request,
    policy_type: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    query = scoped_query(db, SchedulingPolicy, user.org_id, False)
    
    if active_only:
        query = query.filter(SchedulingPolicy.is_active == True)
    if policy_type:
        query = query.filter(SchedulingPolicy.policy_type == policy_type)
    
    return query.order_by(SchedulingPolicy.priority).all()


@router.get("/alerts")
def get_scheduling_alerts(
    request: Request,
    severity: Optional[str] = None,
    unresolved_only: bool = True,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    query = scoped_query(db, SchedulingAlert, user.org_id, False)
    
    if unresolved_only:
        query = query.filter(SchedulingAlert.is_resolved == False)
    if severity:
        query = query.filter(SchedulingAlert.severity == severity)
    
    return query.order_by(SchedulingAlert.created_at.desc()).limit(limit).all()


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    alert = get_scoped_record(db, request, SchedulingAlert, alert_id, user, resource_label="alert")
    
    alert.is_acknowledged = True
    alert.acknowledged_by = user.id
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    
    return {"status": "ok", "message": "Alert acknowledged"}


@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    request: Request,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    alert = get_scoped_record(db, request, SchedulingAlert, alert_id, user, resource_label="alert")
    
    alert.is_resolved = True
    alert.resolved_by = user.id
    alert.resolved_at = datetime.utcnow()
    alert.resolution_notes = notes
    db.commit()
    
    return {"status": "ok", "message": "Alert resolved"}


@router.get("/calendar")
def get_calendar_view(
    request: Request,
    start_date: date,
    end_date: date,
    station_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    shifts = scoped_query(db, ScheduledShift, user.org_id, request.state.training_mode).filter(
        ScheduledShift.shift_date.between(start_date, end_date)
    )
    if station_id:
        shifts = shifts.filter(ScheduledShift.station_id == station_id)
    shifts = shifts.all()
    
    alerts = scoped_query(db, SchedulingAlert, user.org_id, False).filter(
        and_(
            SchedulingAlert.is_resolved == False,
            SchedulingAlert.shift_id.in_([s.id for s in shifts])
        )
    ).all()
    
    calendar_data = {}
    current = start_date
    while current <= end_date:
        day_shifts = [s for s in shifts if s.shift_date == current]
        day_alerts = [a for a in alerts if a.shift_id in [s.id for s in day_shifts]]
        
        total_required = sum(s.required_staff for s in day_shifts)
        total_assigned = sum(s.assigned_count for s in day_shifts)
        
        calendar_data[current.isoformat()] = {
            "date": current.isoformat(),
            "day_of_week": current.strftime("%A"),
            "shifts": [
                {
                    "id": s.id,
                    "start": s.start_datetime.isoformat(),
                    "end": s.end_datetime.isoformat(),
                    "station": s.station_name,
                    "unit": s.unit_name,
                    "status": s.status,
                    "required": s.required_staff,
                    "assigned": s.assigned_count,
                    "is_open": s.is_open,
                    "is_critical": s.is_critical,
                }
                for s in day_shifts
            ],
            "coverage": {
                "required": total_required,
                "assigned": total_assigned,
                "rate": round((total_assigned / total_required * 100) if total_required > 0 else 100, 1),
            },
            "alerts": [{"id": a.id, "severity": a.severity, "title": a.title} for a in day_alerts],
            "has_gaps": total_assigned < total_required,
        }
        current += timedelta(days=1)
    
    return {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "calendar": calendar_data,
    }


@router.get("/audit-log")
def get_audit_log(
    request: Request,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.founder)),
):
    query = scoped_query(db, SchedulingAuditLog, user.org_id, False)
    
    if resource_type:
        query = query.filter(SchedulingAuditLog.resource_type == resource_type)
    if resource_id:
        query = query.filter(SchedulingAuditLog.resource_id == resource_id)
    if user_id:
        query = query.filter(SchedulingAuditLog.user_id == user_id)
    if start_date:
        query = query.filter(func.date(SchedulingAuditLog.created_at) >= start_date)
    if end_date:
        query = query.filter(func.date(SchedulingAuditLog.created_at) <= end_date)
    
    return query.order_by(SchedulingAuditLog.created_at.desc()).limit(limit).all()


@router.get("/subscription")
def get_subscription_features(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    sub = db.query(SchedulingSubscriptionFeature).filter(
        SchedulingSubscriptionFeature.org_id == user.org_id
    ).first()
    
    if not sub:
        sub = SchedulingSubscriptionFeature(org_id=user.org_id, subscription_tier="base")
        db.add(sub)
        db.commit()
        db.refresh(sub)
    
    return {
        "tier": sub.subscription_tier,
        "features": {
            "ai_recommendations": sub.ai_recommendations_enabled,
            "fatigue_tracking": sub.fatigue_tracking_enabled,
            "predictive_staffing": sub.predictive_staffing_enabled,
            "overtime_modeling": sub.overtime_modeling_enabled,
            "scenario_planning": sub.scenario_planning_enabled,
            "advanced_analytics": sub.advanced_analytics_enabled,
            "cross_module_context": sub.cross_module_context_enabled,
        },
        "limits": {
            "max_schedule_periods": sub.max_schedule_periods,
            "max_templates": sub.max_templates,
            "api_rate_limit": sub.api_rate_limit,
        },
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
    }


@router.get("/ai/recommendations")
def get_ai_recommendations(
    request: Request,
    status_filter: str = "pending",
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    if not _check_subscription_feature(db, user.org_id, "ai_recommendations_enabled"):
        return {"enabled": False, "message": "AI recommendations require premium subscription", "recommendations": []}
    
    query = scoped_query(db, AISchedulingRecommendation, user.org_id, False)
    
    if status_filter:
        query = query.filter(AISchedulingRecommendation.status == status_filter)
    
    query = query.filter(AISchedulingRecommendation.expires_at > datetime.utcnow())
    
    recommendations = query.order_by(
        AISchedulingRecommendation.impact_score.desc(),
        AISchedulingRecommendation.confidence_score.desc()
    ).limit(limit).all()
    
    return {
        "enabled": True,
        "recommendations": [
            {
                "id": r.id,
                "type": r.recommendation_type,
                "title": r.title,
                "description": r.description,
                "explanation": r.explanation,
                "confidence_score": r.confidence_score,
                "impact_score": r.impact_score,
                "shift_id": r.shift_id,
                "user_id": r.user_id,
                "suggested_action": r.suggested_action,
                "alternatives": r.alternative_actions,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
            }
            for r in recommendations
        ],
    }


@router.post("/ai/recommendations/{recommendation_id}/accept")
def accept_ai_recommendation(
    recommendation_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    rec = get_scoped_record(db, request, AISchedulingRecommendation, recommendation_id, user, resource_label="recommendation")
    
    if rec.status != "pending":
        raise HTTPException(status_code=400, detail="Recommendation is not pending")
    
    rec.accepted = True
    rec.accepted_by = user.id
    rec.accepted_at = datetime.utcnow()
    rec.status = "accepted"
    db.commit()
    
    _audit_log(db, request, user, "accept", "ai_recommendation", rec.id, ai_assisted=True, ai_recommendation_id=rec.id)
    db.commit()
    
    return {"status": "ok", "message": "Recommendation accepted", "action": rec.suggested_action}


@router.post("/ai/recommendations/{recommendation_id}/reject")
def reject_ai_recommendation(
    recommendation_id: int,
    request: Request,
    reason: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    rec = get_scoped_record(db, request, AISchedulingRecommendation, recommendation_id, user, resource_label="recommendation")
    
    if rec.status != "pending":
        raise HTTPException(status_code=400, detail="Recommendation is not pending")
    
    rec.accepted = False
    rec.rejection_reason = reason
    rec.status = "rejected"
    db.commit()
    
    _audit_log(db, request, user, "reject", "ai_recommendation", rec.id, ai_assisted=False)
    db.commit()
    
    return {"status": "ok", "message": "Recommendation rejected"}


@router.get("/ai/coverage-analysis")
def get_ai_coverage_analysis(
    request: Request,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    from services.scheduling.ai_service import get_ai_service
    
    ai_service = get_ai_service(db, user.org_id)
    analysis = ai_service.analyze_shift_coverage(start_date, end_date)
    
    return {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "analysis": analysis,
    }


@router.get("/ai/assignment-suggestions/{shift_id}")
def get_ai_assignment_suggestions(
    shift_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    if not _check_subscription_feature(db, user.org_id, "ai_recommendations_enabled"):
        return {"enabled": False, "message": "AI recommendations require premium subscription", "suggestions": []}
    
    from services.scheduling.ai_service import get_ai_service
    from models.user import User as UserModel
    
    shift = get_scoped_record(db, request, ScheduledShift, shift_id, user, resource_label="shift")
    
    available_users = db.query(UserModel).filter(
        UserModel.org_id == user.org_id
    ).all()
    
    ai_service = get_ai_service(db, user.org_id)
    suggestions = ai_service.suggest_assignment(shift_id, [u.id for u in available_users])
    
    return {
        "enabled": True,
        "shift_id": shift_id,
        "suggestions": suggestions[:10],
    }


@router.get("/ai/overtime-risk/{target_user_id}")
def get_overtime_risk(
    target_user_id: int,
    request: Request,
    proposed_hours: float = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    from services.scheduling.ai_service import get_ai_service
    
    ai_service = get_ai_service(db, user.org_id)
    risk = ai_service.check_overtime_risk(target_user_id, proposed_hours)
    
    return risk


@router.get("/ai/fatigue-score/{target_user_id}")
def get_fatigue_score(
    target_user_id: int,
    request: Request,
    target_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    if not _check_subscription_feature(db, user.org_id, "fatigue_tracking_enabled"):
        return {"enabled": False, "message": "Fatigue tracking requires premium subscription"}
    
    from services.scheduling.ai_service import get_ai_service
    
    ai_service = get_ai_service(db, user.org_id)
    score = ai_service.calculate_fatigue_score(target_user_id, target_date)
    
    return score


@router.get("/ai/generate-alerts")
def generate_ai_alerts(
    request: Request,
    target_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin)),
):
    from services.scheduling.ai_service import get_ai_service
    
    ai_service = get_ai_service(db, user.org_id)
    alerts = ai_service.generate_alerts(target_date)
    
    for alert_data in alerts:
        existing = db.query(SchedulingAlert).filter(
            and_(
                SchedulingAlert.org_id == user.org_id,
                SchedulingAlert.alert_type == alert_data["type"],
                SchedulingAlert.shift_id == alert_data.get("shift_id"),
                SchedulingAlert.is_resolved == False
            )
        ).first()
        
        if not existing:
            alert = SchedulingAlert(
                org_id=user.org_id,
                alert_type=alert_data["type"],
                severity=alert_data["severity"],
                title=alert_data["title"],
                message=alert_data["message"],
                shift_id=alert_data.get("shift_id"),
            )
            db.add(alert)
    
    db.commit()
    
    return {"status": "ok", "alerts_generated": len(alerts), "alerts": alerts}


@router.get("/credentials/user/{target_user_id}")
def get_user_credentials(
    target_user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    from services.scheduling.credential_service import get_credential_validation_service
    
    credential_service = get_credential_validation_service()
    return credential_service.get_user_credentials_summary(db, target_user_id)


@router.get("/credentials/validate-assignment/{shift_id}/{target_user_id}")
def validate_shift_assignment_credentials(
    shift_id: int,
    target_user_id: int,
    request: Request,
    enforce: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    from services.scheduling.credential_service import get_credential_validation_service
    
    credential_service = get_credential_validation_service()
    return credential_service.validate_shift_assignment(db, target_user_id, shift_id, enforce)


@router.get("/credentials/qualified-users/{shift_id}")
def get_qualified_users_for_shift(
    shift_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    from services.scheduling.credential_service import get_credential_validation_service
    
    credential_service = get_credential_validation_service()
    return {
        "shift_id": shift_id,
        "qualified_users": credential_service.get_qualified_users_for_shift(db, shift_id, user.org_id),
    }


@router.post("/credentials/check-certifications")
def check_user_certifications(
    request: Request,
    user_id: int,
    certifications: List[str],
    check_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    from services.scheduling.credential_service import get_credential_validation_service
    
    credential_service = get_credential_validation_service()
    is_valid, results = credential_service.check_user_certifications(
        db, user_id, certifications, check_date
    )
    
    return {
        "user_id": user_id,
        "is_valid": is_valid,
        "required_certifications": certifications,
        "check_date": (check_date or date.today()).isoformat(),
        "validation_results": results,
    }


@router.get("/export/period/{period_id}/pdf")
def export_schedule_period_pdf(
    period_id: int,
    request: Request,
    include_assignments: bool = True,
    include_coverage: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.ops_admin, UserRole.dispatcher)),
):
    from fastapi.responses import StreamingResponse
    from services.scheduling.pdf_export_service import get_schedule_pdf_service
    
    pdf_service = get_schedule_pdf_service(db, user.org_id)
    
    try:
        pdf_bytes = pdf_service.export_schedule_period(
            period_id=period_id,
            include_assignments=include_assignments,
            include_coverage_summary=include_coverage,
        )
        
        _audit_log(db, request, user, "export", "schedule_period", period_id, after_state={"format": "pdf"})
        db.commit()
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=schedule_period_{period_id}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/export/my-schedule/pdf")
def export_my_schedule_pdf(
    request: Request,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    from fastapi.responses import StreamingResponse
    from services.scheduling.pdf_export_service import get_schedule_pdf_service
    
    if not start_date:
        start_date = date.today()
    if not end_date:
        end_date = start_date + timedelta(days=30)
    
    pdf_service = get_schedule_pdf_service(db, user.org_id)
    
    try:
        pdf_bytes = pdf_service.export_my_schedule(
            user_id=user.id,
            start_date=start_date,
            end_date=end_date,
        )
        
        _audit_log(db, request, user, "export", "my_schedule", user.id, after_state={"format": "pdf", "start_date": start_date.isoformat(), "end_date": end_date.isoformat()})
        db.commit()
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=my_schedule_{start_date}_{end_date}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/export/my-schedule/ics")
def export_my_schedule_ics(
    request: Request,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    from fastapi.responses import Response
    from services.scheduling.ics_export_service import get_ics_export_service
    
    if not start_date:
        start_date = date.today()
    if not end_date:
        end_date = start_date + timedelta(days=30)
    
    ics_service = get_ics_export_service(db, user.org_id)
    
    try:
        ics_content = ics_service.export_user_schedule_ics(
            user_id=user.id,
            start_date=start_date,
            end_date=end_date,
            calendar_name=f"FusionEMS Schedule - {user.full_name}",
        )
        
        _audit_log(db, request, user, "export", "my_schedule", user.id, after_state={"format": "ics", "start_date": start_date.isoformat(), "end_date": end_date.isoformat()})
        db.commit()
        
        return Response(
            content=ics_content,
            media_type="text/calendar",
            headers={
                "Content-Disposition": f"attachment; filename=my_schedule_{start_date}_{end_date}.ics"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/export/period/{period_id}/ics")
def export_schedule_period_ics(
    request: Request,
    period_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER])),
):
    from fastapi.responses import Response
    from services.scheduling.ics_export_service import get_ics_export_service
    
    period = get_scoped_record(db, SchedulePeriod, period_id, user.org_id)
    if not period:
        raise HTTPException(status_code=404, detail="Schedule period not found")
    
    ics_service = get_ics_export_service(db, user.org_id)
    
    try:
        ics_content = ics_service.export_period_ics(
            period_id=period_id,
        )
        
        _audit_log(db, request, user, "export", "schedule_period", period_id, after_state={"format": "ics"})
        db.commit()
        
        return Response(
            content=ics_content,
            media_type="text/calendar",
            headers={
                "Content-Disposition": f"attachment; filename=schedule_{period.start_date}_{period.end_date}.ics"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/export/shift/{shift_id}/google-calendar-url")
def get_shift_google_calendar_url(
    request: Request,
    shift_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    from services.scheduling.ics_export_service import get_ics_export_service
    
    shift = get_scoped_record(db, ScheduledShift, shift_id, user.org_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.user_id == user.id,
        ShiftAssignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED])
    ).first()
    
    if not assignment and user.role not in [UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER]:
        raise HTTPException(status_code=403, detail="Not assigned to this shift")
    
    ics_service = get_ics_export_service(db, user.org_id)
    google_url = ics_service.generate_google_calendar_url(shift, user)
    
    _audit_log(db, request, user, "generate_url", "google_calendar", shift_id)
    db.commit()
    
    return {"google_calendar_url": google_url}


@router.get("/export/shift/{shift_id}/ics")
def export_single_shift_ics(
    request: Request,
    shift_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    from fastapi.responses import Response
    from services.scheduling.ics_export_service import get_ics_export_service
    
    shift = get_scoped_record(db, ScheduledShift, shift_id, user.org_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.user_id == user.id,
        ShiftAssignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED])
    ).first()
    
    if not assignment and user.role not in [UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER]:
        raise HTTPException(status_code=403, detail="Not assigned to this shift")
    
    ics_service = get_ics_export_service(db, user.org_id)
    ics_content = ics_service.export_user_schedule_ics(
        user_id=user.id,
        start_date=shift.shift_date,
        end_date=shift.shift_date,
        calendar_name="FusionEMS Shift",
    )
    
    _audit_log(db, request, user, "export", "single_shift", shift_id, after_state={"format": "ics"})
    db.commit()
    
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=shift_{shift.shift_date}.ics"
        }
    )


@router.websocket("/ws")
async def scheduling_websocket(
    websocket: WebSocket,
    db: Session = Depends(get_db),
):
    from core.security import get_current_user_ws
    
    user = await get_current_user_ws(websocket, db)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.connect(websocket, user.org_id, user.id)
    
    try:
        await websocket.send_json({
            "type": "connected",
            "user_id": user.id,
            "org_id": user.org_id,
        })
        while True:
            data = await websocket.receive_text()
            message = {"type": "pong", "echo": data}
            await websocket.send_json(message)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user.org_id, user.id)


async def _broadcast_shift_created(org_id: int, shift_data: dict):
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.notify_shift_created(org_id, shift_data)


async def _broadcast_shift_updated(org_id: int, shift_data: dict):
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.notify_shift_updated(org_id, shift_data)


async def _broadcast_shift_deleted(org_id: int, shift_id: int):
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.notify_shift_deleted(org_id, shift_id)


async def _broadcast_assignment_created(org_id: int, user_id: int, assignment_data: dict):
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.notify_assignment_created(org_id, user_id, assignment_data)


async def _broadcast_assignment_removed(org_id: int, user_id: int, assignment_id: int):
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.notify_assignment_removed(org_id, user_id, assignment_id)


async def _broadcast_schedule_published(org_id: int, period_data: dict):
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.notify_schedule_published(org_id, period_data)


async def _broadcast_time_off_status(user_id: int, request_data: dict):
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.notify_time_off_status(user_id, request_data)


async def _broadcast_swap_request(target_user_id: int, swap_data: dict):
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.notify_swap_request(target_user_id, swap_data)


async def _broadcast_alert(org_id: int, alert_data: dict):
    ws_manager = get_scheduling_ws_manager()
    await ws_manager.notify_alert(org_id, alert_data)
