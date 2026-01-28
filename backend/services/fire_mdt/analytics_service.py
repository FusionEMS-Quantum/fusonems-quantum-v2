"""
Fire MDT Analytics Service

Response time analytics and station benchmarking with data completeness scoring.

Calculates:
- Turnout time (UNIT_MOVING - MDT_INCIDENT_GENERATED)
- Travel time (ON_SCENE - UNIT_MOVING)
- Response time (ON_SCENE - MDT_INCIDENT_GENERATED)
- On-scene duration (DEPART_SCENE - ON_SCENE)
- Station benchmarking with normalization
- Percentile calculations (median, 90th)
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
import logging
from statistics import median, quantiles

from models.fire_mdt import (
    FireIncident,
    FireIncidentTimeline,
    TimelineEventType,
    FireIncidentStatus,
)

logger = logging.getLogger(__name__)


class FireAnalyticsService:
    """Fire MDT Analytics Service - Performance metrics and benchmarking"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Individual Incident Metrics
    # ========================================================================

    async def calculate_incident_metrics(
        self, incident_id: UUID, org_id: UUID
    ) -> Dict[str, Any]:
        """
        Calculate all performance metrics for a single incident.
        
        Returns metrics with data completeness indicators.
        """
        try:
            # Get all timeline events for this incident
            result = await self.db.execute(
                select(FireIncidentTimeline)
                .where(
                    and_(
                        FireIncidentTimeline.incident_id == incident_id,
                        FireIncidentTimeline.org_id == org_id,
                    )
                )
                .order_by(FireIncidentTimeline.event_time.asc())
            )
            events = list(result.scalars().all())

            # Build event map
            event_map = {}
            for event in events:
                if event.event_type not in event_map:
                    event_map[event.event_type] = event

            # Calculate metrics
            metrics = {
                "incident_id": str(incident_id),
                "turnout_time_seconds": None,
                "travel_time_seconds": None,
                "response_time_seconds": None,
                "on_scene_duration_seconds": None,
                "total_incident_duration_seconds": None,
                "data_completeness_score": 0,
                "missing_events": [],
            }

            # Turnout time (UNIT_MOVING - MDT_INCIDENT_GENERATED)
            if (
                TimelineEventType.MDT_INCIDENT_GENERATED in event_map
                and TimelineEventType.UNIT_MOVING in event_map
            ):
                generated_time = event_map[TimelineEventType.MDT_INCIDENT_GENERATED].event_time
                moving_time = event_map[TimelineEventType.UNIT_MOVING].event_time
                metrics["turnout_time_seconds"] = (moving_time - generated_time).total_seconds()
            else:
                metrics["missing_events"].append("turnout_time_missing_events")

            # Travel time (ON_SCENE - UNIT_MOVING)
            if (
                TimelineEventType.UNIT_MOVING in event_map
                and TimelineEventType.ON_SCENE in event_map
            ):
                moving_time = event_map[TimelineEventType.UNIT_MOVING].event_time
                on_scene_time = event_map[TimelineEventType.ON_SCENE].event_time
                metrics["travel_time_seconds"] = (on_scene_time - moving_time).total_seconds()
            else:
                metrics["missing_events"].append("travel_time_missing_events")

            # Response time (ON_SCENE - MDT_INCIDENT_GENERATED)
            if (
                TimelineEventType.MDT_INCIDENT_GENERATED in event_map
                and TimelineEventType.ON_SCENE in event_map
            ):
                generated_time = event_map[TimelineEventType.MDT_INCIDENT_GENERATED].event_time
                on_scene_time = event_map[TimelineEventType.ON_SCENE].event_time
                metrics["response_time_seconds"] = (on_scene_time - generated_time).total_seconds()
            else:
                metrics["missing_events"].append("response_time_missing_events")

            # On-scene duration (DEPART_SCENE - ON_SCENE)
            if (
                TimelineEventType.ON_SCENE in event_map
                and TimelineEventType.DEPART_SCENE in event_map
            ):
                on_scene_time = event_map[TimelineEventType.ON_SCENE].event_time
                depart_time = event_map[TimelineEventType.DEPART_SCENE].event_time
                metrics["on_scene_duration_seconds"] = (depart_time - on_scene_time).total_seconds()
            else:
                metrics["missing_events"].append("on_scene_duration_missing_events")

            # Total incident duration
            if (
                TimelineEventType.MDT_INCIDENT_GENERATED in event_map
                and TimelineEventType.INCIDENT_COMPLETED in event_map
            ):
                generated_time = event_map[TimelineEventType.MDT_INCIDENT_GENERATED].event_time
                completed_time = event_map[TimelineEventType.INCIDENT_COMPLETED].event_time
                metrics["total_incident_duration_seconds"] = (completed_time - generated_time).total_seconds()

            # Data completeness score (0-100)
            metrics["data_completeness_score"] = self._calculate_completeness_score(event_map)

            return metrics

        except Exception as e:
            logger.error(f"Failed to calculate incident metrics: {e}")
            return {"error": str(e)}

    # ========================================================================
    # Aggregate Analytics
    # ========================================================================

    async def calculate_station_benchmarks(
        self,
        org_id: UUID,
        start_date: datetime,
        end_date: datetime,
        station_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Calculate station performance benchmarks with percentile analysis.
        
        Returns median and 90th percentile for all metrics, normalized by station.
        """
        try:
            # Get all incidents in date range
            query = select(FireIncident).where(
                and_(
                    FireIncident.org_id == org_id,
                    FireIncident.created_at >= start_date,
                    FireIncident.created_at <= end_date,
                    FireIncident.status == FireIncidentStatus.CLOSED,
                )
            )
            
            if station_id:
                query = query.where(FireIncident.station_id == station_id)
            
            result = await self.db.execute(query)
            incidents = list(result.scalars().all())

            if not incidents:
                return {"error": "No incidents found in date range"}

            # Calculate metrics for all incidents
            all_metrics = []
            for incident in incidents:
                metrics = await self.calculate_incident_metrics(incident.id, org_id)
                if "error" not in metrics:
                    all_metrics.append(metrics)

            # Extract valid metric values
            turnout_times = [m["turnout_time_seconds"] for m in all_metrics if m["turnout_time_seconds"] is not None]
            travel_times = [m["travel_time_seconds"] for m in all_metrics if m["travel_time_seconds"] is not None]
            response_times = [m["response_time_seconds"] for m in all_metrics if m["response_time_seconds"] is not None]
            on_scene_durations = [m["on_scene_duration_seconds"] for m in all_metrics if m["on_scene_duration_seconds"] is not None]

            # Calculate percentiles
            benchmarks = {
                "station_id": str(station_id) if station_id else "all_stations",
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                },
                "total_incidents": len(incidents),
                "incidents_with_complete_data": len(all_metrics),
                "turnout_time": self._calculate_percentiles(turnout_times),
                "travel_time": self._calculate_percentiles(travel_times),
                "response_time": self._calculate_percentiles(response_times),
                "on_scene_duration": self._calculate_percentiles(on_scene_durations),
                "average_completeness_score": round(
                    sum(m["data_completeness_score"] for m in all_metrics) / len(all_metrics), 2
                ) if all_metrics else 0,
            }

            return benchmarks

        except Exception as e:
            logger.error(f"Failed to calculate station benchmarks: {e}")
            return {"error": str(e)}

    async def calculate_unit_performance(
        self,
        org_id: UUID,
        unit_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """Calculate performance metrics for a specific unit"""
        try:
            # Get all incidents for this unit
            result = await self.db.execute(
                select(FireIncident).where(
                    and_(
                        FireIncident.org_id == org_id,
                        FireIncident.unit_id == unit_id,
                        FireIncident.created_at >= start_date,
                        FireIncident.created_at <= end_date,
                        FireIncident.status == FireIncidentStatus.CLOSED,
                    )
                )
            )
            incidents = list(result.scalars().all())

            if not incidents:
                return {
                    "unit_id": str(unit_id),
                    "total_incidents": 0,
                    "message": "No closed incidents found in date range"
                }

            # Calculate metrics for all incidents
            all_metrics = []
            for incident in incidents:
                metrics = await self.calculate_incident_metrics(incident.id, org_id)
                if "error" not in metrics:
                    all_metrics.append(metrics)

            # Extract valid metric values
            response_times = [m["response_time_seconds"] for m in all_metrics if m["response_time_seconds"] is not None]

            performance = {
                "unit_id": str(unit_id),
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                },
                "total_incidents": len(incidents),
                "incidents_analyzed": len(all_metrics),
                "average_response_time_seconds": round(sum(response_times) / len(response_times), 2) if response_times else None,
                "median_response_time_seconds": round(median(response_times), 2) if response_times else None,
                "data_completeness_score": round(
                    sum(m["data_completeness_score"] for m in all_metrics) / len(all_metrics), 2
                ) if all_metrics else 0,
            }

            return performance

        except Exception as e:
            logger.error(f"Failed to calculate unit performance: {e}")
            return {"error": str(e)}

    async def get_daily_summary(
        self,
        org_id: UUID,
        date: datetime,
        station_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """Get daily incident summary with performance overview"""
        try:
            start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=1)

            # Get all incidents for the day
            query = select(FireIncident).where(
                and_(
                    FireIncident.org_id == org_id,
                    FireIncident.created_at >= start_date,
                    FireIncident.created_at < end_date,
                )
            )
            
            if station_id:
                query = query.where(FireIncident.station_id == station_id)
            
            result = await self.db.execute(query)
            incidents = list(result.scalars().all())

            # Count by status
            status_counts = {
                "open": sum(1 for i in incidents if i.status == FireIncidentStatus.OPEN),
                "active": sum(1 for i in incidents if i.status == FireIncidentStatus.ACTIVE),
                "closed": sum(1 for i in incidents if i.status == FireIncidentStatus.CLOSED),
                "cancelled": sum(1 for i in incidents if i.status == FireIncidentStatus.CANCELLED),
            }

            # Get average response time for closed incidents
            closed_incidents = [i for i in incidents if i.status == FireIncidentStatus.CLOSED]
            response_times = []
            
            for incident in closed_incidents:
                metrics = await self.calculate_incident_metrics(incident.id, org_id)
                if metrics.get("response_time_seconds"):
                    response_times.append(metrics["response_time_seconds"])

            summary = {
                "date": date.strftime("%Y-%m-%d"),
                "station_id": str(station_id) if station_id else "all_stations",
                "total_incidents": len(incidents),
                "status_breakdown": status_counts,
                "average_response_time_seconds": round(sum(response_times) / len(response_times), 2) if response_times else None,
                "median_response_time_seconds": round(median(response_times), 2) if response_times else None,
            }

            return summary

        except Exception as e:
            logger.error(f"Failed to get daily summary: {e}")
            return {"error": str(e)}

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _calculate_percentiles(self, values: List[float]) -> Dict[str, Any]:
        """Calculate percentile statistics for a list of values"""
        if not values:
            return {
                "count": 0,
                "mean": None,
                "median": None,
                "percentile_90th": None,
                "min": None,
                "max": None,
            }

        sorted_values = sorted(values)
        
        try:
            # Calculate percentiles using statistics.quantiles
            percentiles = quantiles(sorted_values, n=10) if len(sorted_values) >= 10 else []
            
            return {
                "count": len(values),
                "mean": round(sum(values) / len(values), 2),
                "median": round(median(sorted_values), 2),
                "percentile_90th": round(percentiles[8], 2) if len(percentiles) >= 9 else round(sorted_values[int(len(sorted_values) * 0.9)], 2),
                "min": round(min(values), 2),
                "max": round(max(values), 2),
            }
        except Exception as e:
            logger.error(f"Failed to calculate percentiles: {e}")
            return {
                "count": len(values),
                "mean": round(sum(values) / len(values), 2),
                "median": round(median(sorted_values), 2),
                "min": round(min(values), 2),
                "max": round(max(values), 2),
            }

    def _calculate_completeness_score(self, event_map: Dict[TimelineEventType, Any]) -> int:
        """
        Calculate data completeness score (0-100) based on critical events.
        
        Critical events for complete incident:
        - MDT_INCIDENT_GENERATED (required)
        - UNIT_MOVING (20 points)
        - ON_SCENE (30 points)
        - DEPART_SCENE (20 points)
        - INCIDENT_COMPLETED (30 points)
        """
        score = 0

        # Base requirement
        if TimelineEventType.MDT_INCIDENT_GENERATED not in event_map:
            return 0

        # Progressive scoring
        if TimelineEventType.UNIT_MOVING in event_map:
            score += 20
        if TimelineEventType.ON_SCENE in event_map:
            score += 30
        if TimelineEventType.DEPART_SCENE in event_map:
            score += 20
        if TimelineEventType.INCIDENT_COMPLETED in event_map:
            score += 30

        return score
