from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.fleet import FleetDVIR, FleetInspection, FleetMaintenance, FleetTelemetry, FleetVehicle, FleetSubscription, FleetAIInsight
from models.user import User, UserRole
from utils.tenancy import scoped_query
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot

router = APIRouter(
    prefix="/api/fleet",
    tags=["Fleet"],
    dependencies=[Depends(require_module("FLEET"))],
)


class VehicleCreate(BaseModel):
    vehicle_id: str
    call_sign: str = ""
    vehicle_type: str = "ALS"
    make: str = ""
    model: str = ""
    year: str = ""
    vin: str = ""
    status: str = "in_service"
    location: str = ""


class MaintenanceCreate(BaseModel):
    vehicle_id: int
    service_type: str = "maintenance"
    status: str = "scheduled"
    due_mileage: int = 0
    notes: str = ""
    payload: dict = {}


class InspectionCreate(BaseModel):
    vehicle_id: int
    status: str = "pass"
    findings: list = []
    performed_by: str = ""
    payload: dict = {}


class TelemetryCreate(BaseModel):
    vehicle_id: int
    latitude: str = ""
    longitude: str = ""
    speed: str = ""
    odometer: str = ""
    payload: dict = {}


class TelemetryCreate(BaseModel):
    vehicle_id: int
    latitude: str = ""
    longitude: str = ""
    speed: str = ""
    odometer: str = ""
    payload: dict = {}


class OBDTelemetryUpdate(BaseModel):
    """OBD-II real-time data from MDT"""
    vin: str
    unit_id: str  # e.g., "M101"
    odometer_km: float
    speed_kmh: float
    engine_rpm: int
    fuel_level_percent: float
    battery_voltage: float
    check_engine: bool
    latitude: float | None = None
    longitude: float | None = None


@router.post("/obd-telemetry")
def update_obd_telemetry(
    payload: OBDTelemetryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    """
    Receive OBD-II telemetry from MDT and update fleet records
    """
    from services.fleet.fleet_ai_service import FleetAIService
    
    vehicle = (
        scoped_query(db, FleetVehicle, user.org_id, request.state.training_mode)
        .filter(
            (FleetVehicle.vin == payload.vin) | (FleetVehicle.vehicle_id == payload.unit_id)
        )
        .first()
    )
    
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle not found: VIN={payload.vin}, Unit={payload.unit_id}"
        )
    
    telemetry = FleetTelemetry(
        org_id=user.org_id,
        vehicle_id=vehicle.id,
        latitude=str(payload.latitude) if payload.latitude else "",
        longitude=str(payload.longitude) if payload.longitude else "",
        speed=str(payload.speed_kmh),
        odometer=str(payload.odometer_km),
        payload={
            "engine_rpm": payload.engine_rpm,
            "fuel_level_percent": payload.fuel_level_percent,
            "battery_voltage": payload.battery_voltage,
            "check_engine": payload.check_engine,
            "source": "obd",
        }
    )
    apply_training_mode(telemetry, request)
    db.add(telemetry)
    
    check_engine_alert_created = False
    ai_insights_generated = 0
    
    if payload.check_engine:
        existing_alert = (
            scoped_query(db, FleetMaintenance, user.org_id, request.state.training_mode)
            .filter(
                FleetMaintenance.vehicle_id == vehicle.id,
                FleetMaintenance.service_type == "check_engine",
                FleetMaintenance.status.in_(["scheduled", "in_progress"])
            )
            .first()
        )
        
        if not existing_alert:
            maintenance = FleetMaintenance(
                org_id=user.org_id,
                vehicle_id=vehicle.id,
                service_type="check_engine",
                status="scheduled",
                notes=f"Check engine light detected via OBD-II. Odometer: {payload.odometer_km:.1f} km",
                payload={
                    "detected_at": datetime.utcnow().isoformat(),
                    "battery_voltage": payload.battery_voltage,
                    "priority": "urgent",
                }
            )
            apply_training_mode(maintenance, request)
            db.add(maintenance)
            check_engine_alert_created = True
            
            audit_and_event(
                db=db,
                request=request,
                user=user,
                action="create",
                resource="fleet_maintenance",
                classification="OPS",
                event_type="fleet.maintenance.check_engine_alert",
                event_payload={
                    "vehicle_id": vehicle.id,
                    "unit_id": payload.unit_id,
                    "odometer_km": payload.odometer_km,
                }
            )
            
            ai_service = FleetAIService(db, user.org_id, request.state.training_mode)
            ai_service.notify_subscribers(
                event_type="critical_alerts",
                vehicle=vehicle,
                message=f"🚨 Check engine light detected on {vehicle.call_sign}",
                priority="urgent",
                data={"odometer_km": payload.odometer_km, "battery_voltage": payload.battery_voltage}
            )
    
    if payload.fuel_level_percent < 20:
        ai_service = FleetAIService(db, user.org_id, request.state.training_mode)
        ai_service.notify_subscribers(
            event_type="fuel_alerts",
            vehicle=vehicle,
            message=f"⛽ Low fuel on {vehicle.call_sign}: {payload.fuel_level_percent}%",
            priority="normal",
            data={"fuel_level_percent": payload.fuel_level_percent}
        )
    
    telemetry_count = (
        scoped_query(db, FleetTelemetry, user.org_id, request.state.training_mode)
        .filter(FleetTelemetry.vehicle_id == vehicle.id)
        .count()
    )
    
    if telemetry_count % 50 == 0 and telemetry_count > 0:
        ai_service = FleetAIService(db, user.org_id, request.state.training_mode)
        insights = ai_service.generate_insights(vehicle.id)
        ai_insights_generated = len(insights)
        
        for insight in insights:
            if insight.priority in ["critical", "high"]:
                ai_service.notify_subscribers(
                    event_type="ai_recommendations",
                    vehicle=vehicle,
                    message=f"🤖 {insight.title}: {insight.description}",
                    priority="normal" if insight.priority == "high" else "urgent",
                    data={"insight_id": insight.id, "action_required": insight.action_required}
                )
    
    db.commit()
    
    return {
        "status": "ok",
        "vehicle_id": vehicle.id,
        "telemetry_recorded": True,
        "check_engine_alert_created": check_engine_alert_created,
        "ai_insights_generated": ai_insights_generated,
    }


@router.get("/vehicles")
def list_vehicles(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    vehicles = (
        scoped_query(db, FleetVehicle, user.org_id, request.state.training_mode)
        .order_by(FleetVehicle.created_at.desc())
        .all()
    )
    return [model_snapshot(vehicle) for vehicle in vehicles]


@router.post("/vehicles", status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: VehicleCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    record = FleetVehicle(org_id=user.org_id, **payload.model_dump())
    apply_training_mode(record, request)
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="fleet_vehicle",
        classification=record.classification,
        after_state=model_snapshot(record),
        event_type="fleet.vehicle.created",
        event_payload={"vehicle_id": record.id},
    )
    return model_snapshot(record)


class DVIRCreate(BaseModel):
    vehicle_id: int
    inspection_type: str = "pre_trip"
    odometer: int = 0

    brakes_ok: bool = True
    steering_ok: bool = True
    lights_headlights_ok: bool = True
    lights_taillights_ok: bool = True
    lights_brake_ok: bool = True
    lights_turn_signals_ok: bool = True
    lights_emergency_ok: bool = True
    horn_ok: bool = True
    windshield_ok: bool = True
    wipers_ok: bool = True
    mirrors_ok: bool = True
    tires_front_ok: bool = True
    tires_rear_ok: bool = True
    wheels_lugs_ok: bool = True
    fluid_levels_ok: bool = True
    exhaust_ok: bool = True
    battery_ok: bool = True
    fire_extinguisher_ok: bool = True
    reflective_triangles_ok: bool = True
    first_aid_kit_ok: bool = True
    seatbelts_ok: bool = True

    stretcher_ok: bool | None = None
    stretcher_straps_ok: bool | None = None
    suction_ok: bool | None = None
    oxygen_main_ok: bool | None = None
    oxygen_portable_ok: bool | None = None
    monitor_defibrillator_ok: bool | None = None
    drug_box_sealed_ok: bool | None = None
    airway_bag_ok: bool | None = None
    trauma_bag_ok: bool | None = None
    iv_supplies_ok: bool | None = None
    splinting_ok: bool | None = None
    stair_chair_ok: bool | None = None
    backboard_ok: bool | None = None
    c_collar_ok: bool | None = None

    pump_ok: bool | None = None
    pump_gauges_ok: bool | None = None
    aerial_ok: bool | None = None
    ground_ladders_ok: bool | None = None
    hose_loads_ok: bool | None = None
    scba_ok: bool | None = None
    nozzles_ok: bool | None = None
    hand_tools_ok: bool | None = None
    forcible_entry_ok: bool | None = None
    vent_equipment_ok: bool | None = None
    rope_rescue_ok: bool | None = None
    thermal_camera_ok: bool | None = None

    defects_found: bool = False
    defect_description: str = ""
    vehicle_safe_to_operate: bool = True
    driver_signature: str = ""
    notes: str = ""
    payload: dict = {}


class DVIRDefectCorrection(BaseModel):
    defects_corrected: bool = True
    corrected_by: str = ""
    mechanic_signature: str = ""


@router.get("/dvir")
def list_dvir(
    request: Request,
    vehicle_id: int | None = None,
    inspection_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    query = scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
    if vehicle_id:
        query = query.filter(FleetDVIR.vehicle_id == vehicle_id)
    if inspection_type:
        query = query.filter(FleetDVIR.inspection_type == inspection_type)
    records = query.order_by(FleetDVIR.created_at.desc()).limit(100).all()
    return [model_snapshot(record) for record in records]


@router.get("/dvir/{dvir_id}")
def get_dvir(
    dvir_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.id == dvir_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DVIR not found")
    return model_snapshot(record)


@router.post("/dvir", status_code=status.HTTP_201_CREATED)
def create_dvir(
    payload: DVIRCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    vehicle = (
        scoped_query(db, FleetVehicle, user.org_id, request.state.training_mode)
        .filter(FleetVehicle.id == payload.vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vehicle not found")
    record = FleetDVIR(
        org_id=user.org_id,
        driver_id=user.id,
        driver_name=f"{user.first_name} {user.last_name}",
        **payload.model_dump()
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
        resource="fleet_dvir",
        classification="OPS",
        after_state=model_snapshot(record),
        event_type="fleet.dvir.created",
        event_payload={
            "dvir_id": record.id,
            "vehicle_id": vehicle.id,
            "inspection_type": record.inspection_type,
            "defects_found": record.defects_found,
            "safe_to_operate": record.vehicle_safe_to_operate,
        },
    )
    return model_snapshot(record)


@router.patch("/dvir/{dvir_id}/correct")
def correct_dvir_defects(
    dvir_id: int,
    payload: DVIRDefectCorrection,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.id == dvir_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DVIR not found")
    if not record.defects_found:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No defects to correct")
    before = model_snapshot(record)
    record.defects_corrected = payload.defects_corrected
    record.corrected_by = payload.corrected_by
    record.mechanic_signature = payload.mechanic_signature
    if payload.defects_corrected:
        record.vehicle_safe_to_operate = True
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="fleet_dvir",
        classification="OPS",
        before_state=before,
        after_state=model_snapshot(record),
        event_type="fleet.dvir.defects_corrected",
        event_payload={"dvir_id": record.id, "corrected": payload.defects_corrected},
    )
    return model_snapshot(record)


@router.get("/dvir/vehicle/{vehicle_id}/latest")
def get_latest_dvir(
    vehicle_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.vehicle_id == vehicle_id)
        .order_by(FleetDVIR.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No DVIR found for vehicle")
    return model_snapshot(record)


@router.get("/dvir/pending-corrections")
def list_pending_corrections(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    records = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.defects_found == True)
        .filter(FleetDVIR.defects_corrected != True)
        .order_by(FleetDVIR.created_at.desc())
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.get("/dvir/stats")
def get_dvir_stats(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    from sqlalchemy import func as sqlfunc
    from datetime import datetime, timedelta

    base = scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    total_today = base.filter(sqlfunc.date(FleetDVIR.created_at) == today).count()
    total_week = base.filter(FleetDVIR.created_at >= week_ago).count()
    total_month = base.filter(FleetDVIR.created_at >= month_ago).count()
    defects_pending = base.filter(
        FleetDVIR.defects_found == True,
        FleetDVIR.defects_corrected != True
    ).count()
    out_of_service = base.filter(
        FleetDVIR.vehicle_safe_to_operate == False,
        FleetDVIR.defects_corrected != True
    ).count()

    return {
        "inspections_today": total_today,
        "inspections_this_week": total_week,
        "inspections_this_month": total_month,
        "defects_pending_correction": defects_pending,
        "vehicles_out_of_service": out_of_service,
    }


class SubscriptionUpdate(BaseModel):
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    critical_alerts: bool = True
    maintenance_due: bool = True
    maintenance_overdue: bool = True
    dvir_defects: bool = True
    daily_summary: bool = False
    weekly_summary: bool = False
    ai_recommendations: bool = True
    vehicle_down: bool = True
    fuel_alerts: bool = False
    vehicle_ids: list = []
    quiet_hours_start: int = 22
    quiet_hours_end: int = 6


@router.get("/subscriptions/me")
def get_my_subscription(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Get current user's fleet notification subscription"""
    subscription = (
        scoped_query(db, FleetSubscription, user.org_id, request.state.training_mode)
        .filter(FleetSubscription.user_id == user.id)
        .first()
    )
    
    if not subscription:
        subscription = FleetSubscription(
            org_id=user.org_id,
            user_id=user.id,
        )
        apply_training_mode(subscription, request)
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
    
    return model_snapshot(subscription)


@router.put("/subscriptions/me")
def update_my_subscription(
    payload: SubscriptionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Update current user's fleet notification subscription"""
    subscription = (
        scoped_query(db, FleetSubscription, user.org_id, request.state.training_mode)
        .filter(FleetSubscription.user_id == user.id)
        .first()
    )
    
    if not subscription:
        subscription = FleetSubscription(
            org_id=user.org_id,
            user_id=user.id,
        )
        apply_training_mode(subscription, request)
    
    for key, value in payload.model_dump().items():
        setattr(subscription, key, value)
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    return model_snapshot(subscription)


@router.get("/vehicles/{vehicle_id}/telemetry")
def get_vehicle_telemetry(
    vehicle_id: int,
    request: Request,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Get telemetry history for a vehicle"""
    records = (
        scoped_query(db, FleetTelemetry, user.org_id, request.state.training_mode)
        .filter(FleetTelemetry.vehicle_id == vehicle_id)
        .order_by(FleetTelemetry.created_at.desc())
        .limit(min(limit, 1000))
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.get("/ai/insights")
def get_ai_insights(
    request: Request,
    vehicle_id: int | None = None,
    status: str = "active",
    priority: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_technician)),
):
    """Get AI-powered fleet insights"""
    query = scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
    
    if vehicle_id:
        query = query.filter(FleetAIInsight.vehicle_id == vehicle_id)
    if status:
        query = query.filter(FleetAIInsight.status == status)
    if priority:
        query = query.filter(FleetAIInsight.priority == priority)
    
    insights = query.order_by(FleetAIInsight.created_at.desc()).limit(100).all()
    return [model_snapshot(insight) for insight in insights]


@router.post("/ai/insights/generate")
def generate_ai_insights(
    request: Request,
    vehicle_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_technician)),
):
    """Trigger AI analysis to generate fleet insights"""
    from services.fleet.fleet_ai_service import FleetAIService
    
    ai_service = FleetAIService(db, user.org_id, request.state.training_mode)
    insights = ai_service.generate_insights(vehicle_id)
    
    return {
        "status": "ok",
        "insights_generated": len(insights),
        "insights": [model_snapshot(insight) for insight in insights],
    }


@router.patch("/ai/insights/{insight_id}/dismiss")
def dismiss_ai_insight(
    insight_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager)),
):
    """Dismiss an AI insight"""
    insight = (
        scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
        .filter(FleetAIInsight.id == insight_id)
        .first()
    )
    
    if not insight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight not found")
    
    insight.status = "dismissed"
    db.commit()
    db.refresh(insight)
    
    return model_snapshot(insight)


@router.get("/ai/insights/stats")
def get_ai_insight_stats(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager)),
):
    """Get AI insight statistics"""
    query = scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
    
    total_active = query.filter(FleetAIInsight.status == "active").count()
    critical_count = query.filter(
        FleetAIInsight.status == "active",
        FleetAIInsight.priority == "critical"
    ).count()
    high_count = query.filter(
        FleetAIInsight.status == "active",
        FleetAIInsight.priority == "high"
    ).count()
    
    potential_savings = db.execute(
        """
        SELECT COALESCE(SUM(estimated_savings), 0)
        FROM fleet_ai_insights
        WHERE org_id = :org_id
        AND status = 'active'
        AND estimated_savings IS NOT NULL
        AND training_mode = :training_mode
        """,
        {"org_id": user.org_id, "training_mode": request.state.training_mode}
    ).scalar()
    
    return {
        "total_active_insights": total_active,
        "critical_priority": critical_count,
        "high_priority": high_count,
        "potential_annual_savings": int(potential_savings or 0),
    }


@router.get("/maintenance")
def list_maintenance(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    records = (
        scoped_query(db, FleetMaintenance, user.org_id, request.state.training_mode)
        .order_by(FleetMaintenance.created_at.desc())
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.post("/maintenance", status_code=status.HTTP_201_CREATED)
def create_maintenance(
    payload: MaintenanceCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    vehicle = (
        scoped_query(db, FleetVehicle, user.org_id, request.state.training_mode)
        .filter(FleetVehicle.id == payload.vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vehicle not found")
    record = FleetMaintenance(org_id=user.org_id, **payload.model_dump())
    apply_training_mode(record, request)
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="fleet_maintenance",
        classification="OPS",
        after_state=model_snapshot(record),
        event_type="fleet.maintenance.created",
        event_payload={"maintenance_id": record.id, "vehicle_id": vehicle.id},
    )
    return model_snapshot(record)


class DVIRCreate(BaseModel):
    vehicle_id: int
    inspection_type: str = "pre_trip"
    odometer: int = 0

    brakes_ok: bool = True
    steering_ok: bool = True
    lights_headlights_ok: bool = True
    lights_taillights_ok: bool = True
    lights_brake_ok: bool = True
    lights_turn_signals_ok: bool = True
    lights_emergency_ok: bool = True
    horn_ok: bool = True
    windshield_ok: bool = True
    wipers_ok: bool = True
    mirrors_ok: bool = True
    tires_front_ok: bool = True
    tires_rear_ok: bool = True
    wheels_lugs_ok: bool = True
    fluid_levels_ok: bool = True
    exhaust_ok: bool = True
    battery_ok: bool = True
    fire_extinguisher_ok: bool = True
    reflective_triangles_ok: bool = True
    first_aid_kit_ok: bool = True
    seatbelts_ok: bool = True

    stretcher_ok: bool | None = None
    stretcher_straps_ok: bool | None = None
    suction_ok: bool | None = None
    oxygen_main_ok: bool | None = None
    oxygen_portable_ok: bool | None = None
    monitor_defibrillator_ok: bool | None = None
    drug_box_sealed_ok: bool | None = None
    airway_bag_ok: bool | None = None
    trauma_bag_ok: bool | None = None
    iv_supplies_ok: bool | None = None
    splinting_ok: bool | None = None
    stair_chair_ok: bool | None = None
    backboard_ok: bool | None = None
    c_collar_ok: bool | None = None

    pump_ok: bool | None = None
    pump_gauges_ok: bool | None = None
    aerial_ok: bool | None = None
    ground_ladders_ok: bool | None = None
    hose_loads_ok: bool | None = None
    scba_ok: bool | None = None
    nozzles_ok: bool | None = None
    hand_tools_ok: bool | None = None
    forcible_entry_ok: bool | None = None
    vent_equipment_ok: bool | None = None
    rope_rescue_ok: bool | None = None
    thermal_camera_ok: bool | None = None

    defects_found: bool = False
    defect_description: str = ""
    vehicle_safe_to_operate: bool = True
    driver_signature: str = ""
    notes: str = ""
    payload: dict = {}


class DVIRDefectCorrection(BaseModel):
    defects_corrected: bool = True
    corrected_by: str = ""
    mechanic_signature: str = ""


@router.get("/dvir")
def list_dvir(
    request: Request,
    vehicle_id: int | None = None,
    inspection_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    query = scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
    if vehicle_id:
        query = query.filter(FleetDVIR.vehicle_id == vehicle_id)
    if inspection_type:
        query = query.filter(FleetDVIR.inspection_type == inspection_type)
    records = query.order_by(FleetDVIR.created_at.desc()).limit(100).all()
    return [model_snapshot(record) for record in records]


@router.get("/dvir/{dvir_id}")
def get_dvir(
    dvir_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.id == dvir_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DVIR not found")
    return model_snapshot(record)


@router.post("/dvir", status_code=status.HTTP_201_CREATED)
def create_dvir(
    payload: DVIRCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    vehicle = (
        scoped_query(db, FleetVehicle, user.org_id, request.state.training_mode)
        .filter(FleetVehicle.id == payload.vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vehicle not found")
    record = FleetDVIR(
        org_id=user.org_id,
        driver_id=user.id,
        driver_name=f"{user.first_name} {user.last_name}",
        **payload.model_dump()
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
        resource="fleet_dvir",
        classification="OPS",
        after_state=model_snapshot(record),
        event_type="fleet.dvir.created",
        event_payload={
            "dvir_id": record.id,
            "vehicle_id": vehicle.id,
            "inspection_type": record.inspection_type,
            "defects_found": record.defects_found,
            "safe_to_operate": record.vehicle_safe_to_operate,
        },
    )
    return model_snapshot(record)


@router.patch("/dvir/{dvir_id}/correct")
def correct_dvir_defects(
    dvir_id: int,
    payload: DVIRDefectCorrection,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.id == dvir_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DVIR not found")
    if not record.defects_found:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No defects to correct")
    before = model_snapshot(record)
    record.defects_corrected = payload.defects_corrected
    record.corrected_by = payload.corrected_by
    record.mechanic_signature = payload.mechanic_signature
    if payload.defects_corrected:
        record.vehicle_safe_to_operate = True
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="fleet_dvir",
        classification="OPS",
        before_state=before,
        after_state=model_snapshot(record),
        event_type="fleet.dvir.defects_corrected",
        event_payload={"dvir_id": record.id, "corrected": payload.defects_corrected},
    )
    return model_snapshot(record)


@router.get("/dvir/vehicle/{vehicle_id}/latest")
def get_latest_dvir(
    vehicle_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.vehicle_id == vehicle_id)
        .order_by(FleetDVIR.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No DVIR found for vehicle")
    return model_snapshot(record)


@router.get("/dvir/pending-corrections")
def list_pending_corrections(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    records = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.defects_found == True)
        .filter(FleetDVIR.defects_corrected != True)
        .order_by(FleetDVIR.created_at.desc())
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.get("/dvir/stats")
def get_dvir_stats(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    from sqlalchemy import func as sqlfunc
    from datetime import datetime, timedelta

    base = scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    total_today = base.filter(sqlfunc.date(FleetDVIR.created_at) == today).count()
    total_week = base.filter(FleetDVIR.created_at >= week_ago).count()
    total_month = base.filter(FleetDVIR.created_at >= month_ago).count()
    defects_pending = base.filter(
        FleetDVIR.defects_found == True,
        FleetDVIR.defects_corrected != True
    ).count()
    out_of_service = base.filter(
        FleetDVIR.vehicle_safe_to_operate == False,
        FleetDVIR.defects_corrected != True
    ).count()

    return {
        "inspections_today": total_today,
        "inspections_this_week": total_week,
        "inspections_this_month": total_month,
        "defects_pending_correction": defects_pending,
        "vehicles_out_of_service": out_of_service,
    }


class SubscriptionUpdate(BaseModel):
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    critical_alerts: bool = True
    maintenance_due: bool = True
    maintenance_overdue: bool = True
    dvir_defects: bool = True
    daily_summary: bool = False
    weekly_summary: bool = False
    ai_recommendations: bool = True
    vehicle_down: bool = True
    fuel_alerts: bool = False
    vehicle_ids: list = []
    quiet_hours_start: int = 22
    quiet_hours_end: int = 6


@router.get("/subscriptions/me")
def get_my_subscription(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Get current user's fleet notification subscription"""
    subscription = (
        scoped_query(db, FleetSubscription, user.org_id, request.state.training_mode)
        .filter(FleetSubscription.user_id == user.id)
        .first()
    )
    
    if not subscription:
        subscription = FleetSubscription(
            org_id=user.org_id,
            user_id=user.id,
        )
        apply_training_mode(subscription, request)
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
    
    return model_snapshot(subscription)


@router.put("/subscriptions/me")
def update_my_subscription(
    payload: SubscriptionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Update current user's fleet notification subscription"""
    subscription = (
        scoped_query(db, FleetSubscription, user.org_id, request.state.training_mode)
        .filter(FleetSubscription.user_id == user.id)
        .first()
    )
    
    if not subscription:
        subscription = FleetSubscription(
            org_id=user.org_id,
            user_id=user.id,
        )
        apply_training_mode(subscription, request)
    
    for key, value in payload.model_dump().items():
        setattr(subscription, key, value)
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    return model_snapshot(subscription)


@router.get("/vehicles/{vehicle_id}/telemetry")
def get_vehicle_telemetry(
    vehicle_id: int,
    request: Request,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Get telemetry history for a vehicle"""
    records = (
        scoped_query(db, FleetTelemetry, user.org_id, request.state.training_mode)
        .filter(FleetTelemetry.vehicle_id == vehicle_id)
        .order_by(FleetTelemetry.created_at.desc())
        .limit(min(limit, 1000))
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.get("/ai/insights")
def get_ai_insights(
    request: Request,
    vehicle_id: int | None = None,
    status: str = "active",
    priority: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_technician)),
):
    """Get AI-powered fleet insights"""
    query = scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
    
    if vehicle_id:
        query = query.filter(FleetAIInsight.vehicle_id == vehicle_id)
    if status:
        query = query.filter(FleetAIInsight.status == status)
    if priority:
        query = query.filter(FleetAIInsight.priority == priority)
    
    insights = query.order_by(FleetAIInsight.created_at.desc()).limit(100).all()
    return [model_snapshot(insight) for insight in insights]


@router.post("/ai/insights/generate")
def generate_ai_insights(
    request: Request,
    vehicle_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_technician)),
):
    """Trigger AI analysis to generate fleet insights"""
    from services.fleet.fleet_ai_service import FleetAIService
    
    ai_service = FleetAIService(db, user.org_id, request.state.training_mode)
    insights = ai_service.generate_insights(vehicle_id)
    
    return {
        "status": "ok",
        "insights_generated": len(insights),
        "insights": [model_snapshot(insight) for insight in insights],
    }


@router.patch("/ai/insights/{insight_id}/dismiss")
def dismiss_ai_insight(
    insight_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager)),
):
    """Dismiss an AI insight"""
    insight = (
        scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
        .filter(FleetAIInsight.id == insight_id)
        .first()
    )
    
    if not insight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight not found")
    
    insight.status = "dismissed"
    db.commit()
    db.refresh(insight)
    
    return model_snapshot(insight)


@router.get("/ai/insights/stats")
def get_ai_insight_stats(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager)),
):
    """Get AI insight statistics"""
    query = scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
    
    total_active = query.filter(FleetAIInsight.status == "active").count()
    critical_count = query.filter(
        FleetAIInsight.status == "active",
        FleetAIInsight.priority == "critical"
    ).count()
    high_count = query.filter(
        FleetAIInsight.status == "active",
        FleetAIInsight.priority == "high"
    ).count()
    
    potential_savings = db.execute(
        """
        SELECT COALESCE(SUM(estimated_savings), 0)
        FROM fleet_ai_insights
        WHERE org_id = :org_id
        AND status = 'active'
        AND estimated_savings IS NOT NULL
        AND training_mode = :training_mode
        """,
        {"org_id": user.org_id, "training_mode": request.state.training_mode}
    ).scalar()
    
    return {
        "total_active_insights": total_active,
        "critical_priority": critical_count,
        "high_priority": high_count,
        "potential_annual_savings": int(potential_savings or 0),
    }


@router.get("/inspections")
def list_inspections(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    records = (
        scoped_query(db, FleetInspection, user.org_id, request.state.training_mode)
        .order_by(FleetInspection.created_at.desc())
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.post("/inspections", status_code=status.HTTP_201_CREATED)
def create_inspection(
    payload: InspectionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    vehicle = (
        scoped_query(db, FleetVehicle, user.org_id, request.state.training_mode)
        .filter(FleetVehicle.id == payload.vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vehicle not found")
    record = FleetInspection(org_id=user.org_id, **payload.model_dump())
    apply_training_mode(record, request)
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="fleet_inspection",
        classification="OPS",
        after_state=model_snapshot(record),
        event_type="fleet.inspection.created",
        event_payload={"inspection_id": record.id, "vehicle_id": vehicle.id},
    )
    return model_snapshot(record)


class DVIRCreate(BaseModel):
    vehicle_id: int
    inspection_type: str = "pre_trip"
    odometer: int = 0

    brakes_ok: bool = True
    steering_ok: bool = True
    lights_headlights_ok: bool = True
    lights_taillights_ok: bool = True
    lights_brake_ok: bool = True
    lights_turn_signals_ok: bool = True
    lights_emergency_ok: bool = True
    horn_ok: bool = True
    windshield_ok: bool = True
    wipers_ok: bool = True
    mirrors_ok: bool = True
    tires_front_ok: bool = True
    tires_rear_ok: bool = True
    wheels_lugs_ok: bool = True
    fluid_levels_ok: bool = True
    exhaust_ok: bool = True
    battery_ok: bool = True
    fire_extinguisher_ok: bool = True
    reflective_triangles_ok: bool = True
    first_aid_kit_ok: bool = True
    seatbelts_ok: bool = True

    stretcher_ok: bool | None = None
    stretcher_straps_ok: bool | None = None
    suction_ok: bool | None = None
    oxygen_main_ok: bool | None = None
    oxygen_portable_ok: bool | None = None
    monitor_defibrillator_ok: bool | None = None
    drug_box_sealed_ok: bool | None = None
    airway_bag_ok: bool | None = None
    trauma_bag_ok: bool | None = None
    iv_supplies_ok: bool | None = None
    splinting_ok: bool | None = None
    stair_chair_ok: bool | None = None
    backboard_ok: bool | None = None
    c_collar_ok: bool | None = None

    pump_ok: bool | None = None
    pump_gauges_ok: bool | None = None
    aerial_ok: bool | None = None
    ground_ladders_ok: bool | None = None
    hose_loads_ok: bool | None = None
    scba_ok: bool | None = None
    nozzles_ok: bool | None = None
    hand_tools_ok: bool | None = None
    forcible_entry_ok: bool | None = None
    vent_equipment_ok: bool | None = None
    rope_rescue_ok: bool | None = None
    thermal_camera_ok: bool | None = None

    defects_found: bool = False
    defect_description: str = ""
    vehicle_safe_to_operate: bool = True
    driver_signature: str = ""
    notes: str = ""
    payload: dict = {}


class DVIRDefectCorrection(BaseModel):
    defects_corrected: bool = True
    corrected_by: str = ""
    mechanic_signature: str = ""


@router.get("/dvir")
def list_dvir(
    request: Request,
    vehicle_id: int | None = None,
    inspection_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    query = scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
    if vehicle_id:
        query = query.filter(FleetDVIR.vehicle_id == vehicle_id)
    if inspection_type:
        query = query.filter(FleetDVIR.inspection_type == inspection_type)
    records = query.order_by(FleetDVIR.created_at.desc()).limit(100).all()
    return [model_snapshot(record) for record in records]


@router.get("/dvir/{dvir_id}")
def get_dvir(
    dvir_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.id == dvir_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DVIR not found")
    return model_snapshot(record)


@router.post("/dvir", status_code=status.HTTP_201_CREATED)
def create_dvir(
    payload: DVIRCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    vehicle = (
        scoped_query(db, FleetVehicle, user.org_id, request.state.training_mode)
        .filter(FleetVehicle.id == payload.vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vehicle not found")
    record = FleetDVIR(
        org_id=user.org_id,
        driver_id=user.id,
        driver_name=f"{user.first_name} {user.last_name}",
        **payload.model_dump()
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
        resource="fleet_dvir",
        classification="OPS",
        after_state=model_snapshot(record),
        event_type="fleet.dvir.created",
        event_payload={
            "dvir_id": record.id,
            "vehicle_id": vehicle.id,
            "inspection_type": record.inspection_type,
            "defects_found": record.defects_found,
            "safe_to_operate": record.vehicle_safe_to_operate,
        },
    )
    return model_snapshot(record)


@router.patch("/dvir/{dvir_id}/correct")
def correct_dvir_defects(
    dvir_id: int,
    payload: DVIRDefectCorrection,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.id == dvir_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DVIR not found")
    if not record.defects_found:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No defects to correct")
    before = model_snapshot(record)
    record.defects_corrected = payload.defects_corrected
    record.corrected_by = payload.corrected_by
    record.mechanic_signature = payload.mechanic_signature
    if payload.defects_corrected:
        record.vehicle_safe_to_operate = True
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="fleet_dvir",
        classification="OPS",
        before_state=before,
        after_state=model_snapshot(record),
        event_type="fleet.dvir.defects_corrected",
        event_payload={"dvir_id": record.id, "corrected": payload.defects_corrected},
    )
    return model_snapshot(record)


@router.get("/dvir/vehicle/{vehicle_id}/latest")
def get_latest_dvir(
    vehicle_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.vehicle_id == vehicle_id)
        .order_by(FleetDVIR.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No DVIR found for vehicle")
    return model_snapshot(record)


@router.get("/dvir/pending-corrections")
def list_pending_corrections(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    records = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.defects_found == True)
        .filter(FleetDVIR.defects_corrected != True)
        .order_by(FleetDVIR.created_at.desc())
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.get("/dvir/stats")
def get_dvir_stats(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    from sqlalchemy import func as sqlfunc
    from datetime import datetime, timedelta

    base = scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    total_today = base.filter(sqlfunc.date(FleetDVIR.created_at) == today).count()
    total_week = base.filter(FleetDVIR.created_at >= week_ago).count()
    total_month = base.filter(FleetDVIR.created_at >= month_ago).count()
    defects_pending = base.filter(
        FleetDVIR.defects_found == True,
        FleetDVIR.defects_corrected != True
    ).count()
    out_of_service = base.filter(
        FleetDVIR.vehicle_safe_to_operate == False,
        FleetDVIR.defects_corrected != True
    ).count()

    return {
        "inspections_today": total_today,
        "inspections_this_week": total_week,
        "inspections_this_month": total_month,
        "defects_pending_correction": defects_pending,
        "vehicles_out_of_service": out_of_service,
    }


class SubscriptionUpdate(BaseModel):
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    critical_alerts: bool = True
    maintenance_due: bool = True
    maintenance_overdue: bool = True
    dvir_defects: bool = True
    daily_summary: bool = False
    weekly_summary: bool = False
    ai_recommendations: bool = True
    vehicle_down: bool = True
    fuel_alerts: bool = False
    vehicle_ids: list = []
    quiet_hours_start: int = 22
    quiet_hours_end: int = 6


@router.get("/subscriptions/me")
def get_my_subscription(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Get current user's fleet notification subscription"""
    subscription = (
        scoped_query(db, FleetSubscription, user.org_id, request.state.training_mode)
        .filter(FleetSubscription.user_id == user.id)
        .first()
    )
    
    if not subscription:
        subscription = FleetSubscription(
            org_id=user.org_id,
            user_id=user.id,
        )
        apply_training_mode(subscription, request)
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
    
    return model_snapshot(subscription)


@router.put("/subscriptions/me")
def update_my_subscription(
    payload: SubscriptionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Update current user's fleet notification subscription"""
    subscription = (
        scoped_query(db, FleetSubscription, user.org_id, request.state.training_mode)
        .filter(FleetSubscription.user_id == user.id)
        .first()
    )
    
    if not subscription:
        subscription = FleetSubscription(
            org_id=user.org_id,
            user_id=user.id,
        )
        apply_training_mode(subscription, request)
    
    for key, value in payload.model_dump().items():
        setattr(subscription, key, value)
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    return model_snapshot(subscription)


@router.get("/vehicles/{vehicle_id}/telemetry")
def get_vehicle_telemetry(
    vehicle_id: int,
    request: Request,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Get telemetry history for a vehicle"""
    records = (
        scoped_query(db, FleetTelemetry, user.org_id, request.state.training_mode)
        .filter(FleetTelemetry.vehicle_id == vehicle_id)
        .order_by(FleetTelemetry.created_at.desc())
        .limit(min(limit, 1000))
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.get("/ai/insights")
def get_ai_insights(
    request: Request,
    vehicle_id: int | None = None,
    status: str = "active",
    priority: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_technician)),
):
    """Get AI-powered fleet insights"""
    query = scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
    
    if vehicle_id:
        query = query.filter(FleetAIInsight.vehicle_id == vehicle_id)
    if status:
        query = query.filter(FleetAIInsight.status == status)
    if priority:
        query = query.filter(FleetAIInsight.priority == priority)
    
    insights = query.order_by(FleetAIInsight.created_at.desc()).limit(100).all()
    return [model_snapshot(insight) for insight in insights]


@router.post("/ai/insights/generate")
def generate_ai_insights(
    request: Request,
    vehicle_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_technician)),
):
    """Trigger AI analysis to generate fleet insights"""
    from services.fleet.fleet_ai_service import FleetAIService
    
    ai_service = FleetAIService(db, user.org_id, request.state.training_mode)
    insights = ai_service.generate_insights(vehicle_id)
    
    return {
        "status": "ok",
        "insights_generated": len(insights),
        "insights": [model_snapshot(insight) for insight in insights],
    }


@router.patch("/ai/insights/{insight_id}/dismiss")
def dismiss_ai_insight(
    insight_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager)),
):
    """Dismiss an AI insight"""
    insight = (
        scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
        .filter(FleetAIInsight.id == insight_id)
        .first()
    )
    
    if not insight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight not found")
    
    insight.status = "dismissed"
    db.commit()
    db.refresh(insight)
    
    return model_snapshot(insight)


@router.get("/ai/insights/stats")
def get_ai_insight_stats(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager)),
):
    """Get AI insight statistics"""
    query = scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
    
    total_active = query.filter(FleetAIInsight.status == "active").count()
    critical_count = query.filter(
        FleetAIInsight.status == "active",
        FleetAIInsight.priority == "critical"
    ).count()
    high_count = query.filter(
        FleetAIInsight.status == "active",
        FleetAIInsight.priority == "high"
    ).count()
    
    potential_savings = db.execute(
        """
        SELECT COALESCE(SUM(estimated_savings), 0)
        FROM fleet_ai_insights
        WHERE org_id = :org_id
        AND status = 'active'
        AND estimated_savings IS NOT NULL
        AND training_mode = :training_mode
        """,
        {"org_id": user.org_id, "training_mode": request.state.training_mode}
    ).scalar()
    
    return {
        "total_active_insights": total_active,
        "critical_priority": critical_count,
        "high_priority": high_count,
        "potential_annual_savings": int(potential_savings or 0),
    }


@router.get("/telemetry")
def list_telemetry(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    records = (
        scoped_query(db, FleetTelemetry, user.org_id, request.state.training_mode)
        .order_by(FleetTelemetry.created_at.desc())
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.post("/telemetry", status_code=status.HTTP_201_CREATED)
def create_telemetry(
    payload: TelemetryCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    vehicle = (
        scoped_query(db, FleetVehicle, user.org_id, request.state.training_mode)
        .filter(FleetVehicle.id == payload.vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vehicle not found")
    record = FleetTelemetry(org_id=user.org_id, **payload.model_dump())
    apply_training_mode(record, request)
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="fleet_telemetry",
        classification="OPS",
        after_state=model_snapshot(record),
        event_type="fleet.telemetry.created",
        event_payload={"telemetry_id": record.id, "vehicle_id": vehicle.id},
    )
    return model_snapshot(record)


class DVIRCreate(BaseModel):
    vehicle_id: int
    inspection_type: str = "pre_trip"
    odometer: int = 0

    brakes_ok: bool = True
    steering_ok: bool = True
    lights_headlights_ok: bool = True
    lights_taillights_ok: bool = True
    lights_brake_ok: bool = True
    lights_turn_signals_ok: bool = True
    lights_emergency_ok: bool = True
    horn_ok: bool = True
    windshield_ok: bool = True
    wipers_ok: bool = True
    mirrors_ok: bool = True
    tires_front_ok: bool = True
    tires_rear_ok: bool = True
    wheels_lugs_ok: bool = True
    fluid_levels_ok: bool = True
    exhaust_ok: bool = True
    battery_ok: bool = True
    fire_extinguisher_ok: bool = True
    reflective_triangles_ok: bool = True
    first_aid_kit_ok: bool = True
    seatbelts_ok: bool = True

    stretcher_ok: bool | None = None
    stretcher_straps_ok: bool | None = None
    suction_ok: bool | None = None
    oxygen_main_ok: bool | None = None
    oxygen_portable_ok: bool | None = None
    monitor_defibrillator_ok: bool | None = None
    drug_box_sealed_ok: bool | None = None
    airway_bag_ok: bool | None = None
    trauma_bag_ok: bool | None = None
    iv_supplies_ok: bool | None = None
    splinting_ok: bool | None = None
    stair_chair_ok: bool | None = None
    backboard_ok: bool | None = None
    c_collar_ok: bool | None = None

    pump_ok: bool | None = None
    pump_gauges_ok: bool | None = None
    aerial_ok: bool | None = None
    ground_ladders_ok: bool | None = None
    hose_loads_ok: bool | None = None
    scba_ok: bool | None = None
    nozzles_ok: bool | None = None
    hand_tools_ok: bool | None = None
    forcible_entry_ok: bool | None = None
    vent_equipment_ok: bool | None = None
    rope_rescue_ok: bool | None = None
    thermal_camera_ok: bool | None = None

    defects_found: bool = False
    defect_description: str = ""
    vehicle_safe_to_operate: bool = True
    driver_signature: str = ""
    notes: str = ""
    payload: dict = {}


class DVIRDefectCorrection(BaseModel):
    defects_corrected: bool = True
    corrected_by: str = ""
    mechanic_signature: str = ""


@router.get("/dvir")
def list_dvir(
    request: Request,
    vehicle_id: int | None = None,
    inspection_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    query = scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
    if vehicle_id:
        query = query.filter(FleetDVIR.vehicle_id == vehicle_id)
    if inspection_type:
        query = query.filter(FleetDVIR.inspection_type == inspection_type)
    records = query.order_by(FleetDVIR.created_at.desc()).limit(100).all()
    return [model_snapshot(record) for record in records]


@router.get("/dvir/{dvir_id}")
def get_dvir(
    dvir_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.id == dvir_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DVIR not found")
    return model_snapshot(record)


@router.post("/dvir", status_code=status.HTTP_201_CREATED)
def create_dvir(
    payload: DVIRCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    vehicle = (
        scoped_query(db, FleetVehicle, user.org_id, request.state.training_mode)
        .filter(FleetVehicle.id == payload.vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vehicle not found")
    record = FleetDVIR(
        org_id=user.org_id,
        driver_id=user.id,
        driver_name=f"{user.first_name} {user.last_name}",
        **payload.model_dump()
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
        resource="fleet_dvir",
        classification="OPS",
        after_state=model_snapshot(record),
        event_type="fleet.dvir.created",
        event_payload={
            "dvir_id": record.id,
            "vehicle_id": vehicle.id,
            "inspection_type": record.inspection_type,
            "defects_found": record.defects_found,
            "safe_to_operate": record.vehicle_safe_to_operate,
        },
    )
    return model_snapshot(record)


@router.patch("/dvir/{dvir_id}/correct")
def correct_dvir_defects(
    dvir_id: int,
    payload: DVIRDefectCorrection,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.id == dvir_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DVIR not found")
    if not record.defects_found:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No defects to correct")
    before = model_snapshot(record)
    record.defects_corrected = payload.defects_corrected
    record.corrected_by = payload.corrected_by
    record.mechanic_signature = payload.mechanic_signature
    if payload.defects_corrected:
        record.vehicle_safe_to_operate = True
    db.commit()
    db.refresh(record)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="fleet_dvir",
        classification="OPS",
        before_state=before,
        after_state=model_snapshot(record),
        event_type="fleet.dvir.defects_corrected",
        event_payload={"dvir_id": record.id, "corrected": payload.defects_corrected},
    )
    return model_snapshot(record)


@router.get("/dvir/vehicle/{vehicle_id}/latest")
def get_latest_dvir(
    vehicle_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.crew)),
):
    record = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.vehicle_id == vehicle_id)
        .order_by(FleetDVIR.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No DVIR found for vehicle")
    return model_snapshot(record)


@router.get("/dvir/pending-corrections")
def list_pending_corrections(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    records = (
        scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
        .filter(FleetDVIR.defects_found == True)
        .filter(FleetDVIR.defects_corrected != True)
        .order_by(FleetDVIR.created_at.desc())
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.get("/dvir/stats")
def get_dvir_stats(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    from sqlalchemy import func as sqlfunc
    from datetime import datetime, timedelta

    base = scoped_query(db, FleetDVIR, user.org_id, request.state.training_mode)
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    total_today = base.filter(sqlfunc.date(FleetDVIR.created_at) == today).count()
    total_week = base.filter(FleetDVIR.created_at >= week_ago).count()
    total_month = base.filter(FleetDVIR.created_at >= month_ago).count()
    defects_pending = base.filter(
        FleetDVIR.defects_found == True,
        FleetDVIR.defects_corrected != True
    ).count()
    out_of_service = base.filter(
        FleetDVIR.vehicle_safe_to_operate == False,
        FleetDVIR.defects_corrected != True
    ).count()

    return {
        "inspections_today": total_today,
        "inspections_this_week": total_week,
        "inspections_this_month": total_month,
        "defects_pending_correction": defects_pending,
        "vehicles_out_of_service": out_of_service,
    }


class SubscriptionUpdate(BaseModel):
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    critical_alerts: bool = True
    maintenance_due: bool = True
    maintenance_overdue: bool = True
    dvir_defects: bool = True
    daily_summary: bool = False
    weekly_summary: bool = False
    ai_recommendations: bool = True
    vehicle_down: bool = True
    fuel_alerts: bool = False
    vehicle_ids: list = []
    quiet_hours_start: int = 22
    quiet_hours_end: int = 6


@router.get("/subscriptions/me")
def get_my_subscription(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Get current user's fleet notification subscription"""
    subscription = (
        scoped_query(db, FleetSubscription, user.org_id, request.state.training_mode)
        .filter(FleetSubscription.user_id == user.id)
        .first()
    )
    
    if not subscription:
        subscription = FleetSubscription(
            org_id=user.org_id,
            user_id=user.id,
        )
        apply_training_mode(subscription, request)
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
    
    return model_snapshot(subscription)


@router.put("/subscriptions/me")
def update_my_subscription(
    payload: SubscriptionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Update current user's fleet notification subscription"""
    subscription = (
        scoped_query(db, FleetSubscription, user.org_id, request.state.training_mode)
        .filter(FleetSubscription.user_id == user.id)
        .first()
    )
    
    if not subscription:
        subscription = FleetSubscription(
            org_id=user.org_id,
            user_id=user.id,
        )
        apply_training_mode(subscription, request)
    
    for key, value in payload.model_dump().items():
        setattr(subscription, key, value)
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    return model_snapshot(subscription)


@router.get("/vehicles/{vehicle_id}/telemetry")
def get_vehicle_telemetry(
    vehicle_id: int,
    request: Request,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_mechanic, UserRole.fleet_technician)),
):
    """Get telemetry history for a vehicle"""
    records = (
        scoped_query(db, FleetTelemetry, user.org_id, request.state.training_mode)
        .filter(FleetTelemetry.vehicle_id == vehicle_id)
        .order_by(FleetTelemetry.created_at.desc())
        .limit(min(limit, 1000))
        .all()
    )
    return [model_snapshot(record) for record in records]


@router.get("/ai/insights")
def get_ai_insights(
    request: Request,
    vehicle_id: int | None = None,
    status: str = "active",
    priority: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_supervisor, UserRole.fleet_technician)),
):
    """Get AI-powered fleet insights"""
    query = scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
    
    if vehicle_id:
        query = query.filter(FleetAIInsight.vehicle_id == vehicle_id)
    if status:
        query = query.filter(FleetAIInsight.status == status)
    if priority:
        query = query.filter(FleetAIInsight.priority == priority)
    
    insights = query.order_by(FleetAIInsight.created_at.desc()).limit(100).all()
    return [model_snapshot(insight) for insight in insights]


@router.post("/ai/insights/generate")
def generate_ai_insights(
    request: Request,
    vehicle_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager, UserRole.fleet_technician)),
):
    """Trigger AI analysis to generate fleet insights"""
    from services.fleet.fleet_ai_service import FleetAIService
    
    ai_service = FleetAIService(db, user.org_id, request.state.training_mode)
    insights = ai_service.generate_insights(vehicle_id)
    
    return {
        "status": "ok",
        "insights_generated": len(insights),
        "insights": [model_snapshot(insight) for insight in insights],
    }


@router.patch("/ai/insights/{insight_id}/dismiss")
def dismiss_ai_insight(
    insight_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager)),
):
    """Dismiss an AI insight"""
    insight = (
        scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
        .filter(FleetAIInsight.id == insight_id)
        .first()
    )
    
    if not insight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight not found")
    
    insight.status = "dismissed"
    db.commit()
    db.refresh(insight)
    
    return model_snapshot(insight)


@router.get("/ai/insights/stats")
def get_ai_insight_stats(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.fleet_admin, UserRole.fleet_manager)),
):
    """Get AI insight statistics"""
    query = scoped_query(db, FleetAIInsight, user.org_id, request.state.training_mode)
    
    total_active = query.filter(FleetAIInsight.status == "active").count()
    critical_count = query.filter(
        FleetAIInsight.status == "active",
        FleetAIInsight.priority == "critical"
    ).count()
    high_count = query.filter(
        FleetAIInsight.status == "active",
        FleetAIInsight.priority == "high"
    ).count()
    
    potential_savings = db.execute(
        """
        SELECT COALESCE(SUM(estimated_savings), 0)
        FROM fleet_ai_insights
        WHERE org_id = :org_id
        AND status = 'active'
        AND estimated_savings IS NOT NULL
        AND training_mode = :training_mode
        """,
        {"org_id": user.org_id, "training_mode": request.state.training_mode}
    ).scalar()
    
    return {
        "total_active_insights": total_active,
        "critical_priority": critical_count,
        "high_priority": high_count,
        "potential_annual_savings": int(potential_savings or 0),
    }
