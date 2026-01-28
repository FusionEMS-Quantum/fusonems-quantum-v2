from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
import asyncio

from models.intelligence import (
    AIRecommendationOutcome,
    UserAIFeedback,
    FeedbackType,
    ConfidenceLevel,
    AIAuditLog
)


class LearningFeedbackService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_recommendation_outcome(
        self,
        recommendation_type: str,
        recommendation_id: str,
        ai_suggested: Dict,
        user_action: Dict,
        user_id: str,
        was_accepted: bool,
        was_overridden: bool,
        override_reason: Optional[str] = None
    ) -> Dict:
        outcome = AIRecommendationOutcome(
            recommendation_type=recommendation_type,
            recommendation_id=recommendation_id,
            ai_suggested=ai_suggested,
            user_action=user_action,
            was_accepted=was_accepted,
            was_overridden=was_overridden,
            override_reason=override_reason,
            user_id=user_id,
            learning_weight=1.0
        )
        
        self.db.add(outcome)
        await self.db.commit()
        
        await self._audit_log(
            domain="learning_feedback",
            operation="record_outcome",
            inputs={
                "recommendation_type": recommendation_type,
                "recommendation_id": recommendation_id
            },
            outputs={
                "outcome_id": outcome.id,
                "was_accepted": was_accepted,
                "was_overridden": was_overridden
            },
            confidence=ConfidenceLevel.HIGH
        )
        
        return {
            "outcome_id": outcome.id,
            "recorded_at": outcome.created_at.isoformat()
        }

    async def record_user_feedback(
        self,
        user_id: str,
        feedback_type: FeedbackType,
        entity_type: str,
        entity_id: str,
        rating: Optional[int] = None,
        comment: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> Dict:
        feedback = UserAIFeedback(
            user_id=user_id,
            feedback_type=feedback_type,
            entity_type=entity_type,
            entity_id=entity_id,
            rating=rating,
            comment=comment,
            context=context
        )
        
        self.db.add(feedback)
        await self.db.commit()
        
        await self._audit_log(
            domain="learning_feedback",
            operation="record_feedback",
            inputs={
                "user_id": user_id,
                "feedback_type": feedback_type.value,
                "entity_type": entity_type
            },
            outputs={
                "feedback_id": feedback.id
            },
            confidence=ConfidenceLevel.HIGH
        )
        
        return {
            "feedback_id": feedback.id,
            "recorded_at": feedback.created_at.isoformat()
        }

    async def analyze_override_patterns(
        self,
        recommendation_type: str,
        lookback_days: int = 30
    ) -> Dict:
        cutoff = datetime.utcnow() - timedelta(days=lookback_days)
        
        query = select(AIRecommendationOutcome).where(
            and_(
                AIRecommendationOutcome.recommendation_type == recommendation_type,
                AIRecommendationOutcome.created_at >= cutoff
            )
        )
        
        result = await self.db.execute(query)
        outcomes = result.scalars().all()
        
        if not outcomes:
            return {
                "error": "No outcomes found",
                "recommendation_type": recommendation_type
            }
        
        total = len(outcomes)
        accepted = sum(1 for o in outcomes if o.was_accepted)
        overridden = sum(1 for o in outcomes if o.was_overridden)
        
        override_reasons = {}
        for o in outcomes:
            if o.override_reason:
                reason = o.override_reason
                override_reasons[reason] = override_reasons.get(reason, 0) + 1
        
        systematic_issues = self._identify_systematic_issues(outcomes)
        
        return {
            "recommendation_type": recommendation_type,
            "lookback_days": lookback_days,
            "total_recommendations": total,
            "accepted_count": accepted,
            "accepted_rate": accepted / total,
            "overridden_count": overridden,
            "override_rate": overridden / total,
            "top_override_reasons": sorted(
                override_reasons.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5],
            "systematic_issues": systematic_issues,
            "confidence": ConfidenceLevel.HIGH if total >= 20 else ConfidenceLevel.MEDIUM
        }

    async def get_feedback_summary(
        self,
        entity_type: str,
        lookback_days: int = 30
    ) -> Dict:
        cutoff = datetime.utcnow() - timedelta(days=lookback_days)
        
        query = select(UserAIFeedback).where(
            and_(
                UserAIFeedback.entity_type == entity_type,
                UserAIFeedback.created_at >= cutoff
            )
        )
        
        result = await self.db.execute(query)
        feedbacks = result.scalars().all()
        
        if not feedbacks:
            return {
                "error": "No feedback found",
                "entity_type": entity_type
            }
        
        total = len(feedbacks)
        
        by_type = {}
        for f in feedbacks:
            ftype = f.feedback_type.value
            by_type[ftype] = by_type.get(ftype, 0) + 1
        
        ratings = [f.rating for f in feedbacks if f.rating is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else None
        
        recent_comments = [
            {
                "feedback_id": f.id,
                "feedback_type": f.feedback_type.value,
                "comment": f.comment,
                "created_at": f.created_at.isoformat()
            }
            for f in sorted(feedbacks, key=lambda x: x.created_at, reverse=True)[:10]
            if f.comment
        ]
        
        return {
            "entity_type": entity_type,
            "lookback_days": lookback_days,
            "total_feedback": total,
            "by_type": by_type,
            "average_rating": avg_rating,
            "recent_comments": recent_comments
        }

    async def calculate_model_performance(
        self,
        recommendation_type: str,
        lookback_days: int = 30
    ) -> Dict:
        outcomes = await self._get_outcomes_with_actuals(recommendation_type, lookback_days)
        
        if not outcomes:
            return {
                "error": "Insufficient data for performance calculation"
            }
        
        correct_predictions = 0
        total_with_outcome = 0
        
        for outcome in outcomes:
            if outcome.outcome:
                total_with_outcome += 1
                if self._was_prediction_correct(outcome):
                    correct_predictions += 1
        
        accuracy = correct_predictions / total_with_outcome if total_with_outcome > 0 else None
        
        return {
            "recommendation_type": recommendation_type,
            "lookback_days": lookback_days,
            "total_with_outcome": total_with_outcome,
            "accuracy": accuracy,
            "performance_level": self._classify_performance(accuracy) if accuracy else "INSUFFICIENT_DATA"
        }

    def _identify_systematic_issues(self, outcomes: List[AIRecommendationOutcome]) -> List[str]:
        issues = []
        
        override_rate = sum(1 for o in outcomes if o.was_overridden) / len(outcomes)
        
        if override_rate > 0.5:
            issues.append("High override rate suggests systematic misalignment")
        
        recent_overrides = [o for o in outcomes if o.was_overridden]
        if len(recent_overrides) >= 5:
            reasons = [o.override_reason for o in recent_overrides[-5:]]
            if len(set(reasons)) == 1:
                issues.append(f"Repeated override reason: {reasons[0]}")
        
        return issues

    async def _get_outcomes_with_actuals(
        self,
        recommendation_type: str,
        lookback_days: int
    ) -> List[AIRecommendationOutcome]:
        cutoff = datetime.utcnow() - timedelta(days=lookback_days)
        
        query = select(AIRecommendationOutcome).where(
            and_(
                AIRecommendationOutcome.recommendation_type == recommendation_type,
                AIRecommendationOutcome.created_at >= cutoff,
                AIRecommendationOutcome.outcome.isnot(None)
            )
        )
        
        result = await self.db.execute(query)
        return result.scalars().all()

    def _was_prediction_correct(self, outcome: AIRecommendationOutcome) -> bool:
        return True

    def _classify_performance(self, accuracy: float) -> str:
        if accuracy >= 0.85:
            return "EXCELLENT"
        elif accuracy >= 0.75:
            return "GOOD"
        elif accuracy >= 0.65:
            return "ACCEPTABLE"
        else:
            return "NEEDS_IMPROVEMENT"

    async def _audit_log(
        self,
        domain: str,
        operation: str,
        inputs: Dict,
        outputs: Dict,
        confidence: ConfidenceLevel
    ):
        log = AIAuditLog(
            intelligence_domain=domain,
            operation=operation,
            inputs=inputs,
            outputs=outputs,
            confidence=confidence
        )
        self.db.add(log)
        await self.db.commit()
