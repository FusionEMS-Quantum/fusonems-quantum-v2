from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, Enum as SQLEnum
from datetime import datetime
import enum
import uuid

from core.database import Base


class TrendDirection(enum.Enum):
    IMPROVING = "IMPROVING"
    DECLINING = "DECLINING"
    STABLE = "STABLE"
    VOLATILE = "VOLATILE"


class PolicyImpactConfidence(enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    SPECULATIVE = "SPECULATIVE"


class StrategicTrendAnalysis(Base):
    __tablename__ = "strategic_trend_analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    analysis_period_start = Column(DateTime, nullable=False)
    analysis_period_end = Column(DateTime, nullable=False)
    
    metric_name = Column(String, nullable=False, index=True)
    metric_category = Column(String, nullable=False)
    
    trend_direction = Column(SQLEnum(TrendDirection), nullable=False)
    
    current_value = Column(Float, nullable=False)
    trend_rate_per_month = Column(Float, nullable=True)
    
    predicted_value_3mo = Column(Float, nullable=True)
    predicted_value_6mo = Column(Float, nullable=True)
    predicted_value_12mo = Column(Float, nullable=True)
    
    confidence = Column(String, nullable=False)
    
    contributing_factors = Column(JSON, nullable=True)
    
    executive_summary = Column(Text, nullable=True)
    
    generated_at = Column(DateTime, default=datetime.utcnow, index=True)


class LongTermForecast(Base):
    __tablename__ = "long_term_forecasts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    forecast_type = Column(String, nullable=False, index=True)
    
    forecast_horizon_months = Column(Integer, nullable=False)
    forecast_target_date = Column(DateTime, nullable=False)
    
    base_scenario = Column(JSON, nullable=False)
    optimistic_scenario = Column(JSON, nullable=True)
    pessimistic_scenario = Column(JSON, nullable=True)
    
    assumptions = Column(JSON, nullable=False)
    
    confidence = Column(String, nullable=False)
    
    executive_recommendation = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_system = Column(String, nullable=True)
    
    reviewed_by_leadership = Column(Boolean, default=False)
    reviewed_at = Column(DateTime, nullable=True)


class PolicyImpactSimulation(Base):
    __tablename__ = "policy_impact_simulations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    policy_name = Column(String, nullable=False)
    policy_description = Column(Text, nullable=False)
    
    simulation_type = Column(String, nullable=False)
    
    baseline_metrics = Column(JSON, nullable=False)
    
    simulated_outcomes = Column(JSON, nullable=False)
    
    estimated_cost = Column(Float, nullable=True)
    estimated_benefit = Column(Float, nullable=True)
    roi_estimate = Column(Float, nullable=True)
    
    risk_factors = Column(JSON, nullable=True)
    
    confidence = Column(SQLEnum(PolicyImpactConfidence), nullable=False)
    
    recommendation = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    reviewed_by_leadership = Column(Boolean, default=False)
    reviewed_by_user_id = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)


class BudgetStrategyModel(Base):
    __tablename__ = "budget_strategy_models"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    fiscal_year = Column(Integer, nullable=False, index=True)
    
    current_budget = Column(JSON, nullable=False)
    
    predicted_expenses = Column(JSON, nullable=False)
    predicted_revenue = Column(JSON, nullable=True)
    
    optimization_scenarios = Column(JSON, nullable=False)
    
    recommended_allocations = Column(JSON, nullable=False)
    
    staffing_recommendations = Column(JSON, nullable=True)
    capital_investment_recommendations = Column(JSON, nullable=True)
    
    risk_adjusted_projections = Column(JSON, nullable=True)
    
    executive_summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class StaffingStrategyRecommendation(Base):
    __tablename__ = "staffing_strategy_recommendations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    planning_horizon_months = Column(Integer, nullable=False)
    target_date = Column(DateTime, nullable=False)
    
    current_staffing = Column(JSON, nullable=False)
    
    predicted_demand = Column(JSON, nullable=False)
    
    recommended_staffing = Column(JSON, nullable=False)
    
    hiring_plan = Column(JSON, nullable=True)
    training_plan = Column(JSON, nullable=True)
    
    cost_analysis = Column(JSON, nullable=True)
    
    rationale = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    approved_by_leadership = Column(Boolean, default=False)
    approved_at = Column(DateTime, nullable=True)


class OutcomeOptimizationInsight(Base):
    __tablename__ = "outcome_optimization_insights"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    outcome_metric = Column(String, nullable=False, index=True)
    
    current_performance = Column(Float, nullable=False)
    benchmark_performance = Column(Float, nullable=True)
    
    performance_gap_percent = Column(Float, nullable=True)
    
    contributing_factors = Column(JSON, nullable=False)
    
    optimization_opportunities = Column(JSON, nullable=False)
    
    estimated_improvement_potential = Column(Float, nullable=True)
    
    implementation_roadmap = Column(JSON, nullable=True)
    
    priority_score = Column(Float, nullable=False)
    
    executive_summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class RegulatoryReadinessScore(Base):
    __tablename__ = "regulatory_readiness_scores"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    regulatory_framework = Column(String, nullable=False, index=True)
    
    assessment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    overall_readiness_score = Column(Float, nullable=False)
    
    dimension_scores = Column(JSON, nullable=False)
    
    compliance_gaps = Column(JSON, nullable=True)
    
    remediation_recommendations = Column(JSON, nullable=False)
    
    estimated_time_to_full_compliance_days = Column(Integer, nullable=True)
    estimated_cost = Column(Float, nullable=True)
    
    risk_level = Column(String, nullable=False)
    
    executive_summary = Column(Text, nullable=True)
    
    next_assessment_date = Column(DateTime, nullable=True)


class ExecutiveDashboardMetric(Base):
    __tablename__ = "executive_dashboard_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, index=True)
    
    metric_name = Column(String, nullable=False, index=True)
    metric_category = Column(String, nullable=False)
    
    time_period = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    value = Column(Float, nullable=False)
    
    trend_vs_prior_period = Column(Float, nullable=True)
    trend_direction = Column(SQLEnum(TrendDirection), nullable=True)
    
    target_value = Column(Float, nullable=True)
    variance_from_target = Column(Float, nullable=True)
    
    benchmark_value = Column(Float, nullable=True)
    variance_from_benchmark = Column(Float, nullable=True)
    
    insight = Column(Text, nullable=True)
    
    drill_down_data = Column(JSON, nullable=True)
