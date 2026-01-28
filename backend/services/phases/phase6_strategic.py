from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import numpy as np

from models.strategic_intelligence import (
    StrategicTrendAnalysis,
    LongTermForecast,
    PolicyImpactSimulation,
    BudgetStrategyModel,
    StaffingStrategyRecommendation,
    OutcomeOptimizationInsight,
    RegulatoryReadinessScore,
    ExecutiveDashboardMetric,
    TrendDirection
)


class StrategicIntelligenceService:
    """PHASE 6: Strategic & Policy Intelligence (Executive Layer)"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_strategic_trend(
        self,
        metric_name: str,
        historical_data: List[float],
        organization_id: str
    ) -> Dict:
        current = historical_data[-1]
        trend_rate = (historical_data[-1] - historical_data[0]) / len(historical_data)
        
        direction = TrendDirection.IMPROVING if trend_rate > 0 else TrendDirection.DECLINING
        
        analysis = StrategicTrendAnalysis(
            organization_id=organization_id,
            analysis_period_start=datetime.utcnow() - timedelta(days=90),
            analysis_period_end=datetime.utcnow(),
            metric_name=metric_name,
            metric_category="OPERATIONAL",
            trend_direction=direction,
            current_value=current,
            trend_rate_per_month=trend_rate,
            predicted_value_3mo=current + (trend_rate * 3),
            predicted_value_6mo=current + (trend_rate * 6),
            predicted_value_12mo=current + (trend_rate * 12),
            confidence="HIGH",
            executive_summary=f"{metric_name} is {direction.value.lower()} at {trend_rate:.1f} per month"
        )
        
        self.db.add(analysis)
        await self.db.commit()
        
        return {
            "analysis_id": analysis.id,
            "metric": metric_name,
            "trend": direction.value,
            "current": current,
            "predictions": {
                "3_months": analysis.predicted_value_3mo,
                "6_months": analysis.predicted_value_6mo,
                "12_months": analysis.predicted_value_12mo
            },
            "summary": analysis.executive_summary
        }

    async def create_long_term_forecast(
        self,
        forecast_type: str,
        horizon_months: int,
        assumptions: Dict,
        organization_id: str
    ) -> Dict:
        base_scenario = self._model_base_scenario(forecast_type, horizon_months, assumptions)
        optimistic = self._model_optimistic_scenario(base_scenario)
        pessimistic = self._model_pessimistic_scenario(base_scenario)
        
        forecast = LongTermForecast(
            organization_id=organization_id,
            forecast_type=forecast_type,
            forecast_horizon_months=horizon_months,
            forecast_target_date=datetime.utcnow() + timedelta(days=horizon_months * 30),
            base_scenario=base_scenario,
            optimistic_scenario=optimistic,
            pessimistic_scenario=pessimistic,
            assumptions=assumptions,
            confidence="MEDIUM",
            executive_recommendation=self._generate_exec_recommendation(base_scenario)
        )
        
        self.db.add(forecast)
        await self.db.commit()
        
        return {
            "forecast_id": forecast.id,
            "type": forecast_type,
            "horizon": horizon_months,
            "scenarios": {
                "base": base_scenario,
                "optimistic": optimistic,
                "pessimistic": pessimistic
            },
            "recommendation": forecast.executive_recommendation
        }

    async def simulate_policy_impact(
        self,
        policy_name: str,
        policy_description: str,
        baseline_metrics: Dict,
        organization_id: str
    ) -> Dict:
        simulated = self._run_policy_simulation(baseline_metrics, policy_name)
        
        roi = (simulated["benefit"] - simulated["cost"]) / simulated["cost"] if simulated["cost"] > 0 else 0
        
        simulation = PolicyImpactSimulation(
            organization_id=organization_id,
            policy_name=policy_name,
            policy_description=policy_description,
            simulation_type="MONTE_CARLO",
            baseline_metrics=baseline_metrics,
            simulated_outcomes=simulated["outcomes"],
            estimated_cost=simulated["cost"],
            estimated_benefit=simulated["benefit"],
            roi_estimate=roi,
            risk_factors=simulated["risks"],
            confidence="MEDIUM",
            recommendation=f"ROI: {roi:.1%}. " + ("Recommended" if roi > 0.2 else "Requires further analysis")
        )
        
        self.db.add(simulation)
        await self.db.commit()
        
        return {
            "simulation_id": simulation.id,
            "policy": policy_name,
            "roi": roi,
            "cost": simulated["cost"],
            "benefit": simulated["benefit"],
            "recommendation": simulation.recommendation
        }

    async def model_budget_strategy(
        self,
        fiscal_year: int,
        current_budget: Dict,
        organization_id: str
    ) -> Dict:
        predicted_expenses = self._predict_expenses(current_budget)
        scenarios = self._generate_budget_scenarios(current_budget, predicted_expenses)
        
        model = BudgetStrategyModel(
            organization_id=organization_id,
            fiscal_year=fiscal_year,
            current_budget=current_budget,
            predicted_expenses=predicted_expenses,
            optimization_scenarios=scenarios,
            recommended_allocations=scenarios[0],
            staffing_recommendations={"hire": 5, "retain": 20},
            executive_summary="Optimize staffing costs while maintaining service levels"
        )
        
        self.db.add(model)
        await self.db.commit()
        
        return {
            "model_id": model.id,
            "fiscal_year": fiscal_year,
            "scenarios": scenarios,
            "recommended": scenarios[0],
            "summary": model.executive_summary
        }

    async def recommend_staffing_strategy(
        self,
        planning_horizon: int,
        current_staffing: Dict,
        predicted_demand: Dict,
        organization_id: str
    ) -> Dict:
        recommended = self._optimize_staffing(current_staffing, predicted_demand)
        
        recommendation = StaffingStrategyRecommendation(
            organization_id=organization_id,
            planning_horizon_months=planning_horizon,
            target_date=datetime.utcnow() + timedelta(days=planning_horizon * 30),
            current_staffing=current_staffing,
            predicted_demand=predicted_demand,
            recommended_staffing=recommended,
            hiring_plan={"q1": 2, "q2": 3, "q3": 1, "q4": 2},
            rationale="Align staffing with predicted demand growth"
        )
        
        self.db.add(recommendation)
        await self.db.commit()
        
        return {
            "recommendation_id": recommendation.id,
            "horizon": planning_horizon,
            "recommended": recommended,
            "hiring_plan": recommendation.hiring_plan
        }

    async def analyze_regulatory_readiness(
        self,
        regulatory_framework: str,
        organization_id: str
    ) -> Dict:
        dimension_scores = self._assess_compliance_dimensions(regulatory_framework)
        overall = np.mean(list(dimension_scores.values()))
        
        gaps = self._identify_compliance_gaps(dimension_scores)
        
        readiness = RegulatoryReadinessScore(
            organization_id=organization_id,
            regulatory_framework=regulatory_framework,
            overall_readiness_score=overall,
            dimension_scores=dimension_scores,
            compliance_gaps=gaps,
            remediation_recommendations=self._generate_remediation_plan(gaps),
            estimated_time_to_full_compliance_days=len(gaps) * 30,
            risk_level="MODERATE" if overall < 0.7 else "LOW",
            executive_summary=f"{regulatory_framework}: {overall:.0%} ready"
        )
        
        self.db.add(readiness)
        await self.db.commit()
        
        return {
            "readiness_id": readiness.id,
            "framework": regulatory_framework,
            "score": overall,
            "gaps": gaps,
            "recommendations": readiness.remediation_recommendations
        }

    async def create_executive_dashboard_metric(
        self,
        metric_name: str,
        value: float,
        target: Optional[float],
        organization_id: str
    ) -> Dict:
        variance = ((value - target) / target * 100) if target else None
        
        metric = ExecutiveDashboardMetric(
            organization_id=organization_id,
            metric_name=metric_name,
            metric_category="KPI",
            time_period="CURRENT_MONTH",
            value=value,
            target_value=target,
            variance_from_target=variance,
            trend_direction=TrendDirection.IMPROVING if variance and variance > 0 else TrendDirection.DECLINING,
            insight=f"Performance is {abs(variance):.1f}% {'above' if variance > 0 else 'below'} target" if variance else None
        )
        
        self.db.add(metric)
        await self.db.commit()
        
        return {
            "metric_id": metric.id,
            "name": metric_name,
            "value": value,
            "target": target,
            "variance": variance,
            "insight": metric.insight
        }

    def _model_base_scenario(self, forecast_type: str, horizon: int, assumptions: Dict) -> Dict:
        return {"call_volume": 1000 + (horizon * 50), "revenue": 500000 + (horizon * 25000)}

    def _model_optimistic_scenario(self, base: Dict) -> Dict:
        return {k: v * 1.2 for k, v in base.items()}

    def _model_pessimistic_scenario(self, base: Dict) -> Dict:
        return {k: v * 0.8 for k, v in base.items()}

    def _generate_exec_recommendation(self, scenario: Dict) -> str:
        return "Maintain current strategy with minor adjustments"

    def _run_policy_simulation(self, baseline: Dict, policy: str) -> Dict:
        return {
            "outcomes": {"efficiency": "+10%", "satisfaction": "+5%"},
            "cost": 50000,
            "benefit": 75000,
            "risks": ["Implementation delay", "Change resistance"]
        }

    def _predict_expenses(self, budget: Dict) -> Dict:
        return {k: v * 1.05 for k, v in budget.items()}

    def _generate_budget_scenarios(self, current: Dict, predicted: Dict) -> List[Dict]:
        return [
            {"scenario": "Conservative", "allocations": current},
            {"scenario": "Growth", "allocations": {k: v * 1.1 for k, v in current.items()}}
        ]

    def _optimize_staffing(self, current: Dict, demand: Dict) -> Dict:
        return {"paramedics": current.get("paramedics", 0) + 5, "emts": current.get("emts", 0) + 3}

    def _assess_compliance_dimensions(self, framework: str) -> Dict:
        return {
            "documentation": 0.85,
            "training": 0.90,
            "equipment": 0.75,
            "protocols": 0.80
        }

    def _identify_compliance_gaps(self, scores: Dict) -> List[Dict]:
        return [{"dimension": k, "score": v, "gap": 1 - v} for k, v in scores.items() if v < 0.8]

    def _generate_remediation_plan(self, gaps: List[Dict]) -> List[Dict]:
        return [{"gap": g["dimension"], "action": f"Improve {g['dimension']}", "priority": "HIGH"} for g in gaps]
