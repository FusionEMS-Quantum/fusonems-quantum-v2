"""
Fire RMS - Fire Apparatus Tracking & Maintenance Service
Apparatus tracking, maintenance logs, pump testing, equipment inventory
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from models.fire_rms import ApparatusMaintenanceRecord
from pydantic import BaseModel


class MaintenanceRecordCreate(BaseModel):
    apparatus_id: str
    apparatus_type: str
    maintenance_date: date
    maintenance_type: str
    mileage: Optional[int] = None
    hours: Optional[int] = None
    oil_level_ok: Optional[bool] = None
    tire_pressure_ok: Optional[bool] = None
    lights_operational: Optional[bool] = None
    pump_tested: Optional[bool] = None
    service_description: Optional[str] = None
    parts_replaced: Optional[List[Dict[str, Any]]] = None
    cost: Optional[float] = None
    performed_by: Optional[str] = None
    out_of_service: bool = False


class PumpTestRecord(BaseModel):
    apparatus_id: str
    test_date: date
    tester_id: int
    draft_test_passed: bool
    pressure_test_passed: bool
    vacuum_test_passed: bool
    rated_capacity_gpm: int
    test_results: Dict[str, Any]


class ApparatusService:
    """Comprehensive fire apparatus tracking and maintenance management"""
    
    # Apparatus types
    APPARATUS_TYPES = [
        "Engine",
        "Ladder/Truck",
        "Rescue",
        "Brush/Wildland",
        "Tanker/Tender",
        "Ambulance",
        "Chief Vehicle",
        "Utility",
        "Heavy Rescue",
        "Hazmat Unit"
    ]
    
    # Maintenance types
    MAINTENANCE_TYPES = [
        "daily_check",
        "weekly_check",
        "monthly_check",
        "preventive_maintenance",
        "pump_test",
        "ladder_test",
        "aerial_certification",
        "repair",
        "emergency_repair",
        "annual_inspection"
    ]
    
    @staticmethod
    async def create_maintenance_record(
        db: AsyncSession,
        org_id: int,
        data: MaintenanceRecordCreate,
        training_mode: bool = False
    ) -> ApparatusMaintenanceRecord:
        """Create maintenance/service record"""
        record = ApparatusMaintenanceRecord(
            org_id=org_id,
            apparatus_id=data.apparatus_id,
            apparatus_type=data.apparatus_type,
            maintenance_date=data.maintenance_date,
            maintenance_type=data.maintenance_type,
            mileage=data.mileage,
            hours=data.hours,
            oil_level_ok=data.oil_level_ok,
            tire_pressure_ok=data.tire_pressure_ok,
            lights_operational=data.lights_operational,
            pump_tested=data.pump_tested,
            service_description=data.service_description,
            parts_replaced=data.parts_replaced,
            cost=data.cost,
            performed_by=data.performed_by,
            out_of_service=data.out_of_service,
            training_mode=training_mode,
            classification="OPS"
        )
        
        # Auto-calculate next service date based on type
        if data.maintenance_type == "preventive_maintenance":
            record.next_service_due = data.maintenance_date + timedelta(days=90)
        elif data.maintenance_type == "pump_test":
            record.next_service_due = data.maintenance_date + timedelta(days=365)
        elif data.maintenance_type == "annual_inspection":
            record.next_service_due = data.maintenance_date + timedelta(days=365)
        
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record
    
    @staticmethod
    async def get_maintenance_record(
        db: AsyncSession,
        org_id: int,
        record_id: int
    ) -> Optional[ApparatusMaintenanceRecord]:
        """Get maintenance record by ID"""
        result = await db.execute(
            select(ApparatusMaintenanceRecord).where(
                and_(
                    ApparatusMaintenanceRecord.id == record_id,
                    ApparatusMaintenanceRecord.org_id == org_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_apparatus_maintenance_history(
        db: AsyncSession,
        org_id: int,
        apparatus_id: str,
        limit: int = 50
    ) -> List[ApparatusMaintenanceRecord]:
        """Get complete maintenance history for apparatus"""
        result = await db.execute(
            select(ApparatusMaintenanceRecord).where(
                and_(
                    ApparatusMaintenanceRecord.org_id == org_id,
                    ApparatusMaintenanceRecord.apparatus_id == apparatus_id
                )
            ).order_by(ApparatusMaintenanceRecord.maintenance_date.desc()).limit(limit)
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_overdue_maintenance(
        db: AsyncSession,
        org_id: int,
        training_mode: bool = False
    ) -> List[Dict[str, Any]]:
        """Get apparatus with overdue maintenance"""
        today = date.today()
        
        result = await db.execute(
            select(ApparatusMaintenanceRecord).where(
                and_(
                    ApparatusMaintenanceRecord.org_id == org_id,
                    ApparatusMaintenanceRecord.training_mode == training_mode,
                    ApparatusMaintenanceRecord.next_service_due < today,
                    ApparatusMaintenanceRecord.next_service_due.isnot(None)
                )
            ).order_by(ApparatusMaintenanceRecord.next_service_due.asc())
        )
        
        # Group by apparatus
        overdue = {}
        for record in result.scalars().all():
            if record.apparatus_id not in overdue:
                overdue[record.apparatus_id] = {
                    "apparatus_id": record.apparatus_id,
                    "apparatus_type": record.apparatus_type,
                    "overdue_items": []
                }
            
            days_overdue = (today - record.next_service_due).days
            overdue[record.apparatus_id]["overdue_items"].append({
                "maintenance_type": record.maintenance_type,
                "due_date": record.next_service_due.isoformat(),
                "days_overdue": days_overdue
            })
        
        return list(overdue.values())
    
    @staticmethod
    async def get_out_of_service_apparatus(
        db: AsyncSession,
        org_id: int,
        training_mode: bool = False
    ) -> List[Dict[str, Any]]:
        """Get currently out-of-service apparatus"""
        result = await db.execute(
            select(ApparatusMaintenanceRecord).where(
                and_(
                    ApparatusMaintenanceRecord.org_id == org_id,
                    ApparatusMaintenanceRecord.training_mode == training_mode,
                    ApparatusMaintenanceRecord.out_of_service == True,
                    or_(
                        ApparatusMaintenanceRecord.out_of_service_end.is_(None),
                        ApparatusMaintenanceRecord.out_of_service_end > datetime.utcnow()
                    )
                )
            ).order_by(ApparatusMaintenanceRecord.out_of_service_start.desc())
        )
        
        oos_apparatus = []
        for record in result.scalars().all():
            if record.out_of_service_start:
                duration = datetime.utcnow() - record.out_of_service_start
                days_oos = duration.days
            else:
                days_oos = 0
            
            oos_apparatus.append({
                "apparatus_id": record.apparatus_id,
                "apparatus_type": record.apparatus_type,
                "reason": record.service_description,
                "out_since": record.out_of_service_start.isoformat() if record.out_of_service_start else None,
                "days_out": days_oos,
                "estimated_return": record.out_of_service_end.isoformat() if record.out_of_service_end else "Unknown"
            })
        
        return oos_apparatus
    
    @staticmethod
    async def mark_apparatus_out_of_service(
        db: AsyncSession,
        org_id: int,
        apparatus_id: str,
        apparatus_type: str,
        reason: str,
        performed_by: str,
        estimated_return: Optional[datetime] = None
    ) -> ApparatusMaintenanceRecord:
        """Mark apparatus as out of service"""
        record = ApparatusMaintenanceRecord(
            org_id=org_id,
            apparatus_id=apparatus_id,
            apparatus_type=apparatus_type,
            maintenance_date=date.today(),
            maintenance_type="emergency_repair",
            service_description=reason,
            performed_by=performed_by,
            out_of_service=True,
            out_of_service_start=datetime.utcnow(),
            out_of_service_end=estimated_return,
            classification="OPS"
        )
        
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record
    
    @staticmethod
    async def return_apparatus_to_service(
        db: AsyncSession,
        org_id: int,
        apparatus_id: str,
        notes: str,
        performed_by: str
    ) -> ApparatusMaintenanceRecord:
        """Return apparatus to service"""
        # Get most recent OOS record
        result = await db.execute(
            select(ApparatusMaintenanceRecord).where(
                and_(
                    ApparatusMaintenanceRecord.org_id == org_id,
                    ApparatusMaintenanceRecord.apparatus_id == apparatus_id,
                    ApparatusMaintenanceRecord.out_of_service == True
                )
            ).order_by(ApparatusMaintenanceRecord.maintenance_date.desc())
        )
        
        oos_record = result.scalars().first()
        if oos_record:
            oos_record.out_of_service_end = datetime.utcnow()
            oos_record.service_description = f"{oos_record.service_description}\nRETURNED TO SERVICE: {notes}"
        
        # Create return-to-service record
        record = ApparatusMaintenanceRecord(
            org_id=org_id,
            apparatus_id=apparatus_id,
            apparatus_type=oos_record.apparatus_type if oos_record else "Unknown",
            maintenance_date=date.today(),
            maintenance_type="repair",
            service_description=f"RETURNED TO SERVICE: {notes}",
            performed_by=performed_by,
            out_of_service=False,
            classification="OPS"
        )
        
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record
    
    @staticmethod
    async def create_pump_test(
        db: AsyncSession,
        org_id: int,
        data: PumpTestRecord,
        training_mode: bool = False
    ) -> ApparatusMaintenanceRecord:
        """Record annual pump test (NFPA 1911)"""
        test_passed = data.draft_test_passed and data.pressure_test_passed and data.vacuum_test_passed
        
        record = ApparatusMaintenanceRecord(
            org_id=org_id,
            apparatus_id=data.apparatus_id,
            apparatus_type="Engine",
            maintenance_date=data.test_date,
            maintenance_type="pump_test",
            pump_tested=True,
            service_description=f"Annual Pump Test - {'PASSED' if test_passed else 'FAILED'}\n" + 
                              f"Draft Test: {'PASS' if data.draft_test_passed else 'FAIL'}\n" +
                              f"Pressure Test: {'PASS' if data.pressure_test_passed else 'FAIL'}\n" +
                              f"Vacuum Test: {'PASS' if data.vacuum_test_passed else 'FAIL'}\n" +
                              f"Rated Capacity: {data.rated_capacity_gpm} GPM",
            parts_replaced=data.test_results,
            performed_by=str(data.tester_id),
            out_of_service=not test_passed,
            next_service_due=data.test_date + timedelta(days=365),
            training_mode=training_mode,
            classification="OPS"
        )
        
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record
    
    @staticmethod
    async def get_apparatus_fleet_status(
        db: AsyncSession,
        org_id: int
    ) -> Dict[str, Any]:
        """Get overall fleet status and readiness"""
        # Get all apparatus (unique IDs)
        result = await db.execute(
            select(
                ApparatusMaintenanceRecord.apparatus_id,
                ApparatusMaintenanceRecord.apparatus_type,
                func.max(ApparatusMaintenanceRecord.maintenance_date).label("last_service")
            ).where(
                ApparatusMaintenanceRecord.org_id == org_id
            ).group_by(
                ApparatusMaintenanceRecord.apparatus_id,
                ApparatusMaintenanceRecord.apparatus_type
            )
        )
        
        fleet = result.all()
        total_apparatus = len(fleet)
        
        # Get OOS count
        oos_result = await db.execute(
            select(func.count(func.distinct(ApparatusMaintenanceRecord.apparatus_id))).where(
                and_(
                    ApparatusMaintenanceRecord.org_id == org_id,
                    ApparatusMaintenanceRecord.out_of_service == True,
                    or_(
                        ApparatusMaintenanceRecord.out_of_service_end.is_(None),
                        ApparatusMaintenanceRecord.out_of_service_end > datetime.utcnow()
                    )
                )
            )
        )
        oos_count = oos_result.scalar() or 0
        
        # Type breakdown
        type_breakdown = {}
        for apparatus in fleet:
            app_type = apparatus.apparatus_type
            if app_type not in type_breakdown:
                type_breakdown[app_type] = 0
            type_breakdown[app_type] += 1
        
        in_service = total_apparatus - oos_count
        readiness_percent = (in_service / total_apparatus * 100) if total_apparatus > 0 else 0
        
        return {
            "total_apparatus": total_apparatus,
            "in_service": in_service,
            "out_of_service": oos_count,
            "readiness_percentage": round(readiness_percent, 2),
            "apparatus_by_type": type_breakdown
        }
    
    @staticmethod
    async def get_maintenance_costs(
        db: AsyncSession,
        org_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get maintenance cost analysis"""
        result = await db.execute(
            select(
                func.sum(ApparatusMaintenanceRecord.cost).label("total_cost"),
                func.avg(ApparatusMaintenanceRecord.cost).label("avg_cost"),
                func.count(ApparatusMaintenanceRecord.id).label("service_count")
            ).where(
                and_(
                    ApparatusMaintenanceRecord.org_id == org_id,
                    ApparatusMaintenanceRecord.maintenance_date.between(start_date, end_date),
                    ApparatusMaintenanceRecord.cost.isnot(None)
                )
            )
        )
        
        stats = result.one()
        
        # Cost by apparatus
        apparatus_result = await db.execute(
            select(
                ApparatusMaintenanceRecord.apparatus_id,
                ApparatusMaintenanceRecord.apparatus_type,
                func.sum(ApparatusMaintenanceRecord.cost).label("total_cost")
            ).where(
                and_(
                    ApparatusMaintenanceRecord.org_id == org_id,
                    ApparatusMaintenanceRecord.maintenance_date.between(start_date, end_date),
                    ApparatusMaintenanceRecord.cost.isnot(None)
                )
            ).group_by(
                ApparatusMaintenanceRecord.apparatus_id,
                ApparatusMaintenanceRecord.apparatus_type
            ).order_by(func.sum(ApparatusMaintenanceRecord.cost).desc())
        )
        
        apparatus_costs = []
        for row in apparatus_result.all():
            apparatus_costs.append({
                "apparatus_id": row.apparatus_id,
                "apparatus_type": row.apparatus_type,
                "total_cost": float(row.total_cost)
            })
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_cost": float(stats.total_cost) if stats.total_cost else 0,
            "avg_service_cost": float(stats.avg_cost) if stats.avg_cost else 0,
            "service_count": stats.service_count,
            "apparatus_breakdown": apparatus_costs
        }
    
    @staticmethod
    async def get_pump_test_compliance(
        db: AsyncSession,
        org_id: int
    ) -> Dict[str, Any]:
        """Check pump test compliance (NFPA 1911 annual requirement)"""
        one_year_ago = date.today() - timedelta(days=365)
        
        # Get all pumper apparatus
        result = await db.execute(
            select(
                ApparatusMaintenanceRecord.apparatus_id,
                func.max(ApparatusMaintenanceRecord.maintenance_date).label("last_pump_test")
            ).where(
                and_(
                    ApparatusMaintenanceRecord.org_id == org_id,
                    ApparatusMaintenanceRecord.apparatus_type.in_(["Engine", "Tanker/Tender"]),
                    ApparatusMaintenanceRecord.maintenance_type == "pump_test"
                )
            ).group_by(ApparatusMaintenanceRecord.apparatus_id)
        )
        
        compliance_status = []
        overdue_count = 0
        
        for row in result.all():
            is_compliant = row.last_pump_test >= one_year_ago
            if not is_compliant:
                overdue_count += 1
            
            compliance_status.append({
                "apparatus_id": row.apparatus_id,
                "last_pump_test": row.last_pump_test.isoformat() if row.last_pump_test else None,
                "compliant": is_compliant,
                "days_since_test": (date.today() - row.last_pump_test).days if row.last_pump_test else 9999
            })
        
        total = len(compliance_status)
        compliant = total - overdue_count
        
        return {
            "total_pumpers": total,
            "compliant": compliant,
            "overdue": overdue_count,
            "compliance_rate": round((compliant / total * 100), 2) if total > 0 else 0,
            "apparatus_status": compliance_status
        }
