from sqlalchemy import Column, String, Float, DateTime, Boolean, JSON, Integer, Text
from datetime import datetime
import uuid

from core.database import Base


class FacilitySearchCache(Base):
    __tablename__ = "facility_search_cache"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    facility_name = Column(String, nullable=False, index=True)
    facility_type = Column(String, nullable=True)
    
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    cms_provider_id = Column(String, nullable=True, index=True)
    npi = Column(String, nullable=True)
    
    source = Column(String, nullable=False)
    
    search_count = Column(Integer, default=0)
    last_searched_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    extra_metadata = Column(JSON, nullable=True)


class DuplicateCallDetection(Base):
    __tablename__ = "duplicate_call_detections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    call_id_1 = Column(String, nullable=False, index=True)
    call_id_2 = Column(String, nullable=False, index=True)
    
    similarity_score = Column(Float, nullable=False)
    
    matching_fields = Column(JSON, nullable=False)
    
    address_match = Column(Boolean, default=False)
    time_proximity_minutes = Column(Float, nullable=True)
    caller_phone_match = Column(Boolean, default=False)
    
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    confirmed_duplicate = Column(Boolean, nullable=True)
    confirmed_by_user_id = Column(String, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    
    merged_into_call_id = Column(String, nullable=True)


class AddressGeocoding(Base):
    __tablename__ = "address_geocoding_cache"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    raw_address = Column(String, nullable=False, index=True)
    
    normalized_address = Column(String, nullable=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    accuracy = Column(String, nullable=True)
    
    geocoding_provider = Column(String, nullable=False)
    
    city = Column(String, nullable=True)
    county = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    
    geocoded_at = Column(DateTime, default=datetime.utcnow)
    
    hit_count = Column(Integer, default=0)


class GeofenceZone(Base):
    __tablename__ = "geofence_zones"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    zone_name = Column(String, nullable=False)
    zone_type = Column(String, nullable=False)
    
    center_lat = Column(Float, nullable=False)
    center_lon = Column(Float, nullable=False)
    radius_meters = Column(Float, nullable=False)
    
    polygon = Column(JSON, nullable=True)
    
    auto_status_rules = Column(JSON, nullable=False)
    
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    
    active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class GeofenceEvent(Base):
    __tablename__ = "geofence_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    zone_id = Column(String, nullable=False, index=True)
    
    unit_id = Column(String, nullable=False, index=True)
    
    event_type = Column(String, nullable=False)
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    auto_status_triggered = Column(Boolean, default=False)
    new_status = Column(String, nullable=True)
    
    incident_id = Column(String, nullable=True)


class WebSocketConnection(Base):
    __tablename__ = "websocket_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    user_id = Column(String, nullable=False, index=True)
    organization_id = Column(String, nullable=False, index=True)
    
    connection_id = Column(String, nullable=False, unique=True)
    
    connected_at = Column(DateTime, default=datetime.utcnow)
    last_ping_at = Column(DateTime, default=datetime.utcnow)
    
    subscribed_channels = Column(JSON, default=[])
    
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    
    active = Column(Boolean, default=True)


class RealTimeDashboardMetric(Base):
    __tablename__ = "realtime_dashboard_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    active_calls = Column(Integer, default=0)
    available_units = Column(Integer, default=0)
    en_route_units = Column(Integer, default=0)
    on_scene_units = Column(Integer, default=0)
    transporting_units = Column(Integer, default=0)
    
    avg_response_time_minutes = Column(Float, nullable=True)
    avg_scene_time_minutes = Column(Float, nullable=True)
    avg_transport_time_minutes = Column(Float, nullable=True)
    
    calls_last_hour = Column(Integer, default=0)
    calls_today = Column(Integer, default=0)
    
    coverage_status = Column(String, nullable=True)
    
    additional_metrics = Column(JSON, nullable=True)
