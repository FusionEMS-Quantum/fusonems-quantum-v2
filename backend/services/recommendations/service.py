from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
import asyncio
import math

from models.recommendations import (
    UnitRecommendationRun,
    UnitCandidateScore,
    RecommendationWeight,
    CallType,
    RecommendationConfidence,
    DispatcherAction
)
from models.unit import Unit, UnitStatus, UnitCapability
from models.routing import RouteCalculation
from services.routing.service import RoutingService


class UnitRecommendationService:
    def __init__(self, db: AsyncSession, routing_service: RoutingService):
        self.db = db
        self.routing_service = routing_service

    async def recommend_units(
        self,
        call_id: str,
        call_type: CallType,
        scene_lat: float,
        scene_lon: float,
        required_capabilities: List[str],
        patient_acuity: Optional[str] = None,
        transport_destination_lat: Optional[float] = None,
        transport_destination_lon: Optional[float] = None,
        organization_id: Optional[str] = None,
        top_n: int = 3
    ) -> Dict:
        run = UnitRecommendationRun(
            call_id=call_id,
            call_type=call_type,
            scene_lat=scene_lat,
            scene_lon=scene_lon,
            required_capabilities=required_capabilities,
            patient_acuity=patient_acuity,
            organization_id=organization_id
        )
        self.db.add(run)
        await self.db.flush()

        weights = await self._get_weights(call_type, organization_id)
        
        eligible_units = await self._get_eligible_units(
            scene_lat, scene_lon, required_capabilities, call_type, organization_id
        )

        if not eligible_units:
            run.confidence = RecommendationConfidence.LOW
            run.recommended_unit_ids = []
            run.completed_at = datetime.utcnow()
            await self.db.commit()
            return {
                "run_id": run.id,
                "recommendations": [],
                "confidence": RecommendationConfidence.LOW.value,
                "message": "No eligible units available"
            }

        scored_units = await self._score_units(
            run.id,
            eligible_units,
            scene_lat,
            scene_lon,
            weights,
            call_type,
            transport_destination_lat,
            transport_destination_lon
        )

        scored_units.sort(key=lambda x: x["total_score"], reverse=True)
        top_recommendations = scored_units[:top_n]
        
        run.recommended_unit_ids = [u["unit_id"] for u in top_recommendations]
        run.confidence = self._calculate_confidence(top_recommendations)
        run.completed_at = datetime.utcnow()
        
        await self.db.commit()

        return {
            "run_id": run.id,
            "recommendations": top_recommendations,
            "all_candidates": scored_units,
            "confidence": run.confidence.value,
            "weights_used": {
                "eta": weights.eta_weight,
                "availability": weights.availability_weight,
                "capability": weights.capability_weight,
                "fatigue": weights.fatigue_weight,
                "coverage": weights.coverage_weight,
                "cost": weights.cost_weight
            }
        }

    async def _get_weights(self, call_type: CallType, organization_id: Optional[str]) -> RecommendationWeight:
        query = select(RecommendationWeight).where(
            and_(
                RecommendationWeight.call_type == call_type,
                or_(
                    RecommendationWeight.organization_id == organization_id,
                    RecommendationWeight.organization_id.is_(None)
                )
            )
        ).order_by(RecommendationWeight.organization_id.desc())
        
        result = await self.db.execute(query)
        weights = result.scalars().first()
        
        if not weights:
            weights = RecommendationWeight(
                call_type=call_type,
                eta_weight=0.35 if call_type == CallType.EMERGENCY_911 else 0.20,
                availability_weight=0.25,
                capability_weight=0.15,
                fatigue_weight=0.10 if call_type == CallType.HEMS else 0.05,
                coverage_weight=0.10,
                cost_weight=0.05 if call_type == CallType.IFT else 0.15
            )
        
        return weights

    async def _get_eligible_units(
        self,
        scene_lat: float,
        scene_lon: float,
        required_capabilities: List[str],
        call_type: CallType,
        organization_id: Optional[str]
    ) -> List[Unit]:
        query = select(Unit).options(
            selectinload(Unit.capabilities),
            selectinload(Unit.current_location)
        ).where(
            Unit.status.in_([UnitStatus.AVAILABLE, UnitStatus.STAGING])
        )
        
        if organization_id:
            query = query.where(Unit.organization_id == organization_id)
        
        result = await self.db.execute(query)
        all_units = result.scalars().all()
        
        eligible = []
        for unit in all_units:
            if not self._check_eligibility(unit, required_capabilities, call_type):
                continue
            eligible.append(unit)
        
        return eligible

    def _check_eligibility(self, unit: Unit, required_capabilities: List[str], call_type: CallType) -> bool:
        unit_caps = {cap.capability_type for cap in unit.capabilities}
        
        if not all(cap in unit_caps for cap in required_capabilities):
            return False
        
        if unit.status not in [UnitStatus.AVAILABLE, UnitStatus.STAGING]:
            return False
        
        if unit.out_of_service or unit.maintenance_mode:
            return False
        
        if call_type == CallType.HEMS:
            if not hasattr(unit, 'flight_hours_today'):
                return False
            if unit.flight_hours_today and unit.flight_hours_today >= 12:
                return False
        
        return True

    async def _score_units(
        self,
        run_id: str,
        units: List[Unit],
        scene_lat: float,
        scene_lon: float,
        weights: RecommendationWeight,
        call_type: CallType,
        dest_lat: Optional[float],
        dest_lon: Optional[float]
    ) -> List[Dict]:
        scored_units = []
        
        for unit in units:
            if not unit.current_location:
                continue
            
            eta_score, eta_minutes = await self._calculate_eta_score(
                unit.current_location.latitude,
                unit.current_location.longitude,
                scene_lat,
                scene_lon,
                call_type
            )
            
            availability_score = self._calculate_availability_score(unit)
            capability_score = self._calculate_capability_score(unit)
            fatigue_score = self._calculate_fatigue_score(unit, call_type)
            coverage_score = await self._calculate_coverage_score(unit, scene_lat, scene_lon)
            cost_score = self._calculate_cost_score(unit, call_type)
            
            total_score = (
                eta_score * weights.eta_weight +
                availability_score * weights.availability_weight +
                capability_score * weights.capability_weight +
                fatigue_score * weights.fatigue_weight +
                coverage_score * weights.coverage_weight +
                cost_score * weights.cost_weight
            )
            
            candidate = UnitCandidateScore(
                run_id=run_id,
                unit_id=unit.id,
                eta_score=eta_score,
                eta_minutes=eta_minutes,
                availability_score=availability_score,
                capability_score=capability_score,
                fatigue_score=fatigue_score,
                coverage_score=coverage_score,
                cost_score=cost_score,
                total_score=total_score
            )
            self.db.add(candidate)
            
            scored_units.append({
                "unit_id": unit.id,
                "unit_name": unit.unit_name,
                "unit_type": unit.unit_type,
                "eta_minutes": eta_minutes,
                "eta_score": eta_score,
                "availability_score": availability_score,
                "capability_score": capability_score,
                "fatigue_score": fatigue_score,
                "coverage_score": coverage_score,
                "cost_score": cost_score,
                "total_score": total_score,
                "explanation": self._generate_explanation(
                    eta_score, availability_score, capability_score,
                    fatigue_score, coverage_score, cost_score, weights
                )
            })
        
        return scored_units

    async def _calculate_eta_score(
        self, unit_lat: float, unit_lon: float,
        scene_lat: float, scene_lon: float,
        call_type: CallType
    ) -> Tuple[float, float]:
        try:
            route = await self.routing_service.calculate_route(
                origin_lat=unit_lat,
                origin_lon=unit_lon,
                dest_lat=scene_lat,
                dest_lon=scene_lon,
                use_paid_api=(call_type == CallType.EMERGENCY_911)
            )
            
            eta_minutes = route["duration_minutes"]
            
            if call_type == CallType.EMERGENCY_911:
                if eta_minutes <= 8:
                    return 1.0, eta_minutes
                elif eta_minutes <= 15:
                    return 0.8, eta_minutes
                elif eta_minutes <= 25:
                    return 0.5, eta_minutes
                else:
                    return 0.2, eta_minutes
            else:
                if eta_minutes <= 20:
                    return 1.0, eta_minutes
                elif eta_minutes <= 40:
                    return 0.7, eta_minutes
                elif eta_minutes <= 60:
                    return 0.4, eta_minutes
                else:
                    return 0.1, eta_minutes
                    
        except Exception as e:
            haversine_km = self._haversine_distance(unit_lat, unit_lon, scene_lat, scene_lon)
            eta_minutes = (haversine_km / 0.8) * 60
            return 0.5, eta_minutes

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        
        a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c

    def _calculate_availability_score(self, unit: Unit) -> float:
        if unit.status == UnitStatus.AVAILABLE:
            return 1.0
        elif unit.status == UnitStatus.STAGING:
            return 0.8
        else:
            return 0.0

    def _calculate_capability_score(self, unit: Unit) -> float:
        base_score = 0.6
        
        capability_types = {cap.capability_type for cap in unit.capabilities}
        
        if "ALS" in capability_types:
            base_score += 0.2
        if "CRITICAL_CARE" in capability_types:
            base_score += 0.1
        if "BARIATRIC" in capability_types:
            base_score += 0.05
        if "NEONATAL" in capability_types:
            base_score += 0.05
        
        return min(base_score, 1.0)

    def _calculate_fatigue_score(self, unit: Unit, call_type: CallType) -> float:
        if not hasattr(unit, 'hours_on_duty') or unit.hours_on_duty is None:
            return 0.8
        
        hours = unit.hours_on_duty
        
        if call_type == CallType.HEMS:
            if hours < 4:
                return 1.0
            elif hours < 8:
                return 0.8
            elif hours < 10:
                return 0.5
            else:
                return 0.2
        else:
            if hours < 8:
                return 1.0
            elif hours < 12:
                return 0.8
            elif hours < 16:
                return 0.5
            else:
                return 0.3

    async def _calculate_coverage_score(self, unit: Unit, scene_lat: float, scene_lon: float) -> float:
        return 0.7

    def _calculate_cost_score(self, unit: Unit, call_type: CallType) -> float:
        if call_type == CallType.HEMS:
            return 0.5
        elif call_type == CallType.IFT:
            if hasattr(unit, 'cost_per_mile') and unit.cost_per_mile:
                if unit.cost_per_mile < 5.0:
                    return 1.0
                elif unit.cost_per_mile < 8.0:
                    return 0.7
                else:
                    return 0.4
        
        return 0.7

    def _calculate_confidence(self, recommendations: List[Dict]) -> RecommendationConfidence:
        if not recommendations:
            return RecommendationConfidence.LOW
        
        top_score = recommendations[0]["total_score"]
        
        if top_score >= 0.8:
            if len(recommendations) > 1:
                gap = top_score - recommendations[1]["total_score"]
                if gap >= 0.15:
                    return RecommendationConfidence.HIGH
            return RecommendationConfidence.MEDIUM
        elif top_score >= 0.6:
            return RecommendationConfidence.MEDIUM
        else:
            return RecommendationConfidence.LOW

    def _generate_explanation(
        self, eta: float, avail: float, cap: float,
        fatigue: float, coverage: float, cost: float,
        weights: RecommendationWeight
    ) -> str:
        parts = []
        
        if eta * weights.eta_weight > 0.2:
            parts.append(f"Quick response time (ETA score: {eta:.2f})")
        if avail == 1.0:
            parts.append("Immediately available")
        if cap >= 0.8:
            parts.append("High capability match")
        if fatigue >= 0.8:
            parts.append("Well-rested crew")
        if cost >= 0.7:
            parts.append("Cost-effective")
        
        return "; ".join(parts) if parts else "Standard recommendation"

    async def log_dispatcher_action(
        self,
        run_id: str,
        action: DispatcherAction,
        selected_unit_id: Optional[str],
        override_reason: Optional[str],
        dispatcher_user_id: str
    ) -> None:
        query = select(UnitRecommendationRun).where(UnitRecommendationRun.id == run_id)
        result = await self.db.execute(query)
        run = result.scalars().first()
        
        if run:
            run.dispatcher_action = action
            run.selected_unit_id = selected_unit_id
            run.override_reason = override_reason
            run.dispatcher_user_id = dispatcher_user_id
            run.action_timestamp = datetime.utcnow()
            await self.db.commit()
