from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from models.fire_rms import (
    Hydrant, HydrantInspection, HydrantStatus, InspectionStatus,
    FireInspection, PreFirePlan, CommunityRiskReduction,
    ApparatusMaintenanceRecord, FireIncidentSupplement
)
from models.user import User
from core.security import get_current_user
from utils.logger import logger
from utils.tenancy import scoped_query
from utils.time import utc_now
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot

router = APIRouter(
    prefix="/api/fire/rms",
    tags=["fire-rms"],
    dependencies=[Depends(require_module("FIRE"))],
)


class HydrantCreate(BaseModel):
    hydrant_number: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hydrant_type: Optional[str] = None
    flow_capacity_gpm: Optional[int] = None
    static_pressure_psi: Optional[int] = None
    residual_pressure_psi: Optional[int] = None
    manufacturer: Optional[str] = None
    install_date: Optional[date] = None
    notes: Optional[str] = None


class HydrantUpdate(BaseModel):
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hydrant_type: Optional[str] = None
    flow_capacity_gpm: Optional[int] = None
    static_pressure_psi: Optional[int] = None
    residual_pressure_psi: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class HydrantInspectionCreate(BaseModel):
    hydrant_id: int
    inspection_date: date
    inspector_id: Optional[int] = None
    flow_test_performed: bool = False
    static_pressure_psi: Optional[int] = None
    residual_pressure_psi: Optional[int] = None
    flow_gpm: Optional[int] = None
    valve_operational: bool = True
    cap_threads_good: bool = True
    paint_condition: Optional[str] = None
    deficiencies_found: Optional[str] = None
    repairs_needed: Optional[str] = None


class FireInspectionCreate(BaseModel):
    property_name: str
    property_address: str
    property_type: str
    occupancy_type: Optional[str] = None
    occupant_load: Optional[int] = None
    inspection_date: date
    inspector_id: Optional[int] = None
    inspection_type: str
    sprinkler_system: bool = False
    fire_alarm: bool = False
    fire_extinguishers: bool = False
    emergency_lighting: bool = False
    exit_signs: bool = False
    violations_description: Optional[str] = None
    corrective_actions_required: Optional[str] = None
    notes: Optional[str] = None


class FireInspectionUpdate(BaseModel):
    violations_found: Optional[int] = None
    critical_violations: Optional[int] = None
    status: Optional[str] = None
    violations_description: Optional[str] = None
    corrective_actions_required: Optional[str] = None
    re_inspection_required: Optional[bool] = None
    re_inspection_date: Optional[date] = None
    notes: Optional[str] = None


class PreFirePlanCreate(BaseModel):
    property_name: str
    property_address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    occupancy_type: str
    occupant_load: Optional[int] = None
    number_of_floors: Optional[int] = None
    square_footage: Optional[int] = None
    construction_type: Optional[str] = None
    roof_type: Optional[str] = None
    hazardous_materials_present: bool = False
    hazmat_types: Optional[List[str]] = None
    sprinkler_system: bool = False
    standpipe_system: bool = False
    fire_alarm_type: Optional[str] = None
    nearest_hydrant_distance_feet: Optional[int] = None
    water_supply_notes: Optional[str] = None
    knox_box_location: Optional[str] = None
    fire_department_connection_location: Optional[str] = None
    property_manager_name: Optional[str] = None
    property_manager_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class PreFirePlanUpdate(BaseModel):
    occupancy_type: Optional[str] = None
    occupant_load: Optional[int] = None
    number_of_floors: Optional[int] = None
    square_footage: Optional[int] = None
    construction_type: Optional[str] = None
    roof_type: Optional[str] = None
    hazardous_materials_present: Optional[bool] = None
    hazmat_types: Optional[List[str]] = None
    sprinkler_system: Optional[bool] = None
    standpipe_system: Optional[bool] = None
    fire_alarm_type: Optional[str] = None
    nearest_hydrant_distance_feet: Optional[int] = None
    water_supply_notes: Optional[str] = None
    knox_box_location: Optional[str] = None
    fire_department_connection_location: Optional[str] = None
    property_manager_name: Optional[str] = None
    property_manager_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class CRRProgramCreate(BaseModel):
    program_name: str
    program_type: str
    event_date: date
    location: Optional[str] = None
    target_audience: Optional[str] = None
    participants_count: Optional[int] = None
    topics: Optional[List[str]] = None
    materials_distributed: Optional[List[dict]] = None
    smoke_alarms_installed: int = 0
    personnel_assigned: Optional[List[dict]] = None
    program_notes: Optional[str] = None
    follow_up_required: bool = False


class ApparatusMaintenanceCreate(BaseModel):
    apparatus_id: str
    apparatus_type: str
    maintenance_date: date
    maintenance_type: str
    mileage: Optional[int] = None
    hours: Optional[int] = None
    oil_level_ok: Optional[bool] = None
    tire_pressure_ok: Optional[bool] = None
    lights_operational: Optional[bool] = None
    pump_tested: Optional[bool] = None
    service_description: Optional[str] = None
    parts_replaced: Optional[List[dict]] = None
    cost: Optional[float] = None
    performed_by: Optional[str] = None
    out_of_service: bool = False
    next_service_due: Optional[date] = None


class IncidentSupplementCreate(BaseModel):
    incident_id: int
    water_supply_method: Optional[str] = None
    gallons_used: Optional[int] = None
    attack_mode: Optional[str] = None
    ventilation_type: Optional[str] = None
    incident_command_system_used: bool = True
    command_post_location: Optional[str] = None
    mutual_aid_received: bool = False
    mutual_aid_agencies: Optional[List[str]] = None
    property_loss_estimate: Optional[float] = None
    contents_loss_estimate: Optional[float] = None
    fire_cause: Optional[str] = None
    area_of_origin: Optional[str] = None
    ignition_source: Optional[str] = None
    investigator_id: Optional[int] = None


def _hydrant_response(h: Hydrant) -> dict:
    return {
        "id": h.id,
        "hydrant_number": h.hydrant_number,
        "address": h.address,
        "latitude": h.latitude,
        "longitude": h.longitude,
        "hydrant_type": h.hydrant_type,
        "flow_capacity_gpm": h.flow_capacity_gpm,
        "static_pressure_psi": h.static_pressure_psi,
        "residual_pressure_psi": h.residual_pressure_psi,
        "manufacturer": h.manufacturer,
        "install_date": h.install_date.isoformat() if h.install_date else None,
        "status": h.status.value if h.status else None,
        "last_inspection_date": h.last_inspection_date.isoformat() if h.last_inspection_date else None,
        "next_inspection_due": h.next_inspection_due.isoformat() if h.next_inspection_due else None,
        "notes": h.notes,
        "created_at": h.created_at.isoformat() if h.created_at else None,
    }


@router.post("/hydrants")
def create_hydrant(
    payload: HydrantCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = getattr(request.state, "org_id", user.org_id)
    existing = db.query(Hydrant).filter(Hydrant.hydrant_number == payload.hydrant_number).first()
    if existing:
        raise HTTPException(status_code=409, detail="Hydrant number already exists")
    
    hydrant = Hydrant(
        hydrant_number=payload.hydrant_number,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        hydrant_type=payload.hydrant_type,
        flow_capacity_gpm=payload.flow_capacity_gpm,
        static_pressure_psi=payload.static_pressure_psi,
        residual_pressure_psi=payload.residual_pressure_psi,
        manufacturer=payload.manufacturer,
        install_date=payload.install_date,
        notes=payload.notes,
        status=HydrantStatus.OPERATIONAL,
    )
    apply_training_mode(hydrant, request)
    db.add(hydrant)
    db.commit()
    db.refresh(hydrant)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="hydrant",
        classification="OPS",
        after_state=model_snapshot(hydrant),
        event_type="fire.rms.hydrant.created",
        event_payload={"hydrant_id": hydrant.id, "hydrant_number": hydrant.hydrant_number},
    )
    return _hydrant_response(hydrant)


@router.get("/hydrants")
def list_hydrants(
    request: Request,
    status: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    training_mode = getattr(request.state, "training_mode", False)
    query = db.query(Hydrant)
    if status:
        query = query.filter(Hydrant.status == status)
    hydrants = query.order_by(Hydrant.hydrant_number).offset(offset).limit(limit).all()
    return {"hydrants": [_hydrant_response(h) for h in hydrants], "count": len(hydrants)}


@router.get("/hydrants/{hydrant_id}")
def get_hydrant(
    hydrant_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    hydrant = db.query(Hydrant).filter(Hydrant.id == hydrant_id).first()
    if not hydrant:
        raise HTTPException(status_code=404, detail="Hydrant not found")
    return _hydrant_response(hydrant)


@router.patch("/hydrants/{hydrant_id}")
def update_hydrant(
    hydrant_id: int,
    payload: HydrantUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    hydrant = db.query(Hydrant).filter(Hydrant.id == hydrant_id).first()
    if not hydrant:
        raise HTTPException(status_code=404, detail="Hydrant not found")
    
    before = model_snapshot(hydrant)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "status" and value:
            setattr(hydrant, field, HydrantStatus(value))
        else:
            setattr(hydrant, field, value)
    hydrant.updated_at = utc_now()
    db.commit()
    db.refresh(hydrant)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="hydrant",
        classification="OPS",
        before_state=before,
        after_state=model_snapshot(hydrant),
        event_type="fire.rms.hydrant.updated",
        event_payload={"hydrant_id": hydrant.id},
    )
    return _hydrant_response(hydrant)


@router.delete("/hydrants/{hydrant_id}")
def delete_hydrant(
    hydrant_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    hydrant = db.query(Hydrant).filter(Hydrant.id == hydrant_id).first()
    if not hydrant:
        raise HTTPException(status_code=404, detail="Hydrant not found")
    
    before = model_snapshot(hydrant)
    db.delete(hydrant)
    db.commit()
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="delete",
        resource="hydrant",
        classification="OPS",
        before_state=before,
        event_type="fire.rms.hydrant.deleted",
        event_payload={"hydrant_id": hydrant_id},
    )
    return {"status": "deleted", "hydrant_id": hydrant_id}


@router.post("/hydrants/{hydrant_id}/inspections")
def create_hydrant_inspection(
    hydrant_id: int,
    payload: HydrantInspectionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    hydrant = db.query(Hydrant).filter(Hydrant.id == hydrant_id).first()
    if not hydrant:
        raise HTTPException(status_code=404, detail="Hydrant not found")
    
    inspection = HydrantInspection(
        hydrant_id=hydrant_id,
        inspection_date=payload.inspection_date,
        inspector_id=payload.inspector_id,
        flow_test_performed=payload.flow_test_performed,
        static_pressure_psi=payload.static_pressure_psi,
        residual_pressure_psi=payload.residual_pressure_psi,
        flow_gpm=payload.flow_gpm,
        valve_operational=payload.valve_operational,
        cap_threads_good=payload.cap_threads_good,
        paint_condition=payload.paint_condition,
        deficiencies_found=payload.deficiencies_found,
        repairs_needed=payload.repairs_needed,
        status=InspectionStatus.COMPLETED,
    )
    apply_training_mode(inspection, request)
    db.add(inspection)
    
    hydrant.last_inspection_date = payload.inspection_date
    if payload.flow_gpm:
        hydrant.flow_capacity_gpm = payload.flow_gpm
    if payload.static_pressure_psi:
        hydrant.static_pressure_psi = payload.static_pressure_psi
    if payload.residual_pressure_psi:
        hydrant.residual_pressure_psi = payload.residual_pressure_psi
    if payload.deficiencies_found or payload.repairs_needed:
        hydrant.status = HydrantStatus.NEEDS_REPAIR
    
    db.commit()
    db.refresh(inspection)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="hydrant_inspection",
        classification="OPS",
        after_state=model_snapshot(inspection),
        event_type="fire.rms.hydrant.inspection.created",
        event_payload={"hydrant_id": hydrant_id, "inspection_id": inspection.id},
    )
    return {
        "id": inspection.id,
        "hydrant_id": hydrant_id,
        "inspection_date": inspection.inspection_date.isoformat(),
        "flow_gpm": inspection.flow_gpm,
        "status": inspection.status.value,
    }


@router.get("/hydrants/{hydrant_id}/inspections")
def list_hydrant_inspections(
    hydrant_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inspections = db.query(HydrantInspection).filter(
        HydrantInspection.hydrant_id == hydrant_id
    ).order_by(HydrantInspection.inspection_date.desc()).all()
    return {
        "inspections": [
            {
                "id": i.id,
                "inspection_date": i.inspection_date.isoformat(),
                "flow_test_performed": i.flow_test_performed,
                "flow_gpm": i.flow_gpm,
                "static_pressure_psi": i.static_pressure_psi,
                "residual_pressure_psi": i.residual_pressure_psi,
                "valve_operational": i.valve_operational,
                "deficiencies_found": i.deficiencies_found,
                "status": i.status.value if i.status else None,
            }
            for i in inspections
        ]
    }


@router.post("/inspections")
def create_fire_inspection(
    payload: FireInspectionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inspection_number = f"FI-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    inspection = FireInspection(
        inspection_number=inspection_number,
        property_name=payload.property_name,
        property_address=payload.property_address,
        property_type=payload.property_type,
        occupancy_type=payload.occupancy_type,
        occupant_load=payload.occupant_load,
        inspection_date=payload.inspection_date,
        inspector_id=payload.inspector_id,
        inspection_type=payload.inspection_type,
        sprinkler_system=payload.sprinkler_system,
        fire_alarm=payload.fire_alarm,
        fire_extinguishers=payload.fire_extinguishers,
        emergency_lighting=payload.emergency_lighting,
        exit_signs=payload.exit_signs,
        violations_description=payload.violations_description,
        corrective_actions_required=payload.corrective_actions_required,
        notes=payload.notes,
        status="passed",
    )
    apply_training_mode(inspection, request)
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="fire_inspection",
        classification="OPS",
        after_state=model_snapshot(inspection),
        event_type="fire.rms.inspection.created",
        event_payload={"inspection_id": inspection.id, "property": payload.property_name},
    )
    return {
        "id": inspection.id,
        "inspection_number": inspection.inspection_number,
        "property_name": inspection.property_name,
        "property_address": inspection.property_address,
        "inspection_date": inspection.inspection_date.isoformat(),
        "status": inspection.status,
    }


@router.get("/inspections")
def list_fire_inspections(
    request: Request,
    status: Optional[str] = None,
    property_type: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(FireInspection)
    if status:
        query = query.filter(FireInspection.status == status)
    if property_type:
        query = query.filter(FireInspection.property_type == property_type)
    inspections = query.order_by(FireInspection.inspection_date.desc()).offset(offset).limit(limit).all()
    return {
        "inspections": [
            {
                "id": i.id,
                "inspection_number": i.inspection_number,
                "property_name": i.property_name,
                "property_address": i.property_address,
                "property_type": i.property_type,
                "inspection_date": i.inspection_date.isoformat(),
                "inspection_type": i.inspection_type,
                "violations_found": i.violations_found,
                "critical_violations": i.critical_violations,
                "status": i.status,
                "re_inspection_required": i.re_inspection_required,
            }
            for i in inspections
        ],
        "count": len(inspections),
    }


@router.get("/inspections/{inspection_id}")
def get_fire_inspection(
    inspection_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inspection = db.query(FireInspection).filter(FireInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return {
        "id": inspection.id,
        "inspection_number": inspection.inspection_number,
        "property_name": inspection.property_name,
        "property_address": inspection.property_address,
        "property_type": inspection.property_type,
        "occupancy_type": inspection.occupancy_type,
        "occupant_load": inspection.occupant_load,
        "inspection_date": inspection.inspection_date.isoformat(),
        "inspector_id": inspection.inspector_id,
        "inspection_type": inspection.inspection_type,
        "violations_found": inspection.violations_found,
        "critical_violations": inspection.critical_violations,
        "status": inspection.status,
        "sprinkler_system": inspection.sprinkler_system,
        "fire_alarm": inspection.fire_alarm,
        "fire_extinguishers": inspection.fire_extinguishers,
        "emergency_lighting": inspection.emergency_lighting,
        "exit_signs": inspection.exit_signs,
        "violations_description": inspection.violations_description,
        "corrective_actions_required": inspection.corrective_actions_required,
        "re_inspection_required": inspection.re_inspection_required,
        "re_inspection_date": inspection.re_inspection_date.isoformat() if inspection.re_inspection_date else None,
        "notes": inspection.notes,
        "created_at": inspection.created_at.isoformat() if inspection.created_at else None,
    }


@router.patch("/inspections/{inspection_id}")
def update_fire_inspection(
    inspection_id: int,
    payload: FireInspectionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inspection = db.query(FireInspection).filter(FireInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    before = model_snapshot(inspection)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(inspection, field, value)
    inspection.updated_at = utc_now()
    db.commit()
    db.refresh(inspection)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="fire_inspection",
        classification="OPS",
        before_state=before,
        after_state=model_snapshot(inspection),
        event_type="fire.rms.inspection.updated",
        event_payload={"inspection_id": inspection.id},
    )
    return {"id": inspection.id, "status": inspection.status, "updated": True}


@router.post("/preplans")
def create_preplan(
    payload: PreFirePlanCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan_number = f"PFP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    preplan = PreFirePlan(
        plan_number=plan_number,
        property_name=payload.property_name,
        property_address=payload.property_address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        occupancy_type=payload.occupancy_type,
        occupant_load=payload.occupant_load,
        number_of_floors=payload.number_of_floors,
        square_footage=payload.square_footage,
        construction_type=payload.construction_type,
        roof_type=payload.roof_type,
        hazardous_materials_present=payload.hazardous_materials_present,
        hazmat_types=payload.hazmat_types,
        sprinkler_system=payload.sprinkler_system,
        standpipe_system=payload.standpipe_system,
        fire_alarm_type=payload.fire_alarm_type,
        nearest_hydrant_distance_feet=payload.nearest_hydrant_distance_feet,
        water_supply_notes=payload.water_supply_notes,
        knox_box_location=payload.knox_box_location,
        fire_department_connection_location=payload.fire_department_connection_location,
        property_manager_name=payload.property_manager_name,
        property_manager_phone=payload.property_manager_phone,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        created_by=user.email,
    )
    apply_training_mode(preplan, request)
    db.add(preplan)
    db.commit()
    db.refresh(preplan)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="pre_fire_plan",
        classification="OPS",
        after_state=model_snapshot(preplan),
        event_type="fire.rms.preplan.created",
        event_payload={"plan_id": preplan.id, "property": payload.property_name},
    )
    return {
        "id": preplan.id,
        "plan_number": preplan.plan_number,
        "property_name": preplan.property_name,
        "property_address": preplan.property_address,
        "created_at": preplan.created_at.isoformat() if preplan.created_at else None,
    }


@router.get("/preplans")
def list_preplans(
    request: Request,
    occupancy_type: Optional[str] = None,
    hazmat: Optional[bool] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(PreFirePlan)
    if occupancy_type:
        query = query.filter(PreFirePlan.occupancy_type == occupancy_type)
    if hazmat is not None:
        query = query.filter(PreFirePlan.hazardous_materials_present == hazmat)
    preplans = query.order_by(PreFirePlan.property_name).offset(offset).limit(limit).all()
    return {
        "preplans": [
            {
                "id": p.id,
                "plan_number": p.plan_number,
                "property_name": p.property_name,
                "property_address": p.property_address,
                "occupancy_type": p.occupancy_type,
                "hazardous_materials_present": p.hazardous_materials_present,
                "sprinkler_system": p.sprinkler_system,
                "number_of_floors": p.number_of_floors,
            }
            for p in preplans
        ],
        "count": len(preplans),
    }


@router.get("/preplans/{plan_id}")
def get_preplan(
    plan_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    preplan = db.query(PreFirePlan).filter(PreFirePlan.id == plan_id).first()
    if not preplan:
        raise HTTPException(status_code=404, detail="Pre-fire plan not found")
    return {
        "id": preplan.id,
        "plan_number": preplan.plan_number,
        "property_name": preplan.property_name,
        "property_address": preplan.property_address,
        "latitude": preplan.latitude,
        "longitude": preplan.longitude,
        "occupancy_type": preplan.occupancy_type,
        "occupant_load": preplan.occupant_load,
        "number_of_floors": preplan.number_of_floors,
        "square_footage": preplan.square_footage,
        "construction_type": preplan.construction_type,
        "roof_type": preplan.roof_type,
        "hazardous_materials_present": preplan.hazardous_materials_present,
        "hazmat_types": preplan.hazmat_types,
        "sprinkler_system": preplan.sprinkler_system,
        "standpipe_system": preplan.standpipe_system,
        "fire_alarm_type": preplan.fire_alarm_type,
        "nearest_hydrant_distance_feet": preplan.nearest_hydrant_distance_feet,
        "water_supply_notes": preplan.water_supply_notes,
        "knox_box_location": preplan.knox_box_location,
        "fire_department_connection_location": preplan.fire_department_connection_location,
        "floor_plan_path": preplan.floor_plan_path,
        "site_plan_path": preplan.site_plan_path,
        "property_manager_name": preplan.property_manager_name,
        "property_manager_phone": preplan.property_manager_phone,
        "emergency_contact_name": preplan.emergency_contact_name,
        "emergency_contact_phone": preplan.emergency_contact_phone,
        "created_by": preplan.created_by,
        "last_updated_by": preplan.last_updated_by,
        "created_at": preplan.created_at.isoformat() if preplan.created_at else None,
        "updated_at": preplan.updated_at.isoformat() if preplan.updated_at else None,
    }


@router.patch("/preplans/{plan_id}")
def update_preplan(
    plan_id: int,
    payload: PreFirePlanUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    preplan = db.query(PreFirePlan).filter(PreFirePlan.id == plan_id).first()
    if not preplan:
        raise HTTPException(status_code=404, detail="Pre-fire plan not found")
    
    before = model_snapshot(preplan)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(preplan, field, value)
    preplan.last_updated_by = user.email
    preplan.updated_at = utc_now()
    db.commit()
    db.refresh(preplan)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="pre_fire_plan",
        classification="OPS",
        before_state=before,
        after_state=model_snapshot(preplan),
        event_type="fire.rms.preplan.updated",
        event_payload={"plan_id": preplan.id},
    )
    return {"id": preplan.id, "plan_number": preplan.plan_number, "updated": True}


@router.post("/crr")
def create_crr_program(
    payload: CRRProgramCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    program = CommunityRiskReduction(
        program_name=payload.program_name,
        program_type=payload.program_type,
        event_date=payload.event_date,
        location=payload.location,
        target_audience=payload.target_audience,
        participants_count=payload.participants_count,
        topics=payload.topics,
        materials_distributed=payload.materials_distributed,
        smoke_alarms_installed=payload.smoke_alarms_installed,
        personnel_assigned=payload.personnel_assigned,
        program_notes=payload.program_notes,
        follow_up_required=payload.follow_up_required,
    )
    apply_training_mode(program, request)
    db.add(program)
    db.commit()
    db.refresh(program)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="community_risk_reduction",
        classification="OPS",
        after_state=model_snapshot(program),
        event_type="fire.rms.crr.created",
        event_payload={"program_id": program.id, "program_name": payload.program_name},
    )
    return {
        "id": program.id,
        "program_name": program.program_name,
        "program_type": program.program_type,
        "event_date": program.event_date.isoformat(),
        "participants_count": program.participants_count,
        "smoke_alarms_installed": program.smoke_alarms_installed,
    }


@router.get("/crr")
def list_crr_programs(
    request: Request,
    program_type: Optional[str] = None,
    target_audience: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(CommunityRiskReduction)
    if program_type:
        query = query.filter(CommunityRiskReduction.program_type == program_type)
    if target_audience:
        query = query.filter(CommunityRiskReduction.target_audience == target_audience)
    programs = query.order_by(CommunityRiskReduction.event_date.desc()).offset(offset).limit(limit).all()
    return {
        "programs": [
            {
                "id": p.id,
                "program_name": p.program_name,
                "program_type": p.program_type,
                "event_date": p.event_date.isoformat(),
                "location": p.location,
                "target_audience": p.target_audience,
                "participants_count": p.participants_count,
                "smoke_alarms_installed": p.smoke_alarms_installed,
                "follow_up_required": p.follow_up_required,
            }
            for p in programs
        ],
        "count": len(programs),
    }


@router.get("/crr/{program_id}")
def get_crr_program(
    program_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    program = db.query(CommunityRiskReduction).filter(CommunityRiskReduction.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="CRR program not found")
    return {
        "id": program.id,
        "program_name": program.program_name,
        "program_type": program.program_type,
        "event_date": program.event_date.isoformat(),
        "location": program.location,
        "target_audience": program.target_audience,
        "participants_count": program.participants_count,
        "topics": program.topics,
        "materials_distributed": program.materials_distributed,
        "smoke_alarms_installed": program.smoke_alarms_installed,
        "personnel_assigned": program.personnel_assigned,
        "program_notes": program.program_notes,
        "follow_up_required": program.follow_up_required,
        "created_at": program.created_at.isoformat() if program.created_at else None,
    }


@router.post("/apparatus/maintenance")
def create_apparatus_maintenance(
    payload: ApparatusMaintenanceCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = ApparatusMaintenanceRecord(
        apparatus_id=payload.apparatus_id,
        apparatus_type=payload.apparatus_type,
        maintenance_date=payload.maintenance_date,
        maintenance_type=payload.maintenance_type,
        mileage=payload.mileage,
        hours=payload.hours,
        oil_level_ok=payload.oil_level_ok,
        tire_pressure_ok=payload.tire_pressure_ok,
        lights_operational=payload.lights_operational,
        pump_tested=payload.pump_tested,
        service_description=payload.service_description,
        parts_replaced=payload.parts_replaced,
        cost=payload.cost,
        performed_by=payload.performed_by or user.email,
        out_of_service=payload.out_of_service,
        next_service_due=payload.next_service_due,
    )
    if payload.out_of_service:
        record.out_of_service_start = utc_now()
    
    apply_training_mode(record, request)
    db.add(record)
    db.commit()
    db.refresh(record)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="apparatus_maintenance",
        classification="OPS",
        after_state=model_snapshot(record),
        event_type="fire.rms.apparatus.maintenance",
        event_payload={"record_id": record.id, "apparatus_id": payload.apparatus_id, "type": payload.maintenance_type},
    )
    return {
        "id": record.id,
        "apparatus_id": record.apparatus_id,
        "maintenance_date": record.maintenance_date.isoformat(),
        "maintenance_type": record.maintenance_type,
        "out_of_service": record.out_of_service,
    }


@router.get("/apparatus/maintenance")
def list_apparatus_maintenance(
    request: Request,
    apparatus_id: Optional[str] = None,
    maintenance_type: Optional[str] = None,
    out_of_service: Optional[bool] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(ApparatusMaintenanceRecord)
    if apparatus_id:
        query = query.filter(ApparatusMaintenanceRecord.apparatus_id == apparatus_id)
    if maintenance_type:
        query = query.filter(ApparatusMaintenanceRecord.maintenance_type == maintenance_type)
    if out_of_service is not None:
        query = query.filter(ApparatusMaintenanceRecord.out_of_service == out_of_service)
    records = query.order_by(ApparatusMaintenanceRecord.maintenance_date.desc()).offset(offset).limit(limit).all()
    return {
        "records": [
            {
                "id": r.id,
                "apparatus_id": r.apparatus_id,
                "apparatus_type": r.apparatus_type,
                "maintenance_date": r.maintenance_date.isoformat(),
                "maintenance_type": r.maintenance_type,
                "mileage": r.mileage,
                "hours": r.hours,
                "out_of_service": r.out_of_service,
                "next_service_due": r.next_service_due.isoformat() if r.next_service_due else None,
            }
            for r in records
        ],
        "count": len(records),
    }


@router.post("/incidents/{incident_id}/supplement")
def create_incident_supplement(
    incident_id: int,
    payload: IncidentSupplementCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.query(FireIncidentSupplement).filter(
        FireIncidentSupplement.incident_id == incident_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Supplement already exists for this incident")
    
    supplement = FireIncidentSupplement(
        incident_id=incident_id,
        water_supply_method=payload.water_supply_method,
        gallons_used=payload.gallons_used,
        attack_mode=payload.attack_mode,
        ventilation_type=payload.ventilation_type,
        incident_command_system_used=payload.incident_command_system_used,
        command_post_location=payload.command_post_location,
        mutual_aid_received=payload.mutual_aid_received,
        mutual_aid_agencies=payload.mutual_aid_agencies,
        property_loss_estimate=payload.property_loss_estimate,
        contents_loss_estimate=payload.contents_loss_estimate,
        fire_cause=payload.fire_cause,
        area_of_origin=payload.area_of_origin,
        ignition_source=payload.ignition_source,
        investigator_id=payload.investigator_id,
    )
    apply_training_mode(supplement, request)
    db.add(supplement)
    db.commit()
    db.refresh(supplement)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="fire_incident_supplement",
        classification="OPS",
        after_state=model_snapshot(supplement),
        event_type="fire.rms.incident.supplement.created",
        event_payload={"incident_id": incident_id, "supplement_id": supplement.id},
    )
    return {
        "id": supplement.id,
        "incident_id": incident_id,
        "attack_mode": supplement.attack_mode,
        "property_loss_estimate": supplement.property_loss_estimate,
        "fire_cause": supplement.fire_cause,
    }


@router.get("/incidents/{incident_id}/supplement")
def get_incident_supplement(
    incident_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    supplement = db.query(FireIncidentSupplement).filter(
        FireIncidentSupplement.incident_id == incident_id
    ).first()
    if not supplement:
        raise HTTPException(status_code=404, detail="Incident supplement not found")
    return {
        "id": supplement.id,
        "incident_id": supplement.incident_id,
        "water_supply_method": supplement.water_supply_method,
        "gallons_used": supplement.gallons_used,
        "attack_mode": supplement.attack_mode,
        "ventilation_type": supplement.ventilation_type,
        "incident_command_system_used": supplement.incident_command_system_used,
        "command_post_location": supplement.command_post_location,
        "mutual_aid_received": supplement.mutual_aid_received,
        "mutual_aid_agencies": supplement.mutual_aid_agencies,
        "property_loss_estimate": supplement.property_loss_estimate,
        "contents_loss_estimate": supplement.contents_loss_estimate,
        "fire_cause": supplement.fire_cause,
        "area_of_origin": supplement.area_of_origin,
        "ignition_source": supplement.ignition_source,
        "investigator_id": supplement.investigator_id,
        "created_at": supplement.created_at.isoformat() if supplement.created_at else None,
    }


@router.get("/dashboard")
def get_rms_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    hydrant_count = db.query(Hydrant).count()
    hydrants_needing_repair = db.query(Hydrant).filter(Hydrant.status == HydrantStatus.NEEDS_REPAIR).count()
    
    inspection_count = db.query(FireInspection).count()
    inspections_failed = db.query(FireInspection).filter(FireInspection.status == "failed").count()
    inspections_pending = db.query(FireInspection).filter(FireInspection.re_inspection_required == True).count()
    
    preplan_count = db.query(PreFirePlan).count()
    preplans_with_hazmat = db.query(PreFirePlan).filter(PreFirePlan.hazardous_materials_present == True).count()
    
    crr_count = db.query(CommunityRiskReduction).count()
    smoke_alarms_installed = db.query(CommunityRiskReduction).with_entities(
        db.func.sum(CommunityRiskReduction.smoke_alarms_installed)
    ).scalar() or 0
    
    apparatus_out_of_service = db.query(ApparatusMaintenanceRecord).filter(
        ApparatusMaintenanceRecord.out_of_service == True,
        ApparatusMaintenanceRecord.out_of_service_end == None
    ).count()
    
    return {
        "hydrants": {
            "total": hydrant_count,
            "needs_repair": hydrants_needing_repair,
        },
        "inspections": {
            "total": inspection_count,
            "failed": inspections_failed,
            "pending_reinspection": inspections_pending,
        },
        "preplans": {
            "total": preplan_count,
            "with_hazmat": preplans_with_hazmat,
        },
        "community_risk_reduction": {
            "programs_count": crr_count,
            "smoke_alarms_installed": smoke_alarms_installed,
        },
        "apparatus": {
            "out_of_service": apparatus_out_of_service,
        },
    }
