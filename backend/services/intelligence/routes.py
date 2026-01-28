from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from core.database import get_db
from services.intelligence.orchestrator import AIAgentOrchestrator


router = APIRouter(prefix="/api/intelligence", tags=["phase2-intelligence"])


class OperationalIntelligenceRequest(BaseModel):
    organization_id: str
    zone_id: Optional[str] = None


class UnitIntelligenceRequest(BaseModel):
    unit_id: str
    incident_id: Optional[str] = None


class IncidentMonitorRequest(BaseModel):
    incident_id: str


class DocumentationAssessmentRequest(BaseModel):
    incident_id: str
    epcr_id: Optional[str] = None


class RecommendationOutcomeRequest(BaseModel):
    recommendation_type: str
    recommendation_id: str
    ai_suggested: dict
    user_action: dict
    user_id: str
    was_accepted: bool
    override_reason: Optional[str] = None


class UserFeedbackRequest(BaseModel):
    user_id: str
    feedback_type: str
    entity_type: str
    entity_id: str
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


@router.post("/operational")
async def get_operational_intelligence(
    request: OperationalIntelligenceRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    DOMAIN 1: Predictive Operations Intelligence
    
    Returns:
    - Call volume forecasts (1hr, 4hr)
    - Coverage risk assessment
    - Surge probability indicators
    
    Authority: Advisory only, never alters dispatch
    """
    orchestrator = AIAgentOrchestrator(db)
    result = await orchestrator.get_operational_intelligence(
        organization_id=request.organization_id,
        zone_id=request.zone_id
    )
    return result


@router.post("/unit")
async def get_unit_intelligence(
    request: UnitIntelligenceRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    DOMAIN 2: Advanced Unit Recommendation Intelligence
    
    Returns:
    - Crew fatigue assessment
    - Turnaround time prediction (if incident provided)
    - Recommendation ranking impact
    
    Authority: Influences recommendations, dispatcher override always allowed
    """
    orchestrator = AIAgentOrchestrator(db)
    result = await orchestrator.get_unit_intelligence(
        unit_id=request.unit_id,
        incident_id=request.incident_id
    )
    return result


@router.post("/incident/monitor")
async def monitor_incident(
    request: IncidentMonitorRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    DOMAIN 3: Smart Notifications & Early Warnings
    
    Detects:
    - Units stuck en route
    - Excessive scene time
    - Delayed hospital offload
    - Missed critical milestones
    
    Authority: Alerts only, no automated escalation
    """
    orchestrator = AIAgentOrchestrator(db)
    result = await orchestrator.monitor_incident(incident_id=request.incident_id)
    return result


@router.post("/documentation/assess")
async def assess_documentation(
    request: DocumentationAssessmentRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    DOMAIN 4: Clinical, Billing, and Compliance Intelligence
    
    Returns:
    - Medical necessity risk score
    - Documentation completeness score
    - NEMSIS validation prediction
    - Suggested improvements
    
    Authority: Advisory only, no auto-editing of records
    """
    orchestrator = AIAgentOrchestrator(db)
    result = await orchestrator.assess_documentation_quality(
        incident_id=request.incident_id,
        epcr_id=request.epcr_id
    )
    return result


@router.post("/learning/outcome")
async def record_outcome(
    request: RecommendationOutcomeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    DOMAIN 5: Learning & Feedback
    
    Records recommendation outcome for continuous learning.
    Tracks acceptance, overrides, and reasons.
    """
    orchestrator = AIAgentOrchestrator(db)
    result = await orchestrator.record_user_interaction(
        recommendation_type=request.recommendation_type,
        recommendation_id=request.recommendation_id,
        ai_suggested=request.ai_suggested,
        user_action=request.user_action,
        user_id=request.user_id,
        was_accepted=request.was_accepted,
        override_reason=request.override_reason
    )
    return result


@router.get("/learning/insights/{recommendation_type}")
async def get_learning_insights(
    recommendation_type: str,
    lookback_days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db)
):
    """
    DOMAIN 5: Learning & Feedback
    
    Returns:
    - Override patterns
    - Model performance metrics
    - Systematic issues
    """
    orchestrator = AIAgentOrchestrator(db)
    result = await orchestrator.get_learning_insights(
        recommendation_type=recommendation_type,
        lookback_days=lookback_days
    )
    return result


@router.post("/feedback")
async def submit_feedback(
    request: UserFeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    DOMAIN 5: Learning & Feedback
    
    Accepts explicit user feedback:
    - GOOD_RECOMMENDATION
    - MISSED_CONTEXT
    - UNSAFE_SUGGESTION
    - INCORRECT_PREDICTION
    - HELPFUL_WARNING
    """
    orchestrator = AIAgentOrchestrator(db)
    result = await orchestrator.submit_user_feedback(
        user_id=request.user_id,
        feedback_type=request.feedback_type,
        entity_type=request.entity_type,
        entity_id=request.entity_id,
        rating=request.rating,
        comment=request.comment
    )
    return result


@router.get("/health")
async def intelligence_health():
    """
    Health check for Phase 2 Intelligence system
    """
    return {
        "status": "online",
        "system": "Phase 2 Intelligence",
        "domains": [
            "Predictive Operations",
            "Advanced Unit Recommendations",
            "Smart Notifications",
            "Documentation & Compliance",
            "Learning & Feedback"
        ],
        "principles": {
            "human_authority": "final",
            "explainability": "mandatory",
            "reversibility": "always",
            "uncertainty": "visible",
            "priority": "safety > speed > cost"
        }
    }
