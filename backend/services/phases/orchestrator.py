from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from services.phases.phase3_guided_automation import GuidedAutomationService
from services.phases.phase4_autonomous_ops import SemiAutonomousService
from services.phases.phase5_ecosystem import EcosystemIntelligenceService
from services.phases.phase6_strategic import StrategicIntelligenceService


class UnifiedIntelligenceOrchestrator:
    """
    6-Phase Intelligence Orchestrator
    
    PHASE 1: Core Operations (routing, recommendations, tracking) ✅
    PHASE 2: Predictive & Advisory Intelligence ✅
    PHASE 3: Guided Automation & Optimization ✅
    PHASE 4: Semi-Autonomous Operations ✅
    PHASE 5: Ecosystem Intelligence ✅
    PHASE 6: Strategic & Policy Intelligence ✅
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.phase3 = GuidedAutomationService(db)
        self.phase4 = SemiAutonomousService(db)
        self.phase5 = EcosystemIntelligenceService(db)
        self.phase6 = StrategicIntelligenceService(db)

    async def get_system_status(self) -> Dict:
        """Get status of all intelligence phases"""
        return {
            "system": "FusionEMS Quantum Intelligence",
            "phases": {
                "phase1_core_ops": {
                    "status": "OPERATIONAL",
                    "features": ["Routing", "Unit Recommendations", "Tracking"]
                },
                "phase2_predictive": {
                    "status": "OPERATIONAL",
                    "features": ["Forecasting", "Coverage Risk", "Documentation Risk", "Learning"]
                },
                "phase3_guided_automation": {
                    "status": "OPERATIONAL",
                    "features": ["Recommended Actions", "Guided Workflows", "Assisted Documentation"]
                },
                "phase4_semi_autonomous": {
                    "status": "OPERATIONAL",
                    "features": ["Auto-routing", "Background Optimization", "Self-healing"]
                },
                "phase5_ecosystem": {
                    "status": "OPERATIONAL",
                    "features": ["Cross-agency Load Balancing", "Regional Optimization", "Surge Coordination"]
                },
                "phase6_strategic": {
                    "status": "OPERATIONAL",
                    "features": ["Trend Analysis", "Policy Simulation", "Budget Strategy", "Regulatory Readiness"]
                }
            },
            "global_rules": {
                "human_authority": "FINAL",
                "explainability": "MANDATORY",
                "reversibility": "ALWAYS",
                "uncertainty_visibility": "REQUIRED",
                "priority": "SAFETY > SPEED > COST"
            }
        }

    async def suggest_action(
        self,
        action_type: str,
        title: str,
        description: str,
        rationale: str,
        payload: Dict,
        organization_id: str,
        confidence: float
    ) -> Dict:
        """PHASE 3: Create recommended action with preview"""
        from models.guided_automation import ActionType
        
        return await self.phase3.create_recommended_action(
            action_type=ActionType[action_type],
            title=title,
            description=description,
            rationale=rationale,
            payload=payload,
            organization_id=organization_id,
            confidence=confidence
        )

    async def approve_and_execute_action(
        self,
        action_id: str,
        user_id: str
    ) -> Dict:
        """PHASE 3: Human approval required before execution"""
        return await self.phase3.approve_action(action_id, user_id)

    async def create_guided_workflow(
        self,
        workflow_name: str,
        workflow_type: str,
        pre_filled_data: Dict,
        required_approvals: list,
        organization_id: str
    ) -> Dict:
        """PHASE 3: Workflow with pre-filled data and impact preview"""
        return await self.phase3.create_guided_workflow(
            workflow_name, workflow_type, pre_filled_data, required_approvals, organization_id
        )

    async def assist_documentation(
        self,
        incident_id: str,
        incident_data: Dict
    ) -> Dict:
        """PHASE 3: AI-assisted documentation with human review"""
        return await self.phase3.assist_documentation(incident_id, incident_data)

    async def auto_route_notification(
        self,
        notification_type: str,
        severity: str,
        payload: Dict,
        organization_id: str
    ) -> Dict:
        """PHASE 4: Auto-route non-critical notifications"""
        return await self.phase4.auto_route_notification(
            notification_type, severity, payload, organization_id
        )

    async def schedule_background_optimization(
        self,
        optimization_type: str,
        scope: Dict,
        organization_id: str,
        requires_supervision: bool = False
    ) -> Dict:
        """PHASE 4: Background optimization with optional supervision"""
        return await self.phase4.schedule_background_optimization(
            optimization_type, scope, organization_id, requires_supervision
        )

    async def assess_regional_load_balance(
        self,
        region_id: str,
        agencies: list
    ) -> Dict:
        """PHASE 5: Cross-agency load balancing"""
        return await self.phase5.assess_cross_agency_load_balance(region_id, agencies)

    async def optimize_regional_coverage(
        self,
        region_id: str,
        agencies: list
    ) -> Dict:
        """PHASE 5: Regional coverage optimization"""
        return await self.phase5.optimize_regional_coverage(region_id, agencies)

    async def coordinate_surge(
        self,
        region_id: str,
        surge_type: str,
        affected_agencies: list,
        severity: str
    ) -> Dict:
        """PHASE 5: System-wide surge coordination"""
        return await self.phase5.coordinate_system_surge(
            region_id, surge_type, affected_agencies, severity
        )

    async def analyze_strategic_trend(
        self,
        metric_name: str,
        historical_data: list,
        organization_id: str
    ) -> Dict:
        """PHASE 6: Long-term trend analysis for executives"""
        return await self.phase6.analyze_strategic_trend(
            metric_name, historical_data, organization_id
        )

    async def simulate_policy_impact(
        self,
        policy_name: str,
        policy_description: str,
        baseline_metrics: Dict,
        organization_id: str
    ) -> Dict:
        """PHASE 6: Policy impact simulation"""
        return await self.phase6.simulate_policy_impact(
            policy_name, policy_description, baseline_metrics, organization_id
        )

    async def model_budget_strategy(
        self,
        fiscal_year: int,
        current_budget: Dict,
        organization_id: str
    ) -> Dict:
        """PHASE 6: Budget and staffing strategy"""
        return await self.phase6.model_budget_strategy(
            fiscal_year, current_budget, organization_id
        )

    async def assess_regulatory_readiness(
        self,
        regulatory_framework: str,
        organization_id: str
    ) -> Dict:
        """PHASE 6: Regulatory compliance readiness"""
        return await self.phase6.analyze_regulatory_readiness(
            regulatory_framework, organization_id
        )
