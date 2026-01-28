from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from core.database import get_db
from services.routing.service import RoutingService, TrafficFeedIngestionService
from models.routing import TrafficEvent, RouteCalculation, RoutingConfig
from core.security import get_current_user

router = APIRouter()


class RouteRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    destination_lat: float
    destination_lon: float
    incident_id: Optional[str] = None
    unit_id: Optional[str] = None
    priority_level: Optional[str] = None
    dispatcher_requested: bool = False


class RouteResponse(BaseModel):
    route_id: str
    baseline_eta_seconds: int
    baseline_distance_meters: int
    traffic_adjusted: bool
    traffic_adjusted_eta_seconds: Optional[int]
    routing_engine: str
    traffic_events_count: int
    calculation_time_ms: int
    paid_api_used: bool
    route_geojson: dict


@router.post("/route/calculate", response_model=RouteResponse)
async def calculate_route(
    request: RouteRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Calculate route with traffic awareness.
    Uses Valhalla + OSM as primary, optionally enhances with paid API.
    """
    service = RoutingService(db)
    
    route = await service.calculate_route(
        origin_lat=request.origin_lat,
        origin_lon=request.origin_lon,
        dest_lat=request.destination_lat,
        dest_lon=request.destination_lon,
        incident_id=request.incident_id,
        unit_id=request.unit_id,
        priority_level=request.priority_level,
        dispatcher_requested=request.dispatcher_requested,
        user_id=current_user.id
    )
    
    return RouteResponse(
        route_id=route.id,
        baseline_eta_seconds=route.baseline_eta_seconds,
        baseline_distance_meters=route.baseline_distance_meters,
        traffic_adjusted=route.traffic_adjusted,
        traffic_adjusted_eta_seconds=route.traffic_adjusted_eta_seconds,
        routing_engine=route.routing_engine.value,
        traffic_events_count=len(route.traffic_events_applied),
        calculation_time_ms=route.calculation_time_ms,
        paid_api_used=route.paid_api_used,
        route_geojson=route.route_geojson
    )


@router.get("/traffic/events")
async def get_active_traffic_events(
    db: Session = Depends(get_db),
    bounds: Optional[str] = Query(None, description="bbox: min_lon,min_lat,max_lon,max_lat"),
    severity: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
):
    """
    Get active traffic events for dispatcher map overlay.
    Reference-only, not authoritative.
    """
    from geoalchemy2 import func
    
    query = db.query(TrafficEvent).filter(TrafficEvent.active == True)
    
    if severity:
        query = query.filter(TrafficEvent.severity == severity)
    
    if bounds:
        coords = [float(c) for c in bounds.split(',')]
        bbox = func.ST_MakeEnvelope(coords[0], coords[1], coords[2], coords[3], 4326)
        query = query.filter(func.ST_Intersects(TrafficEvent.geometry, bbox))
    
    events = query.all()
    
    return {
        "events": [
            {
                "id": e.id,
                "type": e.event_type.value,
                "severity": e.severity.value,
                "title": e.title,
                "description": e.description,
                "source": e.source,
                "geometry": e.metadata.get('geometry') if e.metadata else None,
                "start_time": e.start_time.isoformat(),
                "end_time": e.end_time.isoformat() if e.end_time else None
            }
            for e in events
        ],
        "count": len(events),
        "disclaimer": "Traffic data is reference-only and not authoritative. Dispatcher judgment overrides all automated data."
    }


@router.get("/routing/config")
async def get_routing_config(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get routing configuration for organization"""
    config = db.query(RoutingConfig).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Routing config not found")
    
    return {
        "valhalla_endpoint": config.valhalla_endpoint,
        "use_traffic_penalties": config.use_traffic_penalties,
        "enable_paid_apis": config.enable_paid_apis,
        "paid_api_provider": config.paid_api_provider,
        "paid_api_monthly_budget_cents": config.paid_api_monthly_budget_cents,
        "paid_api_current_spend_cents": config.paid_api_current_month_spend_cents,
        "auto_recalc_on_major_incident": config.auto_recalc_on_major_incident
    }


@router.get("/routing/audit")
async def get_routing_audit_log(
    db: Session = Depends(get_db),
    incident_id: Optional[str] = Query(None),
    unit_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user = Depends(get_current_user)
):
    """
    Audit log of all route calculations.
    Shows routing engine used, traffic applied, costs.
    """
    query = db.query(RouteCalculation).order_by(RouteCalculation.created_at.desc())
    
    if incident_id:
        query = query.filter(RouteCalculation.incident_id == incident_id)
    
    if unit_id:
        query = query.filter(RouteCalculation.unit_id == unit_id)
    
    routes = query.limit(limit).all()
    
    return {
        "routes": [
            {
                "id": r.id,
                "incident_id": r.incident_id,
                "unit_id": r.unit_id,
                "routing_engine": r.routing_engine.value,
                "baseline_eta_seconds": r.baseline_eta_seconds,
                "traffic_adjusted": r.traffic_adjusted,
                "traffic_adjusted_eta_seconds": r.traffic_adjusted_eta_seconds,
                "traffic_events_count": len(r.traffic_events_applied),
                "dispatcher_requested": r.dispatcher_requested,
                "paid_api_used": r.paid_api_used,
                "paid_api_cost_cents": r.paid_api_cost_cents,
                "created_at": r.created_at.isoformat(),
                "created_by": r.created_by
            }
            for r in routes
        ],
        "count": len(routes)
    }
