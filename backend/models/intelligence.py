from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from core.database import Base


class ForecastHorizon(enum.Enum):
    HOUR_1 = "HOUR_1"
    HOUR_4 = "HOUR_4"
    HOUR_12 = "HOUR_12"
    DAY_1 = "DAY_1"
    DAY_7 = "DAY_7"


class CallVolumeType(enum.Enum):
    EMERGENCY_911 = "EMERGENCY_911"
    IFT = "IFT"
    FIRE = "FIRE"
    HEMS = "HEMS"
    ALL = "ALL"


class ConfidenceLevel(enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    VERY_LOW = "VERY_LOW"


class CoverageRiskLevel(enum.Enum):
    SAFE = "SAFE"
    MODERATE = "MODERATE"
    CRITICAL = "CRITICAL"
    LAST_UNIT = "LAST_UNIT"


class AlertSeverity(enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    URGENT = "URGENT"


class AlertType(enum.Enum):
    COVERAGE_RISK = "COVERAGE_RISK"
    SURGE_PREDICTED = "SURGE_PREDICTED"
    UNIT_STUCK = "UNIT_STUCK"
    EXCESSIVE_SCENE_TIME = "EXCESSIVE_SCENE_TIME"
    DELAYED_OFFLOAD = "DELAYED_OFFLOAD"
    FATIGUE_THRESHOLD = "FATIGUE_THRESHOLD"
    DOCUMENTATION_RISK = "DOCUMENTATION_RISK"
    NEMSIS_VALIDATION_RISK = "NEMSIS_VALIDATION_RISK"


class AlertAudience(enum.Enum):
    DISPATCHER = "DISPATCHER"
    SUPERVISOR = "SUPERVISOR"
    CLINICAL_LEADERSHIP = "CLINICAL_LEADERSHIP"
    BILLING_COMPLIANCE = "BILLING_COMPLIANCE"


class FeedbackType(enum.Enum):
    GOOD_RECOMMENDATION = "GOOD_RECOMMENDATION"
    MISSED_CONTEXT = "MISSED_CONTEXT"
    UNSAFE_SUGGESTION = "UNSAFE_SUGGESTION"
    INCORRECT_PREDICTION = "INCORRECT_PREDICTION"
    HELPFUL_WARNING = "HELPFUL_WARNING"


class CallVolumeForecast(Base):
    __tablename__ = "call_volume_forecasts"
    __table_args__ = (
        Index('idx_forecast_time_zone', 'forecast_for', 'zone_id'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    forecast_for = Column(DateTime, nullable=False, index=True)
    horizon = Column(SQLEnum(ForecastHorizon), nullable=False)
    call_type = Column(SQLEnum(CallVolumeType), nullable=False)
    zone_id = Column(String, nullable=True)
    
    predicted_volume = Column(Float, nullable=False)
    baseline_volume = Column(Float, nullable=False)
    surge_probability = Column(Float, nullable=False, default=0.0)
    
    confidence = Column(SQLEnum(ConfidenceLevel), nullable=False)
    confidence_lower = Column(Float, nullable=True)
    confidence_upper = Column(Float, nullable=True)
    
    features_used = Column(JSON, nullable=True)
    model_version = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    actuals_volume = Column(Float, nullable=True)
    actuals_recorded_at = Column(DateTime, nullable=True)


class CoverageRiskSnapshot(Base):
    __tablename__ = "coverage_risk_snapshots"
    __table_args__ = (
        Index('idx_coverage_time', 'timestamp'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    zone_id = Column(String, nullable=True)
    
    available_units = Column(Integer, nullable=False)
    required_minimum = Column(Integer, nullable=False)
    risk_level = Column(SQLEnum(CoverageRiskLevel), nullable=False)
    
    last_available_unit_id = Column(String, nullable=True)
    units_returning_soon = Column(Integer, default=0)
    estimated_gap_duration_minutes = Column(Float, nullable=True)
    
    active_incidents = Column(Integer, default=0)
    predicted_call_rate = Column(Float, nullable=True)
    
    explanation = Column(Text, nullable=True)
    confidence = Column(SQLEnum(ConfidenceLevel), nullable=False)


class UnitTurnaroundPrediction(Base):
    __tablename__ = "unit_turnaround_predictions"
    __table_args__ = (
        Index('idx_turnaround_unit_incident', 'unit_id', 'incident_id'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    unit_id = Column(String, nullable=False, index=True)
    incident_id = Column(String, nullable=False, index=True)
    
    predicted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    predicted_back_in_service = Column(DateTime, nullable=False)
    
    predicted_scene_minutes = Column(Float, nullable=True)
    predicted_transport_minutes = Column(Float, nullable=True)
    predicted_hospital_dwell_minutes = Column(Float, nullable=True)
    predicted_documentation_minutes = Column(Float, nullable=True)
    
    total_predicted_minutes = Column(Float, nullable=False)
    confidence = Column(SQLEnum(ConfidenceLevel), nullable=False)
    
    historical_avg_scene = Column(Float, nullable=True)
    historical_avg_transport = Column(Float, nullable=True)
    historical_avg_dwell = Column(Float, nullable=True)
    facility_dwell_avg = Column(Float, nullable=True)
    
    actual_back_in_service = Column(DateTime, nullable=True)
    actual_total_minutes = Column(Float, nullable=True)
    prediction_error_minutes = Column(Float, nullable=True)


class CrewFatigueScore(Base):
    __tablename__ = "crew_fatigue_scores"
    __table_args__ = (
        Index('idx_fatigue_unit_time', 'unit_id', 'timestamp'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    unit_id = Column(String, nullable=False, index=True)
    shift_id = Column(String, nullable=True)
    
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    hours_on_duty = Column(Float, nullable=False)
    calls_this_shift = Column(Integer, default=0)
    high_acuity_calls = Column(Integer, default=0)
    
    fatigue_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    
    flight_hours_today = Column(Float, nullable=True)
    regulatory_limit_approaching = Column(Boolean, default=False)
    
    recommendation_impact = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)


class IntelligentAlert(Base):
    __tablename__ = "intelligent_alerts"
    __table_args__ = (
        Index('idx_alert_audience_time', 'audience', 'created_at'),
        Index('idx_alert_entity', 'entity_type', 'entity_id'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    alert_type = Column(SQLEnum(AlertType), nullable=False, index=True)
    severity = Column(SQLEnum(AlertSeverity), nullable=False)
    audience = Column(SQLEnum(AlertAudience), nullable=False, index=True)
    
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True, index=True)
    
    confidence = Column(SQLEnum(ConfidenceLevel), nullable=False)
    
    suggested_actions = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String, nullable=True)
    
    dismissed = Column(Boolean, default=False)
    dismissed_at = Column(DateTime, nullable=True)
    dismissed_by = Column(String, nullable=True)
    dismissed_reason = Column(Text, nullable=True)
    
    outcome_recorded = Column(Boolean, default=False)
    outcome = Column(String, nullable=True)
    outcome_notes = Column(Text, nullable=True)


class DocumentationRiskAssessment(Base):
    __tablename__ = "documentation_risk_assessments"
    __table_args__ = (
        Index('idx_doc_risk_incident', 'incident_id'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    incident_id = Column(String, nullable=False, index=True)
    epcr_id = Column(String, nullable=True)
    
    assessed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    medical_necessity_risk_score = Column(Float, nullable=False)
    documentation_completeness_score = Column(Float, nullable=False)
    nemsis_validation_risk_score = Column(Float, nullable=False)
    
    denial_probability = Column(Float, nullable=False)
    confidence = Column(SQLEnum(ConfidenceLevel), nullable=False)
    
    missing_elements = Column(JSON, nullable=True)
    weak_elements = Column(JSON, nullable=True)
    suggested_improvements = Column(JSON, nullable=True)
    
    historical_denial_rate_similar = Column(Float, nullable=True)
    
    alert_created = Column(Boolean, default=False)
    alert_id = Column(String, nullable=True)


class NEMSISValidationPrediction(Base):
    __tablename__ = "nemsis_validation_predictions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    incident_id = Column(String, nullable=False, index=True)
    epcr_id = Column(String, nullable=True)
    
    predicted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    submission_ready_score = Column(Float, nullable=False)
    rejection_probability = Column(Float, nullable=False)
    confidence = Column(SQLEnum(ConfidenceLevel), nullable=False)
    
    predicted_errors = Column(JSON, nullable=True)
    state_specific_issues = Column(JSON, nullable=True)
    
    actual_submission_at = Column(DateTime, nullable=True)
    actual_validation_result = Column(String, nullable=True)
    actual_errors = Column(JSON, nullable=True)
    
    prediction_correct = Column(Boolean, nullable=True)


class AIRecommendationOutcome(Base):
    __tablename__ = "ai_recommendation_outcomes"
    __table_args__ = (
        Index('idx_outcome_recommendation_type', 'recommendation_type', 'created_at'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    recommendation_type = Column(String, nullable=False, index=True)
    recommendation_id = Column(String, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    ai_suggested = Column(JSON, nullable=False)
    user_action = Column(JSON, nullable=False)
    
    was_accepted = Column(Boolean, nullable=False)
    was_overridden = Column(Boolean, nullable=False)
    override_reason = Column(Text, nullable=True)
    
    user_id = Column(String, nullable=False)
    
    outcome = Column(String, nullable=True)
    outcome_timestamp = Column(DateTime, nullable=True)
    
    learning_weight = Column(Float, default=1.0)


class UserAIFeedback(Base):
    __tablename__ = "user_ai_feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    user_id = Column(String, nullable=False, index=True)
    
    feedback_type = Column(SQLEnum(FeedbackType), nullable=False)
    
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    
    rating = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    
    context = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    reviewed = Column(Boolean, default=False)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    action_taken = Column(Text, nullable=True)


class AIAuditLog(Base):
    __tablename__ = "ai_audit_logs"
    __table_args__ = (
        Index('idx_audit_domain_time', 'intelligence_domain', 'timestamp'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    intelligence_domain = Column(String, nullable=False, index=True)
    operation = Column(String, nullable=False)
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    inputs = Column(JSON, nullable=True)
    outputs = Column(JSON, nullable=True)
    
    model_version = Column(String, nullable=True)
    confidence = Column(SQLEnum(ConfidenceLevel), nullable=True)
    
    user_id = Column(String, nullable=True)
    organization_id = Column(String, nullable=True)
    
    human_override = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    
    outcome = Column(String, nullable=True)
    outcome_timestamp = Column(DateTime, nullable=True)
    
    explainability_data = Column(JSON, nullable=True)
