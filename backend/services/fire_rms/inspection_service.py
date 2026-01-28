"""
Fire RMS - Fire Inspection Management Service
Fire code inspections, violation tracking, re-inspection scheduling, compliance reporting
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from models.fire_rms import FireInspection
from pydantic import BaseModel


class FireInspectionCreate(BaseModel):
    property_name: str
    property_address: str
    property_type: str
    occupancy_type: Optional[str] = None
    occupant_load: Optional[int] = None
    inspection_date: date
    inspector_id: int
    inspection_type: str
    sprinkler_system: bool = False
    fire_alarm: bool = False
    fire_extinguishers: bool = False
    emergency_lighting: bool = False
    exit_signs: bool = False
    violations_description: Optional[str] = None
    corrective_actions_required: Optional[str] = None
    notes: Optional[str] = None


class ViolationRecord(BaseModel):
    violation_code: str
    description: str
    severity: str  # "critical", "major", "minor"
    corrective_action: str
    deadline_days: int


class InspectionService:
    """Comprehensive fire inspection and violation management"""
    
    # Standard inspection types
    INSPECTION_TYPES = [
        "annual",
        "complaint",
        "pre_occupancy",
        "construction",
        "re_inspection",
        "follow_up",
        "special_event"
    ]
    
    # Property types
    PROPERTY_TYPES = [
        "assembly",
        "business",
        "educational",
        "factory",
        "healthcare",
        "hotel",
        "residential",
        "storage",
        "mixed_use"
    ]
    
    @staticmethod
    async def create_inspection(
        db: AsyncSession,
        org_id: int,
        data: FireInspectionCreate,
        training_mode: bool = False
    ) -> FireInspection:
        """Create new fire inspection record"""
        # Generate inspection number
        inspection_number = await InspectionService._generate_inspection_number(db, org_id)
        
        inspection = FireInspection(
            org_id=org_id,
            inspection_number=inspection_number,
            property_name=data.property_name,
            property_address=data.property_address,
            property_type=data.property_type,
            occupancy_type=data.occupancy_type,
            occupant_load=data.occupant_load,
            inspection_date=data.inspection_date,
            inspector_id=data.inspector_id,
            inspection_type=data.inspection_type,
            sprinkler_system=data.sprinkler_system,
            fire_alarm=data.fire_alarm,
            fire_extinguishers=data.fire_extinguishers,
            emergency_lighting=data.emergency_lighting,
            exit_signs=data.exit_signs,
            violations_description=data.violations_description,
            corrective_actions_required=data.corrective_actions_required,
            notes=data.notes,
            violations_found=0,
            critical_violations=0,
            status="passed",
            training_mode=training_mode,
            classification="OPS"
        )
        
        db.add(inspection)
        await db.commit()
        await db.refresh(inspection)
        return inspection
    
    @staticmethod
    async def _generate_inspection_number(db: AsyncSession, org_id: int) -> str:
        """Generate unique inspection number"""
        year = date.today().year
        
        # Count inspections this year
        result = await db.execute(
            select(func.count(FireInspection.id)).where(
                and_(
                    FireInspection.org_id == org_id,
                    func.extract('year', FireInspection.inspection_date) == year
                )
            )
        )
        count = result.scalar() or 0
        
        return f"INS-{year}-{count + 1:05d}"
    
    @staticmethod
    async def get_inspection(
        db: AsyncSession,
        org_id: int,
        inspection_id: int
    ) -> Optional[FireInspection]:
        """Get inspection by ID"""
        result = await db.execute(
            select(FireInspection).where(
                and_(
                    FireInspection.id == inspection_id,
                    FireInspection.org_id == org_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def add_violations(
        db: AsyncSession,
        org_id: int,
        inspection_id: int,
        violations: List[ViolationRecord]
    ) -> FireInspection:
        """Add violations to inspection and update status"""
        inspection = await InspectionService.get_inspection(db, org_id, inspection_id)
        if not inspection:
            raise ValueError(f"Inspection {inspection_id} not found")
        
        # Count violations by severity
        critical_count = sum(1 for v in violations if v.severity == "critical")
        total_count = len(violations)
        
        inspection.violations_found = total_count
        inspection.critical_violations = critical_count
        
        # Build violations description
        violation_text = []
        corrective_text = []
        
        for v in violations:
            violation_text.append(f"[{v.severity.upper()}] {v.violation_code}: {v.description}")
            corrective_text.append(f"{v.violation_code}: {v.corrective_action} (Due in {v.deadline_days} days)")
        
        inspection.violations_description = "\n".join(violation_text)
        inspection.corrective_actions_required = "\n".join(corrective_text)
        
        # Determine status
        if critical_count > 0:
            inspection.status = "failed_critical"
            inspection.re_inspection_required = True
            # Schedule re-inspection based on most urgent deadline
            min_deadline = min([v.deadline_days for v in violations])
            inspection.re_inspection_date = date.today() + timedelta(days=min_deadline)
        elif total_count > 0:
            inspection.status = "failed"
            inspection.re_inspection_required = True
            # Standard 30-day re-inspection
            inspection.re_inspection_date = date.today() + timedelta(days=30)
        else:
            inspection.status = "passed"
            inspection.re_inspection_required = False
        
        await db.commit()
        await db.refresh(inspection)
        return inspection
    
    @staticmethod
    async def schedule_re_inspection(
        db: AsyncSession,
        org_id: int,
        inspection_id: int,
        re_inspection_date: date,
        notes: Optional[str] = None
    ) -> FireInspection:
        """Schedule re-inspection for failed inspection"""
        inspection = await InspectionService.get_inspection(db, org_id, inspection_id)
        if not inspection:
            raise ValueError(f"Inspection {inspection_id} not found")
        
        inspection.re_inspection_required = True
        inspection.re_inspection_date = re_inspection_date
        if notes:
            inspection.notes = f"{inspection.notes or ''}\nRe-inspection scheduled: {notes}"
        
        await db.commit()
        await db.refresh(inspection)
        return inspection
    
    @staticmethod
    async def get_overdue_inspections(
        db: AsyncSession,
        org_id: int,
        training_mode: bool = False
    ) -> List[FireInspection]:
        """Get properties with overdue annual inspections"""
        # Properties due for inspection (last inspection > 365 days ago)
        one_year_ago = date.today() - timedelta(days=365)
        
        result = await db.execute(
            select(FireInspection).where(
                and_(
                    FireInspection.org_id == org_id,
                    FireInspection.training_mode == training_mode,
                    FireInspection.inspection_date < one_year_ago
                )
            ).order_by(FireInspection.inspection_date.asc())
        )
        
        return list(result.scalars().all())
    
    @staticmethod
    async def get_pending_re_inspections(
        db: AsyncSession,
        org_id: int,
        training_mode: bool = False
    ) -> List[FireInspection]:
        """Get inspections requiring re-inspection"""
        result = await db.execute(
            select(FireInspection).where(
                and_(
                    FireInspection.org_id == org_id,
                    FireInspection.training_mode == training_mode,
                    FireInspection.re_inspection_required == True,
                    FireInspection.status.in_(["failed", "failed_critical"])
                )
            ).order_by(FireInspection.re_inspection_date.asc().nullsfirst())
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_inspections_by_property(
        db: AsyncSession,
        org_id: int,
        property_address: str
    ) -> List[FireInspection]:
        """Get inspection history for specific property"""
        result = await db.execute(
            select(FireInspection).where(
                and_(
                    FireInspection.org_id == org_id,
                    FireInspection.property_address == property_address
                )
            ).order_by(FireInspection.inspection_date.desc())
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_inspector_workload(
        db: AsyncSession,
        org_id: int,
        inspector_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get inspector workload and productivity metrics"""
        result = await db.execute(
            select(FireInspection).where(
                and_(
                    FireInspection.org_id == org_id,
                    FireInspection.inspector_id == inspector_id,
                    FireInspection.inspection_date.between(start_date, end_date)
                )
            )
        )
        
        inspections = result.scalars().all()
        total = len(inspections)
        
        passed = sum(1 for i in inspections if i.status == "passed")
        failed = sum(1 for i in inspections if i.status in ["failed", "failed_critical"])
        total_violations = sum(i.violations_found for i in inspections)
        critical_violations = sum(i.critical_violations for i in inspections)
        
        return {
            "inspector_id": inspector_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_inspections": total,
            "passed_count": passed,
            "failed_count": failed,
            "pass_rate": round((passed / total * 100), 2) if total > 0 else 0,
            "total_violations_found": total_violations,
            "critical_violations_found": critical_violations,
            "avg_violations_per_inspection": round((total_violations / total), 2) if total > 0 else 0
        }
    
    @staticmethod
    async def generate_compliance_report(
        db: AsyncSession,
        org_id: int,
        start_date: date,
        end_date: date,
        training_mode: bool = False
    ) -> Dict[str, Any]:
        """Generate comprehensive compliance report"""
        result = await db.execute(
            select(FireInspection).where(
                and_(
                    FireInspection.org_id == org_id,
                    FireInspection.training_mode == training_mode,
                    FireInspection.inspection_date.between(start_date, end_date)
                )
            )
        )
        
        inspections = result.scalars().all()
        
        # Overall metrics
        total = len(inspections)
        passed = sum(1 for i in inspections if i.status == "passed")
        failed = sum(1 for i in inspections if i.status == "failed")
        failed_critical = sum(1 for i in inspections if i.status == "failed_critical")
        
        # Violation analysis
        total_violations = sum(i.violations_found for i in inspections)
        total_critical = sum(i.critical_violations for i in inspections)
        
        # Property type breakdown
        property_types = {}
        for inspection in inspections:
            prop_type = inspection.property_type
            if prop_type not in property_types:
                property_types[prop_type] = {
                    "count": 0,
                    "passed": 0,
                    "failed": 0,
                    "violations": 0
                }
            property_types[prop_type]["count"] += 1
            if inspection.status == "passed":
                property_types[prop_type]["passed"] += 1
            else:
                property_types[prop_type]["failed"] += 1
            property_types[prop_type]["violations"] += inspection.violations_found
        
        # Fire protection system analysis
        with_sprinklers = sum(1 for i in inspections if i.sprinkler_system)
        with_alarms = sum(1 for i in inspections if i.fire_alarm)
        
        return {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_inspections": total,
                "passed": passed,
                "failed": failed,
                "failed_critical": failed_critical,
                "pass_rate": round((passed / total * 100), 2) if total > 0 else 0
            },
            "violations": {
                "total_violations": total_violations,
                "critical_violations": total_critical,
                "avg_per_inspection": round((total_violations / total), 2) if total > 0 else 0
            },
            "property_type_breakdown": property_types,
            "fire_protection_systems": {
                "properties_with_sprinklers": with_sprinklers,
                "properties_with_fire_alarms": with_alarms,
                "sprinkler_percentage": round((with_sprinklers / total * 100), 2) if total > 0 else 0
            }
        }
    
    @staticmethod
    async def get_high_risk_properties(
        db: AsyncSession,
        org_id: int,
        min_violations: int = 5
    ) -> List[Dict[str, Any]]:
        """Identify high-risk properties based on inspection history"""
        result = await db.execute(
            select(
                FireInspection.property_address,
                FireInspection.property_name,
                FireInspection.property_type,
                func.count(FireInspection.id).label("inspection_count"),
                func.sum(FireInspection.violations_found).label("total_violations"),
                func.sum(FireInspection.critical_violations).label("total_critical"),
                func.max(FireInspection.inspection_date).label("last_inspection")
            ).where(
                FireInspection.org_id == org_id
            ).group_by(
                FireInspection.property_address,
                FireInspection.property_name,
                FireInspection.property_type
            ).having(
                func.sum(FireInspection.violations_found) >= min_violations
            ).order_by(
                func.sum(FireInspection.critical_violations).desc()
            )
        )
        
        high_risk = []
        for row in result.all():
            high_risk.append({
                "property_name": row.property_name,
                "property_address": row.property_address,
                "property_type": row.property_type,
                "inspection_count": row.inspection_count,
                "total_violations": row.total_violations,
                "total_critical_violations": row.total_critical,
                "last_inspection_date": row.last_inspection.isoformat() if row.last_inspection else None,
                "risk_score": row.total_critical * 10 + row.total_violations
            })
        
        return high_risk
