"""
Fire RMS - Community Risk Reduction & Prevention Service
Public education, smoke detector programs, community outreach, prevention campaigns
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from models.fire_rms import CommunityRiskReduction
from pydantic import BaseModel


class PreventionProgramCreate(BaseModel):
    program_name: str
    program_type: str
    event_date: date
    location: Optional[str] = None
    target_audience: Optional[str] = None
    participants_count: Optional[int] = None
    topics: Optional[List[str]] = None
    materials_distributed: Optional[List[Dict[str, Any]]] = None
    smoke_alarms_installed: int = 0
    personnel_assigned: Optional[List[Dict[str, Any]]] = None
    program_notes: Optional[str] = None
    follow_up_required: bool = False


class SmokeDetectorInstall(BaseModel):
    address: str
    resident_name: str
    resident_phone: Optional[str] = None
    alarms_installed: int
    alarm_types: List[str]
    installation_date: date
    installer_id: int
    batteries_provided: int
    education_provided: bool = True


class PreventionService:
    """Community risk reduction, public education, and fire prevention programs"""
    
    # Program types
    PROGRAM_TYPES = [
        "school_visit",
        "station_tour",
        "smoke_alarm_installation",
        "fire_safety_presentation",
        "senior_safety",
        "child_safety",
        "cooking_safety",
        "holiday_safety",
        "wildfire_prevention",
        "community_event",
        "business_outreach"
    ]
    
    # Target audiences
    TARGET_AUDIENCES = [
        "elementary_students",
        "middle_school",
        "high_school",
        "seniors",
        "businesses",
        "community_groups",
        "general_public",
        "at_risk_populations"
    ]
    
    # Educational topics
    EDUCATION_TOPICS = [
        "fire_escape_planning",
        "smoke_alarm_maintenance",
        "kitchen_fire_safety",
        "electrical_safety",
        "heating_safety",
        "wildfire_preparedness",
        "stop_drop_roll",
        "call_911",
        "carbon_monoxide"
    ]
    
    @staticmethod
    async def create_prevention_program(
        db: AsyncSession,
        org_id: int,
        data: PreventionProgramCreate,
        training_mode: bool = False
    ) -> CommunityRiskReduction:
        """Create community risk reduction program record"""
        program = CommunityRiskReduction(
            org_id=org_id,
            program_name=data.program_name,
            program_type=data.program_type,
            event_date=data.event_date,
            location=data.location,
            target_audience=data.target_audience,
            participants_count=data.participants_count,
            topics=data.topics,
            materials_distributed=data.materials_distributed,
            smoke_alarms_installed=data.smoke_alarms_installed,
            personnel_assigned=data.personnel_assigned,
            program_notes=data.program_notes,
            follow_up_required=data.follow_up_required,
            training_mode=training_mode,
            classification="OPS"
        )
        
        db.add(program)
        await db.commit()
        await db.refresh(program)
        return program
    
    @staticmethod
    async def get_program(
        db: AsyncSession,
        org_id: int,
        program_id: int
    ) -> Optional[CommunityRiskReduction]:
        """Get program by ID"""
        result = await db.execute(
            select(CommunityRiskReduction).where(
                and_(
                    CommunityRiskReduction.id == program_id,
                    CommunityRiskReduction.org_id == org_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_smoke_detector_program(
        db: AsyncSession,
        org_id: int,
        install: SmokeDetectorInstall,
        training_mode: bool = False
    ) -> CommunityRiskReduction:
        """Record smoke detector installation"""
        materials = [
            {
                "type": "smoke_alarms",
                "quantity": install.alarms_installed,
                "alarm_types": install.alarm_types
            },
            {
                "type": "batteries",
                "quantity": install.batteries_provided
            }
        ]
        
        topics = ["smoke_alarm_maintenance", "fire_escape_planning"]
        if install.education_provided:
            topics.extend(["stop_drop_roll", "call_911"])
        
        program = CommunityRiskReduction(
            org_id=org_id,
            program_name=f"Smoke Alarm Installation - {install.address}",
            program_type="smoke_alarm_installation",
            event_date=install.installation_date,
            location=install.address,
            target_audience="at_risk_populations",
            participants_count=1,
            topics=topics,
            materials_distributed=materials,
            smoke_alarms_installed=install.alarms_installed,
            personnel_assigned=[{"personnel_id": install.installer_id}],
            program_notes=f"Resident: {install.resident_name}\nPhone: {install.resident_phone or 'N/A'}",
            follow_up_required=True,
            training_mode=training_mode,
            classification="OPS"
        )
        
        db.add(program)
        await db.commit()
        await db.refresh(program)
        return program
    
    @staticmethod
    async def get_programs_by_type(
        db: AsyncSession,
        org_id: int,
        program_type: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[CommunityRiskReduction]:
        """Get programs filtered by type and date range"""
        conditions = [
            CommunityRiskReduction.org_id == org_id,
            CommunityRiskReduction.program_type == program_type
        ]
        
        if start_date:
            conditions.append(CommunityRiskReduction.event_date >= start_date)
        if end_date:
            conditions.append(CommunityRiskReduction.event_date <= end_date)
        
        result = await db.execute(
            select(CommunityRiskReduction).where(and_(*conditions)).order_by(CommunityRiskReduction.event_date.desc())
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_upcoming_programs(
        db: AsyncSession,
        org_id: int,
        days_ahead: int = 30,
        training_mode: bool = False
    ) -> List[CommunityRiskReduction]:
        """Get scheduled upcoming programs"""
        today = date.today()
        future_date = today + timedelta(days=days_ahead)
        
        result = await db.execute(
            select(CommunityRiskReduction).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.training_mode == training_mode,
                    CommunityRiskReduction.event_date.between(today, future_date)
                )
            ).order_by(CommunityRiskReduction.event_date.asc())
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_smoke_alarm_program_statistics(
        db: AsyncSession,
        org_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get smoke alarm installation program metrics"""
        result = await db.execute(
            select(
                func.count(CommunityRiskReduction.id).label("total_installations"),
                func.sum(CommunityRiskReduction.smoke_alarms_installed).label("total_alarms"),
                func.avg(CommunityRiskReduction.smoke_alarms_installed).label("avg_per_home")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.program_type == "smoke_alarm_installation",
                    CommunityRiskReduction.event_date.between(start_date, end_date)
                )
            )
        )
        
        stats = result.one()
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_installations": stats.total_installations,
            "total_alarms_installed": stats.total_alarms or 0,
            "avg_alarms_per_home": round(stats.avg_per_home, 2) if stats.avg_per_home else 0,
            "homes_protected": stats.total_installations
        }
    
    @staticmethod
    async def get_public_education_reach(
        db: AsyncSession,
        org_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Calculate total public education reach"""
        result = await db.execute(
            select(
                func.count(CommunityRiskReduction.id).label("total_programs"),
                func.sum(CommunityRiskReduction.participants_count).label("total_participants")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.event_date.between(start_date, end_date)
                )
            )
        )
        
        stats = result.one()
        
        # Breakdown by program type
        type_result = await db.execute(
            select(
                CommunityRiskReduction.program_type,
                func.count(CommunityRiskReduction.id).label("count"),
                func.sum(CommunityRiskReduction.participants_count).label("participants")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.event_date.between(start_date, end_date)
                )
            ).group_by(CommunityRiskReduction.program_type)
        )
        
        breakdown = []
        for row in type_result.all():
            breakdown.append({
                "program_type": row.program_type,
                "program_count": row.count,
                "participants_reached": row.participants or 0
            })
        
        # Target audience breakdown
        audience_result = await db.execute(
            select(
                CommunityRiskReduction.target_audience,
                func.count(CommunityRiskReduction.id).label("count"),
                func.sum(CommunityRiskReduction.participants_count).label("participants")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.event_date.between(start_date, end_date),
                    CommunityRiskReduction.target_audience.isnot(None)
                )
            ).group_by(CommunityRiskReduction.target_audience)
        )
        
        audience_breakdown = []
        for row in audience_result.all():
            audience_breakdown.append({
                "target_audience": row.target_audience,
                "programs": row.count,
                "participants": row.participants or 0
            })
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_programs": stats.total_programs,
                "total_participants": stats.total_participants or 0
            },
            "program_type_breakdown": breakdown,
            "target_audience_breakdown": audience_breakdown
        }
    
    @staticmethod
    async def get_school_outreach_statistics(
        db: AsyncSession,
        org_id: int,
        school_year_start: date,
        school_year_end: date
    ) -> Dict[str, Any]:
        """Track school-based fire safety education"""
        # School-related program types
        school_programs = ["school_visit", "station_tour"]
        school_audiences = ["elementary_students", "middle_school", "high_school"]
        
        result = await db.execute(
            select(
                func.count(CommunityRiskReduction.id).label("total_programs"),
                func.sum(CommunityRiskReduction.participants_count).label("students_reached")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.event_date.between(school_year_start, school_year_end),
                    or_(
                        CommunityRiskReduction.program_type.in_(school_programs),
                        CommunityRiskReduction.target_audience.in_(school_audiences)
                    )
                )
            )
        )
        
        stats = result.one()
        
        # By grade level
        grade_result = await db.execute(
            select(
                CommunityRiskReduction.target_audience,
                func.count(CommunityRiskReduction.id).label("programs"),
                func.sum(CommunityRiskReduction.participants_count).label("students")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.event_date.between(school_year_start, school_year_end),
                    CommunityRiskReduction.target_audience.in_(school_audiences)
                )
            ).group_by(CommunityRiskReduction.target_audience)
        )
        
        grade_breakdown = []
        for row in grade_result.all():
            grade_breakdown.append({
                "grade_level": row.target_audience,
                "programs": row.programs,
                "students_reached": row.students or 0
            })
        
        return {
            "school_year": {
                "start": school_year_start.isoformat(),
                "end": school_year_end.isoformat()
            },
            "total_programs": stats.total_programs,
            "students_reached": stats.students_reached or 0,
            "grade_level_breakdown": grade_breakdown
        }
    
    @staticmethod
    async def get_seasonal_campaigns(
        db: AsyncSession,
        org_id: int,
        year: int
    ) -> Dict[str, Any]:
        """Track seasonal fire prevention campaigns"""
        campaigns = {
            "Fire Prevention Week (October)": {
                "start": date(year, 10, 1),
                "end": date(year, 10, 31),
                "programs": 0,
                "reach": 0
            },
            "Holiday Safety (November-December)": {
                "start": date(year, 11, 1),
                "end": date(year, 12, 31),
                "programs": 0,
                "reach": 0
            },
            "Heating Season (January-March)": {
                "start": date(year, 1, 1),
                "end": date(year, 3, 31),
                "programs": 0,
                "reach": 0
            },
            "Wildfire Season (May-September)": {
                "start": date(year, 5, 1),
                "end": date(year, 9, 30),
                "programs": 0,
                "reach": 0
            }
        }
        
        for campaign_name, period in campaigns.items():
            result = await db.execute(
                select(
                    func.count(CommunityRiskReduction.id).label("programs"),
                    func.sum(CommunityRiskReduction.participants_count).label("reach")
                ).where(
                    and_(
                        CommunityRiskReduction.org_id == org_id,
                        CommunityRiskReduction.event_date.between(period["start"], period["end"])
                    )
                )
            )
            
            stats = result.one()
            campaigns[campaign_name]["programs"] = stats.programs
            campaigns[campaign_name]["reach"] = stats.reach or 0
        
        return {
            "year": year,
            "campaigns": campaigns
        }
    
    @staticmethod
    async def generate_annual_report(
        db: AsyncSession,
        org_id: int,
        year: int
    ) -> Dict[str, Any]:
        """Generate comprehensive annual prevention report"""
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        # Overall statistics
        result = await db.execute(
            select(
                func.count(CommunityRiskReduction.id).label("total_programs"),
                func.sum(CommunityRiskReduction.participants_count).label("total_reach"),
                func.sum(CommunityRiskReduction.smoke_alarms_installed).label("total_alarms")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.event_date.between(start_date, end_date)
                )
            )
        )
        
        stats = result.one()
        
        # Program type breakdown
        type_result = await db.execute(
            select(
                CommunityRiskReduction.program_type,
                func.count(CommunityRiskReduction.id).label("count")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.event_date.between(start_date, end_date)
                )
            ).group_by(CommunityRiskReduction.program_type)
        )
        
        program_breakdown = {row.program_type: row.count for row in type_result.all()}
        
        # Monthly distribution
        monthly_result = await db.execute(
            select(
                func.extract('month', CommunityRiskReduction.event_date).label("month"),
                func.count(CommunityRiskReduction.id).label("programs")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.event_date.between(start_date, end_date)
                )
            ).group_by(func.extract('month', CommunityRiskReduction.event_date))
        )
        
        monthly_activity = {int(row.month): row.programs for row in monthly_result.all()}
        
        return {
            "year": year,
            "summary": {
                "total_programs": stats.total_programs,
                "people_reached": stats.total_reach or 0,
                "smoke_alarms_installed": stats.total_alarms or 0
            },
            "program_breakdown": program_breakdown,
            "monthly_activity": monthly_activity
        }
    
    @staticmethod
    async def get_high_risk_neighborhoods(
        db: AsyncSession,
        org_id: int,
        min_installations: int = 5
    ) -> List[Dict[str, Any]]:
        """Identify neighborhoods with most smoke alarm installations (high-risk areas)"""
        result = await db.execute(
            select(
                CommunityRiskReduction.location,
                func.count(CommunityRiskReduction.id).label("installation_count"),
                func.sum(CommunityRiskReduction.smoke_alarms_installed).label("total_alarms")
            ).where(
                and_(
                    CommunityRiskReduction.org_id == org_id,
                    CommunityRiskReduction.program_type == "smoke_alarm_installation",
                    CommunityRiskReduction.location.isnot(None)
                )
            ).group_by(CommunityRiskReduction.location).having(
                func.count(CommunityRiskReduction.id) >= min_installations
            ).order_by(func.count(CommunityRiskReduction.id).desc())
        )
        
        neighborhoods = []
        for row in result.all():
            neighborhoods.append({
                "location": row.location,
                "installation_count": row.installation_count,
                "total_alarms_installed": row.total_alarms or 0,
                "risk_level": "high" if row.installation_count >= 10 else "moderate"
            })
        
        return neighborhoods
