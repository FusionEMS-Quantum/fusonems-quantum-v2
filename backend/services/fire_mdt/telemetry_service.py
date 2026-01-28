"""
Fire MDT Telemetry Service

GPS and OBD-II telemetry ingestion with automatic state detection.

Features:
- GPS breadcrumb ingestion
- OBD-II snapshot recording
- Automatic incident linking
- Mileage calculation from GPS trail
- OBD availability detection
- Geofence-based state transitions
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
import logging

from models.fire_mdt import (
    MDTGPSBreadcrumb,
    MDTOBDIngest,
    FireIncident,
    FireIncidentStatus,
    OBDGear,
    TimelineEventType,
    TimelineEventSource,
)
from .incident_service import FireIncidentService
from .geofence_service import GeofenceService

logger = logging.getLogger(__name__)


class TelemetryService:
    """Telemetry Service - GPS and OBD ingestion with state detection"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.incident_service = FireIncidentService(db)
        self.geofence_service = GeofenceService(db)

    # ========================================================================
    # GPS Breadcrumb Ingestion
    # ========================================================================

    async def ingest_gps_breadcrumb(
        self,
        org_id: UUID,
        unit_id: UUID,
        device_id: UUID,
        gps_time: datetime,
        lat: float,
        lng: float,
        speed_mph: Optional[float] = None,
        heading: Optional[float] = None,
        accuracy_m: Optional[float] = None,
        altitude_m: Optional[float] = None,
        incident_id: Optional[UUID] = None,
    ) -> MDTGPSBreadcrumb:
        """
        Ingest GPS breadcrumb and trigger state detection.
        
        Automatically links to active incidents and triggers geofence checks.
        """
        try:
            # If no incident_id provided, link to active incident
            if not incident_id:
                active_incidents = await self.incident_service.get_active_incidents_for_unit(
                    unit_id, org_id
                )
                if active_incidents:
                    incident_id = active_incidents[0].id

            # Create breadcrumb
            breadcrumb = MDTGPSBreadcrumb(
                org_id=org_id,
                unit_id=unit_id,
                device_id=device_id,
                incident_id=incident_id,
                gps_time=gps_time,
                lat=lat,
                lng=lng,
                speed_mph=speed_mph,
                heading=heading,
                accuracy_m=accuracy_m,
                altitude_m=altitude_m,
            )
            self.db.add(breadcrumb)
            await self.db.flush()

            # Trigger state detection if linked to incident
            if incident_id:
                await self._detect_state_from_gps(
                    incident_id=incident_id,
                    org_id=org_id,
                    unit_id=unit_id,
                    gps_time=gps_time,
                    lat=lat,
                    lng=lng,
                    speed_mph=speed_mph,
                )

            await self.db.commit()
            await self.db.refresh(breadcrumb)

            logger.debug(f"Ingested GPS breadcrumb for unit {unit_id}")
            return breadcrumb

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to ingest GPS breadcrumb: {e}")
            raise

    async def get_gps_trail(
        self,
        incident_id: UUID,
        org_id: UUID,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[MDTGPSBreadcrumb]:
        """Get GPS breadcrumb trail for an incident"""
        try:
            query = select(MDTGPSBreadcrumb).where(
                and_(
                    MDTGPSBreadcrumb.incident_id == incident_id,
                    MDTGPSBreadcrumb.org_id == org_id,
                )
            )
            
            if start_time:
                query = query.where(MDTGPSBreadcrumb.gps_time >= start_time)
            if end_time:
                query = query.where(MDTGPSBreadcrumb.gps_time <= end_time)
            
            query = query.order_by(MDTGPSBreadcrumb.gps_time.asc())
            
            result = await self.db.execute(query)
            return list(result.scalars().all())

        except Exception as e:
            logger.error(f"Failed to get GPS trail: {e}")
            return []

    # ========================================================================
    # OBD-II Ingestion
    # ========================================================================

    async def ingest_obd_snapshot(
        self,
        org_id: UUID,
        unit_id: UUID,
        device_id: UUID,
        ingest_time: datetime,
        speed_mph: Optional[float] = None,
        gear: Optional[OBDGear] = None,
        ignition_on: Optional[bool] = None,
        odometer_miles: Optional[float] = None,
        engine_rpm: Optional[int] = None,
        fuel_level_pct: Optional[float] = None,
        raw_payload: Optional[Dict[str, Any]] = None,
    ) -> MDTOBDIngest:
        """
        Ingest OBD-II snapshot and trigger state detection.
        
        Uses gear state (PARK/DRIVE) for automatic state transitions.
        """
        try:
            # Create OBD snapshot
            obd_snapshot = MDTOBDIngest(
                org_id=org_id,
                unit_id=unit_id,
                device_id=device_id,
                ingest_time=ingest_time,
                speed_mph=speed_mph,
                gear=gear,
                ignition_on=ignition_on,
                odometer_miles=odometer_miles,
                engine_rpm=engine_rpm,
                fuel_level_pct=fuel_level_pct,
                raw_payload=raw_payload,
            )
            self.db.add(obd_snapshot)
            await self.db.flush()

            # Trigger state detection for active incidents
            active_incidents = await self.incident_service.get_active_incidents_for_unit(
                unit_id, org_id
            )
            
            if active_incidents:
                incident = active_incidents[0]
                await self._detect_state_from_obd(
                    incident_id=incident.id,
                    org_id=org_id,
                    unit_id=unit_id,
                    obd_snapshot_id=obd_snapshot.id,
                    ingest_time=ingest_time,
                    gear=gear,
                    speed_mph=speed_mph,
                )

            await self.db.commit()
            await self.db.refresh(obd_snapshot)

            logger.debug(f"Ingested OBD snapshot for unit {unit_id}")
            return obd_snapshot

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to ingest OBD snapshot: {e}")
            raise

    async def detect_obd_availability(
        self, unit_id: UUID, org_id: UUID, lookback_minutes: int = 5
    ) -> bool:
        """
        Detect if OBD is available for a unit.
        
        Checks if any OBD data has been received in the last N minutes.
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=lookback_minutes)
            
            result = await self.db.execute(
                select(func.count(MDTOBDIngest.id)).where(
                    and_(
                        MDTOBDIngest.unit_id == unit_id,
                        MDTOBDIngest.org_id == org_id,
                        MDTOBDIngest.ingest_time >= cutoff_time,
                    )
                )
            )
            count = result.scalar()
            
            return count > 0

        except Exception as e:
            logger.error(f"Failed to detect OBD availability: {e}")
            return False

    # ========================================================================
    # State Detection from Telemetry
    # ========================================================================

    async def _detect_state_from_gps(
        self,
        incident_id: UUID,
        org_id: UUID,
        unit_id: UUID,
        gps_time: datetime,
        lat: float,
        lng: float,
        speed_mph: Optional[float] = None,
    ):
        """
        Detect state changes from GPS data.
        
        Triggers:
        - UNIT_MOVING: Speed > 5 mph
        - ON_SCENE: Within scene geofence
        - DEPART_SCENE: Exit scene geofence while moving
        - AT_DESTINATION: Within destination geofence
        - RETURN_STATION: Within station geofence
        """
        try:
            incident = await self.incident_service.get_incident_by_id(incident_id, org_id)
            if not incident:
                return

            # Check scene geofence (ON_SCENE)
            if incident.scene_lat and incident.scene_lng:
                in_scene = await self.geofence_service.check_point_in_circular_geofence(
                    lat=lat,
                    lng=lng,
                    center_lat=float(incident.scene_lat),
                    center_lng=float(incident.scene_lng),
                    radius_meters=incident.scene_geofence_meters,
                )
                
                if in_scene:
                    # Find scene geofence if exists
                    scene_geofence = await self.geofence_service.find_geofence_for_location(
                        org_id=org_id,
                        lat=lat,
                        lng=lng,
                        role="scene",
                    )
                    
                    await self.incident_service.detect_on_scene(
                        incident_id=incident_id,
                        org_id=org_id,
                        unit_id=unit_id,
                        event_time=gps_time,
                        source=TimelineEventSource.GEOFENCE,
                        lat=lat,
                        lng=lng,
                        geofence_id=scene_geofence.id if scene_geofence else None,
                    )

            # Check destination geofence (AT_DESTINATION)
            if incident.destination_lat and incident.destination_lng:
                in_destination = await self.geofence_service.check_point_in_circular_geofence(
                    lat=lat,
                    lng=lng,
                    center_lat=float(incident.destination_lat),
                    center_lng=float(incident.destination_lng),
                    radius_meters=incident.destination_geofence_meters,
                )
                
                if in_destination:
                    dest_geofence = await self.geofence_service.find_geofence_for_location(
                        org_id=org_id,
                        lat=lat,
                        lng=lng,
                        role="destination",
                    )
                    
                    await self.incident_service.detect_at_destination(
                        incident_id=incident_id,
                        org_id=org_id,
                        unit_id=unit_id,
                        event_time=gps_time,
                        source=TimelineEventSource.GEOFENCE,
                        lat=lat,
                        lng=lng,
                        geofence_id=dest_geofence.id if dest_geofence else None,
                    )

            # Check station geofence (RETURN_STATION)
            if incident.station_id:
                station_geofence = await self.geofence_service.find_geofence_for_location(
                    org_id=org_id,
                    lat=lat,
                    lng=lng,
                    role="station",
                    station_id=incident.station_id,
                )
                
                if station_geofence:
                    await self.incident_service.detect_return_station(
                        incident_id=incident_id,
                        org_id=org_id,
                        unit_id=unit_id,
                        station_id=incident.station_id,
                        event_time=gps_time,
                        source=TimelineEventSource.GEOFENCE,
                        lat=lat,
                        lng=lng,
                        geofence_id=station_geofence.id,
                    )

            # Detect movement from speed
            if speed_mph and speed_mph > 5:
                await self.incident_service.detect_unit_moving(
                    incident_id=incident_id,
                    org_id=org_id,
                    unit_id=unit_id,
                    event_time=gps_time,
                    source=TimelineEventSource.GPS,
                    lat=lat,
                    lng=lng,
                )

        except Exception as e:
            logger.error(f"Failed to detect state from GPS: {e}")

    async def _detect_state_from_obd(
        self,
        incident_id: UUID,
        org_id: UUID,
        unit_id: UUID,
        obd_snapshot_id: UUID,
        ingest_time: datetime,
        gear: Optional[OBDGear] = None,
        speed_mph: Optional[float] = None,
    ):
        """
        Detect state changes from OBD data.
        
        Triggers:
        - UNIT_MOVING: Gear in DRIVE and speed > 5 mph
        - UNIT_STOPPED: Gear in PARK or speed = 0
        """
        try:
            # Detect unit moving
            if gear == OBDGear.DRIVE and speed_mph and speed_mph > 5:
                await self.incident_service.detect_unit_moving(
                    incident_id=incident_id,
                    org_id=org_id,
                    unit_id=unit_id,
                    event_time=ingest_time,
                    source=TimelineEventSource.OBD,
                    obd_snapshot_id=obd_snapshot_id,
                )

            # Detect unit stopped
            if gear == OBDGear.PARK or (speed_mph is not None and speed_mph == 0):
                # Record UNIT_STOPPED event
                await self.incident_service.record_timeline_event(
                    incident_id=incident_id,
                    org_id=org_id,
                    unit_id=unit_id,
                    event_type=TimelineEventType.UNIT_STOPPED,
                    event_time=ingest_time,
                    source=TimelineEventSource.OBD,
                    obd_snapshot_id=obd_snapshot_id,
                    notes="Unit stopped (gear in PARK or speed = 0)",
                )

        except Exception as e:
            logger.error(f"Failed to detect state from OBD: {e}")

    # ========================================================================
    # Mileage Calculation
    # ========================================================================

    async def calculate_mileage_from_gps(
        self, incident_id: UUID, org_id: UUID
    ) -> Dict[str, Any]:
        """
        Calculate total mileage for incident from GPS breadcrumbs.
        
        Returns detailed mileage breakdown.
        """
        try:
            # Get GPS trail
            breadcrumbs = await self.get_gps_trail(incident_id, org_id)
            
            if len(breadcrumbs) < 2:
                return {
                    "incident_id": str(incident_id),
                    "total_miles": 0.0,
                    "data_points": len(breadcrumbs),
                    "message": "Insufficient GPS data for mileage calculation"
                }

            # Calculate using incident service
            total_miles = await self.incident_service.calculate_incident_mileage(
                incident_id, org_id
            )

            return {
                "incident_id": str(incident_id),
                "total_miles": total_miles,
                "data_points": len(breadcrumbs),
                "start_time": breadcrumbs[0].gps_time.isoformat(),
                "end_time": breadcrumbs[-1].gps_time.isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to calculate mileage from GPS: {e}")
            return {"error": str(e)}

    # ========================================================================
    # Telemetry Statistics
    # ========================================================================

    async def get_telemetry_statistics(
        self, unit_id: UUID, org_id: UUID, hours: int = 24
    ) -> Dict[str, Any]:
        """Get telemetry statistics for a unit over the last N hours"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)

            # GPS statistics
            gps_result = await self.db.execute(
                select(func.count(MDTGPSBreadcrumb.id)).where(
                    and_(
                        MDTGPSBreadcrumb.unit_id == unit_id,
                        MDTGPSBreadcrumb.org_id == org_id,
                        MDTGPSBreadcrumb.gps_time >= cutoff_time,
                    )
                )
            )
            gps_count = gps_result.scalar()

            # OBD statistics
            obd_result = await self.db.execute(
                select(func.count(MDTOBDIngest.id)).where(
                    and_(
                        MDTOBDIngest.unit_id == unit_id,
                        MDTOBDIngest.org_id == org_id,
                        MDTOBDIngest.ingest_time >= cutoff_time,
                    )
                )
            )
            obd_count = obd_result.scalar()

            # OBD availability
            obd_available = await self.detect_obd_availability(unit_id, org_id)

            return {
                "unit_id": str(unit_id),
                "time_window_hours": hours,
                "gps_breadcrumbs": gps_count,
                "obd_snapshots": obd_count,
                "obd_available": obd_available,
            }

        except Exception as e:
            logger.error(f"Failed to get telemetry statistics: {e}")
            return {"error": str(e)}
