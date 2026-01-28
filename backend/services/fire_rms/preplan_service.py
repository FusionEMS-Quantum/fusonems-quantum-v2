"""
Fire RMS - Pre-Incident Plan Service
Pre-fire planning, building profiles, hazmat information, tactical considerations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from models.fire_rms import PreFirePlan
from pydantic import BaseModel


class PreFirePlanCreate(BaseModel):
    property_name: str
    property_address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    occupancy_type: str
    occupant_load: Optional[int] = None
    number_of_floors: Optional[int] = None
    square_footage: Optional[int] = None
    construction_type: Optional[str] = None
    roof_type: Optional[str] = None
    hazardous_materials_present: bool = False
    hazmat_types: Optional[List[Dict[str, Any]]] = None
    sprinkler_system: bool = False
    standpipe_system: bool = False
    fire_alarm_type: Optional[str] = None
    nearest_hydrant_distance_feet: Optional[int] = None
    water_supply_notes: Optional[str] = None
    knox_box_location: Optional[str] = None
    fire_department_connection_location: Optional[str] = None
    property_manager_name: Optional[str] = None
    property_manager_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class TacticalConsideration(BaseModel):
    category: str  # "water_supply", "access", "hazard", "ventilation", "rescue"
    description: str
    priority: str  # "high", "medium", "low"


class PrePlanService:
    """Comprehensive pre-incident planning and tactical information management"""
    
    # Construction types (IBC classifications)
    CONSTRUCTION_TYPES = [
        "Type I - Fire Resistive",
        "Type II - Non-Combustible",
        "Type III - Ordinary",
        "Type IV - Heavy Timber",
        "Type V - Wood Frame"
    ]
    
    # Occupancy classifications (NFPA)
    OCCUPANCY_TYPES = [
        "Assembly",
        "Educational",
        "Detention/Correctional",
        "Residential",
        "Business",
        "Mercantile",
        "Industrial",
        "Storage",
        "Healthcare",
        "Mixed Use"
    ]
    
    @staticmethod
    async def create_preplan(
        db: AsyncSession,
        org_id: int,
        data: PreFirePlanCreate,
        created_by: str,
        training_mode: bool = False
    ) -> PreFirePlan:
        """Create new pre-incident plan"""
        # Generate plan number
        plan_number = await PrePlanService._generate_plan_number(db, org_id)
        
        preplan = PreFirePlan(
            org_id=org_id,
            plan_number=plan_number,
            property_name=data.property_name,
            property_address=data.property_address,
            latitude=data.latitude,
            longitude=data.longitude,
            occupancy_type=data.occupancy_type,
            occupant_load=data.occupant_load,
            number_of_floors=data.number_of_floors,
            square_footage=data.square_footage,
            construction_type=data.construction_type,
            roof_type=data.roof_type,
            hazardous_materials_present=data.hazardous_materials_present,
            hazmat_types=data.hazmat_types,
            sprinkler_system=data.sprinkler_system,
            standpipe_system=data.standpipe_system,
            fire_alarm_type=data.fire_alarm_type,
            nearest_hydrant_distance_feet=data.nearest_hydrant_distance_feet,
            water_supply_notes=data.water_supply_notes,
            knox_box_location=data.knox_box_location,
            fire_department_connection_location=data.fire_department_connection_location,
            property_manager_name=data.property_manager_name,
            property_manager_phone=data.property_manager_phone,
            emergency_contact_name=data.emergency_contact_name,
            emergency_contact_phone=data.emergency_contact_phone,
            created_by=created_by,
            last_updated_by=created_by,
            training_mode=training_mode,
            classification="OPS"
        )
        
        db.add(preplan)
        await db.commit()
        await db.refresh(preplan)
        return preplan
    
    @staticmethod
    async def _generate_plan_number(db: AsyncSession, org_id: int) -> str:
        """Generate unique pre-plan number"""
        year = date.today().year
        
        # Count plans this year
        result = await db.execute(
            select(func.count(PreFirePlan.id)).where(
                and_(
                    PreFirePlan.org_id == org_id,
                    func.extract('year', PreFirePlan.created_at) == year
                )
            )
        )
        count = result.scalar() or 0
        
        return f"PP-{year}-{count + 1:04d}"
    
    @staticmethod
    async def get_preplan(
        db: AsyncSession,
        org_id: int,
        preplan_id: int
    ) -> Optional[PreFirePlan]:
        """Get pre-plan by ID"""
        result = await db.execute(
            select(PreFirePlan).where(
                and_(
                    PreFirePlan.id == preplan_id,
                    PreFirePlan.org_id == org_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_preplan_by_address(
        db: AsyncSession,
        org_id: int,
        address: str
    ) -> Optional[PreFirePlan]:
        """Get pre-plan for specific address (for CAD/dispatch integration)"""
        result = await db.execute(
            select(PreFirePlan).where(
                and_(
                    PreFirePlan.org_id == org_id,
                    PreFirePlan.property_address.ilike(f"%{address}%")
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_preplans_near_location(
        db: AsyncSession,
        org_id: int,
        latitude: float,
        longitude: float,
        radius_miles: float = 1.0
    ) -> List[Dict[str, Any]]:
        """Get pre-plans near incident location for tactical planning"""
        # Rough approximation: 1 degree latitude ≈ 69 miles
        lat_range = radius_miles / 69.0
        lon_range = radius_miles / (69.0 * 0.8)
        
        result = await db.execute(
            select(PreFirePlan).where(
                and_(
                    PreFirePlan.org_id == org_id,
                    PreFirePlan.latitude.isnot(None),
                    PreFirePlan.longitude.isnot(None),
                    PreFirePlan.latitude.between(latitude - lat_range, latitude + lat_range),
                    PreFirePlan.longitude.between(longitude - lon_range, longitude + lon_range)
                )
            )
        )
        
        preplans = []
        for plan in result.scalars().all():
            # Calculate approximate distance
            lat_diff = abs(plan.latitude - latitude)
            lon_diff = abs(plan.longitude - longitude)
            approx_distance = ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 69.0
            
            preplans.append({
                "id": plan.id,
                "plan_number": plan.plan_number,
                "property_name": plan.property_name,
                "property_address": plan.property_address,
                "occupancy_type": plan.occupancy_type,
                "construction_type": plan.construction_type,
                "hazardous_materials_present": plan.hazardous_materials_present,
                "sprinkler_system": plan.sprinkler_system,
                "distance_miles": round(approx_distance, 2)
            })
        
        # Sort by distance
        preplans.sort(key=lambda x: x["distance_miles"])
        return preplans
    
    @staticmethod
    async def get_target_hazards(
        db: AsyncSession,
        org_id: int,
        training_mode: bool = False
    ) -> List[PreFirePlan]:
        """Get high-priority target hazards (hazmat, high occupancy, etc.)"""
        result = await db.execute(
            select(PreFirePlan).where(
                and_(
                    PreFirePlan.org_id == org_id,
                    PreFirePlan.training_mode == training_mode,
                    or_(
                        PreFirePlan.hazardous_materials_present == True,
                        PreFirePlan.occupant_load >= 50,
                        PreFirePlan.number_of_floors >= 4
                    )
                )
            ).order_by(PreFirePlan.property_name)
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def update_preplan(
        db: AsyncSession,
        org_id: int,
        preplan_id: int,
        updates: Dict[str, Any],
        updated_by: str
    ) -> PreFirePlan:
        """Update existing pre-plan"""
        preplan = await PrePlanService.get_preplan(db, org_id, preplan_id)
        if not preplan:
            raise ValueError(f"Pre-plan {preplan_id} not found")
        
        # Update fields
        for field, value in updates.items():
            if hasattr(preplan, field):
                setattr(preplan, field, value)
        
        preplan.last_updated_by = updated_by
        preplan.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(preplan)
        return preplan
    
    @staticmethod
    async def attach_floor_plan(
        db: AsyncSession,
        org_id: int,
        preplan_id: int,
        file_path: str,
        updated_by: str
    ) -> PreFirePlan:
        """Attach floor plan document to pre-plan"""
        preplan = await PrePlanService.get_preplan(db, org_id, preplan_id)
        if not preplan:
            raise ValueError(f"Pre-plan {preplan_id} not found")
        
        preplan.floor_plan_path = file_path
        preplan.last_updated_by = updated_by
        preplan.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(preplan)
        return preplan
    
    @staticmethod
    async def attach_site_plan(
        db: AsyncSession,
        org_id: int,
        preplan_id: int,
        file_path: str,
        updated_by: str
    ) -> PreFirePlan:
        """Attach site plan document to pre-plan"""
        preplan = await PrePlanService.get_preplan(db, org_id, preplan_id)
        if not preplan:
            raise ValueError(f"Pre-plan {preplan_id} not found")
        
        preplan.site_plan_path = file_path
        preplan.last_updated_by = updated_by
        preplan.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(preplan)
        return preplan
    
    @staticmethod
    async def generate_tactical_summary(
        db: AsyncSession,
        org_id: int,
        preplan_id: int
    ) -> Dict[str, Any]:
        """Generate tactical summary for quick reference during incident"""
        preplan = await PrePlanService.get_preplan(db, org_id, preplan_id)
        if not preplan:
            raise ValueError(f"Pre-plan {preplan_id} not found")
        
        tactical_considerations = []
        
        # Water supply
        if preplan.nearest_hydrant_distance_feet:
            if preplan.nearest_hydrant_distance_feet > 500:
                tactical_considerations.append({
                    "category": "water_supply",
                    "description": f"Nearest hydrant {preplan.nearest_hydrant_distance_feet} ft away - consider relay pumping",
                    "priority": "high"
                })
        
        # Hazmat
        if preplan.hazardous_materials_present:
            tactical_considerations.append({
                "category": "hazard",
                "description": "HAZARDOUS MATERIALS PRESENT - See hazmat details",
                "priority": "high"
            })
        
        # High-rise
        if preplan.number_of_floors and preplan.number_of_floors >= 4:
            tactical_considerations.append({
                "category": "access",
                "description": f"{preplan.number_of_floors} floors - Aerial apparatus and stair climbs required",
                "priority": "high"
            })
        
        # Standpipe
        if preplan.standpipe_system:
            tactical_considerations.append({
                "category": "water_supply",
                "description": "Standpipe system available - FDC location noted",
                "priority": "medium"
            })
        
        # Sprinklers
        if not preplan.sprinkler_system and preplan.square_footage and preplan.square_footage > 5000:
            tactical_considerations.append({
                "category": "hazard",
                "description": "Large building WITHOUT sprinkler protection",
                "priority": "high"
            })
        
        # High occupancy
        if preplan.occupant_load and preplan.occupant_load >= 50:
            tactical_considerations.append({
                "category": "rescue",
                "description": f"High occupant load ({preplan.occupant_load}) - Mass evacuation considerations",
                "priority": "high"
            })
        
        return {
            "plan_number": preplan.plan_number,
            "property_name": preplan.property_name,
            "property_address": preplan.property_address,
            "occupancy_type": preplan.occupancy_type,
            "construction_type": preplan.construction_type,
            "quick_facts": {
                "floors": preplan.number_of_floors,
                "square_footage": preplan.square_footage,
                "occupant_load": preplan.occupant_load,
                "sprinkler_system": preplan.sprinkler_system,
                "standpipe_system": preplan.standpipe_system,
                "hazmat_present": preplan.hazardous_materials_present
            },
            "tactical_considerations": tactical_considerations,
            "contacts": {
                "property_manager": {
                    "name": preplan.property_manager_name,
                    "phone": preplan.property_manager_phone
                },
                "emergency_contact": {
                    "name": preplan.emergency_contact_name,
                    "phone": preplan.emergency_contact_phone
                }
            },
            "access_info": {
                "knox_box": preplan.knox_box_location,
                "fdc_location": preplan.fire_department_connection_location
            }
        }
    
    @staticmethod
    async def generate_gis_export(
        db: AsyncSession,
        org_id: int
    ) -> Dict[str, Any]:
        """Export pre-plans for GIS/mapping systems"""
        result = await db.execute(
            select(PreFirePlan).where(
                and_(
                    PreFirePlan.org_id == org_id,
                    PreFirePlan.latitude.isnot(None),
                    PreFirePlan.longitude.isnot(None)
                )
            )
        )
        
        features = []
        for plan in result.scalars().all():
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [plan.longitude, plan.latitude]
                },
                "properties": {
                    "id": plan.id,
                    "plan_number": plan.plan_number,
                    "property_name": plan.property_name,
                    "property_address": plan.property_address,
                    "occupancy_type": plan.occupancy_type,
                    "construction_type": plan.construction_type,
                    "hazmat_present": plan.hazardous_materials_present,
                    "sprinkler_system": plan.sprinkler_system,
                    "occupant_load": plan.occupant_load,
                    "target_hazard": plan.hazardous_materials_present or (plan.occupant_load or 0) >= 50
                }
            })
        
        return {
            "type": "FeatureCollection",
            "features": features
        }
    
    @staticmethod
    async def get_preplanning_statistics(
        db: AsyncSession,
        org_id: int
    ) -> Dict[str, Any]:
        """Get pre-planning program statistics"""
        result = await db.execute(
            select(
                func.count(PreFirePlan.id).label("total_plans"),
                func.sum(func.cast(PreFirePlan.hazardous_materials_present, Integer)).label("hazmat_count"),
                func.sum(func.cast(PreFirePlan.sprinkler_system, Integer)).label("sprinkler_count"),
                func.avg(PreFirePlan.occupant_load).label("avg_occupancy")
            ).where(
                PreFirePlan.org_id == org_id
            )
        )
        
        stats = result.one()
        
        # Occupancy type breakdown
        occupancy_result = await db.execute(
            select(
                PreFirePlan.occupancy_type,
                func.count(PreFirePlan.id).label("count")
            ).where(
                PreFirePlan.org_id == org_id
            ).group_by(PreFirePlan.occupancy_type)
        )
        
        occupancy_breakdown = {row.occupancy_type: row.count for row in occupancy_result.all()}
        
        return {
            "total_preplans": stats.total_plans,
            "hazmat_locations": stats.hazmat_count or 0,
            "sprinklered_locations": stats.sprinkler_count or 0,
            "avg_occupant_load": round(stats.avg_occupancy, 1) if stats.avg_occupancy else 0,
            "occupancy_breakdown": occupancy_breakdown
        }
