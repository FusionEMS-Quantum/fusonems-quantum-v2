from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from core.database import get_db, get_hems_db
from core.guards import require_module
from core.security import require_roles
from models.cad import CADIncident, CADIncidentTimeline, CrewLinkPage, Unit
from models.hems import HemsFlightRequest, HemsCrew
from models.module_registry import ModuleRegistry
from models.user import User, UserRole
from utils.tenancy import get_scoped_record, scoped_query
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot


router = APIRouter(
    prefix="/api/crewlink",
    tags=["CrewLink"],
    dependencies=[Depends(require_module("CREWLINK"))],
)


class TripAcknowledge(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TripUnableToRespond(BaseModel):
    reason: Literal[
        "ALREADY_ASSIGNED",
        "OUT_OF_SERVICE",
        "CREW_UNAVAILABLE",
        "EQUIPMENT_UNAVAILABLE",
        "SAFETY_CONCERN",
        "OTHER",
    ]
    notes: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TripStatusUpdate(BaseModel):
    status: Literal[
        "acknowledged",
        "enroute",
        "on_scene",
        "patient_contact",
        "loaded",
        "transporting",
        "at_destination",
        "available",
        "cancelled",
    ]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    notes: str = ""


class CrewStatusUpdate(BaseModel):
    status: Literal["available", "busy", "on_break", "off_duty"]


class PTTChannelResponse(BaseModel):
    id: str
    name: str
    description: str
    is_active: bool = True


class DutyStatusResponse(BaseModel):
    current_hours_7day: float
    current_hours_30day: float
    limit_7day: float = 30.0
    limit_30day: float = 100.0
    duty_start: datetime | None = None
    can_accept_flight: bool = True
    warning_message: str = ""


class TripResponse(BaseModel):
    id: int
    trip_number: str
    service_level: str
    priority: str
    status: str
    patient_name: str
    chief_complaint: str
    pickup_facility: str
    pickup_address: str
    destination_facility: str
    destination_address: str
    pickup_time: datetime | None = None
    special_needs: list[str] = []
    equipment_needed: list[str] = []
    acknowledged_at: datetime | None = None
    is_hems: bool = False
    weather: dict = {}
    
    class Config:
        from_attributes = True


class TripHistoryItem(BaseModel):
    id: int
    trip_number: str
    service_level: str
    priority: str
    pickup_facility: str
    destination_facility: str
    acknowledged_at: datetime | None = None
    completed_at: datetime | None = None
    
    class Config:
        from_attributes = True


class ModulesResponse(BaseModel):
    paging: bool = True
    ptt: bool = True
    messaging: bool = True
    hems: bool = False
    hemsWeather: bool = False
    hemsFrat: bool = False
    hemsDutyTime: bool = False
    hemsNotams: bool = False
    locationSharing: bool = True
    tripHistory: bool = True


def _get_trip_number(incident: CADIncident) -> str:
    return f"T{incident.id:06d}"


def _get_service_level(incident: CADIncident) -> str:
    transport_type = (incident.transport_type or "").upper()
    if "HEMS" in transport_type or "HELICOPTER" in transport_type:
        if "IFT" in transport_type or "INTERFACILITY" in transport_type:
            return "HEMS_IFT"
        return "HEMS_SCENE"
    if "CCT" in transport_type or "CRITICAL" in transport_type:
        return "CCT"
    if "ALS" in transport_type or "ADVANCED" in transport_type:
        return "ALS"
    if "SPECIALTY" in transport_type:
        return "SPECIALTY"
    return "BLS"


def _incident_to_trip_response(incident: CADIncident, weather: dict | None = None) -> dict:
    service_level = _get_service_level(incident)
    is_hems = service_level.startswith("HEMS")
    
    special_needs = []
    equipment_needed = []
    notes = incident.notes or ""
    
    if "O2" in notes.upper() or "OXYGEN" in notes.upper():
        equipment_needed.append("Supplemental O2")
    if "VENT" in notes.upper():
        equipment_needed.append("Ventilator")
    if "IV" in notes.upper():
        equipment_needed.append("IV Pump")
    if "CARDIAC" in notes.upper() or "MONITOR" in notes.upper():
        equipment_needed.append("Cardiac Monitor")
    if "BARIATRIC" in notes.upper():
        special_needs.append("Bariatric equipment")
    if "ISOLATION" in notes.upper():
        special_needs.append("Isolation precautions")
    if "DNR" in notes.upper():
        special_needs.append("DNR on file")
        
    timeline = incident.timeline_entries or []
    ack_entry = next((e for e in timeline if e.status == "acknowledged"), None)
    
    return {
        "id": incident.id,
        "trip_number": _get_trip_number(incident),
        "service_level": service_level,
        "priority": incident.priority or "ROUTINE",
        "status": incident.status or "pending",
        "patient_name": "",
        "chief_complaint": notes[:100] if notes else "",
        "pickup_facility": incident.requesting_facility or "",
        "pickup_address": "",
        "destination_facility": incident.receiving_facility or "",
        "destination_address": "",
        "pickup_time": incident.scheduled_time,
        "special_needs": special_needs,
        "equipment_needed": equipment_needed,
        "acknowledged_at": ack_entry.recorded_at if ack_entry else None,
        "is_hems": is_hems,
        "weather": weather or {},
    }


@router.get("/modules", response_model=ModulesResponse)
def get_enabled_modules(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    modules = (
        db.query(ModuleRegistry)
        .filter(ModuleRegistry.org_id == user.org_id, ModuleRegistry.enabled == True)
        .all()
    )
    enabled_keys = {m.module_key for m in modules}
    
    has_hems = "HEMS" in enabled_keys
    has_ptt = "PTT" in enabled_keys or "CREWLINK" in enabled_keys
    
    return ModulesResponse(
        paging=True,
        ptt=has_ptt,
        messaging=True,
        hems=has_hems,
        hemsWeather=has_hems,
        hemsFrat=has_hems,
        hemsDutyTime=has_hems,
        hemsNotams=has_hems,
        locationSharing=True,
        tripHistory=True,
    )


@router.get("/trips/active")
def get_active_trip(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    unit = (
        scoped_query(db, Unit, user.org_id, request.state.training_mode)
        .filter(Unit.id == user.assigned_unit_id)
        .first()
    ) if hasattr(user, 'assigned_unit_id') and user.assigned_unit_id else None
    
    if not unit:
        return None
    
    active_statuses = ("acknowledged", "enroute", "on_scene", "patient_contact", "loaded", "transporting")
    incident = (
        scoped_query(db, CADIncident, user.org_id, request.state.training_mode)
        .filter(
            CADIncident.assigned_unit_id == unit.id,
            CADIncident.status.in_(active_statuses),
        )
        .order_by(CADIncident.created_at.desc())
        .first()
    )
    
    if not incident:
        return None
        
    return _incident_to_trip_response(incident)


@router.get("/trips/pending")
def get_pending_trips(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    unit = (
        scoped_query(db, Unit, user.org_id, request.state.training_mode)
        .filter(Unit.id == user.assigned_unit_id)
        .first()
    ) if hasattr(user, 'assigned_unit_id') and user.assigned_unit_id else None
    
    query = scoped_query(db, CADIncident, user.org_id, request.state.training_mode).filter(
        CADIncident.status == "pending"
    )
    
    if unit:
        query = query.filter(
            or_(
                CADIncident.assigned_unit_id == unit.id,
                CADIncident.assigned_unit_id == None,
            )
        )
    
    incidents = query.order_by(CADIncident.created_at.desc()).limit(20).all()
    return [_incident_to_trip_response(inc) for inc in incidents]


@router.get("/trips/history")
def get_trip_history(
    request: Request,
    days: int = 7,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    incidents = (
        scoped_query(db, CADIncident, user.org_id, request.state.training_mode)
        .filter(CADIncident.created_at >= cutoff)
        .order_by(CADIncident.created_at.desc())
        .limit(50)
        .all()
    )
    
    results = []
    for inc in incidents:
        timeline = inc.timeline_entries or []
        ack_entry = next((e for e in timeline if e.status == "acknowledged"), None)
        complete_entry = next((e for e in timeline if e.status in ("available", "completed")), None)
        
        results.append({
            "id": inc.id,
            "trip_number": _get_trip_number(inc),
            "service_level": _get_service_level(inc),
            "priority": inc.priority or "ROUTINE",
            "pickup_facility": inc.requesting_facility or "",
            "destination_facility": inc.receiving_facility or "",
            "acknowledged_at": ack_entry.recorded_at if ack_entry else None,
            "completed_at": complete_entry.recorded_at if complete_entry else None,
            "status": inc.status or "pending",
        })
    
    return results


@router.get("/trips/{trip_id}")
def get_trip(
    trip_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    incident = get_scoped_record(db, request, CADIncident, trip_id, user, resource_label="cad_incident")
    
    weather = {}
    service_level = _get_service_level(incident)
    if service_level.startswith("HEMS"):
        try:
            from services.aviation.weather_service import AviationWeatherService
            weather_service = AviationWeatherService()
            weather = weather_service.get_current_conditions("KMSP")
        except Exception:
            pass
    
    return _incident_to_trip_response(incident, weather)


@router.post("/trips/{trip_id}/acknowledge")
def acknowledge_trip(
    trip_id: int,
    payload: TripAcknowledge,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    incident = get_scoped_record(db, request, CADIncident, trip_id, user, resource_label="cad_incident")
    
    if incident.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot acknowledge trip in status '{incident.status}'",
        )
    
    before_state = model_snapshot(incident)
    incident.status = "acknowledged"
    incident.updated_at = datetime.utcnow()
    
    timeline_entry = CADIncidentTimeline(
        org_id=user.org_id,
        incident_id=incident.id,
        status="acknowledged",
        notes=f"Acknowledged by {user.full_name}",
        payload={"user_id": user.id, "timestamp": payload.timestamp.isoformat()},
        recorded_by_id=user.id,
        recorded_at=payload.timestamp,
    )
    apply_training_mode(timeline_entry, request)
    db.add(timeline_entry)
    
    apply_training_mode(incident, request)
    db.commit()
    db.refresh(incident)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="cad_incident",
        classification=incident.classification,
        before_state=before_state,
        after_state=model_snapshot(incident),
        event_type="crewlink.trip.acknowledged",
        event_payload={
            "trip_id": incident.id,
            "trip_number": _get_trip_number(incident),
            "user_id": user.id,
        },
    )
    
    return _incident_to_trip_response(incident)


@router.post("/trips/{trip_id}/unable-to-respond")
def unable_to_respond(
    trip_id: int,
    payload: TripUnableToRespond,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    incident = get_scoped_record(db, request, CADIncident, trip_id, user, resource_label="cad_incident")
    
    if incident.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot mark unable to respond for trip in status '{incident.status}'",
        )
    
    reason_labels = {
        "ALREADY_ASSIGNED": "Already assigned",
        "OUT_OF_SERVICE": "Out of service",
        "CREW_UNAVAILABLE": "Crew unavailable",
        "EQUIPMENT_UNAVAILABLE": "Equipment unavailable",
        "SAFETY_CONCERN": "Safety concern",
        "OTHER": "Other",
    }
    
    before_state = model_snapshot(incident)
    incident.status = "unable_to_respond"
    incident.updated_at = datetime.utcnow()
    
    reason_text = reason_labels.get(payload.reason, payload.reason)
    notes_text = f"Unable to respond: {reason_text}"
    if payload.notes:
        notes_text += f" - {payload.notes}"
    
    timeline_entry = CADIncidentTimeline(
        org_id=user.org_id,
        incident_id=incident.id,
        status="unable_to_respond",
        notes=notes_text,
        payload={
            "user_id": user.id,
            "reason": payload.reason,
            "reason_label": reason_text,
            "notes": payload.notes,
            "timestamp": payload.timestamp.isoformat(),
        },
        recorded_by_id=user.id,
        recorded_at=payload.timestamp,
    )
    apply_training_mode(timeline_entry, request)
    db.add(timeline_entry)
    
    apply_training_mode(incident, request)
    db.commit()
    db.refresh(incident)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="cad_incident",
        classification=incident.classification,
        before_state=before_state,
        after_state=model_snapshot(incident),
        event_type="crewlink.trip.unable_to_respond",
        event_payload={
            "trip_id": incident.id,
            "trip_number": _get_trip_number(incident),
            "reason": payload.reason,
            "user_id": user.id,
        },
    )
    
    return {"status": "ok", "message": "Unable to respond recorded"}


@router.post("/trips/{trip_id}/status")
def update_trip_status(
    trip_id: int,
    payload: TripStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    incident = get_scoped_record(db, request, CADIncident, trip_id, user, resource_label="cad_incident")
    
    valid_transitions = {
        "pending": ["acknowledged", "unable_to_respond", "cancelled"],
        "acknowledged": ["enroute", "cancelled"],
        "enroute": ["on_scene", "cancelled"],
        "on_scene": ["patient_contact", "cancelled"],
        "patient_contact": ["loaded", "cancelled"],
        "loaded": ["transporting", "cancelled"],
        "transporting": ["at_destination", "cancelled"],
        "at_destination": ["available", "cancelled"],
    }
    
    current_status = incident.status or "pending"
    allowed = valid_transitions.get(current_status, [])
    
    if payload.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition from '{current_status}' to '{payload.status}'",
        )
    
    before_state = model_snapshot(incident)
    incident.status = payload.status
    incident.updated_at = datetime.utcnow()
    
    timeline_entry = CADIncidentTimeline(
        org_id=user.org_id,
        incident_id=incident.id,
        status=payload.status,
        notes=payload.notes or f"Status updated to {payload.status}",
        payload={"user_id": user.id, "timestamp": payload.timestamp.isoformat()},
        recorded_by_id=user.id,
        recorded_at=payload.timestamp,
    )
    apply_training_mode(timeline_entry, request)
    db.add(timeline_entry)
    
    apply_training_mode(incident, request)
    db.commit()
    db.refresh(incident)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="cad_incident",
        classification=incident.classification,
        before_state=before_state,
        after_state=model_snapshot(incident),
        event_type=f"crewlink.trip.status.{payload.status}",
        event_payload={
            "trip_id": incident.id,
            "trip_number": _get_trip_number(incident),
            "status": payload.status,
            "user_id": user.id,
        },
    )
    
    return _incident_to_trip_response(incident)


@router.post("/status")
def update_crew_status(
    payload: CrewStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="crew_status",
        classification="OPS",
        event_type="crewlink.crew.status_changed",
        event_payload={
            "user_id": user.id,
            "status": payload.status,
        },
    )
    
    return {"status": "ok", "crew_status": payload.status}


@router.get("/duty-status", response_model=DutyStatusResponse)
def get_duty_status(
    request: Request,
    db: Session = Depends(get_db),
    hems_db: Session = Depends(get_hems_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    crew = (
        hems_db.query(HemsCrew)
        .filter(HemsCrew.org_id == user.org_id, HemsCrew.full_name == user.full_name)
        .first()
    )
    
    if not crew:
        return DutyStatusResponse(
            current_hours_7day=0.0,
            current_hours_30day=0.0,
            limit_7day=30.0,
            limit_30day=100.0,
            duty_start=None,
            can_accept_flight=True,
            warning_message="",
        )
    
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    
    hours_7day = 0.0
    hours_30day = 0.0
    
    try:
        from models.hems_aviation import HemsFlightLog
        
        flights_7day = (
            hems_db.query(func.sum(HemsFlightLog.flight_time_hours))
            .filter(
                HemsFlightLog.org_id == user.org_id,
                HemsFlightLog.date >= seven_days_ago,
            )
            .scalar()
        ) or 0.0
        
        flights_30day = (
            hems_db.query(func.sum(HemsFlightLog.flight_time_hours))
            .filter(
                HemsFlightLog.org_id == user.org_id,
                HemsFlightLog.date >= thirty_days_ago,
            )
            .scalar()
        ) or 0.0
        
        hours_7day = float(flights_7day)
        hours_30day = float(flights_30day)
    except Exception:
        pass
    
    limit_7day = 30.0
    limit_30day = 100.0
    
    can_accept = hours_7day < limit_7day and hours_30day < limit_30day
    warning = ""
    
    if hours_7day >= limit_7day * 0.9:
        warning = f"Approaching 7-day limit: {hours_7day:.1f}/{limit_7day} hours"
    elif hours_30day >= limit_30day * 0.9:
        warning = f"Approaching 30-day limit: {hours_30day:.1f}/{limit_30day} hours"
    
    return DutyStatusResponse(
        current_hours_7day=hours_7day,
        current_hours_30day=hours_30day,
        limit_7day=limit_7day,
        limit_30day=limit_30day,
        duty_start=crew.duty_start,
        can_accept_flight=can_accept,
        warning_message=warning,
    )


@router.get("/ptt/channels")
def get_ptt_channels(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    channels = [
        PTTChannelResponse(id="dispatch", name="Dispatch", description="Main dispatch channel"),
        PTTChannelResponse(id="tac", name="Tactical", description="Tactical operations"),
        PTTChannelResponse(id="ops", name="Operations", description="General operations"),
        PTTChannelResponse(id="med_control", name="Medical Control", description="Medical direction"),
    ]
    return [c.dict() for c in channels]


@router.post("/ptt/send")
async def send_ptt_message(
    request: Request,
    audio: UploadFile = File(...),
    channel_id: str = Form(...),
    is_emergency: str = Form("false"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    audio_content = await audio.read()
    is_emergency_bool = is_emergency.lower() == "true"
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="ptt_message",
        classification="COMMS",
        event_type="crewlink.ptt.transmission",
        event_payload={
            "channel_id": channel_id,
            "user_id": user.id,
            "user_name": user.full_name,
            "is_emergency": is_emergency_bool,
            "audio_size_bytes": len(audio_content),
        },
    )
    
    return {
        "status": "sent",
        "channel_id": channel_id,
        "is_emergency": is_emergency_bool,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/weather")
def get_weather(
    airport_code: str = "KMSP",
    request: Request = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    try:
        from services.aviation.weather_service import AviationWeatherService
        weather_service = AviationWeatherService()
        return weather_service.get_current_conditions(airport_code)
    except Exception as e:
        return {
            "flight_category": "UNKNOWN",
            "visibility_miles": None,
            "ceiling_feet": None,
            "wind_speed_kts": None,
            "wind_direction": None,
            "temperature_c": None,
            "dewpoint_c": None,
            "altimeter_inhg": None,
            "raw_metar": "",
            "error": str(e),
        }


@router.get("/notams")
def get_notams(
    airport_code: str = "KMSP",
    request: Request = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    try:
        from services.aviation.notams_service import NotamsService
        notams_service = NotamsService()
        return notams_service.get_notams(airport_code)
    except Exception as e:
        return {"notams": [], "error": str(e)}


@router.post("/location")
def update_location(
    latitude: float,
    longitude: float,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    if hasattr(user, 'assigned_unit_id') and user.assigned_unit_id:
        unit = (
            scoped_query(db, Unit, user.org_id, request.state.training_mode)
            .filter(Unit.id == user.assigned_unit_id)
            .first()
        )
        if unit:
            unit.latitude = latitude
            unit.longitude = longitude
            unit.last_update = datetime.utcnow()
            apply_training_mode(unit, request)
            db.commit()
    
    return {"status": "ok", "latitude": latitude, "longitude": longitude}


class PatientContactPayload(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SetRolePayload(BaseModel):
    role: str
    response_role: str
    nemsis_crew_level: str


class MessageCreate(BaseModel):
    content: str
    recipient_id: int | None = None


class DocumentScanPayload(BaseModel):
    image_data: str
    document_type: str
    trip_id: int | None = None


class DocumentSubmitPayload(BaseModel):
    document_id: str
    trip_id: int | None = None
    attach_to_epcr: bool = False


@router.post("/trips/{trip_id}/patient-contact")
def record_patient_contact(
    trip_id: int,
    payload: PatientContactPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    incident = get_scoped_record(db, request, CADIncident, trip_id, user, resource_label="cad_incident")
    
    if incident.status not in ("acknowledged", "on_scene"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot record patient contact in status '{incident.status}'",
        )
    
    before_state = model_snapshot(incident)
    incident.status = "patient_contact"
    incident.updated_at = datetime.utcnow()
    
    timeline_entry = CADIncidentTimeline(
        org_id=user.org_id,
        incident_id=incident.id,
        status="patient_contact",
        notes=f"Patient contact recorded by {user.full_name}",
        payload={"user_id": user.id, "timestamp": payload.timestamp.isoformat()},
        recorded_by_id=user.id,
        recorded_at=payload.timestamp,
    )
    apply_training_mode(timeline_entry, request)
    db.add(timeline_entry)
    
    apply_training_mode(incident, request)
    db.commit()
    db.refresh(incident)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="cad_incident",
        classification=incident.classification,
        before_state=before_state,
        after_state=model_snapshot(incident),
        event_type="crewlink.trip.patient_contact",
        event_payload={
            "trip_id": incident.id,
            "trip_number": _get_trip_number(incident),
            "timestamp": payload.timestamp.isoformat(),
            "user_id": user.id,
        },
    )
    
    return _incident_to_trip_response(incident)


@router.post("/set-role")
def set_crew_role(
    payload: SetRolePayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="crew_role",
        classification="OPS",
        event_type="crewlink.crew.role_set",
        event_payload={
            "user_id": user.id,
            "role": payload.role,
            "response_role": payload.response_role,
            "nemsis_crew_level": payload.nemsis_crew_level,
        },
    )
    
    return {"status": "ok", "role": payload.role}


@router.get("/facilities")
def get_facilities(
    search: str = "",
    facility_type: str = "ALL",
    request: Request = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    from models.core_operations import FacilitySearchCache
    
    query = db.query(FacilitySearchCache).filter(
        FacilitySearchCache.organization_id == str(user.org_id)
    )
    
    if search:
        query = query.filter(
            or_(
                FacilitySearchCache.facility_name.ilike(f"%{search}%"),
                FacilitySearchCache.city.ilike(f"%{search}%"),
            )
        )
    
    if facility_type != "ALL":
        query = query.filter(FacilitySearchCache.facility_type == facility_type)
    
    facilities = query.order_by(FacilitySearchCache.facility_name).limit(100).all()
    
    return [
        {
            "id": f.id,
            "name": f.facility_name,
            "type": f.facility_type or "HOSPITAL",
            "address": f.address or "",
            "city": f.city or "",
            "state": f.state or "",
            "zip": f.zip_code or "",
            "main_phone": (f.extra_metadata or {}).get("main_phone", ""),
            "er_phone": (f.extra_metadata or {}).get("er_phone"),
            "dispatch_phone": (f.extra_metadata or {}).get("dispatch_phone"),
            "helipad_radio_freq": (f.extra_metadata or {}).get("helipad_radio_freq"),
            "helipad_phone": (f.extra_metadata or {}).get("helipad_phone"),
            "latitude": f.latitude,
            "longitude": f.longitude,
            "is_trauma_center": (f.extra_metadata or {}).get("is_trauma_center", False),
            "trauma_level": (f.extra_metadata or {}).get("trauma_level"),
            "is_stroke_center": (f.extra_metadata or {}).get("is_stroke_center", False),
            "is_stemi_center": (f.extra_metadata or {}).get("is_stemi_center", False),
            "is_burn_center": (f.extra_metadata or {}).get("is_burn_center", False),
            "is_peds_center": (f.extra_metadata or {}).get("is_peds_center", False),
            "notes": (f.extra_metadata or {}).get("notes", ""),
        }
        for f in facilities
    ]


@router.get("/crew/online")
def get_online_crew(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    from models.user import User as UserModel
    
    users = (
        db.query(UserModel)
        .filter(
            UserModel.org_id == user.org_id,
            UserModel.is_active == True,
        )
        .all()
    )
    
    return [
        {
            "id": str(u.id),
            "name": u.full_name,
            "role": u.role,
            "response_role": "PATIENT_ATTENDANT",
            "status": "AVAILABLE",
            "unit_id": str(u.assigned_unit_id) if hasattr(u, 'assigned_unit_id') and u.assigned_unit_id else None,
            "phone": "",
            "is_online": True,
            "last_seen": None,
            "current_trip_id": None,
        }
        for u in users
        if u.id != user.id
    ]


@router.get("/messages")
def get_messages(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    from models.cad import CrewLinkPage
    
    messages = (
        scoped_query(db, CrewLinkPage, user.org_id, request.state.training_mode)
        .filter(CrewLinkPage.event_type == "message")
        .order_by(CrewLinkPage.created_at.desc())
        .limit(100)
        .all()
    )
    
    return [
        {
            "id": str(m.id),
            "sender_id": str(m.payload.get("sender_id", "")),
            "sender_name": m.payload.get("sender_name", ""),
            "recipient_id": m.payload.get("recipient_id"),
            "channel_id": None,
            "content": m.message,
            "attachments": [],
            "timestamp": m.created_at.isoformat(),
            "read_at": None,
            "is_canned": m.payload.get("is_canned", False),
        }
        for m in messages
    ]


@router.post("/messages")
def send_message(
    payload: MessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    from models.cad import CrewLinkPage
    
    message = CrewLinkPage(
        org_id=user.org_id,
        event_type="message",
        title="Message",
        message=payload.content,
        payload={
            "sender_id": user.id,
            "sender_name": user.full_name,
            "recipient_id": payload.recipient_id,
            "is_canned": False,
        },
    )
    apply_training_mode(message, request)
    db.add(message)
    db.commit()
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="crewlink_message",
        classification="COMMS",
        event_type="crewlink.message.sent",
        event_payload={
            "message_id": message.id,
            "recipient_id": payload.recipient_id,
        },
    )
    
    return {"status": "sent", "message_id": message.id}


@router.post("/documents/scan")
def scan_document(
    payload: DocumentScanPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    import uuid
    
    document_id = str(uuid.uuid4())
    
    ocr_result = {
        "id": document_id,
        "document_type": payload.document_type,
        "image_data": payload.image_data[:100] + "...",
        "ocr_text": None,
        "ocr_confidence": 85,
        "ocr_fields": {},
        "trip_id": str(payload.trip_id) if payload.trip_id else None,
        "epcr_id": None,
        "queued": payload.trip_id is None,
        "scanned_at": datetime.utcnow().isoformat(),
        "scanned_by": user.full_name,
    }
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="scanned_document",
        classification="PHI",
        event_type="crewlink.document.scanned",
        event_payload={
            "document_id": document_id,
            "document_type": payload.document_type,
            "trip_id": payload.trip_id,
        },
    )
    
    return ocr_result


@router.post("/documents/submit")
def submit_document(
    payload: DocumentSubmitPayload,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.provider, UserRole.crew)),
):
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="scanned_document",
        classification="PHI",
        event_type="crewlink.document.submitted",
        event_payload={
            "document_id": payload.document_id,
            "trip_id": payload.trip_id,
            "attach_to_epcr": payload.attach_to_epcr,
        },
    )
    
    return {
        "status": "submitted",
        "document_id": payload.document_id,
        "attached_to_epcr": payload.attach_to_epcr and payload.trip_id is not None,
    }
