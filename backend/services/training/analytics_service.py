"""
Training Analytics Service
Handles learning analytics, engagement metrics, knowledge retention scoring, and reporting.
"""
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, case

from models.training_management import (
    TrainingCourse,
    TrainingSession,
    TrainingEnrollment,
    TrainingRequirement,
    TrainingCompetency,
    ContinuingEducationCredit,
    FieldTrainingOfficerRecord,
    TrainingStatus,
    CourseStatus,
)
from models.hr_personnel import Personnel


class AnalyticsService:
    """Service layer for training analytics and reporting"""

    @staticmethod
    async def get_organization_dashboard(
        db: Session,
        org_id: int,
        period: str = "30d",
    ) -> Dict[str, Any]:
        """
        Get comprehensive training dashboard for organization.
        """
        # Calculate date range
        end_date = date.today()
        if period == "7d":
            start_date = end_date - timedelta(days=7)
        elif period == "30d":
            start_date = end_date - timedelta(days=30)
        elif period == "90d":
            start_date = end_date - timedelta(days=90)
        elif period == "1y":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)

        # Total enrollments
        total_enrollments = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.enrollment_date >= start_date,
            )
            .count()
        )

        # Completions
        completions = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.completion_date >= start_date,
                TrainingEnrollment.status == TrainingStatus.COMPLETED,
            )
            .count()
        )

        # Pass rate
        passed = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.completion_date >= start_date,
                TrainingEnrollment.passed == True,
            )
            .count()
        )

        pass_rate = (passed / completions * 100) if completions > 0 else 0

        # Average score
        avg_score = (
            db.query(func.avg(TrainingEnrollment.final_score))
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.completion_date >= start_date,
                TrainingEnrollment.final_score.isnot(None),
            )
            .scalar() or 0
        )

        # Total training hours
        total_hours = (
            db.query(func.sum(TrainingCourse.duration_hours))
            .join(TrainingSession)
            .join(TrainingEnrollment)
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.completion_date >= start_date,
                TrainingEnrollment.passed == True,
            )
            .scalar() or 0
        )

        # Active sessions
        active_sessions = (
            db.query(TrainingSession)
            .filter(
                TrainingSession.org_id == org_id,
                TrainingSession.status == CourseStatus.IN_PROGRESS,
            )
            .count()
        )

        # Overdue requirements
        overdue = (
            db.query(TrainingRequirement)
            .filter(
                TrainingRequirement.org_id == org_id,
                TrainingRequirement.required_by_date < date.today(),
                TrainingRequirement.status != TrainingStatus.COMPLETED,
            )
            .count()
        )

        return {
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
            "metrics": {
                "total_enrollments": total_enrollments,
                "completions": completions,
                "pass_rate": pass_rate,
                "average_score": float(avg_score),
                "total_training_hours": float(total_hours),
                "active_sessions": active_sessions,
                "overdue_requirements": overdue,
            },
        }

    @staticmethod
    async def get_engagement_metrics(
        db: Session,
        org_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Calculate training engagement metrics.
        """
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()

        # Active learners (enrolled in at least one course)
        active_learners = (
            db.query(func.count(func.distinct(TrainingEnrollment.personnel_id)))
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.enrollment_date >= start_date,
            )
            .scalar()
        )

        # Total personnel
        total_personnel = (
            db.query(Personnel)
            .filter(
                Personnel.org_id == org_id,
                Personnel.employment_status == "active",
            )
            .count()
        )

        # Engagement rate
        engagement_rate = (active_learners / total_personnel * 100) if total_personnel > 0 else 0

        # Average courses per person
        avg_courses = (
            db.query(func.count(TrainingEnrollment.id) / func.count(func.distinct(TrainingEnrollment.personnel_id)))
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.enrollment_date >= start_date,
            )
            .scalar() or 0
        )

        # Completion rate
        total_enrollments = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.enrollment_date >= start_date,
            )
            .count()
        )

        completed = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.enrollment_date >= start_date,
                TrainingEnrollment.status == TrainingStatus.COMPLETED,
            )
            .count()
        )

        completion_rate = (completed / total_enrollments * 100) if total_enrollments > 0 else 0

        return {
            "period": {
                "start_date": start_date,
                "end_date": end_date,
            },
            "engagement": {
                "active_learners": active_learners,
                "total_personnel": total_personnel,
                "engagement_rate": engagement_rate,
                "average_courses_per_person": float(avg_courses),
                "completion_rate": completion_rate,
            },
        }

    @staticmethod
    async def get_knowledge_retention_score(
        db: Session,
        org_id: int,
        personnel_id: Optional[int] = None,
        course_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Calculate knowledge retention score based on pre/post test comparison.
        """
        query = db.query(TrainingEnrollment).filter(
            TrainingEnrollment.org_id == org_id,
            TrainingEnrollment.pre_test_score.isnot(None),
            TrainingEnrollment.post_test_score.isnot(None),
        )

        if personnel_id:
            query = query.filter(TrainingEnrollment.personnel_id == personnel_id)

        if course_id:
            query = query.join(TrainingSession).filter(TrainingSession.course_id == course_id)

        enrollments = query.all()

        if not enrollments:
            return {
                "error": "No data available",
                "retention_score": 0,
            }

        # Calculate retention metrics
        improvements = []
        retention_scores = []

        for enrollment in enrollments:
            improvement = enrollment.post_test_score - enrollment.pre_test_score
            improvements.append(improvement)
            
            # Retention score = post_test_score weighted by improvement
            retention_score = (enrollment.post_test_score * 0.7) + (improvement * 0.3)
            retention_scores.append(retention_score)

        avg_retention = sum(retention_scores) / len(retention_scores)
        avg_improvement = sum(improvements) / len(improvements)
        avg_pre = sum(e.pre_test_score for e in enrollments) / len(enrollments)
        avg_post = sum(e.post_test_score for e in enrollments) / len(enrollments)

        return {
            "sample_size": len(enrollments),
            "retention_score": avg_retention,
            "average_improvement": avg_improvement,
            "average_pre_test": avg_pre,
            "average_post_test": avg_post,
            "improvement_rate": (avg_improvement / avg_pre * 100) if avg_pre > 0 else 0,
        }

    @staticmethod
    async def get_course_effectiveness(
        db: Session,
        org_id: int,
        course_id: int,
    ) -> Dict[str, Any]:
        """
        Analyze course effectiveness based on completion rates, scores, and feedback.
        """
        # Get all enrollments for course
        enrollments = (
            db.query(TrainingEnrollment)
            .join(TrainingSession)
            .filter(
                TrainingSession.course_id == course_id,
                TrainingEnrollment.org_id == org_id,
            )
            .all()
        )

        if not enrollments:
            return {"error": "No enrollment data available"}

        total = len(enrollments)
        completed = sum(1 for e in enrollments if e.status == TrainingStatus.COMPLETED)
        passed = sum(1 for e in enrollments if e.passed)
        failed = sum(1 for e in enrollments if e.status == TrainingStatus.COMPLETED and not e.passed)

        # Calculate metrics
        completion_rate = (completed / total * 100) if total > 0 else 0
        pass_rate = (passed / completed * 100) if completed > 0 else 0

        # Score statistics
        final_scores = [e.final_score for e in enrollments if e.final_score is not None]
        avg_score = sum(final_scores) / len(final_scores) if final_scores else 0
        min_score = min(final_scores) if final_scores else 0
        max_score = max(final_scores) if final_scores else 0

        # Knowledge retention
        retention = await AnalyticsService.get_knowledge_retention_score(
            db=db,
            org_id=org_id,
            course_id=course_id,
        )

        # Effectiveness score (weighted combination)
        effectiveness_score = (
            (completion_rate * 0.2) +
            (pass_rate * 0.3) +
            (avg_score * 0.3) +
            (retention.get("retention_score", 0) * 0.2)
        )

        return {
            "course_id": course_id,
            "total_enrollments": total,
            "completed": completed,
            "passed": passed,
            "failed": failed,
            "completion_rate": completion_rate,
            "pass_rate": pass_rate,
            "score_statistics": {
                "average": avg_score,
                "minimum": min_score,
                "maximum": max_score,
            },
            "knowledge_retention": retention,
            "effectiveness_score": effectiveness_score,
            "rating": AnalyticsService._get_effectiveness_rating(effectiveness_score),
        }

    @staticmethod
    def _get_effectiveness_rating(score: float) -> str:
        """Convert effectiveness score to rating."""
        if score >= 90:
            return "Excellent"
        elif score >= 80:
            return "Very Good"
        elif score >= 70:
            return "Good"
        elif score >= 60:
            return "Fair"
        else:
            return "Needs Improvement"

    @staticmethod
    async def get_instructor_performance(
        db: Session,
        org_id: int,
        instructor_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Analyze instructor performance metrics.
        """
        query = (
            db.query(TrainingSession)
            .filter(
                TrainingSession.org_id == org_id,
                TrainingSession.instructor_id == instructor_id,
            )
        )

        if start_date:
            query = query.filter(TrainingSession.start_time >= start_date)
        if end_date:
            query = query.filter(TrainingSession.start_time <= end_date)

        sessions = query.all()

        if not sessions:
            return {"error": "No session data available"}

        # Calculate metrics
        total_sessions = len(sessions)
        total_students = sum(s.students_enrolled for s in sessions)
        total_completed = sum(s.students_completed for s in sessions)
        total_failed = sum(s.students_failed for s in sessions)

        completion_rate = (total_completed / total_students * 100) if total_students > 0 else 0
        pass_rate = (
            (total_completed / (total_completed + total_failed) * 100)
            if (total_completed + total_failed) > 0
            else 0
        )

        # Get average scores from enrollments
        enrollments = (
            db.query(TrainingEnrollment)
            .join(TrainingSession)
            .filter(
                TrainingSession.instructor_id == instructor_id,
                TrainingEnrollment.final_score.isnot(None),
            )
            .all()
        )

        avg_score = (
            sum(e.final_score for e in enrollments) / len(enrollments)
            if enrollments
            else 0
        )

        return {
            "instructor_id": instructor_id,
            "total_sessions": total_sessions,
            "total_students": total_students,
            "completion_rate": completion_rate,
            "pass_rate": pass_rate,
            "average_student_score": avg_score,
        }

    @staticmethod
    async def get_trend_analysis(
        db: Session,
        org_id: int,
        metric: str = "completions",
        period: str = "monthly",
        months: int = 12,
    ) -> Dict[str, Any]:
        """
        Analyze trends over time for various training metrics.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=months * 30)

        # Get enrollments
        enrollments = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.created_at >= start_date,
            )
            .all()
        )

        # Group by month
        trends = {}
        for enrollment in enrollments:
            if metric == "completions" and enrollment.completion_date:
                month_key = enrollment.completion_date.strftime("%Y-%m")
            else:
                month_key = enrollment.enrollment_date.strftime("%Y-%m")

            if month_key not in trends:
                trends[month_key] = {
                    "enrollments": 0,
                    "completions": 0,
                    "passed": 0,
                    "scores": [],
                }

            trends[month_key]["enrollments"] += 1

            if enrollment.status == TrainingStatus.COMPLETED:
                trends[month_key]["completions"] += 1
                if enrollment.passed:
                    trends[month_key]["passed"] += 1

            if enrollment.final_score:
                trends[month_key]["scores"].append(enrollment.final_score)

        # Calculate averages
        trend_data = []
        for month, data in sorted(trends.items()):
            avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0
            pass_rate = (data["passed"] / data["completions"] * 100) if data["completions"] > 0 else 0

            trend_data.append({
                "period": month,
                "enrollments": data["enrollments"],
                "completions": data["completions"],
                "passed": data["passed"],
                "pass_rate": pass_rate,
                "average_score": avg_score,
            })

        return {
            "metric": metric,
            "period": period,
            "months": months,
            "trend_data": trend_data,
        }

    @staticmethod
    async def get_competency_heatmap(
        db: Session,
        org_id: int,
        department: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate competency heatmap showing organization-wide skill levels.
        """
        query = db.query(TrainingCompetency).filter(TrainingCompetency.org_id == org_id)

        if department:
            query = query.join(Personnel).filter(Personnel.department == department)

        competencies = query.all()

        # Group by competency name
        heatmap = {}
        for comp in competencies:
            name = comp.competency_name
            if name not in heatmap:
                heatmap[name] = {
                    "NOT_PROFICIENT": 0,
                    "BASIC": 0,
                    "INTERMEDIATE": 0,
                    "ADVANCED": 0,
                    "EXPERT": 0,
                }

            level = comp.current_proficiency_level or "NOT_PROFICIENT"
            heatmap[name][level] += 1

        # Calculate proficiency percentages
        heatmap_percentages = {}
        for skill, levels in heatmap.items():
            total = sum(levels.values())
            heatmap_percentages[skill] = {
                level: (count / total * 100) if total > 0 else 0
                for level, count in levels.items()
            }

        return {
            "organization_id": org_id,
            "department": department,
            "heatmap": heatmap,
            "heatmap_percentages": heatmap_percentages,
        }

    @staticmethod
    async def get_compliance_report(
        db: Session,
        org_id: int,
    ) -> Dict[str, Any]:
        """
        Generate training compliance report.
        """
        # Active personnel
        total_personnel = (
            db.query(Personnel)
            .filter(
                Personnel.org_id == org_id,
                Personnel.employment_status == "active",
            )
            .count()
        )

        # Overdue requirements
        overdue = (
            db.query(TrainingRequirement)
            .filter(
                TrainingRequirement.org_id == org_id,
                TrainingRequirement.required_by_date < date.today(),
                TrainingRequirement.status != TrainingStatus.COMPLETED,
            )
            .all()
        )

        # Due soon (within 30 days)
        due_soon = (
            db.query(TrainingRequirement)
            .filter(
                TrainingRequirement.org_id == org_id,
                TrainingRequirement.required_by_date >= date.today(),
                TrainingRequirement.required_by_date <= date.today() + timedelta(days=30),
                TrainingRequirement.status != TrainingStatus.COMPLETED,
            )
            .all()
        )

        # Personnel with overdue requirements
        personnel_overdue = len(set(r.personnel_id for r in overdue))
        
        # Compliance rate
        compliant_personnel = total_personnel - personnel_overdue
        compliance_rate = (compliant_personnel / total_personnel * 100) if total_personnel > 0 else 0

        return {
            "total_personnel": total_personnel,
            "compliant_personnel": compliant_personnel,
            "non_compliant_personnel": personnel_overdue,
            "compliance_rate": compliance_rate,
            "overdue_requirements": len(overdue),
            "due_soon_requirements": len(due_soon),
            "overdue_details": overdue,
            "due_soon_details": due_soon,
        }

    @staticmethod
    async def export_training_report(
        db: Session,
        org_id: int,
        report_type: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Generate comprehensive training report for export.
        """
        if not start_date:
            start_date = date.today() - timedelta(days=365)
        if not end_date:
            end_date = date.today()

        report_data = {
            "report_type": report_type,
            "generated_at": datetime.utcnow(),
            "period": {
                "start_date": start_date,
                "end_date": end_date,
            },
        }

        if report_type == "comprehensive":
            report_data["dashboard"] = await AnalyticsService.get_organization_dashboard(
                db, org_id, "1y"
            )
            report_data["engagement"] = await AnalyticsService.get_engagement_metrics(
                db, org_id, start_date, end_date
            )
            report_data["compliance"] = await AnalyticsService.get_compliance_report(db, org_id)

        elif report_type == "compliance":
            report_data["compliance"] = await AnalyticsService.get_compliance_report(db, org_id)

        elif report_type == "engagement":
            report_data["engagement"] = await AnalyticsService.get_engagement_metrics(
                db, org_id, start_date, end_date
            )

        return report_data
