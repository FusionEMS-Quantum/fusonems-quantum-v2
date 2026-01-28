from sqlalchemy import Column, String, Float, DateTime, JSON, Boolean, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from datetime import datetime
import enum
from core.database import Base


class TrafficEventType(str, enum.Enum):
    ACCIDENT = "accident"
    CLOSURE = "closure"
    CONSTRUCTION = "construction"
    CONGESTION = "congestion"
    HAZARD = "hazard"
    OTHER = "other"


class TrafficSeverity(str, enum.Enum):
    ROAD_CLOSURE = "road_closure"
    MAJOR = "major"
    MODERATE = "moderate"
    MINOR = "minor"


class RoutingEngine(str, enum.Enum):
    VALHALLA = "valhalla"
    MAPBOX = "mapbox"
    GOOGLE = "google"


class TrafficEvent(Base):
    __tablename__ = "traffic_events"

    id = Column(String, primary_key=True)
    source = Column(String, nullable=False, index=True)
    event_type = Column(SQLEnum(TrafficEventType), nullable=False, index=True)
    severity = Column(SQLEnum(TrafficSeverity), nullable=False, index=True)
    
    title = Column(String, nullable=False)
    description = Column(String)
    
    geometry = Column(Geometry('GEOMETRY', srid=4326), nullable=False)
    geometry_type = Column(String, nullable=False)
    
    penalty_multiplier = Column(Float, default=1.0)
    
    active = Column(Boolean, default=True, index=True)
    start_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_time = Column(DateTime)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    source_event_id = Column(String, index=True)
    meta_data = Column(JSONB, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)


class RouteCalculation(Base):
    __tablename__ = "route_calculations"

    id = Column(String, primary_key=True)
    incident_id = Column(String, index=True)
    unit_id = Column(String, index=True)
    
    origin_lat = Column(Float, nullable=False)
    origin_lon = Column(Float, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lon = Column(Float, nullable=False)
    
    routing_engine = Column(SQLEnum(RoutingEngine), nullable=False, index=True)
    
    route_geometry = Column(Geometry('LINESTRING', srid=4326))
    route_geojson = Column(JSONB)
    
    baseline_eta_seconds = Column(Integer)
    baseline_distance_meters = Column(Integer)
    
    traffic_adjusted = Column(Boolean, default=False)
    traffic_adjusted_eta_seconds = Column(Integer)
    
    traffic_events_applied = Column(JSONB, default=[])
    penalties_applied = Column(JSONB, default=[])
    
    calculation_time_ms = Column(Integer)
    
    dispatcher_requested = Column(Boolean, default=False)
    manual_refresh = Column(Boolean, default=False)
    
    paid_api_used = Column(Boolean, default=False)
    paid_api_cost_cents = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    created_by = Column(String)


class TrafficFeedSource(Base):
    __tablename__ = "traffic_feed_sources"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    
    url = Column(String)
    api_key = Column(String)
    
    poll_interval_seconds = Column(Integer, default=300)
    
    active = Column(Boolean, default=True)
    last_poll_at = Column(DateTime)
    last_success_at = Column(DateTime)
    last_error = Column(String)
    
    events_ingested_count = Column(Integer, default=0)
    
    config = Column(JSONB, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RoutingConfig(Base):
    __tablename__ = "routing_config"

    id = Column(String, primary_key=True)
    organization_id = Column(String, index=True)
    
    valhalla_endpoint = Column(String, default="http://valhalla:8002")
    
    use_traffic_penalties = Column(Boolean, default=True)
    
    enable_paid_apis = Column(Boolean, default=False)
    paid_api_provider = Column(String)
    paid_api_rate_limit_per_hour = Column(Integer, default=100)
    paid_api_monthly_budget_cents = Column(Integer, default=0)
    paid_api_current_month_spend_cents = Column(Integer, default=0)
    
    high_priority_threshold = Column(String, default="ESI-1,ESI-2")
    
    auto_recalc_on_major_incident = Column(Boolean, default=True)
    auto_recalc_distance_threshold_meters = Column(Integer, default=500)
    
    severity_penalties = Column(JSONB, default={
        "road_closure": 9999,
        "major": 600,
        "moderate": 300,
        "minor": 60
    })
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
