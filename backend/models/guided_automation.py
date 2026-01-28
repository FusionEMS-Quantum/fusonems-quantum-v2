from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, Enum as SQLEnum, ForeignKey
from datetime import datetime
import enum
import uuid

from core.database import Base


class ActionType(enum.Enum):
    DISPATCH_UNIT = "DISPATCH_UNIT"
    ADD_BACKUP = "ADD_BACKUP"
    ESCALATE_INCIDENT = "ESCALATE_INCIDENT"
    REQUEST_ADDITIONAL_RESOURCES = "REQUEST_ADDITIONAL_RESOURCES"
    ROUTE_TO_ALTERNATE_FACILITY = "ROUTE_TO_ALTERNATE_FACILITY"
    COMPLETE_DOCUMENTATION = "COMPLETE_DOCUMENTATION"
    SCHEDULE_SHIFT = "SCHEDULE_SHIFT"
    ORDER_SUPPLIES = "ORDER_SUPPLIES"
    PERFORM_MAINTENANCE = "PERFORM_MAINTENANCE"


class ActionStatus(enum.Enum):
    SUGGESTED = "SUGGESTED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"


class WorkflowStage(enum.Enum):
    SUGGESTED = "SUGGESTED"
    PREVIEW = "PREVIEW"
    APPROVED = "APPROVED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    ROLLED_BACK = "ROLLED_BACK"


class RecommendedAction(Base):
    __tablename__ = "recommended_actions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    action_type = Column(SQLEnum(ActionType), nullable=False, index=True)
    status = Column(SQLEnum(ActionStatus), nullable=False, default=ActionStatus.SUGGESTED, index=True)
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    
    action_payload = Column(JSON, nullable=False)
    
    preview_data = Column(JSON, nullable=True)
    
    confidence_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    
    suggested_at = Column(DateTime, default=datetime.utcnow, index=True)
    suggested_by_system = Column(String, nullable=True)
    
    presented_to_user_id = Column(String, nullable=True)
    presented_at = Column(DateTime, nullable=True)
    
    approved_by_user_id = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    rejected_by_user_id = Column(String, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    executed_at = Column(DateTime, nullable=True)
    execution_result = Column(JSON, nullable=True)
    
    expires_at = Column(DateTime, nullable=True)


class GuidedWorkflow(Base):
    __tablename__ = "guided_workflows"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    workflow_name = Column(String, nullable=False)
    workflow_type = Column(String, nullable=False, index=True)
    
    stage = Column(SQLEnum(WorkflowStage), nullable=False, default=WorkflowStage.SUGGESTED)
    
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    
    pre_filled_data = Column(JSON, nullable=False)
    
    required_approvals = Column(JSON, nullable=False)
    received_approvals = Column(JSON, nullable=True, default=[])
    
    impact_preview = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_system = Column(String, nullable=True)
    
    approved_at = Column(DateTime, nullable=True)
    approved_by_user_id = Column(String, nullable=True)
    
    executed_at = Column(DateTime, nullable=True)
    execution_steps = Column(JSON, nullable=True)
    
    rollback_available = Column(Boolean, default=False)
    rollback_data = Column(JSON, nullable=True)
    rolled_back_at = Column(DateTime, nullable=True)


class AssistedDocumentation(Base):
    __tablename__ = "assisted_documentation"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    incident_id = Column(String, nullable=False, index=True)
    epcr_id = Column(String, nullable=True)
    
    suggested_narrative = Column(Text, nullable=True)
    suggested_chief_complaint = Column(String, nullable=True)
    suggested_assessment = Column(Text, nullable=True)
    suggested_codes = Column(JSON, nullable=True)
    
    auto_populated_fields = Column(JSON, nullable=True)
    
    user_accepted_suggestions = Column(JSON, nullable=True)
    user_modified_suggestions = Column(JSON, nullable=True)
    
    confidence_scores = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_by_user_id = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)


class IntelligentScheduleSuggestion(Base):
    __tablename__ = "intelligent_schedule_suggestions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    schedule_date = Column(DateTime, nullable=False, index=True)
    shift_type = Column(String, nullable=False)
    
    suggested_staffing = Column(JSON, nullable=False)
    
    predicted_call_volume = Column(Float, nullable=True)
    predicted_peak_hours = Column(JSON, nullable=True)
    
    coverage_optimization_score = Column(Float, nullable=True)
    cost_efficiency_score = Column(Float, nullable=True)
    
    rationale = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    approved_by_user_id = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    implemented = Column(Boolean, default=False)
    implemented_at = Column(DateTime, nullable=True)


class PredictiveMaintenanceAlert(Base):
    __tablename__ = "guided_maintenance_alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    asset_type = Column(String, nullable=False)
    asset_id = Column(String, nullable=False, index=True)
    
    predicted_failure_component = Column(String, nullable=True)
    predicted_failure_date = Column(DateTime, nullable=True)
    
    failure_probability = Column(Float, nullable=False)
    
    recommended_action = Column(Text, nullable=False)
    urgency_level = Column(String, nullable=False)
    
    estimated_cost_if_delayed = Column(Float, nullable=True)
    estimated_downtime_hours = Column(Float, nullable=True)
    
    usage_metrics = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    acknowledged_by_user_id = Column(String, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    
    work_order_created = Column(Boolean, default=False)
    work_order_id = Column(String, nullable=True)


class SupplyReplenishmentPrompt(Base):
    __tablename__ = "supply_replenishment_prompts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    supply_item = Column(String, nullable=False)
    current_quantity = Column(Integer, nullable=False)
    reorder_threshold = Column(Integer, nullable=False)
    
    predicted_depletion_date = Column(DateTime, nullable=True)
    
    recommended_order_quantity = Column(Integer, nullable=False)
    recommended_order_date = Column(DateTime, nullable=False)
    
    usage_trend_7day = Column(Float, nullable=True)
    usage_trend_30day = Column(Float, nullable=True)
    
    estimated_stockout_risk = Column(Float, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    order_placed = Column(Boolean, default=False)
    order_placed_at = Column(DateTime, nullable=True)
    order_id = Column(String, nullable=True)
