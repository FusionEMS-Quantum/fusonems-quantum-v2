from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from core.config import settings
from core.database import get_db
from core.guards import require_module
from models.hems_aviation import (
    HemsFlightLog, HemsAircraftMaintenance, HemsAirworthinessDirective,
    HemsWeatherMinimums, HemsWeatherDecisionLog, HemsPilotCurrency,
    HemsFlightDutyRecord, HemsChecklist, HemsChecklistCompletion,
    HemsFRATAssessment
)
from models.hems import HemsMission, HemsAircraft, HemsCrew
from models.user import User
from core.security import get_current_user
from utils.logger import logger
from utils.tenancy import scoped_query
from utils.time import utc_now
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot

router = APIRouter(
    prefix="/api/hems/aviation",
    tags=["hems-aviation"],
    dependencies=[Depends(require_module("HEMS"))],
)


class FlightLogCreate(BaseModel):
    mission_id: Optional[int] = None
    aircraft_id: int
    pilot_id: int
    flight_date: date
    departure_airport: Optional[str] = None
    arrival_airport: Optional[str] = None
    hobbs_start: float
    hobbs_end: float
    tach_start: Optional[float] = None
    tach_end: Optional[float] = None
    fuel_gallons_used: Optional[float] = None
    fuel_gallons_added: Optional[float] = None
    day_vfr_time: int = 0
    night_vfr_time: int = 0
    day_ifr_time: int = 0
    night_ifr_time: int = 0
    landings_day: int = 0
    landings_night: int = 0
    gps_track: Optional[List[dict]] = None
    remarks: Optional[str] = None


class MaintenanceCreate(BaseModel):
    aircraft_id: int
    maintenance_type: str
    description: str
    hobbs_at_maintenance: Optional[float] = None
    tach_at_maintenance: Optional[float] = None
    airframe_hours_at_maintenance: Optional[float] = None
    completed_date: date
    mechanic_name: str
    mechanic_certificate_number: str
    inspector_approval: Optional[str] = None
    parts_replaced: Optional[List[dict]] = None
    work_order_number: Optional[str] = None
    cost: Optional[float] = None
    next_due_hobbs: Optional[float] = None
    next_due_date: Optional[date] = None
    next_due_type: Optional[str] = None
    return_to_service: bool = True
    discrepancies_remaining: Optional[str] = None


class ADCreate(BaseModel):
    aircraft_id: int
    ad_number: str
    subject: str
    effective_date: Optional[date] = None
    recurring: bool = False
    recurring_interval_hours: Optional[float] = None
    recurring_interval_calendar: Optional[str] = None


class ADCompliance(BaseModel):
    compliance_date: date
    compliance_method: str
    compliance_hobbs: Optional[float] = None
    mechanic_name: str
    mechanic_certificate: str
    next_due_hobbs: Optional[float] = None
    next_due_date: Optional[date] = None


class WeatherMinimumsCreate(BaseModel):
    base_name: str
    day_vfr_ceiling_feet: int = 800
    day_vfr_visibility_miles: float = 2.0
    night_vfr_ceiling_feet: int = 1000
    night_vfr_visibility_miles: float = 3.0
    ifr_ceiling_feet: int = 200
    ifr_visibility_miles: float = 0.5
    max_wind_knots: int = 35
    max_gusts_knots: int = 45
    max_crosswind_knots: int = 20
    icing_prohibited: bool = True
    thunderstorm_distance_nm: int = 20
    night_operations_allowed: bool = True
    ifr_operations_allowed: bool = False
    special_minimums: Optional[dict] = None


class WeatherDecisionCreate(BaseModel):
    mission_id: Optional[int] = None
    request_id: Optional[int] = None
    decision: str
    metar_text: Optional[str] = None
    taf_text: Optional[str] = None
    ceiling_feet: Optional[int] = None
    visibility_miles: Optional[float] = None
    wind_direction: Optional[int] = None
    wind_speed_knots: Optional[int] = None
    wind_gusts_knots: Optional[int] = None
    temperature_c: Optional[int] = None
    dewpoint_c: Optional[int] = None
    altimeter: Optional[float] = None
    flight_category: Optional[str] = None
    tfrs_active: Optional[List[dict]] = None
    notams_relevant: Optional[List[dict]] = None
    icing_conditions: bool = False
    thunderstorms: bool = False
    justification: str


class PilotCurrencyCreate(BaseModel):
    pilot_id: int
    certificate_number: str
    certificate_type: Optional[str] = None
    medical_class: str
    medical_issued: Optional[date] = None
    medical_expires: Optional[date] = None
    flight_review_date: Optional[date] = None
    instrument_proficiency_check: Optional[date] = None
    part_135_checkride_date: Optional[date] = None
    annual_recurrent_training: Optional[date] = None
    crm_training_date: Optional[date] = None
    type_ratings: Optional[List[str]] = None
    endorsements: Optional[List[str]] = None


class PilotCurrencyUpdate(BaseModel):
    medical_class: Optional[str] = None
    medical_issued: Optional[date] = None
    medical_expires: Optional[date] = None
    flight_review_date: Optional[date] = None
    instrument_proficiency_check: Optional[date] = None
    last_6_approaches_date: Optional[date] = None
    last_3_takeoffs_day: Optional[date] = None
    last_3_landings_day: Optional[date] = None
    last_3_takeoffs_night: Optional[date] = None
    last_3_landings_night: Optional[date] = None
    nvg_currency_date: Optional[date] = None
    part_135_checkride_date: Optional[date] = None
    annual_recurrent_training: Optional[date] = None
    crm_training_date: Optional[date] = None
    total_flight_hours: Optional[float] = None
    total_pic_hours: Optional[float] = None
    total_night_hours: Optional[float] = None
    total_ifr_hours: Optional[float] = None
    total_nvg_hours: Optional[float] = None
    hours_in_type: Optional[float] = None
    type_ratings: Optional[List[str]] = None
    endorsements: Optional[List[str]] = None


class FlightDutyCreate(BaseModel):
    crew_id: int
    duty_date: date
    duty_start: datetime
    duty_end: Optional[datetime] = None
    flight_time_minutes: int = 0
    rest_start: Optional[datetime] = None
    rest_end: Optional[datetime] = None
    rest_adequate: bool = True
    fatigue_call_used: bool = False
    fatigue_reason: Optional[str] = None


class ChecklistCreate(BaseModel):
    checklist_name: str
    checklist_type: str
    aircraft_type: Optional[str] = None
    version: str = "1.0"
    effective_date: Optional[date] = None
    items: List[dict]


class ChecklistCompletionCreate(BaseModel):
    checklist_id: int
    mission_id: Optional[int] = None
    aircraft_id: int
    hobbs_reading: Optional[float] = None
    fuel_quantity: Optional[float] = None
    item_results: List[dict]
    discrepancies: Optional[List[dict]] = None


class FRATCreate(BaseModel):
    mission_id: Optional[int] = None
    request_id: Optional[int] = None
    weather_score: int = 0
    crew_score: int = 0
    aircraft_score: int = 0
    mission_score: int = 0
    patient_score: int = 0
    environment_score: int = 0
    weather_factors: Optional[List[dict]] = None
    crew_factors: Optional[List[dict]] = None
    aircraft_factors: Optional[List[dict]] = None
    mission_factors: Optional[List[dict]] = None
    patient_factors: Optional[List[dict]] = None
    environment_factors: Optional[List[dict]] = None
    mitigations: Optional[List[dict]] = None


def _calculate_flight_time(hobbs_start: float, hobbs_end: float) -> int:
    return int((hobbs_end - hobbs_start) * 60)


def _calculate_part_135_limits(db: Session, org_id: int, crew_id: int, duty_date: date) -> dict:
    seven_days_ago = duty_date - timedelta(days=7)
    thirty_days_ago = duty_date - timedelta(days=30)
    
    seven_day_flight = db.query(func.sum(HemsFlightDutyRecord.flight_time_minutes)).filter(
        HemsFlightDutyRecord.org_id == org_id,
        HemsFlightDutyRecord.crew_id == crew_id,
        HemsFlightDutyRecord.duty_date >= seven_days_ago,
        HemsFlightDutyRecord.duty_date <= duty_date,
    ).scalar() or 0
    
    thirty_day_flight = db.query(func.sum(HemsFlightDutyRecord.flight_time_minutes)).filter(
        HemsFlightDutyRecord.org_id == org_id,
        HemsFlightDutyRecord.crew_id == crew_id,
        HemsFlightDutyRecord.duty_date >= thirty_days_ago,
        HemsFlightDutyRecord.duty_date <= duty_date,
    ).scalar() or 0
    
    return {
        "rolling_7_day_flight_hours": seven_day_flight / 60,
        "rolling_30_day_flight_hours": thirty_day_flight / 60,
        "7_day_limit_hours": 32,
        "30_day_limit_hours": 100,
        "7_day_remaining": max(0, 32 - (seven_day_flight / 60)),
        "30_day_remaining": max(0, 100 - (thirty_day_flight / 60)),
    }


@router.post("/flight-logs")
def create_flight_log(
    payload: FlightLogCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    flight_time = _calculate_flight_time(payload.hobbs_start, payload.hobbs_end)
    
    log = HemsFlightLog(
        org_id=org_id,
        mission_id=payload.mission_id,
        aircraft_id=payload.aircraft_id,
        pilot_id=payload.pilot_id,
        flight_date=payload.flight_date,
        departure_airport=payload.departure_airport,
        arrival_airport=payload.arrival_airport,
        hobbs_start=payload.hobbs_start,
        hobbs_end=payload.hobbs_end,
        tach_start=payload.tach_start,
        tach_end=payload.tach_end,
        flight_time_minutes=flight_time,
        fuel_gallons_used=payload.fuel_gallons_used,
        fuel_gallons_added=payload.fuel_gallons_added,
        day_vfr_time=payload.day_vfr_time,
        night_vfr_time=payload.night_vfr_time,
        day_ifr_time=payload.day_ifr_time,
        night_ifr_time=payload.night_ifr_time,
        landings_day=payload.landings_day,
        landings_night=payload.landings_night,
        gps_track=payload.gps_track,
        remarks=payload.remarks,
        pilot_signature=user.email,
    )
    apply_training_mode(log, request)
    db.add(log)
    
    aircraft = db.query(HemsAircraft).filter(HemsAircraft.id == payload.aircraft_id).first()
    if aircraft:
        if not hasattr(aircraft, 'total_hobbs') or aircraft.total_hobbs is None:
            pass
    
    currency = db.query(HemsPilotCurrency).filter(
        HemsPilotCurrency.org_id == org_id,
        HemsPilotCurrency.pilot_id == payload.pilot_id,
    ).first()
    if currency:
        currency.total_flight_hours = (currency.total_flight_hours or 0) + (flight_time / 60)
        if payload.day_vfr_time + payload.night_vfr_time > 0:
            currency.total_pic_hours = (currency.total_pic_hours or 0) + (flight_time / 60)
        if payload.night_vfr_time + payload.night_ifr_time > 0:
            currency.total_night_hours = (currency.total_night_hours or 0) + ((payload.night_vfr_time + payload.night_ifr_time) / 60)
        if payload.day_ifr_time + payload.night_ifr_time > 0:
            currency.total_ifr_hours = (currency.total_ifr_hours or 0) + ((payload.day_ifr_time + payload.night_ifr_time) / 60)
        if payload.landings_day > 0:
            currency.last_3_takeoffs_day = payload.flight_date
            currency.last_3_landings_day = payload.flight_date
        if payload.landings_night > 0:
            currency.last_3_takeoffs_night = payload.flight_date
            currency.last_3_landings_night = payload.flight_date
        currency.updated_at = utc_now()
    
    db.commit()
    db.refresh(log)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="hems_flight_log",
        classification="AVIATION_SAFETY",
        after_state=model_snapshot(log),
        event_type="hems.aviation.flight_log.created",
        event_payload={"log_id": log.id, "aircraft_id": payload.aircraft_id, "flight_time": flight_time},
    )
    
    return {
        "id": log.id,
        "flight_date": log.flight_date.isoformat(),
        "aircraft_id": log.aircraft_id,
        "pilot_id": log.pilot_id,
        "hobbs_start": log.hobbs_start,
        "hobbs_end": log.hobbs_end,
        "flight_time_minutes": log.flight_time_minutes,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


@router.get("/flight-logs")
def list_flight_logs(
    request: Request,
    aircraft_id: Optional[int] = None,
    pilot_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    training_mode = getattr(request.state, "training_mode", False)
    
    query = scoped_query(db, HemsFlightLog, org_id, training_mode)
    
    if aircraft_id:
        query = query.filter(HemsFlightLog.aircraft_id == aircraft_id)
    if pilot_id:
        query = query.filter(HemsFlightLog.pilot_id == pilot_id)
    if start_date:
        query = query.filter(HemsFlightLog.flight_date >= start_date)
    if end_date:
        query = query.filter(HemsFlightLog.flight_date <= end_date)
    
    logs = query.order_by(HemsFlightLog.flight_date.desc()).offset(offset).limit(limit).all()
    
    return {
        "flight_logs": [
            {
                "id": l.id,
                "flight_date": l.flight_date.isoformat(),
                "aircraft_id": l.aircraft_id,
                "pilot_id": l.pilot_id,
                "departure_airport": l.departure_airport,
                "arrival_airport": l.arrival_airport,
                "hobbs_start": l.hobbs_start,
                "hobbs_end": l.hobbs_end,
                "flight_time_minutes": l.flight_time_minutes,
                "landings_day": l.landings_day,
                "landings_night": l.landings_night,
            }
            for l in logs
        ],
        "count": len(logs),
    }


@router.post("/maintenance")
def create_maintenance_record(
    payload: MaintenanceCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    record = HemsAircraftMaintenance(
        org_id=org_id,
        aircraft_id=payload.aircraft_id,
        maintenance_type=payload.maintenance_type,
        description=payload.description,
        hobbs_at_maintenance=payload.hobbs_at_maintenance,
        tach_at_maintenance=payload.tach_at_maintenance,
        airframe_hours_at_maintenance=payload.airframe_hours_at_maintenance,
        completed_date=payload.completed_date,
        mechanic_name=payload.mechanic_name,
        mechanic_certificate_number=payload.mechanic_certificate_number,
        inspector_approval=payload.inspector_approval,
        parts_replaced=payload.parts_replaced,
        work_order_number=payload.work_order_number,
        cost=payload.cost,
        next_due_hobbs=payload.next_due_hobbs,
        next_due_date=payload.next_due_date,
        next_due_type=payload.next_due_type,
        return_to_service=payload.return_to_service,
        discrepancies_remaining=payload.discrepancies_remaining,
    )
    apply_training_mode(record, request)
    db.add(record)
    
    aircraft = db.query(HemsAircraft).filter(HemsAircraft.id == payload.aircraft_id).first()
    if aircraft:
        if payload.return_to_service:
            aircraft.maintenance_status = "Green"
        else:
            aircraft.maintenance_status = "Red"
    
    db.commit()
    db.refresh(record)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="hems_maintenance",
        classification="AVIATION_SAFETY",
        after_state=model_snapshot(record),
        event_type="hems.aviation.maintenance.created",
        event_payload={"record_id": record.id, "aircraft_id": payload.aircraft_id, "type": payload.maintenance_type},
    )
    
    return {
        "id": record.id,
        "aircraft_id": record.aircraft_id,
        "maintenance_type": record.maintenance_type,
        "completed_date": record.completed_date.isoformat(),
        "return_to_service": record.return_to_service,
        "next_due_date": record.next_due_date.isoformat() if record.next_due_date else None,
    }


@router.get("/maintenance")
def list_maintenance_records(
    request: Request,
    aircraft_id: Optional[int] = None,
    maintenance_type: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    training_mode = getattr(request.state, "training_mode", False)
    
    query = scoped_query(db, HemsAircraftMaintenance, org_id, training_mode)
    
    if aircraft_id:
        query = query.filter(HemsAircraftMaintenance.aircraft_id == aircraft_id)
    if maintenance_type:
        query = query.filter(HemsAircraftMaintenance.maintenance_type == maintenance_type)
    
    records = query.order_by(HemsAircraftMaintenance.completed_date.desc()).offset(offset).limit(limit).all()
    
    return {
        "maintenance_records": [
            {
                "id": r.id,
                "aircraft_id": r.aircraft_id,
                "maintenance_type": r.maintenance_type,
                "description": r.description,
                "completed_date": r.completed_date.isoformat(),
                "mechanic_name": r.mechanic_name,
                "return_to_service": r.return_to_service,
                "next_due_date": r.next_due_date.isoformat() if r.next_due_date else None,
                "next_due_hobbs": r.next_due_hobbs,
            }
            for r in records
        ],
        "count": len(records),
    }


@router.get("/maintenance/due")
def get_maintenance_due(
    request: Request,
    days_ahead: int = 30,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    training_mode = getattr(request.state, "training_mode", False)
    
    future_date = date.today() + timedelta(days=days_ahead)
    
    records = scoped_query(db, HemsAircraftMaintenance, org_id, training_mode).filter(
        HemsAircraftMaintenance.next_due_date <= future_date,
        HemsAircraftMaintenance.next_due_date >= date.today(),
    ).order_by(HemsAircraftMaintenance.next_due_date.asc()).all()
    
    return {
        "maintenance_due": [
            {
                "id": r.id,
                "aircraft_id": r.aircraft_id,
                "maintenance_type": r.maintenance_type,
                "next_due_date": r.next_due_date.isoformat(),
                "next_due_hobbs": r.next_due_hobbs,
                "days_until_due": (r.next_due_date - date.today()).days,
            }
            for r in records
        ],
    }


@router.post("/airworthiness-directives")
def create_ad(
    payload: ADCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    ad = HemsAirworthinessDirective(
        org_id=org_id,
        aircraft_id=payload.aircraft_id,
        ad_number=payload.ad_number,
        subject=payload.subject,
        effective_date=payload.effective_date,
        recurring=payload.recurring,
        recurring_interval_hours=payload.recurring_interval_hours,
        recurring_interval_calendar=payload.recurring_interval_calendar,
        compliance_status="open",
    )
    apply_training_mode(ad, request)
    db.add(ad)
    db.commit()
    db.refresh(ad)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="hems_ad",
        classification="AVIATION_SAFETY",
        after_state=model_snapshot(ad),
        event_type="hems.aviation.ad.created",
        event_payload={"ad_id": ad.id, "ad_number": payload.ad_number},
    )
    
    return {
        "id": ad.id,
        "aircraft_id": ad.aircraft_id,
        "ad_number": ad.ad_number,
        "subject": ad.subject,
        "compliance_status": ad.compliance_status,
    }


@router.post("/airworthiness-directives/{ad_id}/comply")
def comply_with_ad(
    ad_id: int,
    payload: ADCompliance,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    ad = db.query(HemsAirworthinessDirective).filter(
        HemsAirworthinessDirective.id == ad_id,
        HemsAirworthinessDirective.org_id == org_id,
    ).first()
    if not ad:
        raise HTTPException(status_code=404, detail="AD not found")
    
    before = model_snapshot(ad)
    ad.compliance_status = "complied"
    ad.compliance_date = payload.compliance_date
    ad.compliance_method = payload.compliance_method
    ad.compliance_hobbs = payload.compliance_hobbs
    ad.mechanic_name = payload.mechanic_name
    ad.mechanic_certificate = payload.mechanic_certificate
    ad.next_due_hobbs = payload.next_due_hobbs
    ad.next_due_date = payload.next_due_date
    ad.updated_at = utc_now()
    
    db.commit()
    db.refresh(ad)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="hems_ad",
        classification="AVIATION_SAFETY",
        before_state=before,
        after_state=model_snapshot(ad),
        event_type="hems.aviation.ad.complied",
        event_payload={"ad_id": ad.id, "ad_number": ad.ad_number},
    )
    
    return {
        "id": ad.id,
        "ad_number": ad.ad_number,
        "compliance_status": ad.compliance_status,
        "compliance_date": ad.compliance_date.isoformat(),
    }


@router.get("/airworthiness-directives")
def list_ads(
    request: Request,
    aircraft_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    training_mode = getattr(request.state, "training_mode", False)
    
    query = scoped_query(db, HemsAirworthinessDirective, org_id, training_mode)
    
    if aircraft_id:
        query = query.filter(HemsAirworthinessDirective.aircraft_id == aircraft_id)
    if status:
        query = query.filter(HemsAirworthinessDirective.compliance_status == status)
    
    ads = query.order_by(HemsAirworthinessDirective.ad_number).all()
    
    return {
        "airworthiness_directives": [
            {
                "id": a.id,
                "aircraft_id": a.aircraft_id,
                "ad_number": a.ad_number,
                "subject": a.subject,
                "compliance_status": a.compliance_status,
                "compliance_date": a.compliance_date.isoformat() if a.compliance_date else None,
                "recurring": a.recurring,
                "next_due_date": a.next_due_date.isoformat() if a.next_due_date else None,
            }
            for a in ads
        ],
    }


@router.post("/weather-minimums")
def create_weather_minimums(
    payload: WeatherMinimumsCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    minimums = HemsWeatherMinimums(
        org_id=org_id,
        base_name=payload.base_name,
        day_vfr_ceiling_feet=payload.day_vfr_ceiling_feet,
        day_vfr_visibility_miles=payload.day_vfr_visibility_miles,
        night_vfr_ceiling_feet=payload.night_vfr_ceiling_feet,
        night_vfr_visibility_miles=payload.night_vfr_visibility_miles,
        ifr_ceiling_feet=payload.ifr_ceiling_feet,
        ifr_visibility_miles=payload.ifr_visibility_miles,
        max_wind_knots=payload.max_wind_knots,
        max_gusts_knots=payload.max_gusts_knots,
        max_crosswind_knots=payload.max_crosswind_knots,
        icing_prohibited=payload.icing_prohibited,
        thunderstorm_distance_nm=payload.thunderstorm_distance_nm,
        night_operations_allowed=payload.night_operations_allowed,
        ifr_operations_allowed=payload.ifr_operations_allowed,
        special_minimums=payload.special_minimums,
    )
    apply_training_mode(minimums, request)
    db.add(minimums)
    db.commit()
    db.refresh(minimums)
    
    return {
        "id": minimums.id,
        "base_name": minimums.base_name,
        "day_vfr_ceiling_feet": minimums.day_vfr_ceiling_feet,
        "day_vfr_visibility_miles": minimums.day_vfr_visibility_miles,
    }


@router.get("/weather-minimums")
def list_weather_minimums(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    training_mode = getattr(request.state, "training_mode", False)
    
    minimums = scoped_query(db, HemsWeatherMinimums, org_id, training_mode).all()
    
    return {
        "weather_minimums": [
            {
                "id": m.id,
                "base_name": m.base_name,
                "day_vfr_ceiling_feet": m.day_vfr_ceiling_feet,
                "day_vfr_visibility_miles": m.day_vfr_visibility_miles,
                "night_vfr_ceiling_feet": m.night_vfr_ceiling_feet,
                "night_vfr_visibility_miles": m.night_vfr_visibility_miles,
                "max_wind_knots": m.max_wind_knots,
                "night_operations_allowed": m.night_operations_allowed,
                "ifr_operations_allowed": m.ifr_operations_allowed,
            }
            for m in minimums
        ],
    }


@router.post("/weather-decisions")
def create_weather_decision(
    payload: WeatherDecisionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    decision = HemsWeatherDecisionLog(
        org_id=org_id,
        mission_id=payload.mission_id,
        request_id=payload.request_id,
        decision=payload.decision,
        decision_time=utc_now(),
        decision_maker_id=user.id,
        metar_text=payload.metar_text,
        taf_text=payload.taf_text,
        ceiling_feet=payload.ceiling_feet,
        visibility_miles=payload.visibility_miles,
        wind_direction=payload.wind_direction,
        wind_speed_knots=payload.wind_speed_knots,
        wind_gusts_knots=payload.wind_gusts_knots,
        temperature_c=payload.temperature_c,
        dewpoint_c=payload.dewpoint_c,
        altimeter=payload.altimeter,
        flight_category=payload.flight_category,
        tfrs_checked=True,
        tfrs_active=payload.tfrs_active,
        notams_reviewed=True,
        notams_relevant=payload.notams_relevant,
        icing_conditions=payload.icing_conditions,
        thunderstorms=payload.thunderstorms,
        justification=payload.justification,
    )
    apply_training_mode(decision, request)
    db.add(decision)
    db.commit()
    db.refresh(decision)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="hems_weather_decision",
        classification="AVIATION_SAFETY",
        after_state=model_snapshot(decision),
        event_type="hems.aviation.weather.decision",
        event_payload={"decision_id": decision.id, "decision": payload.decision},
    )
    
    return {
        "id": decision.id,
        "decision": decision.decision,
        "decision_time": decision.decision_time.isoformat(),
        "ceiling_feet": decision.ceiling_feet,
        "visibility_miles": decision.visibility_miles,
    }


@router.post("/pilot-currency")
def create_pilot_currency(
    payload: PilotCurrencyCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    existing = db.query(HemsPilotCurrency).filter(
        HemsPilotCurrency.org_id == org_id,
        HemsPilotCurrency.pilot_id == payload.pilot_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Pilot currency record already exists")
    
    flight_review_due = None
    if payload.flight_review_date:
        flight_review_due = date(payload.flight_review_date.year + 2, payload.flight_review_date.month, 1)
    
    instrument_currency_expires = None
    if payload.instrument_proficiency_check:
        instrument_currency_expires = payload.instrument_proficiency_check + timedelta(days=180)
    
    part_135_due = None
    if payload.part_135_checkride_date:
        part_135_due = date(payload.part_135_checkride_date.year + 1, payload.part_135_checkride_date.month, payload.part_135_checkride_date.day)
    
    annual_training_due = None
    if payload.annual_recurrent_training:
        annual_training_due = date(payload.annual_recurrent_training.year + 1, payload.annual_recurrent_training.month, 1)
    
    crm_due = None
    if payload.crm_training_date:
        crm_due = date(payload.crm_training_date.year + 1, payload.crm_training_date.month, 1)
    
    currency = HemsPilotCurrency(
        org_id=org_id,
        pilot_id=payload.pilot_id,
        certificate_number=payload.certificate_number,
        certificate_type=payload.certificate_type,
        medical_class=payload.medical_class,
        medical_issued=payload.medical_issued,
        medical_expires=payload.medical_expires,
        flight_review_date=payload.flight_review_date,
        flight_review_due=flight_review_due,
        instrument_proficiency_check=payload.instrument_proficiency_check,
        instrument_currency_expires=instrument_currency_expires,
        part_135_checkride_date=payload.part_135_checkride_date,
        part_135_checkride_due=part_135_due,
        annual_recurrent_training=payload.annual_recurrent_training,
        annual_training_due=annual_training_due,
        crm_training_date=payload.crm_training_date,
        crm_training_due=crm_due,
        type_ratings=payload.type_ratings,
        endorsements=payload.endorsements,
    )
    apply_training_mode(currency, request)
    db.add(currency)
    db.commit()
    db.refresh(currency)
    
    return {
        "id": currency.id,
        "pilot_id": currency.pilot_id,
        "certificate_number": currency.certificate_number,
        "medical_expires": currency.medical_expires.isoformat() if currency.medical_expires else None,
        "flight_review_due": currency.flight_review_due.isoformat() if currency.flight_review_due else None,
    }


@router.get("/pilot-currency/{pilot_id}")
def get_pilot_currency(
    pilot_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    currency = db.query(HemsPilotCurrency).filter(
        HemsPilotCurrency.org_id == org_id,
        HemsPilotCurrency.pilot_id == pilot_id,
    ).first()
    if not currency:
        raise HTTPException(status_code=404, detail="Pilot currency record not found")
    
    today = date.today()
    alerts = []
    
    if currency.medical_expires and currency.medical_expires <= today + timedelta(days=30):
        alerts.append({"type": "medical", "message": f"Medical expires {currency.medical_expires}", "severity": "critical" if currency.medical_expires <= today else "warning"})
    
    if currency.flight_review_due and currency.flight_review_due <= today + timedelta(days=30):
        alerts.append({"type": "flight_review", "message": f"Flight review due {currency.flight_review_due}", "severity": "critical" if currency.flight_review_due <= today else "warning"})
    
    if currency.instrument_currency_expires and currency.instrument_currency_expires <= today + timedelta(days=30):
        alerts.append({"type": "instrument", "message": f"Instrument currency expires {currency.instrument_currency_expires}", "severity": "critical" if currency.instrument_currency_expires <= today else "warning"})
    
    if currency.part_135_checkride_due and currency.part_135_checkride_due <= today + timedelta(days=30):
        alerts.append({"type": "part_135", "message": f"Part 135 checkride due {currency.part_135_checkride_due}", "severity": "critical" if currency.part_135_checkride_due <= today else "warning"})
    
    return {
        "id": currency.id,
        "pilot_id": currency.pilot_id,
        "certificate_number": currency.certificate_number,
        "certificate_type": currency.certificate_type,
        "medical_class": currency.medical_class,
        "medical_issued": currency.medical_issued.isoformat() if currency.medical_issued else None,
        "medical_expires": currency.medical_expires.isoformat() if currency.medical_expires else None,
        "flight_review_date": currency.flight_review_date.isoformat() if currency.flight_review_date else None,
        "flight_review_due": currency.flight_review_due.isoformat() if currency.flight_review_due else None,
        "instrument_proficiency_check": currency.instrument_proficiency_check.isoformat() if currency.instrument_proficiency_check else None,
        "instrument_currency_expires": currency.instrument_currency_expires.isoformat() if currency.instrument_currency_expires else None,
        "part_135_checkride_date": currency.part_135_checkride_date.isoformat() if currency.part_135_checkride_date else None,
        "part_135_checkride_due": currency.part_135_checkride_due.isoformat() if currency.part_135_checkride_due else None,
        "annual_recurrent_training": currency.annual_recurrent_training.isoformat() if currency.annual_recurrent_training else None,
        "annual_training_due": currency.annual_training_due.isoformat() if currency.annual_training_due else None,
        "crm_training_date": currency.crm_training_date.isoformat() if currency.crm_training_date else None,
        "crm_training_due": currency.crm_training_due.isoformat() if currency.crm_training_due else None,
        "total_flight_hours": currency.total_flight_hours,
        "total_pic_hours": currency.total_pic_hours,
        "total_night_hours": currency.total_night_hours,
        "total_ifr_hours": currency.total_ifr_hours,
        "type_ratings": currency.type_ratings,
        "alerts": alerts,
        "current": len([a for a in alerts if a["severity"] == "critical"]) == 0,
    }


@router.patch("/pilot-currency/{pilot_id}")
def update_pilot_currency(
    pilot_id: int,
    payload: PilotCurrencyUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    currency = db.query(HemsPilotCurrency).filter(
        HemsPilotCurrency.org_id == org_id,
        HemsPilotCurrency.pilot_id == pilot_id,
    ).first()
    if not currency:
        raise HTTPException(status_code=404, detail="Pilot currency record not found")
    
    before = model_snapshot(currency)
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(currency, field, value)
    
    if payload.flight_review_date:
        currency.flight_review_due = date(payload.flight_review_date.year + 2, payload.flight_review_date.month, 1)
    if payload.instrument_proficiency_check:
        currency.instrument_currency_expires = payload.instrument_proficiency_check + timedelta(days=180)
    if payload.part_135_checkride_date:
        currency.part_135_checkride_due = date(payload.part_135_checkride_date.year + 1, payload.part_135_checkride_date.month, payload.part_135_checkride_date.day)
    if payload.annual_recurrent_training:
        currency.annual_training_due = date(payload.annual_recurrent_training.year + 1, payload.annual_recurrent_training.month, 1)
    if payload.crm_training_date:
        currency.crm_training_due = date(payload.crm_training_date.year + 1, payload.crm_training_date.month, 1)
    
    currency.updated_at = utc_now()
    db.commit()
    db.refresh(currency)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="hems_pilot_currency",
        classification="AVIATION_SAFETY",
        before_state=before,
        after_state=model_snapshot(currency),
        event_type="hems.aviation.pilot_currency.updated",
        event_payload={"pilot_id": pilot_id},
    )
    
    return {"id": currency.id, "pilot_id": pilot_id, "updated": True}


@router.post("/flight-duty")
def create_flight_duty_record(
    payload: FlightDutyCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    limits = _calculate_part_135_limits(db, org_id, payload.crew_id, payload.duty_date)
    
    violations = []
    if limits["rolling_7_day_flight_hours"] + (payload.flight_time_minutes / 60) > 32:
        violations.append({"type": "7_day_flight_limit", "message": "Exceeds 32-hour 7-day flight time limit"})
    if limits["rolling_30_day_flight_hours"] + (payload.flight_time_minutes / 60) > 100:
        violations.append({"type": "30_day_flight_limit", "message": "Exceeds 100-hour 30-day flight time limit"})
    
    record = HemsFlightDutyRecord(
        org_id=org_id,
        crew_id=payload.crew_id,
        duty_date=payload.duty_date,
        duty_start=payload.duty_start,
        duty_end=payload.duty_end,
        flight_time_minutes=payload.flight_time_minutes,
        rest_start=payload.rest_start,
        rest_end=payload.rest_end,
        rest_adequate=payload.rest_adequate,
        rolling_7_day_flight_hours=limits["rolling_7_day_flight_hours"] + (payload.flight_time_minutes / 60),
        rolling_30_day_flight_hours=limits["rolling_30_day_flight_hours"] + (payload.flight_time_minutes / 60),
        fatigue_call_used=payload.fatigue_call_used,
        fatigue_reason=payload.fatigue_reason,
        violations=violations if violations else None,
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
        resource="hems_flight_duty",
        classification="AVIATION_SAFETY",
        after_state=model_snapshot(record),
        event_type="hems.aviation.flight_duty.created",
        event_payload={"record_id": record.id, "crew_id": payload.crew_id, "violations": len(violations)},
    )
    
    return {
        "id": record.id,
        "crew_id": record.crew_id,
        "duty_date": record.duty_date.isoformat(),
        "flight_time_minutes": record.flight_time_minutes,
        "rolling_7_day_flight_hours": record.rolling_7_day_flight_hours,
        "rolling_30_day_flight_hours": record.rolling_30_day_flight_hours,
        "violations": violations,
        "part_135_limits": limits,
    }


@router.get("/flight-duty/{crew_id}")
def get_crew_flight_duty(
    crew_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    limits = _calculate_part_135_limits(db, org_id, crew_id, date.today())
    
    recent_records = db.query(HemsFlightDutyRecord).filter(
        HemsFlightDutyRecord.org_id == org_id,
        HemsFlightDutyRecord.crew_id == crew_id,
    ).order_by(HemsFlightDutyRecord.duty_date.desc()).limit(30).all()
    
    return {
        "crew_id": crew_id,
        "part_135_limits": limits,
        "recent_records": [
            {
                "id": r.id,
                "duty_date": r.duty_date.isoformat(),
                "flight_time_minutes": r.flight_time_minutes,
                "violations": r.violations,
            }
            for r in recent_records
        ],
    }


@router.post("/checklists")
def create_checklist(
    payload: ChecklistCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    checklist = HemsChecklist(
        org_id=org_id,
        checklist_name=payload.checklist_name,
        checklist_type=payload.checklist_type,
        aircraft_type=payload.aircraft_type,
        version=payload.version,
        effective_date=payload.effective_date or date.today(),
        items=payload.items,
        active=True,
    )
    apply_training_mode(checklist, request)
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    
    return {
        "id": checklist.id,
        "checklist_name": checklist.checklist_name,
        "checklist_type": checklist.checklist_type,
        "version": checklist.version,
        "item_count": len(checklist.items),
    }


@router.get("/checklists")
def list_checklists(
    request: Request,
    checklist_type: Optional[str] = None,
    aircraft_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    training_mode = getattr(request.state, "training_mode", False)
    
    query = scoped_query(db, HemsChecklist, org_id, training_mode).filter(HemsChecklist.active == True)
    
    if checklist_type:
        query = query.filter(HemsChecklist.checklist_type == checklist_type)
    if aircraft_type:
        query = query.filter(HemsChecklist.aircraft_type == aircraft_type)
    
    checklists = query.order_by(HemsChecklist.checklist_name).all()
    
    return {
        "checklists": [
            {
                "id": c.id,
                "checklist_name": c.checklist_name,
                "checklist_type": c.checklist_type,
                "aircraft_type": c.aircraft_type,
                "version": c.version,
                "item_count": len(c.items) if c.items else 0,
            }
            for c in checklists
        ],
    }


@router.post("/checklists/{checklist_id}/complete")
def complete_checklist(
    checklist_id: int,
    payload: ChecklistCompletionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    checklist = db.query(HemsChecklist).filter(
        HemsChecklist.id == checklist_id,
        HemsChecklist.org_id == org_id,
    ).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    
    crew = db.query(HemsCrew).filter(HemsCrew.org_id == org_id).first()
    crew_id = crew.id if crew else 1
    
    all_satisfactory = all(
        item.get("satisfactory", True) for item in payload.item_results
    )
    
    completion = HemsChecklistCompletion(
        org_id=org_id,
        checklist_id=checklist_id,
        mission_id=payload.mission_id,
        aircraft_id=payload.aircraft_id,
        completed_by_id=crew_id,
        completed_at=utc_now(),
        hobbs_reading=payload.hobbs_reading,
        fuel_quantity=payload.fuel_quantity,
        item_results=payload.item_results,
        all_items_satisfactory=all_satisfactory,
        discrepancies=payload.discrepancies,
        signature=user.email,
    )
    apply_training_mode(completion, request)
    db.add(completion)
    db.commit()
    db.refresh(completion)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="hems_checklist_completion",
        classification="AVIATION_SAFETY",
        after_state=model_snapshot(completion),
        event_type="hems.aviation.checklist.completed",
        event_payload={"completion_id": completion.id, "checklist_id": checklist_id, "satisfactory": all_satisfactory},
    )
    
    return {
        "id": completion.id,
        "checklist_id": checklist_id,
        "aircraft_id": payload.aircraft_id,
        "completed_at": completion.completed_at.isoformat(),
        "all_items_satisfactory": all_satisfactory,
        "discrepancy_count": len(payload.discrepancies) if payload.discrepancies else 0,
    }


@router.post("/frat")
def create_frat_assessment(
    payload: FRATCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    
    total_score = (
        payload.weather_score +
        payload.crew_score +
        payload.aircraft_score +
        payload.mission_score +
        payload.patient_score +
        payload.environment_score
    )
    
    if total_score <= 10:
        risk_level = "Low"
        decision = "Go"
        supervisor_required = False
    elif total_score <= 20:
        risk_level = "Medium"
        decision = "Go with mitigations"
        supervisor_required = True
    else:
        risk_level = "High"
        decision = "No-Go or supervisor override required"
        supervisor_required = True
    
    frat = HemsFRATAssessment(
        org_id=org_id,
        mission_id=payload.mission_id,
        request_id=payload.request_id,
        assessed_by_id=user.id,
        assessed_at=utc_now(),
        weather_score=payload.weather_score,
        crew_score=payload.crew_score,
        aircraft_score=payload.aircraft_score,
        mission_score=payload.mission_score,
        patient_score=payload.patient_score,
        environment_score=payload.environment_score,
        total_score=total_score,
        risk_level=risk_level,
        weather_factors=payload.weather_factors,
        crew_factors=payload.crew_factors,
        aircraft_factors=payload.aircraft_factors,
        mission_factors=payload.mission_factors,
        patient_factors=payload.patient_factors,
        environment_factors=payload.environment_factors,
        mitigations=payload.mitigations,
        decision=decision,
        supervisor_required=supervisor_required,
    )
    apply_training_mode(frat, request)
    db.add(frat)
    db.commit()
    db.refresh(frat)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="hems_frat",
        classification="AVIATION_SAFETY",
        after_state=model_snapshot(frat),
        event_type="hems.aviation.frat.completed",
        event_payload={"frat_id": frat.id, "total_score": total_score, "risk_level": risk_level},
    )
    
    return {
        "id": frat.id,
        "total_score": total_score,
        "risk_level": risk_level,
        "decision": decision,
        "supervisor_required": supervisor_required,
        "scores": {
            "weather": payload.weather_score,
            "crew": payload.crew_score,
            "aircraft": payload.aircraft_score,
            "mission": payload.mission_score,
            "patient": payload.patient_score,
            "environment": payload.environment_score,
        },
    }


@router.get("/compliance-report")
def get_compliance_report(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    training_mode = getattr(request.state, "training_mode", False)
    today = date.today()
    
    aircraft = scoped_query(db, HemsAircraft, org_id, training_mode).all()
    aircraft_status = []
    for a in aircraft:
        maintenance_due = scoped_query(db, HemsAircraftMaintenance, org_id, training_mode).filter(
            HemsAircraftMaintenance.aircraft_id == a.id,
            HemsAircraftMaintenance.next_due_date <= today + timedelta(days=30),
        ).count()
        
        ads_open = scoped_query(db, HemsAirworthinessDirective, org_id, training_mode).filter(
            HemsAirworthinessDirective.aircraft_id == a.id,
            HemsAirworthinessDirective.compliance_status == "open",
        ).count()
        
        aircraft_status.append({
            "aircraft_id": a.id,
            "tail_number": a.tail_number,
            "maintenance_status": a.maintenance_status,
            "maintenance_items_due_30_days": maintenance_due,
            "open_ads": ads_open,
            "compliant": maintenance_due == 0 and ads_open == 0 and a.maintenance_status == "Green",
        })
    
    pilots = scoped_query(db, HemsPilotCurrency, org_id, training_mode).all()
    pilot_status = []
    for p in pilots:
        issues = []
        if p.medical_expires and p.medical_expires <= today:
            issues.append("Medical expired")
        if p.flight_review_due and p.flight_review_due <= today:
            issues.append("Flight review overdue")
        if p.part_135_checkride_due and p.part_135_checkride_due <= today:
            issues.append("Part 135 checkride overdue")
        
        pilot_status.append({
            "pilot_id": p.pilot_id,
            "certificate_number": p.certificate_number,
            "medical_expires": p.medical_expires.isoformat() if p.medical_expires else None,
            "issues": issues,
            "current": len(issues) == 0,
        })
    
    return {
        "report_date": today.isoformat(),
        "aircraft_compliance": aircraft_status,
        "pilot_compliance": pilot_status,
        "overall_compliance": all(a["compliant"] for a in aircraft_status) and all(p["current"] for p in pilot_status),
    }
