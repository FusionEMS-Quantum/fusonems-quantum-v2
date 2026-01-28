from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from services.intelligence.predictive_ops import PredictiveOpsService
from services.intelligence.advanced_recommendations import AdvancedRecommendationService
from services.intelligence.smart_notifications import SmartNotificationService
from services.intelligence.learning_feedback import LearningFeedbackService

from models.intelligence import (
    ForecastHorizon,
    CallVolumeType,
    AlertAudience,
    FeedbackType
)


class AIAgentOrchestrator:
    """
    Phase 2 Intelligence Orchestrator
    
    Coordinates all AI intelligence domains while enforcing:
    - Human authority is final
    - Explainability is mandatory
    - Intelligence must be reversible
    - Uncertainty must be visible
    - Safety > speed > cost
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.predictive_ops = PredictiveOpsService(db)
        self.advanced_recs = AdvancedRecommendationService(db)
        self.notifications = SmartNotificationService(db)
        self.learning = LearningFeedbackService(db)

    async def get_operational_intelligence(
        self,
        organization_id: str,
        zone_id: Optional[str] = None
    ) -> Dict:
        """
        DOMAIN 1: Predictive Operations Intelligence
        Returns call volume forecasts and coverage risk assessment
        """
        forecast_1hr = await self.predictive_ops.forecast_call_volume(
            organization_id=organization_id,
            horizon=ForecastHorizon.HOUR_1,
            call_type=CallVolumeType.ALL,
            zone_id=zone_id
        )
        
        forecast_4hr = await self.predictive_ops.forecast_call_volume(
            organization_id=organization_id,
            horizon=ForecastHorizon.HOUR_4,
            call_type=CallVolumeType.ALL,
            zone_id=zone_id
        )
        
        coverage_risk = await self.predictive_ops.assess_coverage_risk(
            organization_id=organization_id,
            zone_id=zone_id
        )
        
        return {
            "domain": "predictive_operations",
            "forecasts": {
                "next_hour": forecast_1hr,
                "next_4_hours": forecast_4hr
            },
            "coverage_risk": coverage_risk,
            "timestamp": self.predictive_ops._calculate_forecast_time(ForecastHorizon.HOUR_1).isoformat()
        }

    async def get_unit_intelligence(
        self,
        unit_id: str,
        incident_id: Optional[str] = None
    ) -> Dict:
        """
        DOMAIN 2: Advanced Unit Recommendation Intelligence
        Returns turnaround prediction and fatigue assessment
        """
        fatigue = await self.advanced_recs.calculate_crew_fatigue(unit_id)
        
        turnaround = None
        if incident_id:
            turnaround = await self.advanced_recs.predict_unit_turnaround(
                unit_id=unit_id,
                incident_id=incident_id
            )
        
        return {
            "domain": "advanced_unit_intelligence",
            "unit_id": unit_id,
            "fatigue_assessment": fatigue,
            "turnaround_prediction": turnaround
        }

    async def monitor_incident(
        self,
        incident_id: str
    ) -> Dict:
        """
        DOMAIN 3: Smart Notifications & Early Warnings
        Detects escalation needs and routes role-aware alerts
        """
        escalation = await self.notifications.detect_incident_escalation(incident_id)
        
        return {
            "domain": "smart_notifications",
            "incident_id": incident_id,
            "escalation_detected": escalation is not None,
            "escalation_details": escalation
        }

    async def assess_documentation_quality(
        self,
        incident_id: str,
        epcr_id: Optional[str] = None
    ) -> Dict:
        """
        DOMAIN 4: Clinical, Billing, and Compliance Intelligence
        Assesses documentation risk and NEMSIS validation readiness
        """
        doc_risk = await self.notifications.assess_documentation_risk(
            incident_id=incident_id,
            epcr_id=epcr_id
        )
        
        nemsis_prediction = None
        if epcr_id:
            nemsis_prediction = await self.notifications.predict_nemsis_validation(
                incident_id=incident_id,
                epcr_id=epcr_id
            )
        
        return {
            "domain": "documentation_compliance",
            "incident_id": incident_id,
            "documentation_risk": doc_risk,
            "nemsis_validation": nemsis_prediction
        }

    async def record_user_interaction(
        self,
        recommendation_type: str,
        recommendation_id: str,
        ai_suggested: Dict,
        user_action: Dict,
        user_id: str,
        was_accepted: bool,
        override_reason: Optional[str] = None
    ) -> Dict:
        """
        DOMAIN 5: Learning & Feedback
        Records outcomes for continuous learning
        """
        outcome = await self.learning.record_recommendation_outcome(
            recommendation_type=recommendation_type,
            recommendation_id=recommendation_id,
            ai_suggested=ai_suggested,
            user_action=user_action,
            user_id=user_id,
            was_accepted=was_accepted,
            was_overridden=not was_accepted,
            override_reason=override_reason
        )
        
        return {
            "domain": "learning_feedback",
            "outcome_recorded": True,
            "outcome_id": outcome["outcome_id"]
        }

    async def get_learning_insights(
        self,
        recommendation_type: str,
        lookback_days: int = 30
    ) -> Dict:
        """
        DOMAIN 5: Learning & Feedback
        Analyzes override patterns and model performance
        """
        override_analysis = await self.learning.analyze_override_patterns(
            recommendation_type=recommendation_type,
            lookback_days=lookback_days
        )
        
        performance = await self.learning.calculate_model_performance(
            recommendation_type=recommendation_type,
            lookback_days=lookback_days
        )
        
        return {
            "domain": "learning_feedback",
            "recommendation_type": recommendation_type,
            "override_analysis": override_analysis,
            "model_performance": performance
        }

    async def submit_user_feedback(
        self,
        user_id: str,
        feedback_type: str,
        entity_type: str,
        entity_id: str,
        rating: Optional[int] = None,
        comment: Optional[str] = None
    ) -> Dict:
        """
        DOMAIN 5: Learning & Feedback
        Captures explicit user feedback
        """
        try:
            feedback_enum = FeedbackType[feedback_type.upper()]
        except KeyError:
            return {"error": f"Invalid feedback_type: {feedback_type}"}
        
        feedback = await self.learning.record_user_feedback(
            user_id=user_id,
            feedback_type=feedback_enum,
            entity_type=entity_type,
            entity_id=entity_id,
            rating=rating,
            comment=comment
        )
        
        return {
            "domain": "learning_feedback",
            "feedback_recorded": True,
            "feedback_id": feedback["feedback_id"]
        }
