"""
Fire RMS - Fire Incident Reporting Service
Fire incident reporting, NFIRS compliance, loss calculations, cause determination
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from models.fire_rms import FireIncidentSupplement
from pydantic import BaseModel


class FireIncidentSupplementCreate(BaseModel):
    incident_id: int
    water_supply_method: Optional[str] = None
    gallons_used: Optional[int] = None
    attack_mode: Optional[str] = None
    ventilation_type: Optional[str] = None
    incident_command_system_used: bool = True
    command_post_location: Optional[str] = None
    mutual_aid_received: bool = False
    mutual_aid_agencies: Optional[List[Dict[str, Any]]] = None
    property_loss_estimate: Optional[float] = None
    contents_loss_estimate: Optional[float] = None
    fire_cause: Optional[str] = None
    area_of_origin: Optional[str] = None
    ignition_source: Optional[str] = None
    investigator_id: Optional[int] = None


class NFIRSExport(BaseModel):
    incident_id: int
    basic_module: Dict[str, Any]
    fire_module: Dict[str, Any]
    structure_fire_module: Optional[Dict[str, Any]] = None
    civilian_casualty_module: Optional[List[Dict[str, Any]]] = None
    firefighter_casualty_module: Optional[List[Dict[str, Any]]] = None


class IncidentService:
    """Fire incident reporting and NFIRS compliance"""
    
    # Water supply methods
    WATER_SUPPLY_METHODS = [
        "hydrant",
        "tanker_shuttle",
        "drafting",
        "relay_pumping",
        "portable_tank",
        "multiple_methods"
    ]
    
    # Attack modes
    ATTACK_MODES = [
        "offensive_interior",
        "offensive_exterior",
        "defensive",
        "transitional"
    ]
    
    # Fire causes (NFIRS)
    FIRE_CAUSES = [
        "cooking",
        "heating",
        "electrical_malfunction",
        "smoking",
        "candles",
        "arson",
        "lightning",
        "natural",
        "undetermined",
        "under_investigation"
    ]
    
    @staticmethod
    async def create_fire_supplement(
        db: AsyncSession,
        org_id: int,
        data: FireIncidentSupplementCreate,
        training_mode: bool = False
    ) -> FireIncidentSupplement:
        """Create fire incident supplement (fire-specific data)"""
        supplement = FireIncidentSupplement(
            org_id=org_id,
            incident_id=data.incident_id,
            water_supply_method=data.water_supply_method,
            gallons_used=data.gallons_used,
            attack_mode=data.attack_mode,
            ventilation_type=data.ventilation_type,
            incident_command_system_used=data.incident_command_system_used,
            command_post_location=data.command_post_location,
            mutual_aid_received=data.mutual_aid_received,
            mutual_aid_agencies=data.mutual_aid_agencies,
            property_loss_estimate=data.property_loss_estimate,
            contents_loss_estimate=data.contents_loss_estimate,
            fire_cause=data.fire_cause,
            area_of_origin=data.area_of_origin,
            ignition_source=data.ignition_source,
            investigator_id=data.investigator_id,
            training_mode=training_mode,
            classification="OPS"
        )
        
        db.add(supplement)
        await db.commit()
        await db.refresh(supplement)
        return supplement
    
    @staticmethod
    async def get_fire_supplement(
        db: AsyncSession,
        org_id: int,
        incident_id: int
    ) -> Optional[FireIncidentSupplement]:
        """Get fire supplement for incident"""
        result = await db.execute(
            select(FireIncidentSupplement).where(
                and_(
                    FireIncidentSupplement.org_id == org_id,
                    FireIncidentSupplement.incident_id == incident_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_loss_estimate(
        db: AsyncSession,
        org_id: int,
        incident_id: int,
        property_loss: float,
        contents_loss: float
    ) -> FireIncidentSupplement:
        """Update property/contents loss estimates"""
        supplement = await IncidentService.get_fire_supplement(db, org_id, incident_id)
        if not supplement:
            raise ValueError(f"Fire supplement for incident {incident_id} not found")
        
        supplement.property_loss_estimate = property_loss
        supplement.contents_loss_estimate = contents_loss
        
        await db.commit()
        await db.refresh(supplement)
        return supplement
    
    @staticmethod
    async def update_fire_investigation(
        db: AsyncSession,
        org_id: int,
        incident_id: int,
        fire_cause: str,
        area_of_origin: str,
        ignition_source: str,
        investigator_id: int
    ) -> FireIncidentSupplement:
        """Update fire investigation findings"""
        supplement = await IncidentService.get_fire_supplement(db, org_id, incident_id)
        if not supplement:
            raise ValueError(f"Fire supplement for incident {incident_id} not found")
        
        supplement.fire_cause = fire_cause
        supplement.area_of_origin = area_of_origin
        supplement.ignition_source = ignition_source
        supplement.investigator_id = investigator_id
        
        await db.commit()
        await db.refresh(supplement)
        return supplement
    
    @staticmethod
    async def get_mutual_aid_statistics(
        db: AsyncSession,
        org_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Analyze mutual aid given/received"""
        result = await db.execute(
            select(FireIncidentSupplement).where(
                and_(
                    FireIncidentSupplement.org_id == org_id,
                    FireIncidentSupplement.mutual_aid_received == True,
                    FireIncidentSupplement.created_at.between(
                        datetime.combine(start_date, datetime.min.time()),
                        datetime.combine(end_date, datetime.max.time())
                    )
                )
            )
        )
        
        incidents = result.scalars().all()
        total_mutual_aid = len(incidents)
        
        # Count agencies
        agency_count = {}
        for incident in incidents:
            if incident.mutual_aid_agencies:
                for agency in incident.mutual_aid_agencies:
                    agency_name = agency.get("agency_name", "Unknown")
                    if agency_name not in agency_count:
                        agency_count[agency_name] = 0
                    agency_count[agency_name] += 1
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_incidents_with_mutual_aid": total_mutual_aid,
            "agencies_called": len(agency_count),
            "agency_breakdown": agency_count
        }
    
    @staticmethod
    async def get_loss_statistics(
        db: AsyncSession,
        org_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Calculate property loss statistics"""
        result = await db.execute(
            select(
                func.sum(FireIncidentSupplement.property_loss_estimate).label("total_property_loss"),
                func.sum(FireIncidentSupplement.contents_loss_estimate).label("total_contents_loss"),
                func.avg(FireIncidentSupplement.property_loss_estimate).label("avg_property_loss"),
                func.count(FireIncidentSupplement.id).label("incident_count")
            ).where(
                and_(
                    FireIncidentSupplement.org_id == org_id,
                    FireIncidentSupplement.created_at.between(
                        datetime.combine(start_date, datetime.min.time()),
                        datetime.combine(end_date, datetime.max.time())
                    )
                )
            )
        )
        
        stats = result.one()
        
        total_loss = (stats.total_property_loss or 0) + (stats.total_contents_loss or 0)
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "incident_count": stats.incident_count,
            "total_property_loss": float(stats.total_property_loss or 0),
            "total_contents_loss": float(stats.total_contents_loss or 0),
            "total_combined_loss": float(total_loss),
            "avg_property_loss": float(stats.avg_property_loss or 0)
        }
    
    @staticmethod
    async def get_fire_cause_analysis(
        db: AsyncSession,
        org_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Analyze fire causes for prevention planning"""
        result = await db.execute(
            select(
                FireIncidentSupplement.fire_cause,
                func.count(FireIncidentSupplement.id).label("count")
            ).where(
                and_(
                    FireIncidentSupplement.org_id == org_id,
                    FireIncidentSupplement.fire_cause.isnot(None),
                    FireIncidentSupplement.created_at.between(
                        datetime.combine(start_date, datetime.min.time()),
                        datetime.combine(end_date, datetime.max.time())
                    )
                )
            ).group_by(FireIncidentSupplement.fire_cause).order_by(func.count(FireIncidentSupplement.id).desc())
        )
        
        causes = []
        total = 0
        for row in result.all():
            causes.append({
                "cause": row.fire_cause,
                "count": row.count
            })
            total += row.count
        
        # Add percentages
        for cause in causes:
            cause["percentage"] = round((cause["count"] / total * 100), 2) if total > 0 else 0
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_fires": total,
            "cause_breakdown": causes
        }
    
    @staticmethod
    async def generate_nfirs_export(
        db: AsyncSession,
        org_id: int,
        incident_id: int
    ) -> Dict[str, Any]:
        """Generate NFIRS-compliant export data"""
        supplement = await IncidentService.get_fire_supplement(db, org_id, incident_id)
        if not supplement:
            raise ValueError(f"Fire supplement for incident {incident_id} not found")
        
        # NFIRS Basic Module
        basic_module = {
            "incident_number": str(incident_id),
            "incident_date": supplement.created_at.date().isoformat(),
            "incident_type": "111",  # Building fire (example)
            "aid_given_or_received": "3" if supplement.mutual_aid_received else "N",
            "actions_taken": "10",  # Fire control/extinguishment
        }
        
        # NFIRS Fire Module
        fire_module = {
            "number_of_stories": None,  # Would come from building pre-plan
            "fire_spread": None,  # Needs to be captured
            "cause_of_ignition": IncidentService._map_cause_to_nfirs(supplement.fire_cause),
            "area_of_origin": supplement.area_of_origin,
            "ignition_source": supplement.ignition_source,
            "property_loss": int(supplement.property_loss_estimate or 0),
            "contents_loss": int(supplement.contents_loss_estimate or 0)
        }
        
        # Structure Fire Module (if applicable)
        structure_fire_module = {
            "building_status": None,
            "method_of_extinguishment": "10",  # Water
            "estimated_fire_area": None
        }
        
        return {
            "incident_id": incident_id,
            "nfirs_version": "5.0",
            "basic_module": basic_module,
            "fire_module": fire_module,
            "structure_fire_module": structure_fire_module
        }
    
    @staticmethod
    def _map_cause_to_nfirs(fire_cause: Optional[str]) -> Optional[str]:
        """Map internal fire cause to NFIRS code"""
        cause_mapping = {
            "cooking": "61",
            "heating": "31",
            "electrical_malfunction": "41",
            "smoking": "51",
            "candles": "62",
            "arson": "1",
            "lightning": "21",
            "natural": "2",
            "undetermined": "UU",
            "under_investigation": "UU"
        }
        return cause_mapping.get(fire_cause) if fire_cause else None
    
    @staticmethod
    async def get_water_usage_statistics(
        db: AsyncSession,
        org_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Analyze water usage for ISO rating and planning"""
        result = await db.execute(
            select(
                FireIncidentSupplement.water_supply_method,
                func.count(FireIncidentSupplement.id).label("count"),
                func.avg(FireIncidentSupplement.gallons_used).label("avg_gallons"),
                func.sum(FireIncidentSupplement.gallons_used).label("total_gallons")
            ).where(
                and_(
                    FireIncidentSupplement.org_id == org_id,
                    FireIncidentSupplement.water_supply_method.isnot(None),
                    FireIncidentSupplement.created_at.between(
                        datetime.combine(start_date, datetime.min.time()),
                        datetime.combine(end_date, datetime.max.time())
                    )
                )
            ).group_by(FireIncidentSupplement.water_supply_method)
        )
        
        methods = []
        for row in result.all():
            methods.append({
                "method": row.water_supply_method,
                "incident_count": row.count,
                "avg_gallons_used": round(row.avg_gallons, 2) if row.avg_gallons else 0,
                "total_gallons_used": int(row.total_gallons or 0)
            })
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "water_supply_breakdown": methods
        }
    
    @staticmethod
    async def get_attack_mode_analysis(
        db: AsyncSession,
        org_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Analyze tactical approaches used"""
        result = await db.execute(
            select(
                FireIncidentSupplement.attack_mode,
                func.count(FireIncidentSupplement.id).label("count")
            ).where(
                and_(
                    FireIncidentSupplement.org_id == org_id,
                    FireIncidentSupplement.attack_mode.isnot(None),
                    FireIncidentSupplement.created_at.between(
                        datetime.combine(start_date, datetime.min.time()),
                        datetime.combine(end_date, datetime.max.time())
                    )
                )
            ).group_by(FireIncidentSupplement.attack_mode).order_by(func.count(FireIncidentSupplement.id).desc())
        )
        
        modes = []
        total = 0
        for row in result.all():
            modes.append({
                "attack_mode": row.attack_mode,
                "count": row.count
            })
            total += row.count
        
        # Add percentages
        for mode in modes:
            mode["percentage"] = round((mode["count"] / total * 100), 2) if total > 0 else 0
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_incidents": total,
            "attack_mode_breakdown": modes
        }
