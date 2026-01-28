from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
import asyncio

from models.intelligence import (
    UnitTurnaroundPrediction,
    CrewFatigueScore,
    ConfidenceLevel,
    AIAuditLog
)
from models.cad import Call, Unit, Dispatch
from models.unit import UnitStatus


class AdvancedRecommendationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def predict_unit_turnaround(
        self,
        unit_id: str,
        incident_id: str
    ) -> Dict:
        unit = await self._get_unit(unit_id)
        incident = await self._get_incident(incident_id)
        
        if not unit or not incident:
            return {"error": "Unit or incident not found"}
        
        historical_stats = await self._get_unit_historical_stats(unit_id)
        facility_stats = await self._get_facility_dwell_stats(incident.destination_facility_id) if hasattr(incident, 'destination_facility_id') else {}
        
        scene_minutes = historical_stats.get("avg_scene_time", 15.0)
        transport_minutes = 0.0
        hospital_dwell = facility_stats.get("avg_dwell_time", 20.0)
        documentation = 5.0
        
        if incident.destination_lat and incident.destination_lon:
            transport_minutes = await self._estimate_transport_time(
                incident.scene_lat,
                incident.scene_lon,
                incident.destination_lat,
                incident.destination_lon
            )
        
        total_minutes = scene_minutes + transport_minutes + hospital_dwell + documentation
        back_in_service = datetime.utcnow() + timedelta(minutes=total_minutes)
        
        confidence = self._calculate_turnaround_confidence(historical_stats, facility_stats)
        
        prediction = UnitTurnaroundPrediction(
            unit_id=unit_id,
            incident_id=incident_id,
            predicted_at=datetime.utcnow(),
            predicted_back_in_service=back_in_service,
            predicted_scene_minutes=scene_minutes,
            predicted_transport_minutes=transport_minutes,
            predicted_hospital_dwell_minutes=hospital_dwell,
            predicted_documentation_minutes=documentation,
            total_predicted_minutes=total_minutes,
            confidence=confidence,
            historical_avg_scene=historical_stats.get("avg_scene_time"),
            historical_avg_transport=historical_stats.get("avg_transport_time"),
            historical_avg_dwell=historical_stats.get("avg_dwell_time"),
            facility_dwell_avg=facility_stats.get("avg_dwell_time")
        )
        
        self.db.add(prediction)
        await self.db.commit()
        
        await self._audit_log(
            domain="advanced_recommendations",
            operation="predict_turnaround",
            inputs={
                "unit_id": unit_id,
                "incident_id": incident_id
            },
            outputs={
                "prediction_id": prediction.id,
                "total_minutes": total_minutes
            },
            confidence=confidence
        )
        
        return {
            "prediction_id": prediction.id,
            "back_in_service_at": back_in_service.isoformat(),
            "total_minutes": total_minutes,
            "breakdown": {
                "scene": scene_minutes,
                "transport": transport_minutes,
                "hospital_dwell": hospital_dwell,
                "documentation": documentation
            },
            "confidence": confidence.value,
            "explanation": self._explain_turnaround(scene_minutes, transport_minutes, hospital_dwell)
        }

    async def calculate_crew_fatigue(
        self,
        unit_id: str
    ) -> Dict:
        unit = await self._get_unit(unit_id)
        
        if not unit:
            return {"error": "Unit not found"}
        
        shift_start = await self._get_shift_start(unit_id)
        hours_on_duty = (datetime.utcnow() - shift_start).total_seconds() / 3600 if shift_start else 0.0
        
        calls_this_shift = await self._get_calls_this_shift(unit_id, shift_start)
        high_acuity = await self._get_high_acuity_calls(unit_id, shift_start)
        
        fatigue_score = self._calculate_fatigue_score(hours_on_duty, calls_this_shift, high_acuity)
        risk_level = self._classify_fatigue_risk(fatigue_score, hours_on_duty)
        
        flight_hours = None
        regulatory_limit = False
        if unit.unit_type == "HEMS":
            flight_hours = await self._get_flight_hours_today(unit_id)
            regulatory_limit = flight_hours >= 10 if flight_hours else False
        
        score_record = CrewFatigueScore(
            unit_id=unit_id,
            shift_id=unit.current_shift_id if hasattr(unit, 'current_shift_id') else None,
            timestamp=datetime.utcnow(),
            hours_on_duty=hours_on_duty,
            calls_this_shift=calls_this_shift,
            high_acuity_calls=high_acuity,
            fatigue_score=fatigue_score,
            risk_level=risk_level,
            flight_hours_today=flight_hours,
            regulatory_limit_approaching=regulatory_limit,
            recommendation_impact=self._explain_recommendation_impact(fatigue_score, risk_level),
            explanation=self._explain_fatigue(hours_on_duty, calls_this_shift, high_acuity, fatigue_score)
        )
        
        self.db.add(score_record)
        await self.db.commit()
        
        await self._audit_log(
            domain="advanced_recommendations",
            operation="calculate_fatigue",
            inputs={
                "unit_id": unit_id
            },
            outputs={
                "score_id": score_record.id,
                "fatigue_score": fatigue_score,
                "risk_level": risk_level
            },
            confidence=ConfidenceLevel.HIGH
        )
        
        return {
            "score_id": score_record.id,
            "fatigue_score": fatigue_score,
            "risk_level": risk_level,
            "hours_on_duty": hours_on_duty,
            "calls_this_shift": calls_this_shift,
            "high_acuity_calls": high_acuity,
            "flight_hours_today": flight_hours,
            "regulatory_limit_approaching": regulatory_limit,
            "recommendation_impact": score_record.recommendation_impact,
            "explanation": score_record.explanation
        }

    async def _get_unit(self, unit_id: str) -> Optional[Unit]:
        query = select(Unit).where(Unit.id == unit_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def _get_incident(self, incident_id: str) -> Optional[Call]:
        query = select(Call).where(Call.id == incident_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def _get_unit_historical_stats(self, unit_id: str) -> Dict:
        return {
            "avg_scene_time": 15.0,
            "avg_transport_time": 20.0,
            "avg_dwell_time": 18.0
        }

    async def _get_facility_dwell_stats(self, facility_id: str) -> Dict:
        return {
            "avg_dwell_time": 22.0
        }

    async def _estimate_transport_time(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> float:
        import math
        R = 6371
        phi1 = math.radians(origin_lat)
        phi2 = math.radians(dest_lat)
        dphi = math.radians(dest_lat - origin_lat)
        dlambda = math.radians(dest_lon - origin_lon)
        
        a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance_km = R * c
        
        return (distance_km / 0.8) * 60

    def _calculate_turnaround_confidence(self, historical: Dict, facility: Dict) -> ConfidenceLevel:
        if historical and facility:
            return ConfidenceLevel.HIGH
        elif historical or facility:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW

    async def _get_shift_start(self, unit_id: str) -> Optional[datetime]:
        return datetime.utcnow() - timedelta(hours=4)

    async def _get_calls_this_shift(self, unit_id: str, shift_start: Optional[datetime]) -> int:
        if not shift_start:
            return 0
        
        query = select(func.count(Dispatch.id)).where(
            and_(
                Dispatch.unit_id == unit_id,
                Dispatch.created_at >= shift_start
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_high_acuity_calls(self, unit_id: str, shift_start: Optional[datetime]) -> int:
        return 1

    def _calculate_fatigue_score(self, hours: float, calls: int, high_acuity: int) -> float:
        base = 1.0
        
        if hours > 12:
            base -= 0.3
        elif hours > 8:
            base -= 0.15
        elif hours > 6:
            base -= 0.05
        
        if calls > 10:
            base -= 0.2
        elif calls > 6:
            base -= 0.1
        elif calls > 4:
            base -= 0.05
        
        if high_acuity > 3:
            base -= 0.15
        elif high_acuity > 1:
            base -= 0.08
        
        return max(0.0, min(1.0, base))

    def _classify_fatigue_risk(self, score: float, hours: float) -> str:
        if score <= 0.5 or hours >= 16:
            return "HIGH"
        elif score <= 0.7 or hours >= 12:
            return "MODERATE"
        else:
            return "LOW"

    async def _get_flight_hours_today(self, unit_id: str) -> Optional[float]:
        return 6.5

    def _explain_turnaround(self, scene: float, transport: float, dwell: float) -> str:
        parts = []
        
        if scene > 20:
            parts.append("Extended scene time expected")
        if transport > 30:
            parts.append("Long transport distance")
        if dwell > 30:
            parts.append("High facility dwell time")
        
        if not parts:
            parts.append("Standard turnaround expected")
        
        return "; ".join(parts)

    def _explain_recommendation_impact(self, score: float, risk: str) -> str:
        if risk == "HIGH":
            return "Unit down-ranked due to high fatigue risk. May be hard-gated for HEMS if regulatory limit reached."
        elif risk == "MODERATE":
            return "Unit ranking reduced by 0.2-0.3 points due to moderate fatigue."
        else:
            return "No ranking impact; crew is well-rested."

    def _explain_fatigue(self, hours: float, calls: int, high_acuity: int, score: float) -> str:
        parts = []
        
        if hours >= 12:
            parts.append(f"Crew has been on duty for {hours:.1f} hours")
        if calls >= 6:
            parts.append(f"{calls} calls completed this shift")
        if high_acuity >= 2:
            parts.append(f"{high_acuity} high-acuity calls")
        
        if score >= 0.8:
            parts.append("Crew is well-rested and alert")
        elif score >= 0.6:
            parts.append("Crew showing mild fatigue signs")
        else:
            parts.append("Crew showing significant fatigue")
        
        return "; ".join(parts)

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
