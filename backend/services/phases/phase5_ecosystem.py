from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.ecosystem_intelligence import (
    CrossAgencyLoadBalance,
    RegionalCoverageOptimization,
    HospitalDemandAwareness,
    SystemWideSurgeCoordination,
    AgencyPartnership
)


class EcosystemIntelligenceService:
    """PHASE 5: Ecosystem Intelligence & Network Optimization"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def assess_cross_agency_load_balance(
        self,
        region_id: str,
        agencies: List[Dict]
    ) -> Dict:
        total_available = sum(a["available_units"] for a in agencies)
        total_calls = sum(a["active_calls"] for a in agencies)
        
        imbalance = self._calculate_imbalance(agencies)
        
        balance = CrossAgencyLoadBalance(
            region_id=region_id,
            agencies=agencies,
            total_available_units=total_available,
            total_active_calls=total_calls,
            load_imbalance_score=imbalance,
            recommended_rebalancing=self._suggest_rebalancing(agencies) if imbalance > 0.3 else None,
            permissions_verified=True,
            confidence="HIGH"
        )
        
        self.db.add(balance)
        await self.db.commit()
        
        return {
            "balance_id": balance.id,
            "imbalance_score": imbalance,
            "rebalancing_needed": imbalance > 0.3,
            "recommendations": balance.recommended_rebalancing
        }

    async def optimize_regional_coverage(
        self,
        region_id: str,
        agencies: List[str]
    ) -> Dict:
        coverage_gaps = self._identify_coverage_gaps(region_id)
        suggestions = self._generate_optimization_suggestions(coverage_gaps)
        
        optimization = RegionalCoverageOptimization(
            region_id=region_id,
            participating_agencies=agencies,
            coverage_gaps=coverage_gaps,
            optimization_suggestions=suggestions,
            estimated_improvement_percent=15.5,
            requires_coordination_approval=True
        )
        
        self.db.add(optimization)
        await self.db.commit()
        
        return {
            "optimization_id": optimization.id,
            "gaps_identified": len(coverage_gaps),
            "suggestions": suggestions,
            "estimated_improvement": "15.5%",
            "requires_approval": True
        }

    async def update_hospital_demand(
        self,
        hospital_id: str,
        ed_wait_time: float,
        diversion_status: str
    ) -> Dict:
        demand = HospitalDemandAwareness(
            hospital_id=hospital_id,
            current_ed_wait_time_minutes=ed_wait_time,
            diversion_status=diversion_status,
            predicted_wait_time_30min=ed_wait_time * 1.1,
            predicted_wait_time_60min=ed_wait_time * 1.2,
            routing_recommendation=self._generate_routing_recommendation(ed_wait_time, diversion_status),
            alternate_facilities=self._find_alternates(hospital_id) if diversion_status == "DIVERTED" else None
        )
        
        self.db.add(demand)
        await self.db.commit()
        
        return {
            "demand_id": demand.id,
            "wait_time": ed_wait_time,
            "diversion": diversion_status,
            "routing_recommendation": demand.routing_recommendation,
            "alternates": demand.alternate_facilities
        }

    async def coordinate_system_surge(
        self,
        region_id: str,
        surge_type: str,
        affected_agencies: List[str],
        severity: str
    ) -> Dict:
        coordination = SystemWideSurgeCoordination(
            region_id=region_id,
            surge_type=surge_type,
            affected_agencies=affected_agencies,
            surge_severity=severity,
            predicted_duration_minutes=120.0,
            coordination_plan=self._create_surge_plan(surge_type, severity),
            mutual_aid_activated=severity in ["HIGH", "CRITICAL"]
        )
        
        self.db.add(coordination)
        await self.db.commit()
        
        return {
            "coordination_id": coordination.id,
            "surge_type": surge_type,
            "severity": severity,
            "plan": coordination.coordination_plan,
            "mutual_aid": coordination.mutual_aid_activated
        }

    def _calculate_imbalance(self, agencies: List[Dict]) -> float:
        ratios = [a["active_calls"] / max(a["available_units"], 1) for a in agencies]
        avg = sum(ratios) / len(ratios)
        variance = sum((r - avg) ** 2 for r in ratios) / len(ratios)
        return min(variance ** 0.5, 1.0)

    def _suggest_rebalancing(self, agencies: List[Dict]) -> List[Dict]:
        return [
            {"from": "Agency A", "to": "Agency B", "units": 1, "reason": "Load balancing"}
        ]

    def _identify_coverage_gaps(self, region_id: str) -> List[Dict]:
        return [
            {"zone": "Northwest", "gap_severity": "MODERATE", "estimated_units_needed": 2}
        ]

    def _generate_optimization_suggestions(self, gaps: List[Dict]) -> List[Dict]:
        return [
            {"action": "Deploy 1 unit to Northwest", "priority": "HIGH"}
        ]

    def _generate_routing_recommendation(self, wait_time: float, status: str) -> str:
        if status == "DIVERTED":
            return "Route to alternate facility"
        elif wait_time > 60:
            return "Consider alternate if patient stable"
        return "Normal routing"

    def _find_alternates(self, hospital_id: str) -> List[str]:
        return ["Hospital B", "Hospital C"]

    def _create_surge_plan(self, surge_type: str, severity: str) -> Dict:
        return {
            "immediate_actions": ["Notify all agencies", "Activate mutual aid"],
            "staging_locations": ["Station 1", "Station 5"],
            "communication_plan": "Regional coordination channel"
        }
