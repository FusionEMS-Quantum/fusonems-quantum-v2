"""
Fire MDT Geofence Service

Geofence management and point-in-polygon detection.

Features:
- Circular geofence management
- Point-in-polygon checks (Haversine formula)
- Station geofence lookups
- Scene/destination geofence helpers
- Geofence-based state triggers
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import logging
from math import radians, sin, cos, sqrt, atan2

from models.fire_mdt import (
    FireGeofence,
    GeofenceRole,
)

logger = logging.getLogger(__name__)


class GeofenceService:
    """Geofence Service - Manage and check geofences"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Geofence Management
    # ========================================================================

    async def create_geofence(
        self,
        org_id: UUID,
        name: str,
        role: GeofenceRole,
        center_lat: float,
        center_lng: float,
        radius_meters: int,
        station_id: Optional[UUID] = None,
        notes: Optional[str] = None,
    ) -> FireGeofence:
        """Create a new geofence"""
        try:
            geofence = FireGeofence(
                org_id=org_id,
                station_id=station_id,
                name=name,
                role=role,
                center_lat=center_lat,
                center_lng=center_lng,
                radius_meters=radius_meters,
                active=True,
                notes=notes,
            )
            self.db.add(geofence)
            await self.db.commit()
            await self.db.refresh(geofence)

            logger.info(f"Created geofence {name} with role {role.value}")
            return geofence

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create geofence: {e}")
            raise

    async def update_geofence(
        self,
        geofence_id: UUID,
        org_id: UUID,
        name: Optional[str] = None,
        center_lat: Optional[float] = None,
        center_lng: Optional[float] = None,
        radius_meters: Optional[int] = None,
        active: Optional[bool] = None,
        notes: Optional[str] = None,
    ) -> Optional[FireGeofence]:
        """Update an existing geofence"""
        try:
            result = await self.db.execute(
                select(FireGeofence).where(
                    and_(
                        FireGeofence.id == geofence_id,
                        FireGeofence.org_id == org_id,
                    )
                )
            )
            geofence = result.scalar_one_or_none()

            if not geofence:
                logger.warning(f"Geofence {geofence_id} not found")
                return None

            # Update fields
            if name is not None:
                geofence.name = name
            if center_lat is not None:
                geofence.center_lat = center_lat
            if center_lng is not None:
                geofence.center_lng = center_lng
            if radius_meters is not None:
                geofence.radius_meters = radius_meters
            if active is not None:
                geofence.active = active
            if notes is not None:
                geofence.notes = notes

            geofence.updated_at = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(geofence)

            logger.info(f"Updated geofence {geofence_id}")
            return geofence

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update geofence: {e}")
            return None

    async def delete_geofence(self, geofence_id: UUID, org_id: UUID) -> bool:
        """Delete a geofence"""
        try:
            result = await self.db.execute(
                select(FireGeofence).where(
                    and_(
                        FireGeofence.id == geofence_id,
                        FireGeofence.org_id == org_id,
                    )
                )
            )
            geofence = result.scalar_one_or_none()

            if not geofence:
                logger.warning(f"Geofence {geofence_id} not found")
                return False

            await self.db.delete(geofence)
            await self.db.commit()

            logger.info(f"Deleted geofence {geofence_id}")
            return True

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to delete geofence: {e}")
            return False

    # ========================================================================
    # Geofence Retrieval
    # ========================================================================

    async def get_geofence_by_id(
        self, geofence_id: UUID, org_id: UUID
    ) -> Optional[FireGeofence]:
        """Get geofence by ID"""
        try:
            result = await self.db.execute(
                select(FireGeofence).where(
                    and_(
                        FireGeofence.id == geofence_id,
                        FireGeofence.org_id == org_id,
                    )
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Failed to get geofence: {e}")
            return None

    async def get_geofences_by_role(
        self,
        org_id: UUID,
        role: GeofenceRole,
        station_id: Optional[UUID] = None,
        active_only: bool = True,
    ) -> List[FireGeofence]:
        """Get all geofences with a specific role"""
        try:
            query = select(FireGeofence).where(
                and_(
                    FireGeofence.org_id == org_id,
                    FireGeofence.role == role,
                )
            )
            
            if station_id:
                query = query.where(FireGeofence.station_id == station_id)
            
            if active_only:
                query = query.where(FireGeofence.active == True)
            
            result = await self.db.execute(query)
            return list(result.scalars().all())

        except Exception as e:
            logger.error(f"Failed to get geofences by role: {e}")
            return []

    async def get_station_geofences(
        self, org_id: UUID, station_id: UUID, active_only: bool = True
    ) -> List[FireGeofence]:
        """Get all geofences for a station"""
        try:
            query = select(FireGeofence).where(
                and_(
                    FireGeofence.org_id == org_id,
                    FireGeofence.station_id == station_id,
                )
            )
            
            if active_only:
                query = query.where(FireGeofence.active == True)
            
            result = await self.db.execute(query)
            return list(result.scalars().all())

        except Exception as e:
            logger.error(f"Failed to get station geofences: {e}")
            return []

    async def get_all_geofences(
        self, org_id: UUID, active_only: bool = True
    ) -> List[FireGeofence]:
        """Get all geofences for an organization"""
        try:
            query = select(FireGeofence).where(FireGeofence.org_id == org_id)
            
            if active_only:
                query = query.where(FireGeofence.active == True)
            
            result = await self.db.execute(query)
            return list(result.scalars().all())

        except Exception as e:
            logger.error(f"Failed to get all geofences: {e}")
            return []

    # ========================================================================
    # Point-in-Polygon (Circle) Checks
    # ========================================================================

    def calculate_distance_meters(
        self, lat1: float, lng1: float, lat2: float, lng2: float
    ) -> float:
        """
        Calculate distance between two points using Haversine formula.
        
        Returns distance in meters.
        """
        # Convert to radians
        lat1_rad = radians(lat1)
        lng1_rad = radians(lng1)
        lat2_rad = radians(lat2)
        lng2_rad = radians(lng2)

        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlng = lng2_rad - lng1_rad

        a = sin(dlat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlng / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        # Earth radius in meters
        earth_radius_m = 6371000
        distance_m = earth_radius_m * c

        return distance_m

    async def check_point_in_circular_geofence(
        self, lat: float, lng: float, center_lat: float, center_lng: float, radius_meters: int
    ) -> bool:
        """
        Check if a point is within a circular geofence.
        
        Returns True if point is within radius.
        """
        try:
            distance = self.calculate_distance_meters(lat, lng, center_lat, center_lng)
            return distance <= radius_meters

        except Exception as e:
            logger.error(f"Failed to check point in geofence: {e}")
            return False

    async def check_point_in_geofence(
        self, lat: float, lng: float, geofence_id: UUID, org_id: UUID
    ) -> bool:
        """Check if a point is within a specific geofence"""
        try:
            geofence = await self.get_geofence_by_id(geofence_id, org_id)
            if not geofence or not geofence.active:
                return False

            return await self.check_point_in_circular_geofence(
                lat=lat,
                lng=lng,
                center_lat=float(geofence.center_lat),
                center_lng=float(geofence.center_lng),
                radius_meters=geofence.radius_meters,
            )

        except Exception as e:
            logger.error(f"Failed to check point in geofence: {e}")
            return False

    # ========================================================================
    # Geofence Lookup Helpers
    # ========================================================================

    async def find_geofence_for_location(
        self,
        org_id: UUID,
        lat: float,
        lng: float,
        role: Optional[str] = None,
        station_id: Optional[UUID] = None,
    ) -> Optional[FireGeofence]:
        """
        Find geofence that contains a specific location.
        
        Returns the first matching geofence if point is within it.
        """
        try:
            # Get all active geofences
            query = select(FireGeofence).where(
                and_(
                    FireGeofence.org_id == org_id,
                    FireGeofence.active == True,
                )
            )
            
            if role:
                query = query.where(FireGeofence.role == GeofenceRole(role))
            
            if station_id:
                query = query.where(FireGeofence.station_id == station_id)
            
            result = await self.db.execute(query)
            geofences = list(result.scalars().all())

            # Check each geofence
            for geofence in geofences:
                in_geofence = await self.check_point_in_circular_geofence(
                    lat=lat,
                    lng=lng,
                    center_lat=float(geofence.center_lat),
                    center_lng=float(geofence.center_lng),
                    radius_meters=geofence.radius_meters,
                )
                
                if in_geofence:
                    return geofence

            return None

        except Exception as e:
            logger.error(f"Failed to find geofence for location: {e}")
            return None

    async def find_all_geofences_for_location(
        self,
        org_id: UUID,
        lat: float,
        lng: float,
    ) -> List[FireGeofence]:
        """
        Find all geofences that contain a specific location.
        
        Returns list of all matching geofences.
        """
        try:
            # Get all active geofences
            result = await self.db.execute(
                select(FireGeofence).where(
                    and_(
                        FireGeofence.org_id == org_id,
                        FireGeofence.active == True,
                    )
                )
            )
            geofences = list(result.scalars().all())

            matching_geofences = []

            # Check each geofence
            for geofence in geofences:
                in_geofence = await self.check_point_in_circular_geofence(
                    lat=lat,
                    lng=lng,
                    center_lat=float(geofence.center_lat),
                    center_lng=float(geofence.center_lng),
                    radius_meters=geofence.radius_meters,
                )
                
                if in_geofence:
                    matching_geofences.append(geofence)

            return matching_geofences

        except Exception as e:
            logger.error(f"Failed to find all geofences for location: {e}")
            return []

    # ========================================================================
    # Scene/Destination Helpers
    # ========================================================================

    async def create_scene_geofence(
        self,
        org_id: UUID,
        name: str,
        center_lat: float,
        center_lng: float,
        radius_meters: int = 300,
        notes: Optional[str] = None,
    ) -> FireGeofence:
        """Create a scene geofence for incident tracking"""
        return await self.create_geofence(
            org_id=org_id,
            name=name,
            role=GeofenceRole.SCENE,
            center_lat=center_lat,
            center_lng=center_lng,
            radius_meters=radius_meters,
            notes=notes,
        )

    async def create_destination_geofence(
        self,
        org_id: UUID,
        name: str,
        center_lat: float,
        center_lng: float,
        radius_meters: int = 300,
        notes: Optional[str] = None,
    ) -> FireGeofence:
        """Create a destination geofence (hospital, etc.)"""
        return await self.create_geofence(
            org_id=org_id,
            name=name,
            role=GeofenceRole.DESTINATION,
            center_lat=center_lat,
            center_lng=center_lng,
            radius_meters=radius_meters,
            notes=notes,
        )

    async def create_station_geofence(
        self,
        org_id: UUID,
        station_id: UUID,
        name: str,
        center_lat: float,
        center_lng: float,
        radius_meters: int = 200,
        notes: Optional[str] = None,
    ) -> FireGeofence:
        """Create a station geofence for return-to-station detection"""
        return await self.create_geofence(
            org_id=org_id,
            name=name,
            role=GeofenceRole.STATION,
            center_lat=center_lat,
            center_lng=center_lng,
            radius_meters=radius_meters,
            station_id=station_id,
            notes=notes,
        )

    # ========================================================================
    # Geofence Statistics
    # ========================================================================

    async def get_geofence_statistics(self, org_id: UUID) -> Dict[str, Any]:
        """Get statistics about geofences for an organization"""
        try:
            all_geofences = await self.get_all_geofences(org_id, active_only=False)

            stats = {
                "total_geofences": len(all_geofences),
                "active_geofences": sum(1 for g in all_geofences if g.active),
                "inactive_geofences": sum(1 for g in all_geofences if not g.active),
                "by_role": {
                    "scene": sum(1 for g in all_geofences if g.role == GeofenceRole.SCENE),
                    "destination": sum(1 for g in all_geofences if g.role == GeofenceRole.DESTINATION),
                    "station": sum(1 for g in all_geofences if g.role == GeofenceRole.STATION),
                    "coverage": sum(1 for g in all_geofences if g.role == GeofenceRole.COVERAGE),
                },
            }

            return stats

        except Exception as e:
            logger.error(f"Failed to get geofence statistics: {e}")
            return {"error": str(e)}
