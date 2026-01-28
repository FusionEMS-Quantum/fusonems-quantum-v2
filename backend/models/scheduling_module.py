from datetime import datetime, date, time
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, 
    JSON, String, Text, Time, func, Index, UniqueConstraint,
    Enum as SQLEnum
)
from sqlalchemy.orm import relationship

from core.database import Base


class ShiftType(str, Enum):
    REGULAR = "regular"
    OVERTIME = "overtime"
    CALLBACK = "callback"
    STANDBY = "standby"
    ON_CALL = "on_call"
    TRAINING = "training"
    ADMINISTRATIVE = "administrative"


class ShiftStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AssignmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    SWAPPED = "swapped"
    NO_SHOW = "no_show"
    COMPLETED = "completed"


class TimeOffType(str, Enum):
    VACATION = "vacation"
    SICK = "sick"
    PERSONAL = "personal"
    BEREAVEMENT = "bereavement"
    JURY_DUTY = "jury_duty"
    MILITARY = "military"
    FMLA = "fmla"
    UNPAID = "unpaid"
    COMP_TIME = "comp_time"
    HOLIDAY = "holiday"


class RequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class AvailabilityType(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    PREFERRED = "preferred"
    CONDITIONAL = "conditional"


class RecurrencePattern(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ScheduleTemplate(Base):
    __tablename__ = "schedule_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    recurrence_pattern = Column(SQLEnum(RecurrencePattern), default=RecurrencePattern.WEEKLY)
    recurrence_config = Column(JSON, default=dict)
    
    effective_start = Column(Date, nullable=False)
    effective_end = Column(Date)
    
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_schedule_template_org_active", "org_id", "is_active"),
    )


class ShiftDefinition(Base):
    __tablename__ = "shift_definitions"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("schedule_templates.id"), index=True)
    
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    description = Column(Text)
    
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration_hours = Column(Float, nullable=False)
    
    shift_type = Column(SQLEnum(ShiftType), default=ShiftType.REGULAR)
    
    color = Column(String(7), default="#FF6B35")
    icon = Column(String(50))
    
    station_id = Column(Integer)
    unit_id = Column(Integer)
    
    min_staff = Column(Integer, default=1)
    max_staff = Column(Integer)
    
    required_certifications = Column(JSON, default=list)
    required_skills = Column(JSON, default=list)
    
    pay_multiplier = Column(Float, default=1.0)
    is_premium = Column(Boolean, default=False)
    
    break_duration_minutes = Column(Integer, default=30)
    allow_split = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_shift_def_org_active", "org_id", "is_active"),
        UniqueConstraint("org_id", "code", name="uq_shift_def_org_code"),
    )


class ScheduledShift(Base):
    __tablename__ = "scheduled_shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    definition_id = Column(Integer, ForeignKey("shift_definitions.id"), index=True)
    schedule_period_id = Column(Integer, ForeignKey("schedule_periods.id"), index=True)
    
    shift_date = Column(Date, nullable=False, index=True)
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    
    status = Column(SQLEnum(ShiftStatus), default=ShiftStatus.DRAFT)
    
    station_id = Column(Integer)
    station_name = Column(String(100))
    unit_id = Column(Integer)
    unit_name = Column(String(50))
    
    required_staff = Column(Integer, default=1)
    assigned_count = Column(Integer, default=0)
    
    notes = Column(Text)
    
    is_open = Column(Boolean, default=True)
    is_overtime = Column(Boolean, default=False)
    is_critical = Column(Boolean, default=False)
    
    coverage_score = Column(Float)
    
    classification = Column(String(20), default="OPS")
    training_mode = Column(Boolean, default=False)
    
    published_at = Column(DateTime(timezone=True))
    published_by = Column(Integer, ForeignKey("users.id"))
    
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_scheduled_shift_org_date", "org_id", "shift_date"),
        Index("idx_scheduled_shift_status", "org_id", "status"),
    )


class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    shift_id = Column(Integer, ForeignKey("scheduled_shifts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), index=True)
    
    status = Column(SQLEnum(AssignmentStatus), default=AssignmentStatus.PENDING)
    
    role = Column(String(50))
    position = Column(String(50))
    
    actual_start = Column(DateTime(timezone=True))
    actual_end = Column(DateTime(timezone=True))
    
    hours_worked = Column(Float)
    hours_overtime = Column(Float, default=0)
    
    is_primary = Column(Boolean, default=True)
    is_overtime = Column(Boolean, default=False)
    is_voluntary = Column(Boolean, default=True)
    
    acknowledgment_required = Column(Boolean, default=True)
    acknowledged_at = Column(DateTime(timezone=True))
    
    notes = Column(Text)
    
    swapped_from_id = Column(Integer, ForeignKey("shift_assignments.id"))
    swapped_to_id = Column(Integer, ForeignKey("shift_assignments.id"))
    
    classification = Column(String(20), default="OPS")
    training_mode = Column(Boolean, default=False)
    
    assigned_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_assignment_user_shift", "user_id", "shift_id"),
        Index("idx_assignment_status", "org_id", "status"),
        UniqueConstraint("shift_id", "user_id", name="uq_shift_user_assignment"),
    )


class SchedulePeriod(Base):
    __tablename__ = "schedule_periods"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    status = Column(String(20), default="draft")
    
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime(timezone=True))
    published_by = Column(Integer, ForeignKey("users.id"))
    
    publish_deadline = Column(DateTime(timezone=True))
    
    notes = Column(Text)
    
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_period_org_dates", "org_id", "start_date", "end_date"),
    )


class CrewAvailability(Base):
    __tablename__ = "crew_availability"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    date = Column(Date, nullable=False, index=True)
    
    availability_type = Column(SQLEnum(AvailabilityType), default=AvailabilityType.AVAILABLE)
    
    start_time = Column(Time)
    end_time = Column(Time)
    all_day = Column(Boolean, default=True)
    
    recurrence_pattern = Column(SQLEnum(RecurrencePattern), default=RecurrencePattern.NONE)
    recurrence_end = Column(Date)
    
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_availability_user_date", "user_id", "date"),
        Index("idx_availability_org_date", "org_id", "date"),
    )


class TimeOffRequest(Base):
    __tablename__ = "time_off_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    request_type = Column(SQLEnum(TimeOffType), nullable=False)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    start_time = Column(Time)
    end_time = Column(Time)
    partial_day = Column(Boolean, default=False)
    
    total_hours = Column(Float)
    
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING)
    
    reason = Column(Text)
    notes = Column(Text)
    
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    reviewed_at = Column(DateTime(timezone=True))
    review_notes = Column(Text)
    
    policy_id = Column(Integer)
    balance_before = Column(Float)
    balance_after = Column(Float)
    
    conflicts_detected = Column(JSON, default=list)
    coverage_impact = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_timeoff_user_dates", "user_id", "start_date", "end_date"),
        Index("idx_timeoff_status", "org_id", "status"),
    )


class ShiftSwapRequest(Base):
    __tablename__ = "shift_swap_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_assignment_id = Column(Integer, ForeignKey("shift_assignments.id"), nullable=False)
    
    target_user_id = Column(Integer, ForeignKey("users.id"))
    target_assignment_id = Column(Integer, ForeignKey("shift_assignments.id"))
    
    swap_type = Column(String(20), default="swap")
    
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING)
    
    reason = Column(Text)
    
    requester_approved = Column(Boolean)
    target_approved = Column(Boolean)
    supervisor_approved = Column(Boolean)
    
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    
    expires_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_swap_requester", "requester_id", "status"),
        Index("idx_swap_target", "target_user_id", "status"),
    )


class CoverageRequirement(Base):
    __tablename__ = "coverage_requirements"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    description = Column(Text)
    
    station_id = Column(Integer)
    station_name = Column(String(100))
    unit_type = Column(String(50))
    
    day_of_week = Column(Integer)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    min_staff = Column(Integer, nullable=False)
    optimal_staff = Column(Integer)
    max_staff = Column(Integer)
    
    required_certifications = Column(JSON, default=list)
    required_roles = Column(JSON, default=list)
    
    priority = Column(Integer, default=1)
    is_critical = Column(Boolean, default=False)
    
    effective_start = Column(Date)
    effective_end = Column(Date)
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_coverage_org_active", "org_id", "is_active"),
    )


class SchedulingPolicy(Base):
    __tablename__ = "scheduling_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    description = Column(Text)
    policy_type = Column(String(50), nullable=False)
    
    config = Column(JSON, nullable=False, default=dict)
    
    max_hours_per_week = Column(Float)
    max_consecutive_days = Column(Integer)
    min_rest_hours = Column(Float)
    max_overtime_hours = Column(Float)
    
    overtime_threshold_daily = Column(Float, default=8)
    overtime_threshold_weekly = Column(Float, default=40)
    
    enforce_certifications = Column(Boolean, default=True)
    enforce_rest_periods = Column(Boolean, default=True)
    enforce_max_hours = Column(Boolean, default=True)
    
    alert_overtime_threshold = Column(Float, default=35)
    alert_fatigue_threshold = Column(Float, default=48)
    
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=1)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_policy_org_type", "org_id", "policy_type"),
    )


class SchedulingAlert(Base):
    __tablename__ = "scheduling_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    alert_type = Column(String(50), nullable=False)
    severity = Column(SQLEnum(AlertSeverity), default=AlertSeverity.WARNING)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    shift_id = Column(Integer, ForeignKey("scheduled_shifts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    assignment_id = Column(Integer, ForeignKey("shift_assignments.id"))
    
    policy_id = Column(Integer, ForeignKey("scheduling_policies.id"))
    policy_violated = Column(String(100))
    
    context_data = Column(JSON)
    
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(Integer, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime(timezone=True))
    
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime(timezone=True))
    resolution_notes = Column(Text)
    
    expires_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index("idx_alert_org_unresolved", "org_id", "is_resolved"),
        Index("idx_alert_severity", "org_id", "severity"),
    )


class AISchedulingRecommendation(Base):
    __tablename__ = "ai_scheduling_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    recommendation_type = Column(String(50), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    explanation = Column(Text)
    
    confidence_score = Column(Float)
    impact_score = Column(Float)
    
    shift_id = Column(Integer, ForeignKey("scheduled_shifts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    suggested_action = Column(JSON)
    alternative_actions = Column(JSON, default=list)
    
    policy_context = Column(JSON)
    
    status = Column(String(20), default="pending")
    
    accepted = Column(Boolean)
    accepted_by = Column(Integer, ForeignKey("users.id"))
    accepted_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)
    
    expires_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index("idx_ai_rec_org_status", "org_id", "status"),
    )


class OvertimeTracking(Base):
    __tablename__ = "overtime_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    
    regular_hours = Column(Float, default=0)
    overtime_hours = Column(Float, default=0)
    double_time_hours = Column(Float, default=0)
    
    projected_regular = Column(Float, default=0)
    projected_overtime = Column(Float, default=0)
    
    overtime_threshold = Column(Float, default=40)
    
    estimated_cost = Column(Float)
    
    last_calculated = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_ot_user_period", "user_id", "period_start"),
        UniqueConstraint("user_id", "period_start", "period_end", name="uq_ot_user_period"),
    )


class FatigueIndicator(Base):
    __tablename__ = "fatigue_indicators"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    calculation_date = Column(Date, nullable=False)
    
    hours_last_24 = Column(Float, default=0)
    hours_last_48 = Column(Float, default=0)
    hours_last_7_days = Column(Float, default=0)
    
    consecutive_days_worked = Column(Integer, default=0)
    rest_hours_since_last_shift = Column(Float)
    
    fatigue_score = Column(Float)
    risk_level = Column(String(20))
    
    factors = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String(255))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index("idx_fatigue_user_date", "user_id", "calculation_date"),
        Index("idx_fatigue_flagged", "org_id", "is_flagged"),
    )


class SchedulingAuditLog(Base):
    __tablename__ = "scheduling_audit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    action = Column(String(50), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(Integer)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    
    before_state = Column(JSON)
    after_state = Column(JSON)
    
    change_summary = Column(Text)
    
    ai_assisted = Column(Boolean, default=False)
    ai_recommendation_id = Column(Integer, ForeignKey("ai_scheduling_recommendations.id"))
    
    policy_overrides = Column(JSON)
    
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index("idx_audit_org_time", "org_id", "created_at"),
        Index("idx_audit_resource", "resource_type", "resource_id"),
    )


class SchedulePublication(Base):
    __tablename__ = "schedule_publications"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    period_id = Column(Integer, ForeignKey("schedule_periods.id"), nullable=False)
    
    version = Column(Integer, nullable=False, default=1)
    
    published_at = Column(DateTime(timezone=True), server_default=func.now())
    published_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    snapshot_data = Column(JSON)
    
    notification_sent = Column(Boolean, default=False)
    notification_sent_at = Column(DateTime(timezone=True))
    
    notes = Column(Text)
    
    __table_args__ = (
        Index("idx_publication_period", "period_id", "version"),
        UniqueConstraint("period_id", "version", name="uq_publication_version"),
    )


class SchedulingSubscriptionFeature(Base):
    __tablename__ = "scheduling_subscription_features"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    subscription_tier = Column(String(50), default="base")
    
    ai_recommendations_enabled = Column(Boolean, default=False)
    fatigue_tracking_enabled = Column(Boolean, default=False)
    predictive_staffing_enabled = Column(Boolean, default=False)
    overtime_modeling_enabled = Column(Boolean, default=False)
    scenario_planning_enabled = Column(Boolean, default=False)
    advanced_analytics_enabled = Column(Boolean, default=False)
    cross_module_context_enabled = Column(Boolean, default=False)
    
    max_schedule_periods = Column(Integer, default=12)
    max_templates = Column(Integer, default=5)
    
    api_rate_limit = Column(Integer, default=1000)
    
    expires_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint("org_id", name="uq_scheduling_subscription_org"),
    )
