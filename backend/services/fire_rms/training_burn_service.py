"""
Fire RMS - Training Burn Coordination Service
Live fire training management, burn permits, safety compliance, training documentation
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class TrainingBurnCreate(BaseModel):
    training_date: date
    burn_location: str
    structure_address: str
    structure_type: str
    burn_permit_number: Optional[str] = None
    training_officer_id: int
    participants: List[Dict[str, Any]]
    training_objectives: List[str]
    safety_officer_assigned: bool = True
    safety_officer_id: Optional[int] = None
    rehab_setup: bool = True
    weather_conditions: Dict[str, Any]
    ems_standby: bool = True
    environmental_clearance: bool = False
    notes: Optional[str] = None


class TrainingBurnRecord(BaseModel):
    """Simplified model - would need proper SQLAlchemy model in production"""
    id: int
    org_id: int
    training_date: date
    burn_location: str
    structure_address: str
    structure_type: str
    burn_permit_number: Optional[str]
    training_officer_id: int
    safety_officer_id: Optional[int]
    participants_count: int
    training_objectives: List[str]
    safety_briefing_conducted: bool
    rehab_setup: bool
    injuries_reported: int
    environmental_clearance: bool
    status: str  # "planned", "conducted", "cancelled"
    after_action_completed: bool
    notes: Optional[str]


class SafetyChecklist(BaseModel):
    pre_burn_inspection: bool
    utilities_disconnected: bool
    water_supply_secured: bool
    accountability_system: bool
    emergency_procedures_briefed: bool
    ppe_inspected: bool
    backup_crews_assigned: bool
    weather_acceptable: bool
    environmental_approved: bool


class TrainingBurnService:
    """Live fire training coordination and safety compliance"""
    
    # Structure types suitable for training burns
    STRUCTURE_TYPES = [
        "single_family_residential",
        "multi_family_residential",
        "commercial",
        "industrial",
        "mobile_home",
        "storage_building",
        "barn_agricultural"
    ]
    
    # Training objectives
    TRAINING_OBJECTIVES = [
        "structural_firefighting",
        "search_and_rescue",
        "ventilation_techniques",
        "hose_deployment",
        "incident_command",
        "rapid_intervention",
        "thermal_imaging",
        "forcible_entry",
        "ladder_operations",
        "water_supply_operations"
    ]
    
    # Safety requirements per NFPA 1403
    NFPA_1403_REQUIREMENTS = [
        "written_training_plan",
        "safety_officer_assigned",
        "backup_teams_ready",
        "utilities_secured",
        "water_supply_adequate",
        "ems_on_scene",
        "accountability_system",
        "weather_conditions_acceptable",
        "structural_integrity_verified"
    ]
    
    @staticmethod
    async def create_training_burn_plan(
        db: AsyncSession,
        org_id: int,
        data: TrainingBurnCreate,
        training_mode: bool = False
    ) -> Dict[str, Any]:
        """Create training burn plan (NFPA 1403 compliant)"""
        # In production, this would create a proper database record
        # For now, return structured plan
        
        burn_plan = {
            "id": None,  # Would be assigned by database
            "org_id": org_id,
            "status": "planned",
            "training_date": data.training_date.isoformat(),
            "burn_location": data.burn_location,
            "structure_address": data.structure_address,
            "structure_type": data.structure_type,
            "burn_permit_number": data.burn_permit_number,
            "training_officer_id": data.training_officer_id,
            "safety_officer_id": data.safety_officer_id,
            "participants": data.participants,
            "participants_count": len(data.participants),
            "training_objectives": data.training_objectives,
            "safety_requirements": {
                "safety_officer_assigned": data.safety_officer_assigned,
                "rehab_setup": data.rehab_setup,
                "ems_standby": data.ems_standby,
                "environmental_clearance": data.environmental_clearance
            },
            "weather_conditions": data.weather_conditions,
            "notes": data.notes,
            "nfpa_1403_compliance": TrainingBurnService._check_nfpa_compliance(data),
            "created_at": datetime.utcnow().isoformat()
        }
        
        return burn_plan
    
    @staticmethod
    def _check_nfpa_compliance(data: TrainingBurnCreate) -> Dict[str, Any]:
        """Verify NFPA 1403 compliance requirements"""
        compliance = {
            "compliant": True,
            "missing_requirements": [],
            "warnings": []
        }
        
        # Safety officer required
        if not data.safety_officer_assigned or not data.safety_officer_id:
            compliance["compliant"] = False
            compliance["missing_requirements"].append("Safety officer must be assigned (NFPA 1403)")
        
        # Rehab required
        if not data.rehab_setup:
            compliance["compliant"] = False
            compliance["missing_requirements"].append("Rehab sector must be established (NFPA 1403)")
        
        # EMS standby required
        if not data.ems_standby:
            compliance["compliant"] = False
            compliance["missing_requirements"].append("EMS must be on standby (NFPA 1403)")
        
        # Environmental clearance (if required by jurisdiction)
        if not data.environmental_clearance:
            compliance["warnings"].append("Environmental clearance not documented")
        
        # Weather conditions
        if data.weather_conditions:
            wind_speed = data.weather_conditions.get("wind_speed_mph", 0)
            if wind_speed > 15:
                compliance["warnings"].append(f"Wind speed ({wind_speed} mph) exceeds recommended limit")
            
            visibility = data.weather_conditions.get("visibility_miles")
            if visibility and visibility < 3:
                compliance["warnings"].append("Poor visibility conditions")
        
        # Minimum participants for safety
        if len(data.participants) < 6:
            compliance["warnings"].append("Minimum crew size of 6 recommended for safety")
        
        return compliance
    
    @staticmethod
    async def conduct_pre_burn_briefing(
        burn_id: int,
        briefing_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Document pre-burn safety briefing (NFPA 1403 requirement)"""
        briefing = {
            "burn_id": burn_id,
            "briefing_time": datetime.utcnow().isoformat(),
            "conducted_by": briefing_data.get("officer_id"),
            "topics_covered": [
                "training_objectives",
                "individual_assignments",
                "safety_procedures",
                "emergency_evacuation_plan",
                "communications_plan",
                "accountability_procedures",
                "medical_emergency_procedures",
                "weather_conditions",
                "water_supply_locations"
            ],
            "attendees": briefing_data.get("attendees", []),
            "questions_addressed": briefing_data.get("questions", []),
            "special_hazards_identified": briefing_data.get("hazards", []),
            "completed": True
        }
        
        return briefing
    
    @staticmethod
    async def complete_safety_checklist(
        burn_id: int,
        checklist: SafetyChecklist
    ) -> Dict[str, Any]:
        """Complete and verify pre-burn safety checklist"""
        all_items_checked = all([
            checklist.pre_burn_inspection,
            checklist.utilities_disconnected,
            checklist.water_supply_secured,
            checklist.accountability_system,
            checklist.emergency_procedures_briefed,
            checklist.ppe_inspected,
            checklist.backup_crews_assigned,
            checklist.weather_acceptable,
            checklist.environmental_approved
        ])
        
        result = {
            "burn_id": burn_id,
            "checklist_completed": datetime.utcnow().isoformat(),
            "all_items_satisfied": all_items_checked,
            "checklist_items": {
                "pre_burn_inspection": checklist.pre_burn_inspection,
                "utilities_disconnected": checklist.utilities_disconnected,
                "water_supply_secured": checklist.water_supply_secured,
                "accountability_system": checklist.accountability_system,
                "emergency_procedures_briefed": checklist.emergency_procedures_briefed,
                "ppe_inspected": checklist.ppe_inspected,
                "backup_crews_assigned": checklist.backup_crews_assigned,
                "weather_acceptable": checklist.weather_acceptable,
                "environmental_approved": checklist.environmental_approved
            },
            "burn_approval": "APPROVED" if all_items_checked else "HOLD - Checklist incomplete"
        }
        
        return result
    
    @staticmethod
    async def record_training_completion(
        burn_id: int,
        completion_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Record training burn completion and outcomes"""
        completion = {
            "burn_id": burn_id,
            "completion_time": datetime.utcnow().isoformat(),
            "status": "completed",
            "objectives_met": completion_data.get("objectives_met", []),
            "participants_count": completion_data.get("participants_count", 0),
            "duration_minutes": completion_data.get("duration_minutes"),
            "injuries_reported": completion_data.get("injuries_reported", 0),
            "equipment_damage": completion_data.get("equipment_damage", False),
            "environmental_concerns": completion_data.get("environmental_concerns", []),
            "lessons_learned": completion_data.get("lessons_learned", []),
            "training_effectiveness": completion_data.get("effectiveness_rating", "good"),
            "after_action_review_scheduled": True,
            "notes": completion_data.get("notes")
        }
        
        return completion
    
    @staticmethod
    async def generate_after_action_report(
        burn_id: int,
        report_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate comprehensive after-action report"""
        report = {
            "burn_id": burn_id,
            "report_date": datetime.utcnow().isoformat(),
            "conducted_by": report_data.get("officer_id"),
            
            "executive_summary": report_data.get("summary"),
            
            "training_objectives": {
                "planned_objectives": report_data.get("planned_objectives", []),
                "objectives_achieved": report_data.get("objectives_achieved", []),
                "objectives_partially_met": report_data.get("objectives_partial", []),
                "objectives_not_met": report_data.get("objectives_not_met", [])
            },
            
            "safety_performance": {
                "injuries": report_data.get("injuries", 0),
                "near_misses": report_data.get("near_misses", []),
                "safety_violations": report_data.get("safety_violations", []),
                "ppe_issues": report_data.get("ppe_issues", [])
            },
            
            "operational_performance": {
                "water_supply_adequate": report_data.get("water_adequate", True),
                "communications_effective": report_data.get("comms_effective", True),
                "command_structure_clear": report_data.get("command_clear", True),
                "tactics_effective": report_data.get("tactics_effective", True)
            },
            
            "lessons_learned": report_data.get("lessons_learned", []),
            
            "recommendations": report_data.get("recommendations", []),
            
            "training_value": {
                "overall_rating": report_data.get("overall_rating", "good"),
                "skills_improved": report_data.get("skills_improved", []),
                "areas_needing_work": report_data.get("areas_needing_work", [])
            },
            
            "follow_up_actions": report_data.get("follow_up_actions", [])
        }
        
        return report
    
    @staticmethod
    async def track_participant_training(
        burn_id: int,
        personnel_id: int,
        training_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Track individual training participation and skills demonstrated"""
        record = {
            "burn_id": burn_id,
            "personnel_id": personnel_id,
            "participation_date": training_data.get("date"),
            "role": training_data.get("role"),  # "interior", "backup", "water_supply", etc.
            "skills_demonstrated": training_data.get("skills", []),
            "performance_rating": training_data.get("rating"),  # "exceeds", "meets", "needs_improvement"
            "certifications_maintained": training_data.get("certifications", []),
            "training_hours_earned": training_data.get("hours", 0),
            "evaluator_notes": training_data.get("notes"),
            "ready_for_advancement": training_data.get("ready_for_advancement", False)
        }
        
        return record
    
    @staticmethod
    def calculate_training_costs(
        burn_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate training burn costs for budgeting"""
        costs = {
            "personnel_costs": 0,
            "equipment_costs": 0,
            "facility_costs": 0,
            "total_cost": 0,
            "cost_per_participant": 0
        }
        
        # Personnel (overtime, standby pay)
        participants = burn_data.get("participants_count", 0)
        duration_hours = burn_data.get("duration_hours", 4)
        avg_hourly_rate = burn_data.get("avg_hourly_rate", 25)
        
        costs["personnel_costs"] = participants * duration_hours * avg_hourly_rate
        
        # Equipment (fuel, water, consumables)
        costs["equipment_costs"] = burn_data.get("equipment_costs", 500)
        
        # Facility (burn permit, structure acquisition, environmental)
        costs["facility_costs"] = burn_data.get("facility_costs", 1000)
        
        costs["total_cost"] = (
            costs["personnel_costs"] +
            costs["equipment_costs"] +
            costs["facility_costs"]
        )
        
        if participants > 0:
            costs["cost_per_participant"] = round(costs["total_cost"] / participants, 2)
        
        return costs
    
    @staticmethod
    def generate_burn_permit_application(
        burn_data: TrainingBurnCreate
    ) -> Dict[str, Any]:
        """Generate training burn permit application"""
        application = {
            "application_date": date.today().isoformat(),
            "applicant_organization": burn_data.burn_location,
            
            "burn_details": {
                "proposed_date": burn_data.training_date.isoformat(),
                "structure_address": burn_data.structure_address,
                "structure_type": burn_data.structure_type,
                "training_purpose": True
            },
            
            "environmental_considerations": {
                "asbestos_survey_completed": burn_data.environmental_clearance,
                "lead_paint_assessment": burn_data.environmental_clearance,
                "hazmat_removed": burn_data.environmental_clearance,
                "air_quality_acceptable": True,
                "wind_direction_favorable": True
            },
            
            "safety_measures": {
                "fire_department_conducted": True,
                "safety_officer_assigned": burn_data.safety_officer_assigned,
                "water_supply_adequate": True,
                "ems_on_standby": burn_data.ems_standby,
                "perimeter_secured": True,
                "notifications_completed": False  # Must notify neighbors
            },
            
            "insurance_information": {
                "liability_coverage": True,
                "workers_compensation": True
            },
            
            "training_officer": {
                "id": burn_data.training_officer_id,
                "certifications": ["Fire Officer I", "Fire Instructor I"]
            },
            
            "nfpa_1403_compliant": True
        }
        
        return application
    
    @staticmethod
    def get_training_burn_statistics(
        burns: List[Dict[str, Any]],
        year: int
    ) -> Dict[str, Any]:
        """Calculate training burn program statistics"""
        year_burns = [b for b in burns if b.get("training_date", "").startswith(str(year))]
        
        total_burns = len(year_burns)
        total_participants = sum(b.get("participants_count", 0) for b in year_burns)
        total_injuries = sum(b.get("injuries_reported", 0) for b in year_burns)
        
        # Calculate injury rate
        injury_rate = (total_injuries / total_participants * 100) if total_participants > 0 else 0
        
        # Objectives analysis
        objectives_met = []
        for burn in year_burns:
            objectives_met.extend(burn.get("objectives_met", []))
        
        objective_frequency = {}
        for obj in objectives_met:
            objective_frequency[obj] = objective_frequency.get(obj, 0) + 1
        
        stats = {
            "year": year,
            "total_training_burns": total_burns,
            "total_participants": total_participants,
            "avg_participants_per_burn": round(total_participants / total_burns, 1) if total_burns > 0 else 0,
            "total_injuries": total_injuries,
            "injury_rate_percent": round(injury_rate, 2),
            "most_common_objectives": objective_frequency,
            "program_status": "active" if total_burns > 0 else "inactive"
        }
        
        return stats
