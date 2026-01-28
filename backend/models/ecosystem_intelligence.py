from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, Enum as SQLEnum
from datetime import datetime
import enum
import uuid

from core.database import Base


class RegionalCoordinationType(enum.Enum):
    LOAD_BALANCING = "LOAD_BALANCING"
    SURGE_COORDINATION = "SURGE_COORDINATION"
    MUTUAL_AID = "MUTUAL_AID"
    RESOURCE_SHARING = "RESOURCE_SHARING"


class AgencyRelationshipType(enum.Enum):
    PARTNER = "PARTNER"
    MUTUAL_AID = "MUTUAL_AID"
    CONTRACTED = "CONTRACTED"
    COORDINATED = "COORDINATED"


class CrossAgencyLoadBalance(Base):
    __tablename__ = "cross_agency_load_balances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    region_id = Column(String, nullable=False, index=True)
    
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    agencies = Column(JSON, nullable=False)
    
    total_available_units = Column(Integer, nullable=False)
    total_active_calls = Column(Integer, nullable=False)
    
    load_imbalance_score = Column(Float, nullable=False)
    
    recommended_rebalancing = Column(JSON, nullable=True)
    
    permissions_verified = Column(Boolean, default=False)
    
    confidence = Column(String, nullable=False)


class RegionalCoverageOptimization(Base):
    __tablename__ = "regional_coverage_optimizations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    region_id = Column(String, nullable=False, index=True)
    
    analysis_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    participating_agencies = Column(JSON, nullable=False)
    
    coverage_gaps = Column(JSON, nullable=True)
    
    optimization_suggestions = Column(JSON, nullable=False)
    
    estimated_improvement_percent = Column(Float, nullable=True)
    
    implementation_cost = Column(Float, nullable=True)
    
    requires_coordination_approval = Column(Boolean, default=True)


class HospitalDemandAwareness(Base):
    __tablename__ = "hospital_demand_awareness"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    hospital_id = Column(String, nullable=False, index=True)
    
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    current_ed_wait_time_minutes = Column(Float, nullable=True)
    current_trauma_capacity = Column(Integer, nullable=True)
    current_critical_care_beds = Column(Integer, nullable=True)
    
    diversion_status = Column(String, nullable=True)
    
    predicted_wait_time_30min = Column(Float, nullable=True)
    predicted_wait_time_60min = Column(Float, nullable=True)
    
    incoming_ambulances = Column(Integer, default=0)
    
    routing_recommendation = Column(Text, nullable=True)
    
    alternate_facilities = Column(JSON, nullable=True)


class SystemWideSurgeCoordination(Base):
    __tablename__ = "system_wide_surge_coordinations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    region_id = Column(String, nullable=False, index=True)
    
    surge_detected_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    surge_type = Column(String, nullable=False)
    
    affected_agencies = Column(JSON, nullable=False)
    
    surge_severity = Column(String, nullable=False)
    predicted_duration_minutes = Column(Float, nullable=True)
    
    coordination_plan = Column(JSON, nullable=False)
    
    mutual_aid_activated = Column(Boolean, default=False)
    mutual_aid_agencies = Column(JSON, nullable=True)
    
    status = Column(String, default="ACTIVE")
    
    resolved_at = Column(DateTime, nullable=True)


class AgencyPartnership(Base):
    __tablename__ = "agency_partnerships"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    agency_a_id = Column(String, nullable=False, index=True)
    agency_b_id = Column(String, nullable=False, index=True)
    
    relationship_type = Column(SQLEnum(AgencyRelationshipType), nullable=False)
    
    permissions = Column(JSON, nullable=False)
    
    data_sharing_enabled = Column(Boolean, default=False)
    shared_data_types = Column(JSON, nullable=True)
    
    load_balancing_enabled = Column(Boolean, default=False)
    mutual_aid_enabled = Column(Boolean, default=False)
    
    active = Column(Boolean, default=True)
    
    established_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class NetworkOptimizationResult(Base):
    __tablename__ = "network_optimization_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    region_id = Column(String, nullable=False, index=True)
    
    optimization_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    optimization_type = Column(String, nullable=False)
    
    agencies_involved = Column(JSON, nullable=False)
    
    metrics_before = Column(JSON, nullable=False)
    metrics_after = Column(JSON, nullable=True)
    
    improvement_summary = Column(JSON, nullable=True)
    
    cost_impact = Column(Float, nullable=True)
    
    implementation_status = Column(String, default="PROPOSED")
    
    approved_by_agencies = Column(JSON, nullable=True)
    
    implemented_at = Column(DateTime, nullable=True)
