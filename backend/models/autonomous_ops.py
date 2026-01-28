from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, Enum as SQLEnum, Index
from datetime import datetime
import enum
import uuid

from core.database import Base


class AutomationTrigger(enum.Enum):
    TIME_BASED = "TIME_BASED"
    EVENT_BASED = "EVENT_BASED"
    THRESHOLD_BASED = "THRESHOLD_BASED"
    PATTERN_BASED = "PATTERN_BASED"


class AutomationStatus(enum.Enum):
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"
    PAUSED = "PAUSED"
    TESTING = "TESTING"


class NotificationRoutingRule(Base):
    __tablename__ = "notification_routing_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    rule_name = Column(String, nullable=False)
    priority = Column(Integer, default=100)
    
    trigger_conditions = Column(JSON, nullable=False)
    
    notification_type = Column(String, nullable=False)
    severity_threshold = Column(String, nullable=True)
    
    auto_route_enabled = Column(Boolean, default=False)
    route_to_roles = Column(JSON, nullable=True)
    route_to_users = Column(JSON, nullable=True)
    
    escalation_rules = Column(JSON, nullable=True)
    
    status = Column(SQLEnum(AutomationStatus), default=AutomationStatus.ENABLED)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_user_id = Column(String, nullable=True)
    
    last_triggered_at = Column(DateTime, nullable=True)
    trigger_count = Column(Integer, default=0)


class BackgroundOptimization(Base):
    __tablename__ = "background_optimizations"
    __table_args__ = (
        Index('idx_bg_opt_schedule', 'scheduled_for'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    optimization_type = Column(String, nullable=False, index=True)
    
    scheduled_for = Column(DateTime, nullable=False, index=True)
    trigger = Column(SQLEnum(AutomationTrigger), nullable=False)
    
    scope = Column(JSON, nullable=False)
    parameters = Column(JSON, nullable=True)
    
    requires_supervision = Column(Boolean, default=False)
    supervisor_user_id = Column(String, nullable=True)
    
    status = Column(String, default="PENDING", index=True)
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    optimization_result = Column(JSON, nullable=True)
    
    metrics_before = Column(JSON, nullable=True)
    metrics_after = Column(JSON, nullable=True)
    
    human_review_required = Column(Boolean, default=False)
    reviewed_by_user_id = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)


class SystemInitiatedSuggestion(Base):
    __tablename__ = "system_initiated_suggestions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    suggestion_type = Column(String, nullable=False, index=True)
    
    learned_from_pattern = Column(Boolean, default=False)
    pattern_id = Column(String, nullable=True)
    
    suggestion_title = Column(String, nullable=False)
    suggestion_description = Column(Text, nullable=False)
    
    supporting_data = Column(JSON, nullable=True)
    
    confidence_score = Column(Float, nullable=False)
    
    target_user_roles = Column(JSON, nullable=True)
    target_user_ids = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    viewed_by_users = Column(JSON, nullable=True, default=[])
    
    accepted_by_user_id = Column(String, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    
    dismissed_by_user_id = Column(String, nullable=True)
    dismissed_at = Column(DateTime, nullable=True)
    dismiss_reason = Column(Text, nullable=True)


class SelfHealingAction(Base):
    __tablename__ = "self_healing_actions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    issue_detected = Column(String, nullable=False)
    issue_severity = Column(String, nullable=False)
    
    detection_time = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    healing_action_type = Column(String, nullable=False)
    healing_action_description = Column(Text, nullable=False)
    
    auto_execute = Column(Boolean, default=False)
    
    requires_approval = Column(Boolean, default=True)
    approved_by_user_id = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    executed_at = Column(DateTime, nullable=True)
    execution_result = Column(JSON, nullable=True)
    
    issue_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    
    rollback_available = Column(Boolean, default=False)
    rollback_executed = Column(Boolean, default=False)


class AutomatedReporting(Base):
    __tablename__ = "automated_reporting"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    report_name = Column(String, nullable=False)
    report_type = Column(String, nullable=False, index=True)
    
    schedule_cron = Column(String, nullable=True)
    trigger = Column(SQLEnum(AutomationTrigger), nullable=False)
    
    report_config = Column(JSON, nullable=False)
    
    recipients = Column(JSON, nullable=False)
    
    last_generated_at = Column(DateTime, nullable=True)
    next_scheduled_at = Column(DateTime, nullable=True, index=True)
    
    generation_count = Column(Integer, default=0)
    
    status = Column(SQLEnum(AutomationStatus), default=AutomationStatus.ENABLED)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_user_id = Column(String, nullable=True)


class LearnedPattern(Base):
    __tablename__ = "learned_patterns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    pattern_type = Column(String, nullable=False, index=True)
    pattern_name = Column(String, nullable=False)
    
    pattern_definition = Column(JSON, nullable=False)
    
    occurrences_observed = Column(Integer, default=1)
    first_observed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_observed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    confidence_score = Column(Float, nullable=False)
    
    triggered_suggestions = Column(Integer, default=0)
    accepted_suggestions = Column(Integer, default=0)
    
    active = Column(Boolean, default=True)
    
    reviewed_by_user_id = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    user_validation = Column(String, nullable=True)


class AutonomousActionLog(Base):
    __tablename__ = "autonomous_action_logs"
    __table_args__ = (
        Index('idx_auto_action_time', 'executed_at'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    action_type = Column(String, nullable=False, index=True)
    action_description = Column(Text, nullable=False)
    
    trigger = Column(String, nullable=False)
    
    risk_level = Column(String, nullable=False)
    
    required_approval = Column(Boolean, nullable=False)
    approval_received = Column(Boolean, default=False)
    approved_by_user_id = Column(String, nullable=True)
    
    executed_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    input_state = Column(JSON, nullable=True)
    output_state = Column(JSON, nullable=True)
    
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    
    human_override = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    
    rollback_available = Column(Boolean, default=False)
    rolled_back = Column(Boolean, default=False)
