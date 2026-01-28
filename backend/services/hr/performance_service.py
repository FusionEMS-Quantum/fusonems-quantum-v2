"""
Performance Management Service
Handles performance reviews, goals, evaluations, and disciplinary actions
"""
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from collections import defaultdict

from models.hr_personnel import (
    PerformanceReview,
    Personnel,
    EmploymentStatus,
    DisciplinaryAction
)
from utils.tenancy import scoped_query


class PerformanceService:
    """Service for managing performance reviews and evaluations"""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    async def get_performance_reviews(
        self,
        personnel_id: Optional[int] = None,
        reviewer_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[PerformanceReview]:
        """Get performance reviews with optional filters"""
        query = scoped_query(self.db, PerformanceReview, self.org_id)

        if personnel_id:
            query = query.filter(PerformanceReview.personnel_id == personnel_id)
        if reviewer_id:
            query = query.filter(PerformanceReview.reviewer_id == reviewer_id)
        if start_date:
            query = query.filter(PerformanceReview.review_date >= start_date)
        if end_date:
            query = query.filter(PerformanceReview.review_date <= end_date)

        return query.order_by(PerformanceReview.review_date.desc()).offset(skip).limit(limit).all()

    async def get_review_by_id(self, review_id: int) -> Optional[PerformanceReview]:
        """Get a single performance review by ID"""
        return scoped_query(self.db, PerformanceReview, self.org_id).filter(
            PerformanceReview.id == review_id
        ).first()

    async def create_performance_review(self, data: Dict[str, Any]) -> PerformanceReview:
        """Create a new performance review"""
        review = PerformanceReview(
            org_id=self.org_id,
            **data
        )
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review

    async def update_performance_review(
        self,
        review_id: int,
        data: Dict[str, Any]
    ) -> Optional[PerformanceReview]:
        """Update a performance review"""
        review = await self.get_review_by_id(review_id)
        if not review:
            return None

        for key, value in data.items():
            if hasattr(review, key):
                setattr(review, key, value)

        self.db.commit()
        self.db.refresh(review)
        return review

    async def submit_employee_signature(
        self,
        review_id: int
    ) -> Optional[PerformanceReview]:
        """Record employee signature/acknowledgment of review"""
        review = await self.get_review_by_id(review_id)
        if not review:
            return None

        review.employee_signature_date = date.today()
        self.db.commit()
        self.db.refresh(review)
        return review

    async def submit_supervisor_signature(
        self,
        review_id: int
    ) -> Optional[PerformanceReview]:
        """Record supervisor signature/approval of review"""
        review = await self.get_review_by_id(review_id)
        if not review:
            return None

        review.supervisor_signature_date = date.today()
        self.db.commit()
        self.db.refresh(review)
        return review

    async def get_personnel_review_history(
        self,
        personnel_id: int
    ) -> Dict[str, Any]:
        """
        Get complete review history for a personnel member
        Includes ratings trends and statistics
        """
        personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.id == personnel_id
        ).first()

        if not personnel:
            return None

        reviews = scoped_query(self.db, PerformanceReview, self.org_id).filter(
            PerformanceReview.personnel_id == personnel_id
        ).order_by(PerformanceReview.review_date.desc()).all()

        ratings_over_time = []
        for review in reviews:
            ratings_over_time.append({
                "review_date": review.review_date.isoformat(),
                "overall_rating": review.overall_rating,
                "technical_skills": review.technical_skills_rating,
                "communication": review.communication_rating,
                "teamwork": review.teamwork_rating,
                "professionalism": review.professionalism_rating
            })

        return {
            "personnel": {
                "id": personnel.id,
                "employee_id": personnel.employee_id,
                "name": f"{personnel.first_name} {personnel.last_name}",
                "job_title": personnel.job_title,
                "department": personnel.department
            },
            "total_reviews": len(reviews),
            "latest_review_date": reviews[0].review_date.isoformat() if reviews else None,
            "average_overall_rating": self._calculate_average_rating(reviews, "overall_rating"),
            "ratings_trend": ratings_over_time,
            "reviews": [self._format_review(r) for r in reviews]
        }

    def _format_review(self, review: PerformanceReview) -> Dict[str, Any]:
        """Format review for output"""
        reviewer = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.id == review.reviewer_id
        ).first() if review.reviewer_id else None

        return {
            "id": review.id,
            "review_date": review.review_date.isoformat(),
            "period_start": review.review_period_start.isoformat() if review.review_period_start else None,
            "period_end": review.review_period_end.isoformat() if review.review_period_end else None,
            "reviewer": f"{reviewer.first_name} {reviewer.last_name}" if reviewer else None,
            "overall_rating": review.overall_rating,
            "technical_skills_rating": review.technical_skills_rating,
            "communication_rating": review.communication_rating,
            "teamwork_rating": review.teamwork_rating,
            "professionalism_rating": review.professionalism_rating,
            "strengths": review.strengths,
            "areas_for_improvement": review.areas_for_improvement,
            "goals": review.goals,
            "employee_signed": review.employee_signature_date is not None,
            "supervisor_signed": review.supervisor_signature_date is not None
        }

    def _calculate_average_rating(
        self,
        reviews: List[PerformanceReview],
        field: str
    ) -> Optional[float]:
        """Calculate average for a specific rating field"""
        if not reviews:
            return None

        ratings = [getattr(r, field) for r in reviews if getattr(r, field) is not None]
        return sum(ratings) / len(ratings) if ratings else None

    async def get_pending_reviews(self) -> List[Dict[str, Any]]:
        """
        Get reviews that are pending signatures or completion
        Identifies reviews needing action
        """
        incomplete_reviews = scoped_query(self.db, PerformanceReview, self.org_id).filter(
            or_(
                PerformanceReview.employee_signature_date.is_(None),
                PerformanceReview.supervisor_signature_date.is_(None)
            )
        ).all()

        result = []
        for review in incomplete_reviews:
            personnel = scoped_query(self.db, Personnel, self.org_id).filter(
                Personnel.id == review.personnel_id
            ).first()

            result.append({
                "review_id": review.id,
                "personnel_id": review.personnel_id,
                "personnel_name": f"{personnel.first_name} {personnel.last_name}" if personnel else "Unknown",
                "review_date": review.review_date.isoformat(),
                "employee_signed": review.employee_signature_date is not None,
                "supervisor_signed": review.supervisor_signature_date is not None,
                "days_pending": (date.today() - review.review_date).days
            })

        return result

    async def get_reviews_due_soon(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Identify personnel who are due for performance reviews
        Based on last review date + review cycle (typically annual)
        """
        active_personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employment_status == EmploymentStatus.ACTIVE
        ).all()

        due_soon = []
        for person in active_personnel:
            last_review = scoped_query(self.db, PerformanceReview, self.org_id).filter(
                PerformanceReview.personnel_id == person.id
            ).order_by(PerformanceReview.review_date.desc()).first()

            if last_review:
                # Assume annual reviews (365 days)
                next_review_due = last_review.review_date + timedelta(days=365)
                days_until_due = (next_review_due - date.today()).days

                if 0 <= days_until_due <= days:
                    due_soon.append({
                        "personnel_id": person.id,
                        "employee_id": person.employee_id,
                        "name": f"{person.first_name} {person.last_name}",
                        "job_title": person.job_title,
                        "department": person.department,
                        "last_review_date": last_review.review_date.isoformat(),
                        "next_review_due": next_review_due.isoformat(),
                        "days_until_due": days_until_due
                    })
            else:
                # Never reviewed - check hire date
                hire_anniversary = person.hire_date + timedelta(days=365)
                days_until_due = (hire_anniversary - date.today()).days

                if 0 <= days_until_due <= days:
                    due_soon.append({
                        "personnel_id": person.id,
                        "employee_id": person.employee_id,
                        "name": f"{person.first_name} {person.last_name}",
                        "job_title": person.job_title,
                        "department": person.department,
                        "last_review_date": None,
                        "next_review_due": hire_anniversary.isoformat(),
                        "days_until_due": days_until_due,
                        "note": "First review - hire anniversary"
                    })

        return sorted(due_soon, key=lambda x: x['days_until_due'])

    async def get_performance_analytics(self) -> Dict[str, Any]:
        """
        Generate analytics on performance review data
        Includes average ratings, trends, and department comparisons
        """
        all_reviews = scoped_query(self.db, PerformanceReview, self.org_id).all()

        if not all_reviews:
            return {
                "total_reviews": 0,
                "message": "No performance reviews available"
            }

        # Overall averages
        overall_avg = self._calculate_average_rating(all_reviews, "overall_rating")
        technical_avg = self._calculate_average_rating(all_reviews, "technical_skills_rating")
        communication_avg = self._calculate_average_rating(all_reviews, "communication_rating")
        teamwork_avg = self._calculate_average_rating(all_reviews, "teamwork_rating")
        professionalism_avg = self._calculate_average_rating(all_reviews, "professionalism_rating")

        # Department breakdown
        dept_ratings = defaultdict(list)
        for review in all_reviews:
            if review.overall_rating:
                personnel = scoped_query(self.db, Personnel, self.org_id).filter(
                    Personnel.id == review.personnel_id
                ).first()
                if personnel and personnel.department:
                    dept_ratings[personnel.department].append(review.overall_rating)

        dept_averages = {
            dept: sum(ratings) / len(ratings)
            for dept, ratings in dept_ratings.items()
        }

        # Recent reviews (last 90 days)
        ninety_days_ago = date.today() - timedelta(days=90)
        recent_reviews = [r for r in all_reviews if r.review_date >= ninety_days_ago]

        return {
            "total_reviews": len(all_reviews),
            "reviews_last_90_days": len(recent_reviews),
            "overall_averages": {
                "overall": overall_avg,
                "technical_skills": technical_avg,
                "communication": communication_avg,
                "teamwork": teamwork_avg,
                "professionalism": professionalism_avg
            },
            "department_averages": dept_averages,
            "completion_rate": self._calculate_completion_rate(all_reviews)
        }

    def _calculate_completion_rate(self, reviews: List[PerformanceReview]) -> float:
        """Calculate percentage of reviews with both signatures"""
        if not reviews:
            return 0.0

        completed = sum(
            1 for r in reviews
            if r.employee_signature_date and r.supervisor_signature_date
        )
        return (completed / len(reviews)) * 100

    # =========================================================================
    # DISCIPLINARY ACTIONS
    # =========================================================================

    async def get_disciplinary_actions(
        self,
        personnel_id: Optional[int] = None,
        action_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[DisciplinaryAction]:
        """Get disciplinary actions with filters"""
        query = scoped_query(self.db, DisciplinaryAction, self.org_id)

        if personnel_id:
            query = query.filter(DisciplinaryAction.personnel_id == personnel_id)
        if action_type:
            query = query.filter(DisciplinaryAction.action_type.ilike(f"%{action_type}%"))

        return query.order_by(DisciplinaryAction.action_date.desc()).offset(skip).limit(limit).all()

    async def create_disciplinary_action(self, data: Dict[str, Any]) -> DisciplinaryAction:
        """Create a new disciplinary action record"""
        action = DisciplinaryAction(
            org_id=self.org_id,
            **data
        )
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)
        return action

    async def acknowledge_disciplinary_action(
        self,
        action_id: int
    ) -> Optional[DisciplinaryAction]:
        """Mark disciplinary action as acknowledged by employee"""
        action = scoped_query(self.db, DisciplinaryAction, self.org_id).filter(
            DisciplinaryAction.id == action_id
        ).first()

        if not action:
            return None

        action.acknowledged_by_employee = True
        action.acknowledgment_date = date.today()
        self.db.commit()
        self.db.refresh(action)
        return action

    async def get_personnel_disciplinary_history(
        self,
        personnel_id: int
    ) -> Dict[str, Any]:
        """Get complete disciplinary history for a personnel member"""
        personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.id == personnel_id
        ).first()

        if not personnel:
            return None

        actions = scoped_query(self.db, DisciplinaryAction, self.org_id).filter(
            DisciplinaryAction.personnel_id == personnel_id
        ).order_by(DisciplinaryAction.action_date.desc()).all()

        # Categorize by severity
        by_severity = defaultdict(int)
        for action in actions:
            if action.severity:
                by_severity[action.severity] += 1

        return {
            "personnel": {
                "id": personnel.id,
                "employee_id": personnel.employee_id,
                "name": f"{personnel.first_name} {personnel.last_name}",
                "job_title": personnel.job_title,
                "department": personnel.department
            },
            "total_actions": len(actions),
            "by_severity": dict(by_severity),
            "actions": [
                {
                    "id": action.id,
                    "incident_date": action.incident_date.isoformat(),
                    "action_date": action.action_date.isoformat(),
                    "action_type": action.action_type,
                    "severity": action.severity,
                    "description": action.description,
                    "corrective_action": action.corrective_action,
                    "issued_by": action.issued_by,
                    "acknowledged": action.acknowledged_by_employee
                }
                for action in actions
            ]
        }

    async def get_disciplinary_statistics(self) -> Dict[str, Any]:
        """Get statistics on disciplinary actions"""
        all_actions = scoped_query(self.db, DisciplinaryAction, self.org_id).all()

        by_type = defaultdict(int)
        by_severity = defaultdict(int)

        for action in all_actions:
            by_type[action.action_type] += 1
            if action.severity:
                by_severity[action.severity] += 1

        return {
            "total_actions": len(all_actions),
            "by_type": dict(by_type),
            "by_severity": dict(by_severity),
            "acknowledgment_rate": self._calculate_acknowledgment_rate(all_actions)
        }

    def _calculate_acknowledgment_rate(self, actions: List[DisciplinaryAction]) -> float:
        """Calculate percentage of acknowledged actions"""
        if not actions:
            return 100.0

        acknowledged = sum(1 for a in actions if a.acknowledged_by_employee)
        return (acknowledged / len(actions)) * 100
