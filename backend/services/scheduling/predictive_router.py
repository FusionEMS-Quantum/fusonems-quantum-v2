"""
FusionEMS Predictive Scheduling API Endpoints
Patent-Pending Intelligent Scheduling Features
"""

from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.user import User, UserRole
from services.scheduling.predictive_engine import (
    get_fatigue_engine,
    get_skill_tracker,
    get_swap_matcher,
    get_wellness_scheduler,
    get_pairing_engine,
    get_demand_predictor,
    FatigueRiskLevel,
    SkillDecayLevel,
)


router = APIRouter(
    prefix="/api/v1/scheduling/predictive",
    tags=["Predictive Scheduling"],
    dependencies=[Depends(require_module("SCHEDULING"))],
)


class FatigueScoreResponse(BaseModel):
    user_id: int
    overall_score: float
    risk_level: str
    factors: dict
    recommendations: List[str]
    next_safe_shift: Optional[str]


class SkillDecayResponse(BaseModel):
    user_id: int
    skill_name: str
    last_performed: Optional[str]
    days_since_use: int
    decay_level: str
    recommended_action: str


class SwapMatchResponse(BaseModel):
    requester_id: int
    target_id: int
    target_name: Optional[str]
    compatibility_score: float
    fairness_impact: float
    factors: dict
    warnings: List[str]


class WellnessAlertResponse(BaseModel):
    user_id: int
    user_name: Optional[str]
    alert_type: str
    severity: str
    incident_count: int
    days_tracked: int
    recommendation: str
    auto_action_suggested: Optional[str]


class CompetencyPairResponse(BaseModel):
    senior_id: int
    senior_name: Optional[str]
    junior_id: int
    junior_name: Optional[str]
    compatibility_score: float
    mentorship_areas: List[str]
    risk_factors: List[str]


class DemandPredictionResponse(BaseModel):
    date: str
    predicted_calls: float
    confidence: float
    recommended_staff: int
    factors: List[str]


@router.get("/fatigue/{user_id}", response_model=FatigueScoreResponse)
def get_fatigue_score(
    request: Request,
    user_id: int,
    as_of_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER])),
):
    """
    Calculate Predictive Fatigue Index for a crew member.
    Patent-pending multi-factor fatigue prediction algorithm.
    """
    engine = get_fatigue_engine(db, current_user.org_id)
    score = engine.calculate_fatigue_score(user_id, as_of_date)
    
    return FatigueScoreResponse(
        user_id=score.user_id,
        overall_score=score.overall_score,
        risk_level=score.risk_level.value,
        factors=score.factors,
        recommendations=score.recommendations,
        next_safe_shift=score.next_safe_shift.isoformat() if score.next_safe_shift else None
    )


@router.get("/fatigue/my-score", response_model=FatigueScoreResponse)
def get_my_fatigue_score(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles()),
):
    """Get your own fatigue score."""
    engine = get_fatigue_engine(db, current_user.org_id)
    score = engine.calculate_fatigue_score(current_user.id)
    
    return FatigueScoreResponse(
        user_id=score.user_id,
        overall_score=score.overall_score,
        risk_level=score.risk_level.value,
        factors=score.factors,
        recommendations=score.recommendations,
        next_safe_shift=score.next_safe_shift.isoformat() if score.next_safe_shift else None
    )


@router.get("/fatigue/high-risk", response_model=List[FatigueScoreResponse])
def get_high_risk_fatigue(
    request: Request,
    threshold: str = Query("high", enum=["moderate", "high", "critical"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN])),
):
    """Get all crew members at or above fatigue risk threshold."""
    engine = get_fatigue_engine(db, current_user.org_id)
    
    threshold_map = {
        "moderate": FatigueRiskLevel.MODERATE,
        "high": FatigueRiskLevel.HIGH,
        "critical": FatigueRiskLevel.CRITICAL,
    }
    min_level = threshold_map[threshold]
    
    users = db.query(User).filter(
        User.org_id == current_user.org_id,
        User.is_active == True
    ).all()
    
    results = []
    for user in users:
        score = engine.calculate_fatigue_score(user.id)
        level_order = [FatigueRiskLevel.LOW, FatigueRiskLevel.MODERATE, FatigueRiskLevel.HIGH, FatigueRiskLevel.CRITICAL]
        if level_order.index(score.risk_level) >= level_order.index(min_level):
            results.append(FatigueScoreResponse(
                user_id=score.user_id,
                overall_score=score.overall_score,
                risk_level=score.risk_level.value,
                factors=score.factors,
                recommendations=score.recommendations,
                next_safe_shift=score.next_safe_shift.isoformat() if score.next_safe_shift else None
            ))
    
    results.sort(key=lambda x: x.overall_score, reverse=True)
    return results


@router.get("/skills/{user_id}", response_model=List[SkillDecayResponse])
def get_skill_decay_report(
    request: Request,
    user_id: int,
    skills: Optional[str] = Query(None, description="Comma-separated skill names"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER])),
):
    """
    Get skill decay report for a crew member.
    Patent-pending skill decay tracking system.
    """
    tracker = get_skill_tracker(db, current_user.org_id)
    skill_list = skills.split(",") if skills else None
    reports = tracker.get_skill_decay_report(user_id, skill_list)
    
    return [
        SkillDecayResponse(
            user_id=r.user_id,
            skill_name=r.skill_name,
            last_performed=r.last_performed.isoformat() if r.last_performed else None,
            days_since_use=r.days_since_use,
            decay_level=r.decay_level.value,
            recommended_action=r.recommended_action
        )
        for r in reports
    ]


@router.get("/skills/my-report", response_model=List[SkillDecayResponse])
def get_my_skill_decay(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles()),
):
    """Get your own skill decay report."""
    tracker = get_skill_tracker(db, current_user.org_id)
    reports = tracker.get_skill_decay_report(current_user.id)
    
    return [
        SkillDecayResponse(
            user_id=r.user_id,
            skill_name=r.skill_name,
            last_performed=r.last_performed.isoformat() if r.last_performed else None,
            days_since_use=r.days_since_use,
            decay_level=r.decay_level.value,
            recommended_action=r.recommended_action
        )
        for r in reports
    ]


@router.get("/skills/gaps/{shift_id}")
def get_shift_skill_gaps(
    request: Request,
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER])),
):
    """Identify skill gaps for a scheduled shift."""
    tracker = get_skill_tracker(db, current_user.org_id)
    gaps = tracker.find_skill_gaps(shift_id)
    return {"shift_id": shift_id, "skill_gaps": gaps}


@router.get("/swap-matches/{assignment_id}", response_model=List[SwapMatchResponse])
def get_swap_matches(
    request: Request,
    assignment_id: int,
    max_results: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles()),
):
    """
    Find optimal swap matches for a shift assignment.
    Patent-pending intelligent swap matching algorithm.
    """
    matcher = get_swap_matcher(db, current_user.org_id)
    matches = matcher.find_swap_matches(assignment_id, max_results)
    
    user_names = {}
    user_ids = set(m.target_id for m in matches)
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_names = {u.id: u.full_name for u in users}
    
    return [
        SwapMatchResponse(
            requester_id=m.requester_id,
            target_id=m.target_id,
            target_name=user_names.get(m.target_id),
            compatibility_score=m.compatibility_score,
            fairness_impact=m.fairness_impact,
            factors=m.factors,
            warnings=m.warnings
        )
        for m in matches
    ]


@router.get("/wellness/alerts", response_model=List[WellnessAlertResponse])
def get_wellness_alerts(
    request: Request,
    threshold: str = Query("watch", enum=["watch", "concern", "intervention", "critical"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN])),
):
    """
    Get wellness alerts for crew members.
    Patent-pending critical incident exposure tracking.
    """
    scheduler = get_wellness_scheduler(db, current_user.org_id)
    alerts = scheduler.get_wellness_alerts(threshold)
    
    user_names = {}
    user_ids = set(a.user_id for a in alerts)
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_names = {u.id: u.full_name for u in users}
    
    return [
        WellnessAlertResponse(
            user_id=a.user_id,
            user_name=user_names.get(a.user_id),
            alert_type=a.alert_type,
            severity=a.severity,
            incident_count=a.incident_count,
            days_tracked=a.days_tracked,
            recommendation=a.recommendation,
            auto_action_suggested=a.auto_action_suggested
        )
        for a in alerts
    ]


@router.get("/wellness/{user_id}")
def get_user_wellness(
    request: Request,
    user_id: int,
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN])),
):
    """Get wellness score and recovery recommendations for a user."""
    scheduler = get_wellness_scheduler(db, current_user.org_id)
    score = scheduler.calculate_wellness_score(user_id, days)
    recovery = scheduler.suggest_recovery_schedule(user_id)
    
    return {
        "wellness_score": score,
        "recovery_plan": recovery
    }


@router.get("/wellness/my-wellness")
def get_my_wellness(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles()),
):
    """Get your own wellness score."""
    scheduler = get_wellness_scheduler(db, current_user.org_id)
    return scheduler.calculate_wellness_score(current_user.id)


@router.get("/pairing/optimal/{shift_id}", response_model=List[CompetencyPairResponse])
def get_optimal_pairs(
    request: Request,
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER])),
):
    """
    Find optimal crew pairings for mentorship.
    Patent-pending competency pairing engine.
    """
    engine = get_pairing_engine(db, current_user.org_id)
    pairs = engine.find_optimal_pairs(shift_id)
    
    user_ids = set()
    for p in pairs:
        user_ids.add(p.senior_id)
        user_ids.add(p.junior_id)
    
    user_names = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_names = {u.id: u.full_name for u in users}
    
    return [
        CompetencyPairResponse(
            senior_id=p.senior_id,
            senior_name=user_names.get(p.senior_id),
            junior_id=p.junior_id,
            junior_name=user_names.get(p.junior_id),
            compatibility_score=p.compatibility_score,
            mentorship_areas=p.mentorship_areas,
            risk_factors=p.risk_factors
        )
        for p in pairs
    ]


@router.get("/demand/predict/{target_date}", response_model=DemandPredictionResponse)
def predict_demand(
    request: Request,
    target_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER])),
):
    """
    Predict call volume and staffing needs for a specific date.
    Patent-pending community demand prediction algorithm.
    """
    predictor = get_demand_predictor(db, current_user.org_id)
    prediction = predictor.predict_demand(target_date)
    
    return DemandPredictionResponse(
        date=prediction.date.isoformat(),
        predicted_calls=prediction.predicted_calls,
        confidence=prediction.confidence,
        recommended_staff=prediction.recommended_staff,
        factors=prediction.factors
    )


@router.get("/demand/forecast")
def get_demand_forecast(
    request: Request,
    start_date: Optional[date] = None,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER])),
):
    """Get staffing demand forecast for a period."""
    predictor = get_demand_predictor(db, current_user.org_id)
    start = start_date or date.today()
    return predictor.get_staffing_recommendations(start, days)


@router.get("/demand/weekly")
def get_weekly_forecast(
    request: Request,
    start_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN, UserRole.DISPATCHER])),
):
    """Get weekly demand forecast with daily breakdown."""
    predictor = get_demand_predictor(db, current_user.org_id)
    start = start_date or date.today()
    predictions = predictor.get_weekly_forecast(start)
    
    return {
        "week_start": start.isoformat(),
        "predictions": [
            {
                "date": p.date.isoformat(),
                "predicted_calls": p.predicted_calls,
                "confidence": p.confidence,
                "recommended_staff": p.recommended_staff,
                "factors": p.factors
            }
            for p in predictions
        ]
    }


@router.get("/dashboard/insights")
def get_predictive_insights(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.OPS_ADMIN])),
):
    """
    Get comprehensive predictive insights dashboard.
    Aggregates all patent-pending prediction systems.
    """
    fatigue_engine = get_fatigue_engine(db, current_user.org_id)
    wellness_scheduler = get_wellness_scheduler(db, current_user.org_id)
    demand_predictor = get_demand_predictor(db, current_user.org_id)
    skill_tracker = get_skill_tracker(db, current_user.org_id)
    
    users = db.query(User).filter(
        User.org_id == current_user.org_id,
        User.is_active == True
    ).all()
    
    fatigue_critical = 0
    fatigue_high = 0
    for user in users:
        score = fatigue_engine.calculate_fatigue_score(user.id)
        if score.risk_level == FatigueRiskLevel.CRITICAL:
            fatigue_critical += 1
        elif score.risk_level == FatigueRiskLevel.HIGH:
            fatigue_high += 1
    
    wellness_alerts = wellness_scheduler.get_wellness_alerts("concern")
    
    forecast = demand_predictor.get_staffing_recommendations(date.today(), 7)
    
    skill_concerns = 0
    for user in users[:10]:
        reports = skill_tracker.get_skill_decay_report(user.id)
        for r in reports:
            if r.decay_level in [SkillDecayLevel.REFRESHER_REQUIRED, SkillDecayLevel.EXPIRED]:
                skill_concerns += 1
    
    return {
        "timestamp": date.today().isoformat(),
        "crew_count": len(users),
        "fatigue_summary": {
            "critical_count": fatigue_critical,
            "high_count": fatigue_high,
            "action_required": fatigue_critical > 0
        },
        "wellness_summary": {
            "alerts_count": len(wellness_alerts),
            "intervention_required": any(a.severity == "intervention" for a in wellness_alerts),
            "critical_required": any(a.severity == "critical" for a in wellness_alerts)
        },
        "demand_forecast": {
            "avg_daily_calls": forecast["avg_daily_calls"],
            "peak_day": forecast["peak_day"],
            "staffing_adequate": True
        },
        "skill_health": {
            "concerns_count": skill_concerns,
            "training_recommended": skill_concerns > 5
        }
    }
