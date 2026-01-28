from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
import asyncio
import numpy as np
from collections import defaultdict

from models.intelligence import (
    CallVolumeForecast,
    CoverageRiskSnapshot,
    ForecastHorizon,
    CallVolumeType,
    ConfidenceLevel,
    CoverageRiskLevel,
    AIAuditLog
)
from models.cad import Call, Unit
from models.unit import UnitStatus


class PredictiveOpsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def forecast_call_volume(
        self,
        organization_id: str,
        horizon: ForecastHorizon,
        call_type: CallVolumeType,
        zone_id: Optional[str] = None
    ) -> Dict:
        forecast_for = self._calculate_forecast_time(horizon)
        
        historical_data = await self._get_historical_volume(
            organization_id, call_type, zone_id, lookback_days=90
        )
        
        if len(historical_data) < 7:
            return {
                "error": "Insufficient historical data",
                "confidence": ConfidenceLevel.VERY_LOW.value
            }
        
        prediction = self._calculate_volume_prediction(historical_data, forecast_for)
        
        baseline = np.median([d["volume"] for d in historical_data])
        surge_probability = self._calculate_surge_probability(prediction["volume"], baseline)
        
        confidence = self._calculate_confidence_level(
            len(historical_data),
            prediction["std"],
            prediction["volume"]
        )
        
        forecast = CallVolumeForecast(
            organization_id=organization_id,
            forecast_for=forecast_for,
            horizon=horizon,
            call_type=call_type,
            zone_id=zone_id,
            predicted_volume=prediction["volume"],
            baseline_volume=baseline,
            surge_probability=surge_probability,
            confidence=confidence,
            confidence_lower=prediction["volume"] - 1.96 * prediction["std"],
            confidence_upper=prediction["volume"] + 1.96 * prediction["std"],
            features_used={
                "historical_days": len(historical_data),
                "time_of_day": forecast_for.hour,
                "day_of_week": forecast_for.weekday()
            },
            model_version="v1.0.0"
        )
        
        self.db.add(forecast)
        await self.db.commit()
        
        await self._audit_log(
            domain="predictive_ops",
            operation="forecast_call_volume",
            inputs={
                "organization_id": organization_id,
                "horizon": horizon.value,
                "call_type": call_type.value,
                "zone_id": zone_id
            },
            outputs={
                "forecast_id": forecast.id,
                "predicted_volume": prediction["volume"],
                "surge_probability": surge_probability
            },
            confidence=confidence,
            organization_id=organization_id
        )
        
        return {
            "forecast_id": forecast.id,
            "forecast_for": forecast_for.isoformat(),
            "predicted_volume": prediction["volume"],
            "baseline_volume": baseline,
            "surge_probability": surge_probability,
            "confidence": confidence.value,
            "confidence_band": {
                "lower": forecast.confidence_lower,
                "upper": forecast.confidence_upper
            },
            "explanation": self._explain_forecast(prediction, baseline, surge_probability)
        }

    async def assess_coverage_risk(
        self,
        organization_id: str,
        zone_id: Optional[str] = None
    ) -> Dict:
        available_units = await self._get_available_units(organization_id, zone_id)
        required_minimum = await self._get_required_minimum_coverage(organization_id, zone_id)
        
        active_incidents = await self._get_active_incidents(organization_id, zone_id)
        units_returning = await self._estimate_units_returning_soon(organization_id, zone_id)
        
        risk_level = self._calculate_coverage_risk_level(
            len(available_units),
            required_minimum,
            active_incidents
        )
        
        last_available = None
        if len(available_units) == 1:
            last_available = available_units[0].id
        
        gap_duration = None
        if len(available_units) < required_minimum:
            gap_duration = await self._estimate_coverage_gap_duration(
                organization_id, zone_id, units_returning
            )
        
        recent_forecast = await self._get_recent_forecast(organization_id, zone_id)
        predicted_call_rate = recent_forecast.predicted_volume / 60 if recent_forecast else None
        
        confidence = ConfidenceLevel.HIGH if len(available_units) >= 3 else ConfidenceLevel.MEDIUM
        
        snapshot = CoverageRiskSnapshot(
            organization_id=organization_id,
            timestamp=datetime.utcnow(),
            zone_id=zone_id,
            available_units=len(available_units),
            required_minimum=required_minimum,
            risk_level=risk_level,
            last_available_unit_id=last_available,
            units_returning_soon=len(units_returning),
            estimated_gap_duration_minutes=gap_duration,
            active_incidents=active_incidents,
            predicted_call_rate=predicted_call_rate,
            explanation=self._explain_coverage_risk(
                len(available_units), required_minimum, risk_level, gap_duration
            ),
            confidence=confidence
        )
        
        self.db.add(snapshot)
        await self.db.commit()
        
        await self._audit_log(
            domain="predictive_ops",
            operation="assess_coverage_risk",
            inputs={
                "organization_id": organization_id,
                "zone_id": zone_id
            },
            outputs={
                "snapshot_id": snapshot.id,
                "risk_level": risk_level.value,
                "available_units": len(available_units)
            },
            confidence=confidence,
            organization_id=organization_id
        )
        
        return {
            "snapshot_id": snapshot.id,
            "risk_level": risk_level.value,
            "available_units": len(available_units),
            "required_minimum": required_minimum,
            "last_available_unit": last_available,
            "units_returning_soon": len(units_returning),
            "estimated_gap_minutes": gap_duration,
            "active_incidents": active_incidents,
            "predicted_call_rate": predicted_call_rate,
            "confidence": confidence.value,
            "explanation": snapshot.explanation
        }

    def _calculate_forecast_time(self, horizon: ForecastHorizon) -> datetime:
        now = datetime.utcnow()
        if horizon == ForecastHorizon.HOUR_1:
            return now + timedelta(hours=1)
        elif horizon == ForecastHorizon.HOUR_4:
            return now + timedelta(hours=4)
        elif horizon == ForecastHorizon.HOUR_12:
            return now + timedelta(hours=12)
        elif horizon == ForecastHorizon.DAY_1:
            return now + timedelta(days=1)
        elif horizon == ForecastHorizon.DAY_7:
            return now + timedelta(days=7)
        return now + timedelta(hours=1)

    async def _get_historical_volume(
        self,
        organization_id: str,
        call_type: CallVolumeType,
        zone_id: Optional[str],
        lookback_days: int
    ) -> List[Dict]:
        cutoff = datetime.utcnow() - timedelta(days=lookback_days)
        
        query = select(
            func.date_trunc('hour', Call.created_at).label('hour'),
            func.count(Call.id).label('volume')
        ).where(
            and_(
                Call.organization_id == organization_id,
                Call.created_at >= cutoff
            )
        )
        
        if call_type != CallVolumeType.ALL:
            query = query.where(Call.call_type == call_type.value)
        
        if zone_id:
            query = query.where(Call.zone_id == zone_id)
        
        query = query.group_by(func.date_trunc('hour', Call.created_at))
        
        result = await self.db.execute(query)
        rows = result.all()
        
        return [{"timestamp": row.hour, "volume": row.volume} for row in rows]

    def _calculate_volume_prediction(self, historical_data: List[Dict], forecast_for: datetime) -> Dict:
        volumes = [d["volume"] for d in historical_data]
        
        hour_of_day = forecast_for.hour
        day_of_week = forecast_for.weekday()
        
        same_hour_volumes = [
            d["volume"] for d in historical_data
            if d["timestamp"].hour == hour_of_day
        ]
        
        same_day_volumes = [
            d["volume"] for d in historical_data
            if d["timestamp"].weekday() == day_of_week
        ]
        
        if same_hour_volumes and same_day_volumes:
            predicted = (np.mean(same_hour_volumes) + np.mean(same_day_volumes)) / 2
            std = np.std(same_hour_volumes) if len(same_hour_volumes) > 1 else np.std(volumes)
        else:
            predicted = np.mean(volumes)
            std = np.std(volumes)
        
        return {
            "volume": float(predicted),
            "std": float(std)
        }

    def _calculate_surge_probability(self, predicted: float, baseline: float) -> float:
        if baseline == 0:
            return 0.0
        
        ratio = predicted / baseline
        
        if ratio >= 1.5:
            return 0.9
        elif ratio >= 1.3:
            return 0.7
        elif ratio >= 1.2:
            return 0.5
        elif ratio >= 1.1:
            return 0.3
        else:
            return 0.1

    def _calculate_confidence_level(self, data_points: int, std: float, predicted: float) -> ConfidenceLevel:
        if data_points < 7:
            return ConfidenceLevel.VERY_LOW
        
        cv = std / predicted if predicted > 0 else 1.0
        
        if data_points >= 60 and cv < 0.3:
            return ConfidenceLevel.HIGH
        elif data_points >= 30 and cv < 0.5:
            return ConfidenceLevel.MEDIUM
        elif data_points >= 14:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW

    async def _get_available_units(self, organization_id: str, zone_id: Optional[str]) -> List[Unit]:
        query = select(Unit).where(
            and_(
                Unit.organization_id == organization_id,
                Unit.status == UnitStatus.AVAILABLE
            )
        )
        
        if zone_id:
            query = query.where(Unit.zone_id == zone_id)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def _get_required_minimum_coverage(self, organization_id: str, zone_id: Optional[str]) -> int:
        return 2

    async def _get_active_incidents(self, organization_id: str, zone_id: Optional[str]) -> int:
        query = select(func.count(Call.id)).where(
            and_(
                Call.organization_id == organization_id,
                Call.status.in_(["PENDING", "DISPATCHED", "EN_ROUTE", "ON_SCENE"])
            )
        )
        
        if zone_id:
            query = query.where(Call.zone_id == zone_id)
        
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _estimate_units_returning_soon(self, organization_id: str, zone_id: Optional[str]) -> List[str]:
        return []

    def _calculate_coverage_risk_level(
        self, available: int, required: int, active_incidents: int
    ) -> CoverageRiskLevel:
        if available == 1:
            return CoverageRiskLevel.LAST_UNIT
        elif available < required:
            return CoverageRiskLevel.CRITICAL
        elif available <= required * 1.2 or (available <= required + 1 and active_incidents > 0):
            return CoverageRiskLevel.MODERATE
        else:
            return CoverageRiskLevel.SAFE

    async def _estimate_coverage_gap_duration(
        self, organization_id: str, zone_id: Optional[str], units_returning: List
    ) -> Optional[float]:
        if units_returning:
            return 15.0
        return None

    async def _get_recent_forecast(
        self, organization_id: str, zone_id: Optional[str]
    ) -> Optional[CallVolumeForecast]:
        query = select(CallVolumeForecast).where(
            and_(
                CallVolumeForecast.organization_id == organization_id,
                CallVolumeForecast.forecast_for >= datetime.utcnow() - timedelta(hours=1)
            )
        ).order_by(desc(CallVolumeForecast.created_at)).limit(1)
        
        if zone_id:
            query = query.where(CallVolumeForecast.zone_id == zone_id)
        
        result = await self.db.execute(query)
        return result.scalars().first()

    def _explain_forecast(self, prediction: Dict, baseline: float, surge_prob: float) -> str:
        parts = []
        
        if surge_prob >= 0.7:
            parts.append(f"High surge probability ({surge_prob:.0%})")
        elif surge_prob >= 0.4:
            parts.append(f"Moderate surge risk ({surge_prob:.0%})")
        else:
            parts.append("Normal volume expected")
        
        if prediction["volume"] > baseline * 1.2:
            parts.append(f"Above baseline by {((prediction['volume'] / baseline - 1) * 100):.0f}%")
        
        return "; ".join(parts)

    def _explain_coverage_risk(
        self, available: int, required: int, risk_level: CoverageRiskLevel, gap_minutes: Optional[float]
    ) -> str:
        if risk_level == CoverageRiskLevel.LAST_UNIT:
            return "CRITICAL: Only one unit available. Any dispatch will leave zero coverage."
        elif risk_level == CoverageRiskLevel.CRITICAL:
            msg = f"CRITICAL: {available} units available, {required} required minimum."
            if gap_minutes:
                msg += f" Estimated gap duration: {gap_minutes:.0f} minutes."
            return msg
        elif risk_level == CoverageRiskLevel.MODERATE:
            return f"Coverage is marginal: {available} units available, {required} required."
        else:
            return f"Coverage is adequate: {available} units available."

    async def _audit_log(
        self,
        domain: str,
        operation: str,
        inputs: Dict,
        outputs: Dict,
        confidence: ConfidenceLevel,
        organization_id: str
    ):
        log = AIAuditLog(
            intelligence_domain=domain,
            operation=operation,
            inputs=inputs,
            outputs=outputs,
            confidence=confidence,
            organization_id=organization_id
        )
        self.db.add(log)
        await self.db.commit()
