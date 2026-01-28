from sqlalchemy import Column, String, Float, DateTime, JSON, Integer, Enum as SQLEnum, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
import enum
from core.database import Base


class CallType(str, enum.Enum):
    EMERGENCY_911 = "emergency_911"
    IFT_SCHEDULED = "ift_scheduled"
    IFT_STAT = "ift_stat"
    HEMS = "hems"


class RecommendationConfidence(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DispatcherAction(str, enum.Enum):
    ACCEPTED = "accepted"
    OVERRODE = "overrode"
    IGNORED = "ignored"
    MANUAL_SELECT = "manual_select"


class UnitRecommendationRun(Base):
    __tablename__ = "unit_recommendation_runs"

    id = Column(String, primary_key=True)
    incident_id = Column(String, nullable=False, index=True)
    call_type = Column(SQLEnum(CallType), nullable=False, index=True)
    
    incident_lat = Column(Float, nullable=False)
    incident_lon = Column(Float, nullable=False)
    
    candidates_evaluated = Column(JSONB, default=[])
    
    weights_used = Column(JSONB, nullable=False)
    
    top_recommendations = Column(JSONB, default=[])
    
    routing_engine_used = Column(String)
    traffic_penalties_applied = Column(Integer, default=0)
    
    confidence = Column(SQLEnum(RecommendationConfidence), default=RecommendationConfidence.HIGH)
    confidence_reason = Column(String)
    
    calculation_time_ms = Column(Integer)
    
    dispatcher_action = Column(SQLEnum(DispatcherAction))
    selected_unit_id = Column(String)
    override_reason = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    created_by = Column(String)


class UnitCandidateScore(Base):
    __tablename__ = "unit_candidate_scores"

    id = Column(String, primary_key=True)
    recommendation_run_id = Column(String, nullable=False, index=True)
    unit_id = Column(String, nullable=False, index=True)
    
    eligible = Column(Boolean, default=True)
    ineligible_reason = Column(String)
    
    eta_seconds = Column(Integer)
    eta_source = Column(String)
    
    score_eta = Column(Float)
    score_availability = Column(Float)
    score_capability = Column(Float)
    score_fatigue = Column(Float)
    score_coverage = Column(Float)
    score_cost = Column(Float)
    
    final_score = Column(Float, index=True)
    rank = Column(Integer)
    
    explanation = Column(Text)
    
    route_calculation_id = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class RecommendationWeight(Base):
    __tablename__ = "recommendation_weights"

    id = Column(String, primary_key=True)
    organization_id = Column(String, index=True)
    call_type = Column(SQLEnum(CallType), nullable=False, unique=True)
    
    weight_eta = Column(Float, nullable=False)
    weight_availability = Column(Float, nullable=False)
    weight_capability = Column(Float, nullable=False)
    weight_fatigue = Column(Float, nullable=False)
    weight_coverage = Column(Float, nullable=False)
    weight_cost = Column(Float, nullable=False)
    
    eta_max_seconds = Column(Integer)
    
    active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
