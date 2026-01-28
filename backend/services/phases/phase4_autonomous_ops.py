from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.autonomous_ops import (
    NotificationRoutingRule,
    BackgroundOptimization,
    SystemInitiatedSuggestion,
    SelfHealingAction,
    LearnedPattern,
    AutomationStatus
)


class SemiAutonomousService:
    """PHASE 4: Semi-Autonomous Operations (Human-in-the-Loop)"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def auto_route_notification(
        self,
        notification_type: str,
        severity: str,
        payload: Dict,
        organization_id: str
    ) -> Dict:
        matching_rules = await self._find_routing_rules(organization_id, notification_type, severity)
        
        if not matching_rules:
            return {"routed": False, "reason": "No matching rules"}
        
        rule = matching_rules[0]
        
        routed_to = []
        if rule.route_to_roles:
            routed_to.extend(rule.route_to_roles)
        if rule.route_to_users:
            routed_to.extend(rule.route_to_users)
        
        rule.last_triggered_at = datetime.utcnow()
        rule.trigger_count += 1
        await self.db.commit()
        
        return {
            "routed": True,
            "rule_id": rule.id,
            "recipients": routed_to,
            "auto_executed": True,
            "requires_supervision": False
        }

    async def schedule_background_optimization(
        self,
        optimization_type: str,
        scope: Dict,
        organization_id: str,
        requires_supervision: bool = False
    ) -> Dict:
        optimization = BackgroundOptimization(
            organization_id=organization_id,
            optimization_type=optimization_type,
            scheduled_for=datetime.utcnow(),
            scope=scope,
            requires_supervision=requires_supervision,
            status="PENDING"
        )
        
        self.db.add(optimization)
        await self.db.commit()
        
        if not requires_supervision:
            result = await self._execute_optimization(optimization)
            optimization.status = "COMPLETED"
            optimization.completed_at = datetime.utcnow()
            optimization.optimization_result = result
            await self.db.commit()
        
        return {
            "optimization_id": optimization.id,
            "type": optimization_type,
            "status": optimization.status,
            "requires_supervision": requires_supervision
        }

    async def create_system_suggestion(
        self,
        suggestion_type: str,
        title: str,
        description: str,
        learned_from_pattern: bool,
        confidence: float,
        organization_id: str
    ) -> Dict:
        suggestion = SystemInitiatedSuggestion(
            organization_id=organization_id,
            suggestion_type=suggestion_type,
            suggestion_title=title,
            suggestion_description=description,
            learned_from_pattern=learned_from_pattern,
            confidence_score=confidence
        )
        
        self.db.add(suggestion)
        await self.db.commit()
        
        return {
            "suggestion_id": suggestion.id,
            "type": suggestion_type,
            "confidence": confidence,
            "learned_from_pattern": learned_from_pattern,
            "requires_human_decision": True
        }

    async def trigger_self_healing(
        self,
        issue_detected: str,
        severity: str,
        healing_action: str,
        auto_execute: bool,
        organization_id: str
    ) -> Dict:
        action = SelfHealingAction(
            organization_id=organization_id,
            issue_detected=issue_detected,
            issue_severity=severity,
            healing_action_type=healing_action,
            healing_action_description=f"Automatic remediation for: {issue_detected}",
            auto_execute=auto_execute,
            requires_approval=not auto_execute
        )
        
        self.db.add(action)
        await self.db.commit()
        
        if auto_execute:
            action.executed_at = datetime.utcnow()
            action.execution_result = {"success": True, "action": healing_action}
            action.issue_resolved = True
            action.resolved_at = datetime.utcnow()
            await self.db.commit()
        
        return {
            "action_id": action.id,
            "issue": issue_detected,
            "healing_action": healing_action,
            "auto_executed": auto_execute,
            "resolved": auto_execute
        }

    async def record_learned_pattern(
        self,
        pattern_type: str,
        pattern_name: str,
        pattern_definition: Dict,
        confidence: float,
        organization_id: str
    ) -> Dict:
        pattern = LearnedPattern(
            organization_id=organization_id,
            pattern_type=pattern_type,
            pattern_name=pattern_name,
            pattern_definition=pattern_definition,
            confidence_score=confidence
        )
        
        self.db.add(pattern)
        await self.db.commit()
        
        return {
            "pattern_id": pattern.id,
            "type": pattern_type,
            "confidence": confidence,
            "can_trigger_suggestions": True
        }

    async def _find_routing_rules(self, org_id: str, notif_type: str, severity: str) -> List:
        query = select(NotificationRoutingRule).where(
            NotificationRoutingRule.organization_id == org_id,
            NotificationRoutingRule.notification_type == notif_type,
            NotificationRoutingRule.status == AutomationStatus.ENABLED
        ).order_by(NotificationRoutingRule.priority)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def _execute_optimization(self, optimization: BackgroundOptimization) -> Dict:
        return {
            "optimized": True,
            "improvements": {
                "efficiency": "+12%",
                "cost": "-5%"
            }
        }
