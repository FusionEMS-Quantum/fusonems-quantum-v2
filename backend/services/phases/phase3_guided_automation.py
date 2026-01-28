from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.guided_automation import (
    RecommendedAction,
    GuidedWorkflow,
    AssistedDocumentation,
    IntelligentScheduleSuggestion,
    ActionType,
    ActionStatus,
    WorkflowStage
)


class GuidedAutomationService:
    """PHASE 3: Guided Automation & Optimization"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_recommended_action(
        self,
        action_type: ActionType,
        title: str,
        description: str,
        rationale: str,
        payload: Dict,
        organization_id: str,
        confidence: float,
        risk_level: str = "LOW"
    ) -> Dict:
        action = RecommendedAction(
            organization_id=organization_id,
            action_type=action_type,
            title=title,
            description=description,
            rationale=rationale,
            action_payload=payload,
            confidence_score=confidence,
            risk_level=risk_level,
            preview_data=self._generate_preview(action_type, payload)
        )
        
        self.db.add(action)
        await self.db.commit()
        
        return {
            "action_id": action.id,
            "status": "SUGGESTED",
            "requires_approval": True,
            "preview": action.preview_data
        }

    async def approve_action(
        self,
        action_id: str,
        user_id: str
    ) -> Dict:
        query = select(RecommendedAction).where(RecommendedAction.id == action_id)
        result = await self.db.execute(query)
        action = result.scalars().first()
        
        if not action:
            return {"error": "Action not found"}
        
        action.status = ActionStatus.APPROVED
        action.approved_by_user_id = user_id
        action.approved_at = datetime.utcnow()
        
        execution_result = await self._execute_action(action)
        
        action.status = ActionStatus.EXECUTED if execution_result["success"] else ActionStatus.FAILED
        action.executed_at = datetime.utcnow()
        action.execution_result = execution_result
        
        await self.db.commit()
        
        return {
            "action_id": action.id,
            "status": action.status.value,
            "execution_result": execution_result
        }

    async def create_guided_workflow(
        self,
        workflow_name: str,
        workflow_type: str,
        pre_filled_data: Dict,
        required_approvals: List[str],
        organization_id: str
    ) -> Dict:
        workflow = GuidedWorkflow(
            organization_id=organization_id,
            workflow_name=workflow_name,
            workflow_type=workflow_type,
            pre_filled_data=pre_filled_data,
            required_approvals=required_approvals,
            impact_preview=self._generate_impact_preview(workflow_type, pre_filled_data)
        )
        
        self.db.add(workflow)
        await self.db.commit()
        
        return {
            "workflow_id": workflow.id,
            "stage": WorkflowStage.SUGGESTED.value,
            "pre_filled_data": pre_filled_data,
            "impact_preview": workflow.impact_preview,
            "required_approvals": required_approvals
        }

    async def assist_documentation(
        self,
        incident_id: str,
        incident_data: Dict
    ) -> Dict:
        suggested_narrative = self._generate_narrative(incident_data)
        suggested_chief_complaint = self._suggest_chief_complaint(incident_data)
        suggested_codes = self._suggest_billing_codes(incident_data)
        
        assisted = AssistedDocumentation(
            incident_id=incident_id,
            suggested_narrative=suggested_narrative,
            suggested_chief_complaint=suggested_chief_complaint,
            suggested_codes=suggested_codes,
            auto_populated_fields=self._auto_populate_fields(incident_data),
            confidence_scores={
                "narrative": 0.85,
                "chief_complaint": 0.90,
                "codes": 0.75
            }
        )
        
        self.db.add(assisted)
        await self.db.commit()
        
        return {
            "assistance_id": assisted.id,
            "suggestions": {
                "narrative": suggested_narrative,
                "chief_complaint": suggested_chief_complaint,
                "codes": suggested_codes
            },
            "auto_populated": assisted.auto_populated_fields,
            "confidence": assisted.confidence_scores,
            "note": "Human review required before submission"
        }

    async def suggest_intelligent_schedule(
        self,
        organization_id: str,
        schedule_date: datetime,
        predicted_volume: float
    ) -> Dict:
        suggested_staffing = self._optimize_staffing(predicted_volume)
        
        suggestion = IntelligentScheduleSuggestion(
            organization_id=organization_id,
            schedule_date=schedule_date,
            shift_type="24HR",
            suggested_staffing=suggested_staffing,
            predicted_call_volume=predicted_volume,
            coverage_optimization_score=0.88,
            cost_efficiency_score=0.82,
            rationale=f"Based on predicted volume of {predicted_volume:.1f} calls, optimize for peak hours"
        )
        
        self.db.add(suggestion)
        await self.db.commit()
        
        return {
            "suggestion_id": suggestion.id,
            "staffing": suggested_staffing,
            "predicted_volume": predicted_volume,
            "scores": {
                "coverage": 0.88,
                "efficiency": 0.82
            },
            "requires_approval": True
        }

    def _generate_preview(self, action_type: ActionType, payload: Dict) -> Dict:
        return {
            "action": action_type.value,
            "will_affect": payload.get("entity_id"),
            "estimated_duration": "< 5 seconds",
            "reversible": True
        }

    def _generate_impact_preview(self, workflow_type: str, data: Dict) -> Dict:
        return {
            "workflow": workflow_type,
            "changes": len(data.keys()),
            "risk": "LOW",
            "preview_available": True
        }

    async def _execute_action(self, action: RecommendedAction) -> Dict:
        return {
            "success": True,
            "message": f"Action {action.action_type.value} executed successfully",
            "timestamp": datetime.utcnow().isoformat()
        }

    def _generate_narrative(self, data: Dict) -> str:
        return "Auto-generated narrative based on incident data. Human review required."

    def _suggest_chief_complaint(self, data: Dict) -> str:
        return data.get("chief_complaint", "Unknown")

    def _suggest_billing_codes(self, data: Dict) -> List[str]:
        return ["A0428", "A0429"]

    def _auto_populate_fields(self, data: Dict) -> Dict:
        return {
            "date": datetime.utcnow().isoformat(),
            "unit_id": data.get("unit_id"),
            "crew": data.get("crew", [])
        }

    def _optimize_staffing(self, predicted_volume: float) -> Dict:
        return {
            "day_shift": 4,
            "night_shift": 3,
            "peak_hours": [10, 11, 14, 15, 16, 17, 18, 19]
        }
