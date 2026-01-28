from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Dict, Optional

from core.database import get_db
from services.phases.orchestrator import UnifiedIntelligenceOrchestrator


router = APIRouter(prefix="/api/phases", tags=["all-phases"])


class RecommendedActionRequest(BaseModel):
    action_type: str
    title: str
    description: str
    rationale: str
    payload: dict
    organization_id: str
    confidence: float


class ApproveActionRequest(BaseModel):
    action_id: str
    user_id: str


class GuidedWorkflowRequest(BaseModel):
    workflow_name: str
    workflow_type: str
    pre_filled_data: dict
    required_approvals: List[str]
    organization_id: str


class AssistedDocumentationRequest(BaseModel):
    incident_id: str
    incident_data: dict


class AutoRouteNotificationRequest(BaseModel):
    notification_type: str
    severity: str
    payload: dict
    organization_id: str


class BackgroundOptimizationRequest(BaseModel):
    optimization_type: str
    scope: dict
    organization_id: str
    requires_supervision: bool = False


class RegionalLoadBalanceRequest(BaseModel):
    region_id: str
    agencies: List[dict]


class RegionalCoverageRequest(BaseModel):
    region_id: str
    agencies: List[str]


class SurgeCoordinationRequest(BaseModel):
    region_id: str
    surge_type: str
    affected_agencies: List[str]
    severity: str


class StrategicTrendRequest(BaseModel):
    metric_name: str
    historical_data: List[float]
    organization_id: str


class PolicySimulationRequest(BaseModel):
    policy_name: str
    policy_description: str
    baseline_metrics: dict
    organization_id: str


class BudgetStrategyRequest(BaseModel):
    fiscal_year: int
    current_budget: dict
    organization_id: str


class RegulatoryReadinessRequest(BaseModel):
    regulatory_framework: str
    organization_id: str


@router.get("/status")
async def get_system_status(db: AsyncSession = Depends(get_db)):
    """Get status of all 6 intelligence phases"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.get_system_status()


@router.post("/phase3/recommend-action")
async def recommend_action(
    request: RecommendedActionRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 3: Create recommended action with preview (requires approval)"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.suggest_action(
        request.action_type,
        request.title,
        request.description,
        request.rationale,
        request.payload,
        request.organization_id,
        request.confidence
    )


@router.post("/phase3/approve-action")
async def approve_action(
    request: ApproveActionRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 3: Approve and execute recommended action"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.approve_and_execute_action(
        request.action_id,
        request.user_id
    )


@router.post("/phase3/guided-workflow")
async def create_guided_workflow(
    request: GuidedWorkflowRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 3: Create pre-filled workflow with impact preview"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.create_guided_workflow(
        request.workflow_name,
        request.workflow_type,
        request.pre_filled_data,
        request.required_approvals,
        request.organization_id
    )


@router.post("/phase3/assist-documentation")
async def assist_documentation(
    request: AssistedDocumentationRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 3: AI-assisted documentation (human review required)"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.assist_documentation(
        request.incident_id,
        request.incident_data
    )


@router.post("/phase4/auto-route")
async def auto_route_notification(
    request: AutoRouteNotificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 4: Auto-route non-critical notifications"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.auto_route_notification(
        request.notification_type,
        request.severity,
        request.payload,
        request.organization_id
    )


@router.post("/phase4/background-optimization")
async def schedule_optimization(
    request: BackgroundOptimizationRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 4: Schedule background optimization"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.schedule_background_optimization(
        request.optimization_type,
        request.scope,
        request.organization_id,
        request.requires_supervision
    )


@router.post("/phase5/load-balance")
async def assess_load_balance(
    request: RegionalLoadBalanceRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 5: Cross-agency load balancing assessment"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.assess_regional_load_balance(
        request.region_id,
        request.agencies
    )


@router.post("/phase5/optimize-coverage")
async def optimize_coverage(
    request: RegionalCoverageRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 5: Regional coverage optimization"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.optimize_regional_coverage(
        request.region_id,
        request.agencies
    )


@router.post("/phase5/coordinate-surge")
async def coordinate_surge(
    request: SurgeCoordinationRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 5: System-wide surge coordination"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.coordinate_surge(
        request.region_id,
        request.surge_type,
        request.affected_agencies,
        request.severity
    )


@router.post("/phase6/analyze-trend")
async def analyze_trend(
    request: StrategicTrendRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 6: Strategic trend analysis for executives"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.analyze_strategic_trend(
        request.metric_name,
        request.historical_data,
        request.organization_id
    )


@router.post("/phase6/simulate-policy")
async def simulate_policy(
    request: PolicySimulationRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 6: Policy impact simulation"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.simulate_policy_impact(
        request.policy_name,
        request.policy_description,
        request.baseline_metrics,
        request.organization_id
    )


@router.post("/phase6/budget-strategy")
async def budget_strategy(
    request: BudgetStrategyRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 6: Budget and staffing strategy modeling"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.model_budget_strategy(
        request.fiscal_year,
        request.current_budget,
        request.organization_id
    )


@router.post("/phase6/regulatory-readiness")
async def regulatory_readiness(
    request: RegulatoryReadinessRequest,
    db: AsyncSession = Depends(get_db)
):
    """PHASE 6: Regulatory compliance readiness assessment"""
    orchestrator = UnifiedIntelligenceOrchestrator(db)
    return await orchestrator.assess_regulatory_readiness(
        request.regulatory_framework,
        request.organization_id
    )
