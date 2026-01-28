"""
ISO Fire Protection Rating (PPC) Tracker
Tracks Public Protection Classification grading factors
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class ISOGradingFactors:
    """ISO/PPC grading breakdown - max 100 points"""
    emergency_communications: float = 0  # Max 10 points
    fire_department: float = 0  # Max 50 points
    water_supply: float = 0  # Max 40 points
    community_risk_reduction: float = 0  # Max 5.5 bonus points

    @property
    def total_score(self) -> float:
        base = self.emergency_communications + self.fire_department + self.water_supply
        bonus = min(self.community_risk_reduction, 5.5)
        return min(base + bonus, 105.5)

    @property
    def ppc_class(self) -> int:
        score = self.total_score
        if score >= 90: return 1
        if score >= 80: return 2
        if score >= 70: return 3
        if score >= 60: return 4
        if score >= 50: return 5
        if score >= 40: return 6
        if score >= 30: return 7
        if score >= 20: return 8
        if score >= 10: return 9
        return 10


EMERGENCY_COMM_FACTORS = {
    "telephone_service": {"max": 3, "desc": "Telephone service availability and reliability"},
    "operators": {"max": 4, "desc": "Number of telecommunicators on duty"},
    "dispatch_circuits": {"max": 3, "desc": "Dispatch circuit facilities"},
}

FIRE_DEPT_FACTORS = {
    "engine_companies": {"max": 10, "desc": "Number and distribution of engine companies"},
    "reserve_pumpers": {"max": 0.5, "desc": "Reserve pumper capacity"},
    "pump_capacity": {"max": 5, "desc": "Pumping capacity"},
    "ladder_service": {"max": 5, "desc": "Ladder/service company distribution"},
    "reserve_ladder": {"max": 0.5, "desc": "Reserve ladder/service apparatus"},
    "deployment_analysis": {"max": 10, "desc": "Deployment analysis"},
    "company_personnel": {"max": 15, "desc": "Company personnel"},
    "training": {"max": 9, "desc": "Training programs"},
}

WATER_SUPPLY_FACTORS = {
    "supply_system": {"max": 30, "desc": "Water supply works"},
    "hydrants": {"max": 3, "desc": "Hydrant size, type, and installation"},
    "inspection_frequency": {"max": 7, "desc": "Inspection and flow testing frequency"},
}

CRR_FACTORS = {
    "fire_prevention_code": {"max": 2.2, "desc": "Fire prevention code adoption/enforcement"},
    "fire_prevention_education": {"max": 2.2, "desc": "Public fire safety education"},
    "fire_investigation": {"max": 1.1, "desc": "Fire investigation programs"},
}


class ISOGradingTracker:
    def __init__(self, org_id: int):
        self.org_id = org_id
        self.grading_data: dict = {}
        self.last_evaluation_date: Optional[datetime] = None
        self.current_ppc_class: int = 10

    def calculate_emergency_communications_score(self, data: dict) -> float:
        score = 0.0
        
        telephone_score = data.get("telephone_service_score", 0)
        score += min(telephone_score, EMERGENCY_COMM_FACTORS["telephone_service"]["max"])
        
        operators_on_duty = data.get("operators_on_duty", 0)
        call_volume = data.get("annual_call_volume", 0)
        required_operators = max(1, call_volume // 2000)
        operator_ratio = min(operators_on_duty / required_operators, 1.0) if required_operators > 0 else 0
        score += operator_ratio * EMERGENCY_COMM_FACTORS["operators"]["max"]
        
        has_backup_power = data.get("has_backup_power", False)
        has_redundant_circuits = data.get("has_redundant_circuits", False)
        circuit_score = 0
        if has_backup_power:
            circuit_score += 1.5
        if has_redundant_circuits:
            circuit_score += 1.5
        score += min(circuit_score, EMERGENCY_COMM_FACTORS["dispatch_circuits"]["max"])
        
        return min(score, 10.0)

    def calculate_fire_department_score(self, data: dict) -> float:
        score = 0.0
        
        engine_count = data.get("engine_companies", 0)
        coverage_percent = data.get("first_due_coverage_percent", 0)
        engine_score = min(engine_count * 2, 10) * (coverage_percent / 100)
        score += engine_score
        
        reserve_pumpers = data.get("reserve_pumpers", 0)
        in_service_pumpers = data.get("in_service_pumpers", 0)
        if in_service_pumpers > 0:
            reserve_ratio = reserve_pumpers / in_service_pumpers
            score += min(reserve_ratio * 0.5, 0.5)
        
        total_gpm = data.get("total_pump_capacity_gpm", 0)
        needed_gpm = data.get("needed_fire_flow_gpm", 3500)
        pump_ratio = min(total_gpm / needed_gpm, 1.0) if needed_gpm > 0 else 0
        score += pump_ratio * 5
        
        ladder_companies = data.get("ladder_companies", 0)
        buildings_over_3_stories = data.get("buildings_over_3_stories", 0)
        if buildings_over_3_stories > 0:
            ladder_ratio = min(ladder_companies / max(buildings_over_3_stories / 50, 1), 1.0)
            score += ladder_ratio * 5
        else:
            score += 5
        
        reserve_ladders = data.get("reserve_ladders", 0)
        in_service_ladders = data.get("in_service_ladders", 0)
        if in_service_ladders > 0:
            reserve_ladder_ratio = reserve_ladders / in_service_ladders
            score += min(reserve_ladder_ratio * 0.5, 0.5)
        
        avg_response_time = data.get("avg_response_time_minutes", 10)
        if avg_response_time <= 4:
            score += 10
        elif avg_response_time <= 6:
            score += 7.5
        elif avg_response_time <= 8:
            score += 5
        else:
            score += max(0, 10 - avg_response_time)
        
        ff_per_company = data.get("firefighters_per_company", 0)
        if ff_per_company >= 4:
            score += 15
        elif ff_per_company >= 3:
            score += 11.25
        elif ff_per_company >= 2:
            score += 7.5
        else:
            score += ff_per_company * 3.75
        
        training_hours_annual = data.get("training_hours_annual", 0)
        has_training_facility = data.get("has_training_facility", False)
        has_driver_training = data.get("has_driver_training_program", False)
        training_score = 0
        if training_hours_annual >= 240:
            training_score += 6
        else:
            training_score += (training_hours_annual / 240) * 6
        if has_training_facility:
            training_score += 1.5
        if has_driver_training:
            training_score += 1.5
        score += min(training_score, 9)
        
        return min(score, 50.0)

    def calculate_water_supply_score(self, data: dict) -> float:
        score = 0.0
        
        system_capacity_gpm = data.get("system_capacity_gpm", 0)
        needed_fire_flow = data.get("needed_fire_flow_gpm", 3500)
        duration_hours = data.get("fire_flow_duration_hours", 2)
        
        if needed_fire_flow > 0:
            capacity_ratio = min(system_capacity_gpm / needed_fire_flow, 1.0)
            duration_ratio = min(duration_hours / 3, 1.0)
            score += capacity_ratio * duration_ratio * 30
        
        hydrant_count = data.get("hydrant_count", 0)
        hydrants_within_1000ft = data.get("hydrants_within_1000ft_percent", 0)
        avg_hydrant_flow = data.get("avg_hydrant_flow_gpm", 0)
        
        hydrant_score = 0
        if avg_hydrant_flow >= 1500:
            hydrant_score += 1.5
        elif avg_hydrant_flow >= 1000:
            hydrant_score += 1.0
        elif avg_hydrant_flow >= 500:
            hydrant_score += 0.5
        
        hydrant_score += (hydrants_within_1000ft / 100) * 1.5
        score += min(hydrant_score, 3)
        
        inspection_frequency_months = data.get("hydrant_inspection_frequency_months", 12)
        flow_test_frequency_months = data.get("flow_test_frequency_months", 60)
        
        inspection_score = 0
        if inspection_frequency_months <= 6:
            inspection_score += 3.5
        elif inspection_frequency_months <= 12:
            inspection_score += 2.5
        else:
            inspection_score += 1
        
        if flow_test_frequency_months <= 12:
            inspection_score += 3.5
        elif flow_test_frequency_months <= 36:
            inspection_score += 2.5
        else:
            inspection_score += 1
        score += min(inspection_score, 7)
        
        return min(score, 40.0)

    def calculate_crr_score(self, data: dict) -> float:
        score = 0.0
        
        has_fire_code = data.get("has_adopted_fire_code", False)
        code_enforcement_staff = data.get("code_enforcement_staff", 0)
        inspections_per_year = data.get("fire_inspections_per_year", 0)
        
        if has_fire_code:
            score += 1.0
            if code_enforcement_staff >= 1:
                score += 0.6
            if inspections_per_year >= 100:
                score += 0.6
        
        has_public_education = data.get("has_public_education_program", False)
        education_contacts_per_year = data.get("public_education_contacts_per_year", 0)
        
        if has_public_education:
            score += 1.0
            if education_contacts_per_year >= 500:
                score += 1.2
            elif education_contacts_per_year >= 100:
                score += 0.6
        
        has_fire_investigation = data.get("has_fire_investigation_program", False)
        investigations_per_year = data.get("fire_investigations_per_year", 0)
        
        if has_fire_investigation:
            score += 0.5
            if investigations_per_year >= 10:
                score += 0.6
        
        return min(score, 5.5)

    def calculate_full_grading(self, data: dict) -> ISOGradingFactors:
        """Calculate complete ISO grading from department data"""
        grading = ISOGradingFactors(
            emergency_communications=self.calculate_emergency_communications_score(data),
            fire_department=self.calculate_fire_department_score(data),
            water_supply=self.calculate_water_supply_score(data),
            community_risk_reduction=self.calculate_crr_score(data),
        )
        return grading

    def get_improvement_recommendations(self, grading: ISOGradingFactors, data: dict) -> list[dict]:
        """Generate actionable recommendations to improve PPC rating"""
        recommendations = []
        
        if grading.emergency_communications < 8:
            if data.get("operators_on_duty", 0) < 2:
                recommendations.append({
                    "category": "Emergency Communications",
                    "recommendation": "Increase minimum telecommunicators on duty to 2",
                    "potential_points": 2.0,
                    "priority": "medium",
                })
            if not data.get("has_backup_power"):
                recommendations.append({
                    "category": "Emergency Communications",
                    "recommendation": "Install backup power for dispatch center",
                    "potential_points": 1.5,
                    "priority": "high",
                })
        
        if grading.fire_department < 40:
            if data.get("avg_response_time_minutes", 10) > 6:
                recommendations.append({
                    "category": "Fire Department",
                    "recommendation": "Reduce average response time to under 6 minutes",
                    "potential_points": 5.0,
                    "priority": "high",
                })
            if data.get("firefighters_per_company", 0) < 4:
                recommendations.append({
                    "category": "Fire Department",
                    "recommendation": "Staff 4 firefighters per apparatus",
                    "potential_points": 7.5,
                    "priority": "high",
                })
            if data.get("training_hours_annual", 0) < 240:
                recommendations.append({
                    "category": "Fire Department",
                    "recommendation": "Increase annual training to 240 hours per firefighter",
                    "potential_points": 3.0,
                    "priority": "medium",
                })
        
        if grading.water_supply < 35:
            if data.get("hydrant_inspection_frequency_months", 12) > 6:
                recommendations.append({
                    "category": "Water Supply",
                    "recommendation": "Increase hydrant inspection frequency to semi-annual",
                    "potential_points": 2.0,
                    "priority": "medium",
                })
            if data.get("flow_test_frequency_months", 60) > 36:
                recommendations.append({
                    "category": "Water Supply",
                    "recommendation": "Conduct flow tests every 3 years minimum",
                    "potential_points": 1.5,
                    "priority": "medium",
                })
        
        if grading.community_risk_reduction < 4:
            if not data.get("has_adopted_fire_code"):
                recommendations.append({
                    "category": "Community Risk Reduction",
                    "recommendation": "Adopt current fire prevention code",
                    "potential_points": 2.2,
                    "priority": "high",
                })
            if not data.get("has_public_education_program"):
                recommendations.append({
                    "category": "Community Risk Reduction",
                    "recommendation": "Implement public fire safety education program",
                    "potential_points": 2.2,
                    "priority": "medium",
                })
        
        recommendations.sort(key=lambda x: (
            0 if x["priority"] == "high" else 1 if x["priority"] == "medium" else 2,
            -x["potential_points"]
        ))
        
        return recommendations


def create_iso_assessment(org_id: int, department_data: dict) -> dict:
    """Create complete ISO/PPC assessment for a department"""
    tracker = ISOGradingTracker(org_id)
    grading = tracker.calculate_full_grading(department_data)
    recommendations = tracker.get_improvement_recommendations(grading, department_data)
    
    return {
        "org_id": org_id,
        "assessment_date": datetime.now().isoformat(),
        "scores": {
            "emergency_communications": round(grading.emergency_communications, 2),
            "fire_department": round(grading.fire_department, 2),
            "water_supply": round(grading.water_supply, 2),
            "community_risk_reduction": round(grading.community_risk_reduction, 2),
            "total_score": round(grading.total_score, 2),
        },
        "ppc_class": grading.ppc_class,
        "ppc_class_description": f"Class {grading.ppc_class}" + (
            " (Best)" if grading.ppc_class == 1 else 
            " (Excellent)" if grading.ppc_class <= 3 else
            " (Good)" if grading.ppc_class <= 5 else
            " (Fair)" if grading.ppc_class <= 7 else
            " (Needs Improvement)"
        ),
        "recommendations": recommendations,
        "potential_improvement": sum(r["potential_points"] for r in recommendations[:5]),
    }
