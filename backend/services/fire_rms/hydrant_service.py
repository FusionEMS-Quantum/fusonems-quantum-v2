"""
Fire RMS - Hydrant Inventory & Management Service
Comprehensive hydrant tracking, inspection scheduling, flow testing, GPS mapping
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_, or_
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from models.fire_rms import Hydrant, HydrantInspection, HydrantStatus, InspectionStatus
from pydantic import BaseModel


class HydrantCreate(BaseModel):
    hydrant_number: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hydrant_type: Optional[str] = None
    flow_capacity_gpm: Optional[int] = None
    static_pressure_psi: Optional[int] = None
    residual_pressure_psi: Optional[int] = None
    manufacturer: Optional[str] = None
    install_date: Optional[date] = None
    notes: Optional[str] = None


class HydrantInspectionCreate(BaseModel):
    hydrant_id: int
    inspection_date: date
    inspector_id: int
    flow_test_performed: bool = False
    static_pressure_psi: Optional[int] = None
    residual_pressure_psi: Optional[int] = None
    flow_gpm: Optional[int] = None
    valve_operational: bool = True
    cap_threads_good: bool = True
    paint_condition: Optional[str] = None
    deficiencies_found: Optional[str] = None
    repairs_needed: Optional[str] = None
    status: InspectionStatus = InspectionStatus.COMPLETED


class HydrantService:
    """Comprehensive hydrant inventory and inspection management"""
    
    @staticmethod
    async def create_hydrant(
        db: AsyncSession,
        org_id: int,
        data: HydrantCreate,
        training_mode: bool = False
    ) -> Hydrant:
        """Create new hydrant in inventory"""
        hydrant = Hydrant(
            org_id=org_id,
            hydrant_number=data.hydrant_number,
            address=data.address,
            latitude=data.latitude,
            longitude=data.longitude,
            hydrant_type=data.hydrant_type,
            flow_capacity_gpm=data.flow_capacity_gpm,
            static_pressure_psi=data.static_pressure_psi,
            residual_pressure_psi=data.residual_pressure_psi,
            manufacturer=data.manufacturer,
            install_date=data.install_date,
            notes=data.notes,
            status=HydrantStatus.OPERATIONAL,
            training_mode=training_mode,
            classification="OPS"
        )
        
        # Auto-schedule first inspection (90 days)
        if hydrant.install_date:
            hydrant.next_inspection_due = hydrant.install_date + timedelta(days=90)
        else:
            hydrant.next_inspection_due = date.today() + timedelta(days=90)
        
        db.add(hydrant)
        await db.commit()
        await db.refresh(hydrant)
        return hydrant
    
    @staticmethod
    async def get_hydrant(
        db: AsyncSession,
        org_id: int,
        hydrant_id: int
    ) -> Optional[Hydrant]:
        """Get hydrant by ID"""
        result = await db.execute(
            select(Hydrant).where(
                and_(
                    Hydrant.id == hydrant_id,
                    Hydrant.org_id == org_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_hydrants_by_status(
        db: AsyncSession,
        org_id: int,
        status: HydrantStatus,
        training_mode: bool = False
    ) -> List[Hydrant]:
        """Get all hydrants by status"""
        result = await db.execute(
            select(Hydrant).where(
                and_(
                    Hydrant.org_id == org_id,
                    Hydrant.status == status,
                    Hydrant.training_mode == training_mode
                )
            ).order_by(Hydrant.hydrant_number)
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_hydrants_near_location(
        db: AsyncSession,
        org_id: int,
        latitude: float,
        longitude: float,
        radius_miles: float = 0.5
    ) -> List[Dict[str, Any]]:
        """Get hydrants within radius of coordinates (simplified distance calc)"""
        # Rough approximation: 1 degree latitude ≈ 69 miles
        lat_range = radius_miles / 69.0
        lon_range = radius_miles / (69.0 * 0.8)  # Adjust for longitude
        
        result = await db.execute(
            select(Hydrant).where(
                and_(
                    Hydrant.org_id == org_id,
                    Hydrant.latitude.isnot(None),
                    Hydrant.longitude.isnot(None),
                    Hydrant.latitude.between(latitude - lat_range, latitude + lat_range),
                    Hydrant.longitude.between(longitude - lon_range, longitude + lon_range)
                )
            )
        )
        
        hydrants = []
        for hydrant in result.scalars().all():
            # Calculate approximate distance
            lat_diff = abs(hydrant.latitude - latitude)
            lon_diff = abs(hydrant.longitude - longitude)
            approx_distance = ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 69.0
            
            hydrants.append({
                "id": hydrant.id,
                "hydrant_number": hydrant.hydrant_number,
                "address": hydrant.address,
                "latitude": hydrant.latitude,
                "longitude": hydrant.longitude,
                "status": hydrant.status,
                "flow_capacity_gpm": hydrant.flow_capacity_gpm,
                "distance_miles": round(approx_distance, 2)
            })
        
        # Sort by distance
        hydrants.sort(key=lambda x: x["distance_miles"])
        return hydrants
    
    @staticmethod
    async def get_overdue_inspections(
        db: AsyncSession,
        org_id: int,
        training_mode: bool = False
    ) -> List[Hydrant]:
        """Get hydrants with overdue inspections"""
        today = date.today()
        result = await db.execute(
            select(Hydrant).where(
                and_(
                    Hydrant.org_id == org_id,
                    Hydrant.training_mode == training_mode,
                    or_(
                        Hydrant.next_inspection_due < today,
                        Hydrant.next_inspection_due.is_(None)
                    )
                )
            ).order_by(Hydrant.next_inspection_due.asc().nullsfirst())
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def schedule_inspections(
        db: AsyncSession,
        org_id: int,
        schedule_days_ahead: int = 90
    ) -> Dict[str, Any]:
        """Auto-schedule hydrant inspections"""
        today = date.today()
        next_inspection_date = today + timedelta(days=schedule_days_ahead)
        
        # Find hydrants needing inspection scheduling
        result = await db.execute(
            select(Hydrant).where(
                and_(
                    Hydrant.org_id == org_id,
                    or_(
                        Hydrant.next_inspection_due < today,
                        Hydrant.next_inspection_due.is_(None)
                    )
                )
            )
        )
        
        hydrants = result.scalars().all()
        scheduled_count = 0
        
        for hydrant in hydrants:
            hydrant.next_inspection_due = next_inspection_date
            scheduled_count += 1
        
        await db.commit()
        
        return {
            "scheduled_count": scheduled_count,
            "next_inspection_date": next_inspection_date.isoformat(),
            "message": f"Scheduled {scheduled_count} hydrant inspections"
        }
    
    @staticmethod
    async def create_inspection(
        db: AsyncSession,
        org_id: int,
        data: HydrantInspectionCreate,
        training_mode: bool = False
    ) -> HydrantInspection:
        """Record hydrant inspection"""
        inspection = HydrantInspection(
            org_id=org_id,
            hydrant_id=data.hydrant_id,
            inspection_date=data.inspection_date,
            inspector_id=data.inspector_id,
            flow_test_performed=data.flow_test_performed,
            static_pressure_psi=data.static_pressure_psi,
            residual_pressure_psi=data.residual_pressure_psi,
            flow_gpm=data.flow_gpm,
            valve_operational=data.valve_operational,
            cap_threads_good=data.cap_threads_good,
            paint_condition=data.paint_condition,
            deficiencies_found=data.deficiencies_found,
            repairs_needed=data.repairs_needed,
            status=data.status,
            training_mode=training_mode,
            classification="OPS"
        )
        
        db.add(inspection)
        
        # Update hydrant record
        hydrant = await HydrantService.get_hydrant(db, org_id, data.hydrant_id)
        if hydrant:
            hydrant.last_inspection_date = data.inspection_date
            hydrant.next_inspection_due = data.inspection_date + timedelta(days=365)
            
            # Update flow/pressure data if flow test performed
            if data.flow_test_performed:
                if data.static_pressure_psi:
                    hydrant.static_pressure_psi = data.static_pressure_psi
                if data.residual_pressure_psi:
                    hydrant.residual_pressure_psi = data.residual_pressure_psi
                if data.flow_gpm:
                    hydrant.flow_capacity_gpm = data.flow_gpm
            
            # Update status based on inspection results
            if data.repairs_needed or data.deficiencies_found:
                hydrant.status = HydrantStatus.NEEDS_REPAIR
            elif not data.valve_operational:
                hydrant.status = HydrantStatus.OUT_OF_SERVICE
            else:
                hydrant.status = HydrantStatus.OPERATIONAL
        
        await db.commit()
        await db.refresh(inspection)
        return inspection
    
    @staticmethod
    async def mark_out_of_service(
        db: AsyncSession,
        org_id: int,
        hydrant_id: int,
        reason: str
    ) -> Hydrant:
        """Mark hydrant out of service"""
        hydrant = await HydrantService.get_hydrant(db, org_id, hydrant_id)
        if not hydrant:
            raise ValueError(f"Hydrant {hydrant_id} not found")
        
        hydrant.status = HydrantStatus.OUT_OF_SERVICE
        hydrant.notes = f"OUT OF SERVICE: {reason}\n{hydrant.notes or ''}"
        hydrant.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(hydrant)
        return hydrant
    
    @staticmethod
    async def return_to_service(
        db: AsyncSession,
        org_id: int,
        hydrant_id: int,
        notes: str
    ) -> Hydrant:
        """Return hydrant to operational status"""
        hydrant = await HydrantService.get_hydrant(db, org_id, hydrant_id)
        if not hydrant:
            raise ValueError(f"Hydrant {hydrant_id} not found")
        
        hydrant.status = HydrantStatus.OPERATIONAL
        hydrant.notes = f"RETURNED TO SERVICE: {notes}\n{hydrant.notes or ''}"
        hydrant.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(hydrant)
        return hydrant
    
    @staticmethod
    async def get_inspection_history(
        db: AsyncSession,
        org_id: int,
        hydrant_id: int
    ) -> List[HydrantInspection]:
        """Get inspection history for hydrant"""
        result = await db.execute(
            select(HydrantInspection).where(
                and_(
                    HydrantInspection.org_id == org_id,
                    HydrantInspection.hydrant_id == hydrant_id
                )
            ).order_by(HydrantInspection.inspection_date.desc())
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_flow_test_analytics(
        db: AsyncSession,
        org_id: int,
        training_mode: bool = False
    ) -> Dict[str, Any]:
        """Analytics on hydrant flow test performance"""
        result = await db.execute(
            select(
                func.count(Hydrant.id).label("total_hydrants"),
                func.avg(Hydrant.flow_capacity_gpm).label("avg_flow_gpm"),
                func.min(Hydrant.flow_capacity_gpm).label("min_flow_gpm"),
                func.max(Hydrant.flow_capacity_gpm).label("max_flow_gpm"),
                func.avg(Hydrant.static_pressure_psi).label("avg_static_psi"),
                func.avg(Hydrant.residual_pressure_psi).label("avg_residual_psi")
            ).where(
                and_(
                    Hydrant.org_id == org_id,
                    Hydrant.training_mode == training_mode,
                    Hydrant.flow_capacity_gpm.isnot(None)
                )
            )
        )
        
        stats = result.one()
        
        # Get status breakdown
        status_result = await db.execute(
            select(
                Hydrant.status,
                func.count(Hydrant.id).label("count")
            ).where(
                and_(
                    Hydrant.org_id == org_id,
                    Hydrant.training_mode == training_mode
                )
            ).group_by(Hydrant.status)
        )
        
        status_breakdown = {row.status: row.count for row in status_result.all()}
        
        return {
            "total_hydrants": stats.total_hydrants,
            "avg_flow_gpm": round(stats.avg_flow_gpm, 2) if stats.avg_flow_gpm else 0,
            "min_flow_gpm": stats.min_flow_gpm or 0,
            "max_flow_gpm": stats.max_flow_gpm or 0,
            "avg_static_psi": round(stats.avg_static_psi, 2) if stats.avg_static_psi else 0,
            "avg_residual_psi": round(stats.avg_residual_psi, 2) if stats.avg_residual_psi else 0,
            "status_breakdown": status_breakdown
        }
    
    @staticmethod
    async def generate_gis_export(
        db: AsyncSession,
        org_id: int
    ) -> List[Dict[str, Any]]:
        """Export hydrant data for GIS mapping systems"""
        result = await db.execute(
            select(Hydrant).where(
                and_(
                    Hydrant.org_id == org_id,
                    Hydrant.latitude.isnot(None),
                    Hydrant.longitude.isnot(None)
                )
            )
        )
        
        gis_data = []
        for hydrant in result.scalars().all():
            gis_data.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [hydrant.longitude, hydrant.latitude]
                },
                "properties": {
                    "id": hydrant.id,
                    "hydrant_number": hydrant.hydrant_number,
                    "address": hydrant.address,
                    "status": hydrant.status,
                    "flow_capacity_gpm": hydrant.flow_capacity_gpm,
                    "static_pressure_psi": hydrant.static_pressure_psi,
                    "last_inspection_date": hydrant.last_inspection_date.isoformat() if hydrant.last_inspection_date else None,
                    "next_inspection_due": hydrant.next_inspection_due.isoformat() if hydrant.next_inspection_due else None
                }
            })
        
        return {
            "type": "FeatureCollection",
            "features": gis_data
        }
