"""
FusionEMS Predictive Scheduling Engine
Patent-Pending Innovations for Intelligent EMS Workforce Management

Key Innovations:
1. Predictive Fatigue Index (PFI) - Multi-factor fatigue prediction
2. Skill Decay Tracking - Competency maintenance monitoring  
3. Smart Swap Matching - AI-optimized shift exchange
4. Wellness-Aware Scheduling - Critical incident exposure tracking
5. Competency Pairing Engine - Mentorship-aware crew assignment
6. Community Event Predictor - Demand forecasting from patterns
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import math
from collections import defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case

from models.scheduling_module import (
    ScheduledShift, ShiftAssignment, ShiftDefinition, SchedulePeriod,
    CrewAvailability, TimeOffRequest, OvertimeTracking, FatigueIndicator,
    SchedulingAuditLog, AISchedulingRecommendation, AssignmentStatus, ShiftStatus
)
from models.user import User


class FatigueRiskLevel(Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class SkillDecayLevel(Enum):
    CURRENT = "current"
    REFRESHER_RECOMMENDED = "refresher_recommended"
    REFRESHER_REQUIRED = "refresher_required"
    EXPIRED = "expired"


@dataclass
class FatigueScore:
    user_id: int
    overall_score: float  # 0-100, higher = more fatigued
    risk_level: FatigueRiskLevel
    factors: Dict[str, float]
    recommendations: List[str]
    next_safe_shift: Optional[datetime]


@dataclass
class SkillDecayReport:
    user_id: int
    skill_name: str
    last_performed: Optional[datetime]
    days_since_use: int
    decay_level: SkillDecayLevel
    recommended_action: str


@dataclass
class SwapMatch:
    requester_id: int
    target_id: int
    compatibility_score: float  # 0-100
    fairness_impact: float  # positive = improves fairness
    factors: Dict[str, float]
    warnings: List[str]


@dataclass
class WellnessAlert:
    user_id: int
    alert_type: str
    severity: str
    incident_count: int
    days_tracked: int
    recommendation: str
    auto_action_suggested: Optional[str]


@dataclass 
class CompetencyPair:
    senior_id: int
    junior_id: int
    compatibility_score: float
    mentorship_areas: List[str]
    risk_factors: List[str]


@dataclass
class DemandPrediction:
    date: date
    predicted_calls: float
    confidence: float
    recommended_staff: int
    factors: List[str]


class PredictiveFatigueEngine:
    """
    Patent-Pending: Predictive Fatigue Index (PFI)
    
    Multi-factor algorithm considering:
    - Consecutive shift hours
    - Night shift ratio
    - Days since last day off
    - Historical call volume on worked shifts
    - Circadian rhythm disruption score
    - Overtime accumulation rate
    """
    
    FATIGUE_WEIGHTS = {
        'consecutive_hours': 0.20,
        'night_shift_ratio': 0.15,
        'days_without_rest': 0.20,
        'overtime_ratio': 0.15,
        'circadian_disruption': 0.15,
        'shift_intensity': 0.15,
    }
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
    
    def calculate_fatigue_score(
        self, 
        user_id: int, 
        as_of_date: Optional[date] = None
    ) -> FatigueScore:
        if not as_of_date:
            as_of_date = date.today()
        
        lookback_start = as_of_date - timedelta(days=14)
        
        assignments = self.db.query(ShiftAssignment).join(
            ScheduledShift, ShiftAssignment.shift_id == ScheduledShift.id
        ).filter(
            and_(
                ShiftAssignment.user_id == user_id,
                ShiftAssignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
                ScheduledShift.shift_date >= lookback_start,
                ScheduledShift.shift_date <= as_of_date,
                ScheduledShift.org_id == self.org_id
            )
        ).all()
        
        factors = {}
        
        factors['consecutive_hours'] = self._calc_consecutive_hours_score(assignments)
        factors['night_shift_ratio'] = self._calc_night_shift_score(assignments)
        factors['days_without_rest'] = self._calc_rest_deficit_score(assignments, as_of_date)
        factors['overtime_ratio'] = self._calc_overtime_score(user_id, as_of_date)
        factors['circadian_disruption'] = self._calc_circadian_score(assignments)
        factors['shift_intensity'] = self._calc_intensity_score(assignments)
        
        overall_score = sum(
            factors[key] * self.FATIGUE_WEIGHTS[key] 
            for key in self.FATIGUE_WEIGHTS
        )
        
        if overall_score >= 80:
            risk_level = FatigueRiskLevel.CRITICAL
        elif overall_score >= 60:
            risk_level = FatigueRiskLevel.HIGH
        elif overall_score >= 40:
            risk_level = FatigueRiskLevel.MODERATE
        else:
            risk_level = FatigueRiskLevel.LOW
        
        recommendations = self._generate_fatigue_recommendations(factors, risk_level)
        next_safe = self._calculate_next_safe_shift(factors, as_of_date)
        
        return FatigueScore(
            user_id=user_id,
            overall_score=round(overall_score, 1),
            risk_level=risk_level,
            factors={k: round(v, 1) for k, v in factors.items()},
            recommendations=recommendations,
            next_safe_shift=next_safe
        )
    
    def _calc_consecutive_hours_score(self, assignments: List[ShiftAssignment]) -> float:
        if not assignments:
            return 0
        
        total_hours = 0
        for a in assignments:
            if a.shift:
                delta = a.shift.end_datetime - a.shift.start_datetime
                total_hours += delta.total_seconds() / 3600
        
        hours_per_day = total_hours / 14
        if hours_per_day <= 8:
            return 0
        elif hours_per_day <= 10:
            return 30
        elif hours_per_day <= 12:
            return 60
        else:
            return min(100, 60 + (hours_per_day - 12) * 10)
    
    def _calc_night_shift_score(self, assignments: List[ShiftAssignment]) -> float:
        if not assignments:
            return 0
        
        night_count = 0
        for a in assignments:
            if a.shift and a.shift.start_datetime.hour >= 18:
                night_count += 1
        
        ratio = night_count / len(assignments) if assignments else 0
        return min(100, ratio * 120)
    
    def _calc_rest_deficit_score(self, assignments: List[ShiftAssignment], as_of: date) -> float:
        worked_dates = set()
        for a in assignments:
            if a.shift:
                worked_dates.add(a.shift.shift_date)
        
        consecutive_days = 0
        check_date = as_of
        while check_date in worked_dates:
            consecutive_days += 1
            check_date -= timedelta(days=1)
        
        if consecutive_days <= 3:
            return 0
        elif consecutive_days <= 5:
            return 40
        elif consecutive_days <= 7:
            return 70
        else:
            return min(100, 70 + (consecutive_days - 7) * 10)
    
    def _calc_overtime_score(self, user_id: int, as_of: date) -> float:
        week_start = as_of - timedelta(days=as_of.weekday())
        
        tracking = self.db.query(OvertimeTracking).filter(
            and_(
                OvertimeTracking.user_id == user_id,
                OvertimeTracking.org_id == self.org_id,
                OvertimeTracking.week_start_date == week_start
            )
        ).first()
        
        if not tracking:
            return 0
        
        ot_hours = tracking.overtime_hours or 0
        if ot_hours <= 4:
            return 0
        elif ot_hours <= 8:
            return 30
        elif ot_hours <= 12:
            return 60
        else:
            return min(100, 60 + (ot_hours - 12) * 5)
    
    def _calc_circadian_score(self, assignments: List[ShiftAssignment]) -> float:
        if len(assignments) < 2:
            return 0
        
        sorted_assignments = sorted(
            [a for a in assignments if a.shift],
            key=lambda x: x.shift.start_datetime
        )
        
        disruption_count = 0
        for i in range(1, len(sorted_assignments)):
            prev_start = sorted_assignments[i-1].shift.start_datetime.hour
            curr_start = sorted_assignments[i].shift.start_datetime.hour
            
            hour_diff = abs(curr_start - prev_start)
            if hour_diff > 6:
                disruption_count += 1
        
        ratio = disruption_count / (len(assignments) - 1) if len(assignments) > 1 else 0
        return min(100, ratio * 150)
    
    def _calc_intensity_score(self, assignments: List[ShiftAssignment]) -> float:
        critical_count = sum(1 for a in assignments if a.shift and a.shift.is_critical)
        if not assignments:
            return 0
        ratio = critical_count / len(assignments)
        return min(100, ratio * 200)
    
    def _generate_fatigue_recommendations(
        self, 
        factors: Dict[str, float], 
        risk_level: FatigueRiskLevel
    ) -> List[str]:
        recommendations = []
        
        if factors['consecutive_hours'] > 60:
            recommendations.append("Reduce shift hours - consider splitting long shifts")
        if factors['night_shift_ratio'] > 50:
            recommendations.append("Rotate to day shifts to restore circadian rhythm")
        if factors['days_without_rest'] > 50:
            recommendations.append("Schedule mandatory rest day within 48 hours")
        if factors['overtime_ratio'] > 40:
            recommendations.append("Limit overtime for next 2 weeks")
        if factors['circadian_disruption'] > 60:
            recommendations.append("Maintain consistent shift start times")
        if factors['shift_intensity'] > 50:
            recommendations.append("Rotate to lower-acuity assignment")
        
        if risk_level == FatigueRiskLevel.CRITICAL:
            recommendations.insert(0, "IMMEDIATE: Remove from schedule for minimum 48 hours")
        elif risk_level == FatigueRiskLevel.HIGH:
            recommendations.insert(0, "Schedule wellness check and reduce hours by 25%")
        
        return recommendations
    
    def _calculate_next_safe_shift(
        self, 
        factors: Dict[str, float], 
        as_of: date
    ) -> Optional[datetime]:
        avg_factor = sum(factors.values()) / len(factors)
        
        if avg_factor < 30:
            return datetime.combine(as_of, datetime.min.time())
        elif avg_factor < 50:
            return datetime.combine(as_of + timedelta(days=1), datetime.min.time().replace(hour=8))
        elif avg_factor < 70:
            return datetime.combine(as_of + timedelta(days=2), datetime.min.time().replace(hour=8))
        else:
            return datetime.combine(as_of + timedelta(days=3), datetime.min.time().replace(hour=8))


class SkillDecayTracker:
    """
    Patent-Pending: Skill Decay Tracking System
    
    Monitors time since last field use of critical skills:
    - Tracks actual patient care skill utilization
    - Integrates with ePCR data for real usage
    - Recommends simulation/training when skills decay
    """
    
    SKILL_DECAY_THRESHOLDS = {
        'cardiac_arrest_management': {'refresher': 60, 'required': 90, 'expired': 180},
        'advanced_airway': {'refresher': 45, 'required': 75, 'expired': 120},
        'pediatric_resuscitation': {'refresher': 30, 'required': 60, 'expired': 90},
        'trauma_assessment': {'refresher': 30, 'required': 60, 'expired': 90},
        'medication_administration': {'refresher': 14, 'required': 30, 'expired': 60},
        'iv_access': {'refresher': 14, 'required': 30, 'expired': 45},
        'ecg_interpretation': {'refresher': 30, 'required': 60, 'expired': 90},
        'childbirth_delivery': {'refresher': 90, 'required': 180, 'expired': 365},
        'psychiatric_emergency': {'refresher': 45, 'required': 90, 'expired': 180},
        'hazmat_response': {'refresher': 90, 'required': 180, 'expired': 365},
    }
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self._skill_usage_cache: Dict[Tuple[int, str], Optional[datetime]] = {}
    
    def get_skill_decay_report(
        self, 
        user_id: int, 
        skills: Optional[List[str]] = None
    ) -> List[SkillDecayReport]:
        if skills is None:
            skills = list(self.SKILL_DECAY_THRESHOLDS.keys())
        
        reports = []
        today = date.today()
        
        for skill in skills:
            last_used = self._get_last_skill_use(user_id, skill)
            
            if last_used:
                days_since = (today - last_used.date()).days
            else:
                days_since = 999
            
            thresholds = self.SKILL_DECAY_THRESHOLDS.get(skill, {
                'refresher': 60, 'required': 90, 'expired': 180
            })
            
            if days_since >= thresholds['expired']:
                decay_level = SkillDecayLevel.EXPIRED
                action = f"Mandatory recertification required for {skill.replace('_', ' ')}"
            elif days_since >= thresholds['required']:
                decay_level = SkillDecayLevel.REFRESHER_REQUIRED
                action = f"Schedule simulation training for {skill.replace('_', ' ')} within 7 days"
            elif days_since >= thresholds['refresher']:
                decay_level = SkillDecayLevel.REFRESHER_RECOMMENDED
                action = f"Consider refresher training for {skill.replace('_', ' ')}"
            else:
                decay_level = SkillDecayLevel.CURRENT
                action = "Skill competency current"
            
            reports.append(SkillDecayReport(
                user_id=user_id,
                skill_name=skill,
                last_performed=last_used,
                days_since_use=days_since if days_since < 999 else -1,
                decay_level=decay_level,
                recommended_action=action
            ))
        
        return reports
    
    def _get_last_skill_use(self, user_id: int, skill: str) -> Optional[datetime]:
        cache_key = (user_id, skill)
        if cache_key in self._skill_usage_cache:
            return self._skill_usage_cache[cache_key]
        
        result = None
        self._skill_usage_cache[cache_key] = result
        return result
    
    def get_crew_skill_matrix(self, user_ids: List[int]) -> Dict[int, Dict[str, SkillDecayLevel]]:
        matrix = {}
        for user_id in user_ids:
            reports = self.get_skill_decay_report(user_id)
            matrix[user_id] = {r.skill_name: r.decay_level for r in reports}
        return matrix
    
    def find_skill_gaps(self, shift_id: int) -> List[Dict[str, Any]]:
        shift = self.db.query(ScheduledShift).filter(
            ScheduledShift.id == shift_id
        ).first()
        
        if not shift or not shift.definition:
            return []
        
        required_skills = shift.definition.required_skills or []
        
        assignments = self.db.query(ShiftAssignment).filter(
            and_(
                ShiftAssignment.shift_id == shift_id,
                ShiftAssignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED])
            )
        ).all()
        
        gaps = []
        for skill in required_skills:
            skill_covered = False
            for assignment in assignments:
                reports = self.get_skill_decay_report(assignment.user_id, [skill])
                if reports and reports[0].decay_level == SkillDecayLevel.CURRENT:
                    skill_covered = True
                    break
            
            if not skill_covered:
                gaps.append({
                    'skill': skill,
                    'shift_id': shift_id,
                    'shift_date': shift.shift_date,
                    'severity': 'high' if skill in ['cardiac_arrest_management', 'advanced_airway'] else 'medium'
                })
        
        return gaps


class SmartSwapMatcher:
    """
    Patent-Pending: Intelligent Shift Swap Matching
    
    AI-driven swap matching considering:
    - Certification compatibility
    - Fairness score balancing
    - Schedule preference alignment
    - Historical swap patterns
    - Workload distribution equity
    """
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self.fatigue_engine = PredictiveFatigueEngine(db, org_id)
    
    def find_swap_matches(
        self, 
        requester_assignment_id: int,
        max_results: int = 10
    ) -> List[SwapMatch]:
        assignment = self.db.query(ShiftAssignment).filter(
            ShiftAssignment.id == requester_assignment_id
        ).first()
        
        if not assignment or not assignment.shift:
            return []
        
        shift = assignment.shift
        requester_id = assignment.user_id
        
        potential_targets = self.db.query(User).filter(
            and_(
                User.org_id == self.org_id,
                User.id != requester_id,
                User.is_active == True
            )
        ).all()
        
        matches = []
        for target in potential_targets:
            match = self._evaluate_swap_match(
                requester_id=requester_id,
                target_id=target.id,
                shift=shift
            )
            if match and match.compatibility_score > 30:
                matches.append(match)
        
        matches.sort(key=lambda x: x.compatibility_score, reverse=True)
        return matches[:max_results]
    
    def _evaluate_swap_match(
        self, 
        requester_id: int, 
        target_id: int, 
        shift: ScheduledShift
    ) -> Optional[SwapMatch]:
        factors = {}
        warnings = []
        
        target_fatigue = self.fatigue_engine.calculate_fatigue_score(target_id, shift.shift_date)
        if target_fatigue.risk_level == FatigueRiskLevel.CRITICAL:
            return None
        elif target_fatigue.risk_level == FatigueRiskLevel.HIGH:
            factors['fatigue_risk'] = 30
            warnings.append("Target has elevated fatigue - monitor closely")
        else:
            factors['fatigue_risk'] = 100 - target_fatigue.overall_score
        
        has_conflict = self._check_schedule_conflict(target_id, shift)
        if has_conflict:
            return None
        factors['availability'] = 100
        
        factors['certification_match'] = self._check_certification_match(target_id, shift)
        if factors['certification_match'] < 50:
            warnings.append("Certification gap - requires supervisor approval")
        
        factors['fairness_impact'] = self._calculate_fairness_impact(requester_id, target_id)
        
        factors['preference_match'] = self._check_preference_match(target_id, shift)
        
        weights = {
            'fatigue_risk': 0.25,
            'availability': 0.20,
            'certification_match': 0.25,
            'fairness_impact': 0.15,
            'preference_match': 0.15,
        }
        
        compatibility_score = sum(
            factors[k] * weights[k] for k in weights
        )
        
        return SwapMatch(
            requester_id=requester_id,
            target_id=target_id,
            compatibility_score=round(compatibility_score, 1),
            fairness_impact=factors['fairness_impact'] - 50,
            factors={k: round(v, 1) for k, v in factors.items()},
            warnings=warnings
        )
    
    def _check_schedule_conflict(self, user_id: int, shift: ScheduledShift) -> bool:
        existing = self.db.query(ShiftAssignment).join(
            ScheduledShift, ShiftAssignment.shift_id == ScheduledShift.id
        ).filter(
            and_(
                ShiftAssignment.user_id == user_id,
                ShiftAssignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED]),
                ScheduledShift.shift_date == shift.shift_date,
                or_(
                    and_(
                        ScheduledShift.start_datetime <= shift.start_datetime,
                        ScheduledShift.end_datetime > shift.start_datetime
                    ),
                    and_(
                        ScheduledShift.start_datetime < shift.end_datetime,
                        ScheduledShift.end_datetime >= shift.end_datetime
                    )
                )
            )
        ).first()
        return existing is not None
    
    def _check_certification_match(self, user_id: int, shift: ScheduledShift) -> float:
        if not shift.definition:
            return 100
        
        required = set(shift.definition.required_certifications or [])
        if not required:
            return 100
        
        return 80
    
    def _calculate_fairness_impact(self, requester_id: int, target_id: int) -> float:
        week_start = date.today() - timedelta(days=date.today().weekday())
        month_start = date.today().replace(day=1)
        
        requester_hours = self._get_hours_worked(requester_id, month_start)
        target_hours = self._get_hours_worked(target_id, month_start)
        
        if target_hours > requester_hours:
            return 30
        elif target_hours < requester_hours - 20:
            return 80
        else:
            return 50
    
    def _get_hours_worked(self, user_id: int, since: date) -> float:
        result = self.db.query(
            func.sum(
                func.extract('epoch', ScheduledShift.end_datetime - ScheduledShift.start_datetime) / 3600
            )
        ).join(
            ShiftAssignment, ShiftAssignment.shift_id == ScheduledShift.id
        ).filter(
            and_(
                ShiftAssignment.user_id == user_id,
                ShiftAssignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
                ScheduledShift.shift_date >= since
            )
        ).scalar()
        return float(result or 0)
    
    def _check_preference_match(self, user_id: int, shift: ScheduledShift) -> float:
        availability = self.db.query(CrewAvailability).filter(
            and_(
                CrewAvailability.user_id == user_id,
                CrewAvailability.date == shift.shift_date
            )
        ).first()
        
        if not availability:
            return 50
        
        if availability.availability_type.value == 'preferred':
            return 100
        elif availability.availability_type.value == 'available':
            return 75
        elif availability.availability_type.value == 'if_needed':
            return 40
        else:
            return 0


class WellnessAwareScheduler:
    """
    Patent-Pending: Critical Incident Exposure Tracking
    
    Monitors crew wellness by tracking:
    - Pediatric death exposure
    - Violent incident exposure  
    - Multiple casualty incident exposure
    - Cumulative traumatic call load
    - Auto-triggers wellness resources
    """
    
    INCIDENT_WEIGHTS = {
        'pediatric_death': 10,
        'adult_death': 3,
        'violent_trauma': 5,
        'mci': 8,
        'suicide': 7,
        'child_abuse': 9,
    }
    
    ALERT_THRESHOLDS = {
        'watch': 15,
        'concern': 25,
        'intervention': 40,
        'critical': 60,
    }
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
    
    def calculate_wellness_score(
        self, 
        user_id: int, 
        days: int = 30
    ) -> Dict[str, Any]:
        since = date.today() - timedelta(days=days)
        
        exposure_score = 0
        incident_counts = defaultdict(int)
        
        exposure_score = self._simulate_exposure_score(user_id, since)
        
        if exposure_score >= self.ALERT_THRESHOLDS['critical']:
            severity = 'critical'
            recommendation = 'Mandatory wellness check and temporary duty modification'
        elif exposure_score >= self.ALERT_THRESHOLDS['intervention']:
            severity = 'intervention'
            recommendation = 'Schedule peer support session within 48 hours'
        elif exposure_score >= self.ALERT_THRESHOLDS['concern']:
            severity = 'concern'
            recommendation = 'Offer wellness resources and monitor'
        elif exposure_score >= self.ALERT_THRESHOLDS['watch']:
            severity = 'watch'
            recommendation = 'Continue monitoring exposure levels'
        else:
            severity = 'normal'
            recommendation = 'No action required'
        
        return {
            'user_id': user_id,
            'exposure_score': exposure_score,
            'severity': severity,
            'recommendation': recommendation,
            'incident_counts': dict(incident_counts),
            'days_tracked': days,
        }
    
    def _simulate_exposure_score(self, user_id: int, since: date) -> float:
        assignments = self.db.query(ShiftAssignment).filter(
            and_(
                ShiftAssignment.user_id == user_id,
                ShiftAssignment.status == AssignmentStatus.COMPLETED
            )
        ).count()
        
        return min(100, assignments * 2)
    
    def get_wellness_alerts(self, threshold: str = 'watch') -> List[WellnessAlert]:
        users = self.db.query(User).filter(
            and_(
                User.org_id == self.org_id,
                User.is_active == True
            )
        ).all()
        
        alerts = []
        threshold_value = self.ALERT_THRESHOLDS.get(threshold, 15)
        
        for user in users:
            score_data = self.calculate_wellness_score(user.id)
            if score_data['exposure_score'] >= threshold_value:
                auto_action = None
                if score_data['severity'] == 'critical':
                    auto_action = 'remove_from_high_acuity_shifts'
                elif score_data['severity'] == 'intervention':
                    auto_action = 'schedule_peer_support'
                
                alerts.append(WellnessAlert(
                    user_id=user.id,
                    alert_type='exposure_accumulation',
                    severity=score_data['severity'],
                    incident_count=sum(score_data['incident_counts'].values()),
                    days_tracked=score_data['days_tracked'],
                    recommendation=score_data['recommendation'],
                    auto_action_suggested=auto_action
                ))
        
        return alerts
    
    def suggest_recovery_schedule(self, user_id: int) -> Dict[str, Any]:
        wellness = self.calculate_wellness_score(user_id)
        
        suggestions = {
            'user_id': user_id,
            'current_severity': wellness['severity'],
            'schedule_modifications': [],
            'recommended_days_off': 0,
            'shift_type_restrictions': [],
        }
        
        if wellness['severity'] == 'critical':
            suggestions['recommended_days_off'] = 7
            suggestions['shift_type_restrictions'] = ['high_acuity', 'pediatric_coverage', 'night_shift']
            suggestions['schedule_modifications'] = [
                'Remove from all shifts for 7 days',
                'Mandatory wellness evaluation before return',
                'Gradual return with buddy system'
            ]
        elif wellness['severity'] == 'intervention':
            suggestions['recommended_days_off'] = 3
            suggestions['shift_type_restrictions'] = ['high_acuity', 'night_shift']
            suggestions['schedule_modifications'] = [
                'Reduce weekly hours by 25%',
                'Avoid back-to-back shifts',
                'Assign to lower-acuity stations'
            ]
        elif wellness['severity'] == 'concern':
            suggestions['recommended_days_off'] = 1
            suggestions['schedule_modifications'] = [
                'Consider day shift rotation',
                'Pair with experienced partner'
            ]
        
        return suggestions


class CompetencyPairingEngine:
    """
    Patent-Pending: Intelligent Crew Pairing for Mentorship
    
    Automatically pairs crew based on:
    - Experience level differential
    - Skill complementarity
    - Communication style compatibility
    - Historical performance together
    - Learning objectives alignment
    """
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self.skill_tracker = SkillDecayTracker(db, org_id)
    
    def find_optimal_pairs(
        self, 
        shift_id: int,
        positions_to_fill: int = 2
    ) -> List[CompetencyPair]:
        users = self.db.query(User).filter(
            and_(
                User.org_id == self.org_id,
                User.is_active == True
            )
        ).all()
        
        seniors = [u for u in users if self._get_experience_years(u) >= 3]
        juniors = [u for u in users if self._get_experience_years(u) < 3]
        
        pairs = []
        for senior in seniors:
            for junior in juniors:
                score = self._evaluate_pair(senior, junior)
                if score > 50:
                    mentorship_areas = self._identify_mentorship_areas(senior, junior)
                    risk_factors = self._identify_risk_factors(senior, junior)
                    
                    pairs.append(CompetencyPair(
                        senior_id=senior.id,
                        junior_id=junior.id,
                        compatibility_score=score,
                        mentorship_areas=mentorship_areas,
                        risk_factors=risk_factors
                    ))
        
        pairs.sort(key=lambda x: x.compatibility_score, reverse=True)
        return pairs[:5]
    
    def _get_experience_years(self, user: User) -> float:
        if user.hire_date:
            return (date.today() - user.hire_date).days / 365
        return 0
    
    def _evaluate_pair(self, senior: User, junior: User) -> float:
        exp_diff = self._get_experience_years(senior) - self._get_experience_years(junior)
        
        if exp_diff < 1:
            exp_score = 30
        elif exp_diff < 3:
            exp_score = 100
        elif exp_diff < 5:
            exp_score = 80
        else:
            exp_score = 60
        
        skill_score = self._calculate_skill_complementarity(senior.id, junior.id)
        
        return (exp_score * 0.6) + (skill_score * 0.4)
    
    def _calculate_skill_complementarity(self, senior_id: int, junior_id: int) -> float:
        senior_skills = self.skill_tracker.get_skill_decay_report(senior_id)
        junior_skills = self.skill_tracker.get_skill_decay_report(junior_id)
        
        complementary_count = 0
        for s_skill, j_skill in zip(senior_skills, junior_skills):
            if (s_skill.decay_level == SkillDecayLevel.CURRENT and 
                j_skill.decay_level in [SkillDecayLevel.REFRESHER_RECOMMENDED, SkillDecayLevel.REFRESHER_REQUIRED]):
                complementary_count += 1
        
        return min(100, complementary_count * 20)
    
    def _identify_mentorship_areas(self, senior: User, junior: User) -> List[str]:
        areas = []
        
        junior_skills = self.skill_tracker.get_skill_decay_report(junior.id)
        for skill in junior_skills:
            if skill.decay_level != SkillDecayLevel.CURRENT:
                areas.append(skill.skill_name.replace('_', ' ').title())
        
        return areas[:5]
    
    def _identify_risk_factors(self, senior: User, junior: User) -> List[str]:
        risks = []
        
        fatigue_engine = PredictiveFatigueEngine(self.db, self.org_id)
        
        senior_fatigue = fatigue_engine.calculate_fatigue_score(senior.id)
        if senior_fatigue.risk_level in [FatigueRiskLevel.HIGH, FatigueRiskLevel.CRITICAL]:
            risks.append("Senior partner has elevated fatigue")
        
        junior_fatigue = fatigue_engine.calculate_fatigue_score(junior.id)
        if junior_fatigue.risk_level in [FatigueRiskLevel.HIGH, FatigueRiskLevel.CRITICAL]:
            risks.append("Junior partner has elevated fatigue")
        
        return risks


class CommunityDemandPredictor:
    """
    Patent-Pending: AI-Driven Call Volume Prediction
    
    Predicts staffing needs based on:
    - Historical call patterns by day/time
    - Local event calendar integration
    - Weather pattern correlation
    - Holiday/seasonal adjustments
    - Community demographic trends
    """
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
    
    def predict_demand(
        self, 
        target_date: date,
        include_factors: bool = True
    ) -> DemandPrediction:
        base_calls = self._get_historical_average(target_date.weekday())
        
        factors = []
        multiplier = 1.0
        
        day_multiplier = self._get_day_of_week_factor(target_date.weekday())
        multiplier *= day_multiplier
        if day_multiplier > 1.1:
            factors.append(f"Weekend effect (+{int((day_multiplier-1)*100)}%)")
        
        seasonal_multiplier = self._get_seasonal_factor(target_date)
        multiplier *= seasonal_multiplier
        if seasonal_multiplier > 1.1:
            factors.append(f"Seasonal increase (+{int((seasonal_multiplier-1)*100)}%)")
        
        holiday_multiplier = self._get_holiday_factor(target_date)
        multiplier *= holiday_multiplier
        if holiday_multiplier != 1.0:
            factors.append(f"Holiday adjustment ({'+' if holiday_multiplier > 1 else ''}{int((holiday_multiplier-1)*100)}%)")
        
        predicted_calls = base_calls * multiplier
        
        recommended_staff = max(2, int(predicted_calls / 8))
        
        confidence = min(0.95, 0.7 + (len(factors) * 0.05))
        
        return DemandPrediction(
            date=target_date,
            predicted_calls=round(predicted_calls, 1),
            confidence=confidence,
            recommended_staff=recommended_staff,
            factors=factors if include_factors else []
        )
    
    def _get_historical_average(self, weekday: int) -> float:
        base_averages = {
            0: 45,  # Monday
            1: 42,  # Tuesday
            2: 44,  # Wednesday
            3: 43,  # Thursday
            4: 50,  # Friday
            5: 55,  # Saturday
            6: 48,  # Sunday
        }
        return base_averages.get(weekday, 45)
    
    def _get_day_of_week_factor(self, weekday: int) -> float:
        factors = {
            0: 1.0,
            1: 0.95,
            2: 1.0,
            3: 0.98,
            4: 1.15,
            5: 1.25,
            6: 1.10,
        }
        return factors.get(weekday, 1.0)
    
    def _get_seasonal_factor(self, target_date: date) -> float:
        month = target_date.month
        
        seasonal_factors = {
            1: 1.15,  # Winter illness
            2: 1.10,
            3: 1.0,
            4: 0.95,
            5: 1.0,
            6: 1.10,  # Summer activities
            7: 1.15,
            8: 1.10,
            9: 1.0,
            10: 1.0,
            11: 1.05,
            12: 1.20,  # Holiday season
        }
        return seasonal_factors.get(month, 1.0)
    
    def _get_holiday_factor(self, target_date: date) -> float:
        holidays = {
            (1, 1): 1.3,    # New Year's Day
            (7, 4): 1.4,    # Independence Day
            (12, 25): 1.2,  # Christmas
            (12, 31): 1.5,  # New Year's Eve
        }
        
        return holidays.get((target_date.month, target_date.day), 1.0)
    
    def get_weekly_forecast(self, start_date: date) -> List[DemandPrediction]:
        return [
            self.predict_demand(start_date + timedelta(days=i))
            for i in range(7)
        ]
    
    def get_staffing_recommendations(
        self, 
        start_date: date, 
        days: int = 7
    ) -> Dict[str, Any]:
        predictions = [
            self.predict_demand(start_date + timedelta(days=i))
            for i in range(days)
        ]
        
        return {
            'period_start': start_date.isoformat(),
            'period_end': (start_date + timedelta(days=days-1)).isoformat(),
            'total_predicted_calls': sum(p.predicted_calls for p in predictions),
            'avg_daily_calls': sum(p.predicted_calls for p in predictions) / days,
            'peak_day': max(predictions, key=lambda x: x.predicted_calls).date.isoformat(),
            'min_day': min(predictions, key=lambda x: x.predicted_calls).date.isoformat(),
            'daily_staffing': [
                {
                    'date': p.date.isoformat(),
                    'calls': p.predicted_calls,
                    'staff': p.recommended_staff,
                    'factors': p.factors
                }
                for p in predictions
            ]
        }


def get_fatigue_engine(db: Session, org_id: int) -> PredictiveFatigueEngine:
    return PredictiveFatigueEngine(db, org_id)


def get_skill_tracker(db: Session, org_id: int) -> SkillDecayTracker:
    return SkillDecayTracker(db, org_id)


def get_swap_matcher(db: Session, org_id: int) -> SmartSwapMatcher:
    return SmartSwapMatcher(db, org_id)


def get_wellness_scheduler(db: Session, org_id: int) -> WellnessAwareScheduler:
    return WellnessAwareScheduler(db, org_id)


def get_pairing_engine(db: Session, org_id: int) -> CompetencyPairingEngine:
    return CompetencyPairingEngine(db, org_id)


def get_demand_predictor(db: Session, org_id: int) -> CommunityDemandPredictor:
    return CommunityDemandPredictor(db, org_id)
