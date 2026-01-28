from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from models.scheduling_module import (
    ScheduledShift, ShiftAssignment, CrewAvailability, TimeOffRequest,
    CoverageRequirement, SchedulingPolicy, SchedulingAlert, 
    AISchedulingRecommendation, OvertimeTracking, FatigueIndicator,
    SchedulingSubscriptionFeature, AlertSeverity
)
from models.user import User


class SchedulingAIService:
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self._load_subscription()
        self._load_policies()
    
    def _load_subscription(self):
        sub = self.db.query(SchedulingSubscriptionFeature).filter(
            SchedulingSubscriptionFeature.org_id == self.org_id
        ).first()
        self.subscription = sub
        self.ai_enabled = sub.ai_recommendations_enabled if sub else False
        self.fatigue_enabled = sub.fatigue_tracking_enabled if sub else False
        self.predictive_enabled = sub.predictive_staffing_enabled if sub else False
    
    def _load_policies(self):
        policies = self.db.query(SchedulingPolicy).filter(
            and_(
                SchedulingPolicy.org_id == self.org_id,
                SchedulingPolicy.is_active == True
            )
        ).all()
        self.policies = {p.policy_type: p for p in policies}
    
    def analyze_shift_coverage(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        shifts = self.db.query(ScheduledShift).filter(
            and_(
                ScheduledShift.org_id == self.org_id,
                ScheduledShift.shift_date.between(start_date, end_date),
                ScheduledShift.status.notin_(["cancelled"])
            )
        ).all()
        
        gaps = []
        critical_gaps = []
        
        for shift in shifts:
            if shift.assigned_count < shift.required_staff:
                gap_info = {
                    "shift_id": shift.id,
                    "date": shift.shift_date.isoformat(),
                    "station": shift.station_name,
                    "shortage": shift.required_staff - shift.assigned_count,
                    "is_critical": shift.is_critical,
                }
                gaps.append(gap_info)
                if shift.is_critical:
                    critical_gaps.append(gap_info)
        
        total_required = sum(s.required_staff for s in shifts)
        total_assigned = sum(s.assigned_count for s in shifts)
        
        return {
            "coverage_rate": round((total_assigned / total_required * 100) if total_required > 0 else 100, 1),
            "total_gaps": len(gaps),
            "critical_gaps": len(critical_gaps),
            "gaps": gaps,
        }
    
    def check_overtime_risk(
        self,
        user_id: int,
        proposed_hours: float = 0
    ) -> Dict[str, Any]:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        ot_record = self.db.query(OvertimeTracking).filter(
            and_(
                OvertimeTracking.org_id == self.org_id,
                OvertimeTracking.user_id == user_id,
                OvertimeTracking.period_start <= today,
                OvertimeTracking.period_end >= today
            )
        ).first()
        
        current_hours = (ot_record.regular_hours + ot_record.overtime_hours) if ot_record else 0
        threshold = self.policies.get("overtime", {})
        weekly_threshold = getattr(threshold, "overtime_threshold_weekly", 40) if threshold else 40
        alert_threshold = getattr(threshold, "alert_overtime_threshold", 35) if threshold else 35
        
        projected_hours = current_hours + proposed_hours
        
        risk_level = "low"
        if projected_hours >= weekly_threshold:
            risk_level = "high"
        elif projected_hours >= alert_threshold:
            risk_level = "medium"
        
        return {
            "user_id": user_id,
            "current_hours": current_hours,
            "proposed_hours": proposed_hours,
            "projected_hours": projected_hours,
            "weekly_threshold": weekly_threshold,
            "risk_level": risk_level,
            "overtime_projected": max(0, projected_hours - weekly_threshold),
        }
    
    def calculate_fatigue_score(
        self,
        user_id: int,
        target_date: Optional[date] = None
    ) -> Dict[str, Any]:
        if not self.fatigue_enabled:
            return {"enabled": False, "message": "Fatigue tracking requires premium subscription"}
        
        calc_date = target_date or date.today()
        
        assignments = self.db.query(ShiftAssignment).join(
            ScheduledShift, ShiftAssignment.shift_id == ScheduledShift.id
        ).filter(
            and_(
                ShiftAssignment.user_id == user_id,
                ShiftAssignment.org_id == self.org_id,
                ShiftAssignment.status.in_(["confirmed", "completed"]),
                ScheduledShift.shift_date.between(
                    calc_date - timedelta(days=7),
                    calc_date
                )
            )
        ).all()
        
        hours_7_days = sum(a.hours_worked or 0 for a in assignments)
        
        recent_assignments = [
            a for a in assignments 
            if a.actual_start and a.actual_start.date() >= calc_date - timedelta(days=2)
        ]
        hours_48 = sum(a.hours_worked or 0 for a in recent_assignments)
        
        consecutive_days = 0
        check_date = calc_date
        while True:
            day_assignments = [
                a for a in assignments 
                if any(
                    s.shift_date == check_date 
                    for s in [self.db.query(ScheduledShift).filter(ScheduledShift.id == a.shift_id).first()]
                    if s
                )
            ]
            if day_assignments:
                consecutive_days += 1
                check_date -= timedelta(days=1)
            else:
                break
        
        fatigue_score = 0
        factors = []
        
        if hours_7_days > 60:
            fatigue_score += 40
            factors.append(f"Worked {hours_7_days:.1f} hours in last 7 days (>60)")
        elif hours_7_days > 48:
            fatigue_score += 25
            factors.append(f"Worked {hours_7_days:.1f} hours in last 7 days (>48)")
        elif hours_7_days > 40:
            fatigue_score += 10
            factors.append(f"Worked {hours_7_days:.1f} hours in last 7 days (>40)")
        
        if consecutive_days >= 7:
            fatigue_score += 35
            factors.append(f"Worked {consecutive_days} consecutive days (>=7)")
        elif consecutive_days >= 5:
            fatigue_score += 20
            factors.append(f"Worked {consecutive_days} consecutive days (>=5)")
        elif consecutive_days >= 3:
            fatigue_score += 10
            factors.append(f"Worked {consecutive_days} consecutive days (>=3)")
        
        if hours_48 > 24:
            fatigue_score += 25
            factors.append(f"Worked {hours_48:.1f} hours in last 48 hours (>24)")
        elif hours_48 > 16:
            fatigue_score += 15
            factors.append(f"Worked {hours_48:.1f} hours in last 48 hours (>16)")
        
        risk_level = "low"
        if fatigue_score >= 70:
            risk_level = "critical"
        elif fatigue_score >= 50:
            risk_level = "high"
        elif fatigue_score >= 30:
            risk_level = "medium"
        
        recommendations = []
        if risk_level in ["critical", "high"]:
            recommendations.append("Consider removing from upcoming shifts")
            recommendations.append("Ensure minimum 10-hour rest before next shift")
        elif risk_level == "medium":
            recommendations.append("Monitor closely for signs of fatigue")
            recommendations.append("Avoid assigning to additional shifts this week")
        
        return {
            "enabled": True,
            "user_id": user_id,
            "calculation_date": calc_date.isoformat(),
            "fatigue_score": fatigue_score,
            "risk_level": risk_level,
            "hours_last_7_days": hours_7_days,
            "hours_last_48": hours_48,
            "consecutive_days_worked": consecutive_days,
            "factors": factors,
            "recommendations": recommendations,
        }
    
    def suggest_assignment(
        self,
        shift_id: int,
        available_users: List[int]
    ) -> List[Dict[str, Any]]:
        if not self.ai_enabled:
            return []
        
        shift = self.db.query(ScheduledShift).filter(
            ScheduledShift.id == shift_id
        ).first()
        
        if not shift:
            return []
        
        scored_users = []
        
        for user_id in available_users:
            score = 100
            reasons = []
            
            availability = self.db.query(CrewAvailability).filter(
                and_(
                    CrewAvailability.user_id == user_id,
                    CrewAvailability.date == shift.shift_date
                )
            ).first()
            
            if availability:
                if availability.availability_type == "preferred":
                    score += 20
                    reasons.append("Preferred availability")
                elif availability.availability_type == "unavailable":
                    score -= 100
                    reasons.append("Marked unavailable")
                elif availability.availability_type == "conditional":
                    score -= 10
                    reasons.append("Conditional availability")
            
            existing = self.db.query(ShiftAssignment).join(
                ScheduledShift, ShiftAssignment.shift_id == ScheduledShift.id
            ).filter(
                and_(
                    ShiftAssignment.user_id == user_id,
                    ShiftAssignment.status.notin_(["declined", "swapped"]),
                    ScheduledShift.shift_date == shift.shift_date
                )
            ).first()
            
            if existing:
                score -= 50
                reasons.append("Already has shift on this day")
            
            ot_risk = self.check_overtime_risk(user_id, shift.end_datetime.hour - shift.start_datetime.hour if shift.end_datetime and shift.start_datetime else 8)
            if ot_risk["risk_level"] == "high":
                score -= 30
                reasons.append(f"High overtime risk ({ot_risk['projected_hours']:.1f}h projected)")
            elif ot_risk["risk_level"] == "medium":
                score -= 15
                reasons.append(f"Medium overtime risk ({ot_risk['projected_hours']:.1f}h projected)")
            
            if self.fatigue_enabled:
                fatigue = self.calculate_fatigue_score(user_id, shift.shift_date)
                if fatigue.get("risk_level") == "critical":
                    score -= 50
                    reasons.append("Critical fatigue risk")
                elif fatigue.get("risk_level") == "high":
                    score -= 30
                    reasons.append("High fatigue risk")
                elif fatigue.get("risk_level") == "medium":
                    score -= 15
                    reasons.append("Medium fatigue risk")
            
            if score > 0:
                scored_users.append({
                    "user_id": user_id,
                    "score": score,
                    "reasons": reasons,
                    "overtime_risk": ot_risk["risk_level"],
                })
        
        return sorted(scored_users, key=lambda x: x["score"], reverse=True)
    
    def generate_alerts(self, target_date: Optional[date] = None) -> List[Dict[str, Any]]:
        check_date = target_date or date.today()
        alerts = []
        
        upcoming_shifts = self.db.query(ScheduledShift).filter(
            and_(
                ScheduledShift.org_id == self.org_id,
                ScheduledShift.shift_date.between(check_date, check_date + timedelta(days=7)),
                ScheduledShift.status.notin_(["cancelled", "completed"])
            )
        ).all()
        
        for shift in upcoming_shifts:
            if shift.assigned_count < shift.required_staff:
                severity = AlertSeverity.CRITICAL if shift.is_critical else AlertSeverity.WARNING
                alerts.append({
                    "type": "coverage_gap",
                    "severity": severity.value,
                    "title": f"Understaffed shift on {shift.shift_date}",
                    "message": f"Shift at {shift.station_name or 'Unknown'} needs {shift.required_staff - shift.assigned_count} more staff",
                    "shift_id": shift.id,
                })
        
        pending_timeoff = self.db.query(TimeOffRequest).filter(
            and_(
                TimeOffRequest.org_id == self.org_id,
                TimeOffRequest.status == "pending",
                TimeOffRequest.start_date <= check_date + timedelta(days=14)
            )
        ).count()
        
        if pending_timeoff > 0:
            alerts.append({
                "type": "pending_requests",
                "severity": AlertSeverity.INFO.value,
                "title": f"{pending_timeoff} pending time-off requests",
                "message": "Review and approve/deny pending time-off requests",
            })
        
        return alerts
    
    def create_recommendation(
        self,
        recommendation_type: str,
        title: str,
        description: str,
        explanation: str,
        shift_id: Optional[int] = None,
        user_id: Optional[int] = None,
        suggested_action: Optional[Dict] = None,
        confidence_score: float = 0.8,
        impact_score: float = 0.5
    ) -> AISchedulingRecommendation:
        if not self.ai_enabled:
            return None
        
        rec = AISchedulingRecommendation(
            org_id=self.org_id,
            recommendation_type=recommendation_type,
            title=title,
            description=description,
            explanation=explanation,
            shift_id=shift_id,
            user_id=user_id,
            suggested_action=suggested_action,
            confidence_score=confidence_score,
            impact_score=impact_score,
            status="pending",
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        self.db.add(rec)
        self.db.commit()
        self.db.refresh(rec)
        
        return rec
    
    def get_pending_recommendations(self) -> List[AISchedulingRecommendation]:
        return self.db.query(AISchedulingRecommendation).filter(
            and_(
                AISchedulingRecommendation.org_id == self.org_id,
                AISchedulingRecommendation.status == "pending",
                AISchedulingRecommendation.expires_at > datetime.utcnow()
            )
        ).order_by(
            AISchedulingRecommendation.impact_score.desc(),
            AISchedulingRecommendation.confidence_score.desc()
        ).all()


def get_ai_service(db: Session, org_id: int) -> SchedulingAIService:
    return SchedulingAIService(db, org_id)
