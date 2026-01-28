"""
Training Assessment Service
Handles quizzes, exams, skill checkoffs, scoring, retake logic, and competency validation.
"""
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models.training_management import (
    TrainingEnrollment,
    TrainingSession,
    TrainingCourse,
    TrainingCompetency,
    TrainingStatus,
)


class AssessmentService:
    """Service layer for training assessments and evaluations"""

    # Assessment types
    ASSESSMENT_TYPES = {
        "PRE_TEST": "pre_test",
        "POST_TEST": "post_test",
        "PRACTICAL": "practical",
        "SKILL_CHECKOFF": "skill_checkoff",
        "FINAL_EXAM": "final_exam",
    }

    @staticmethod
    async def create_assessment(
        db: Session,
        org_id: int,
        course_id: int,
        assessment_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Create new assessment for a course.
        Assessment data includes questions, passing score, time limit, etc.
        """
        # Assessment structure stored as JSON in course metadata
        assessment = {
            "course_id": course_id,
            "assessment_type": assessment_data.get("assessment_type", "POST_TEST"),
            "title": assessment_data.get("title"),
            "description": assessment_data.get("description"),
            "questions": assessment_data.get("questions", []),
            "passing_score": assessment_data.get("passing_score", 70.0),
            "time_limit_minutes": assessment_data.get("time_limit_minutes", 60),
            "max_attempts": assessment_data.get("max_attempts", 3),
            "randomize_questions": assessment_data.get("randomize_questions", False),
            "show_correct_answers": assessment_data.get("show_correct_answers", True),
            "created_at": datetime.utcnow().isoformat(),
        }

        return {
            "success": True,
            "assessment": assessment,
        }

    @staticmethod
    async def submit_assessment(
        db: Session,
        org_id: int,
        enrollment_id: int,
        assessment_type: str,
        answers: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Submit assessment answers and calculate score.
        """
        enrollment = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.id == enrollment_id,
                TrainingEnrollment.org_id == org_id,
            )
            .first()
        )

        if not enrollment:
            return {"error": "Enrollment not found"}

        # Calculate score (simplified - would use actual assessment questions)
        total_questions = answers.get("total_questions", 0)
        correct_answers = answers.get("correct_answers", 0)
        score = (correct_answers / total_questions * 100) if total_questions > 0 else 0

        # Store score based on assessment type
        if assessment_type == "pre_test" or assessment_type == "PRE_TEST":
            enrollment.pre_test_score = score
        elif assessment_type == "post_test" or assessment_type == "POST_TEST":
            enrollment.post_test_score = score
        elif assessment_type == "practical" or assessment_type == "PRACTICAL":
            enrollment.practical_score = score
        elif assessment_type == "final_exam" or assessment_type == "FINAL_EXAM":
            enrollment.final_score = score

        # Update status
        if enrollment.status == TrainingStatus.NOT_STARTED:
            enrollment.status = TrainingStatus.IN_PROGRESS

        enrollment.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(enrollment)

        return {
            "success": True,
            "score": score,
            "passed": score >= answers.get("passing_score", 70),
            "correct_answers": correct_answers,
            "total_questions": total_questions,
            "enrollment": enrollment,
        }

    @staticmethod
    async def get_assessment_attempts(
        db: Session,
        org_id: int,
        enrollment_id: int,
        assessment_type: str,
    ) -> Dict[str, Any]:
        """
        Get all assessment attempts for an enrollment.
        """
        enrollment = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.id == enrollment_id,
                TrainingEnrollment.org_id == org_id,
            )
            .first()
        )

        if not enrollment:
            return {"error": "Enrollment not found"}

        # Get scores from enrollment
        scores = []
        if assessment_type == "pre_test":
            if enrollment.pre_test_score is not None:
                scores.append(enrollment.pre_test_score)
        elif assessment_type == "post_test":
            if enrollment.post_test_score is not None:
                scores.append(enrollment.post_test_score)
        elif assessment_type == "practical":
            if enrollment.practical_score is not None:
                scores.append(enrollment.practical_score)
        elif assessment_type == "final":
            if enrollment.final_score is not None:
                scores.append(enrollment.final_score)

        return {
            "enrollment_id": enrollment_id,
            "assessment_type": assessment_type,
            "attempts": len(scores),
            "scores": scores,
            "best_score": max(scores) if scores else None,
            "latest_score": scores[-1] if scores else None,
        }

    @staticmethod
    async def record_skill_checkoff(
        db: Session,
        org_id: int,
        personnel_id: int,
        skill_name: str,
        evaluator_id: int,
        passed: bool,
        score: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Record skill checkoff/competency validation.
        """
        # Check if competency exists
        competency = (
            db.query(TrainingCompetency)
            .filter(
                TrainingCompetency.personnel_id == personnel_id,
                TrainingCompetency.competency_name == skill_name,
                TrainingCompetency.org_id == org_id,
            )
            .first()
        )

        if not competency:
            # Create new competency record
            competency = TrainingCompetency(
                org_id=org_id,
                personnel_id=personnel_id,
                competency_name=skill_name,
                competency_category="Clinical",
                current_proficiency_level="Basic" if passed else "Not Proficient",
                required_proficiency_level="Basic",
            )
            db.add(competency)

        # Update competency
        competency.last_evaluated_date = date.today()
        competency.evaluator_id = evaluator_id
        competency.passed_last_evaluation = passed
        competency.notes = notes or ""

        # Calculate next evaluation due date (90 days)
        competency.next_evaluation_due = date.today() + timedelta(days=90)

        db.commit()
        db.refresh(competency)

        return {
            "success": True,
            "competency": competency,
            "skill_name": skill_name,
            "passed": passed,
            "next_evaluation_due": competency.next_evaluation_due,
        }

    @staticmethod
    async def calculate_final_score(
        db: Session,
        org_id: int,
        enrollment_id: int,
        weighting: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Calculate final score using weighted averages of different assessments.
        Default weighting: Pre-test 10%, Post-test 40%, Practical 50%
        """
        enrollment = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.id == enrollment_id,
                TrainingEnrollment.org_id == org_id,
            )
            .first()
        )

        if not enrollment:
            return {"error": "Enrollment not found"}

        # Default weighting
        if not weighting:
            weighting = {
                "pre_test": 0.10,
                "post_test": 0.40,
                "practical": 0.50,
            }

        # Calculate weighted average
        components = []
        if enrollment.pre_test_score is not None:
            components.append(enrollment.pre_test_score * weighting.get("pre_test", 0))
        if enrollment.post_test_score is not None:
            components.append(enrollment.post_test_score * weighting.get("post_test", 0))
        if enrollment.practical_score is not None:
            components.append(enrollment.practical_score * weighting.get("practical", 0))

        if not components:
            return {"error": "No scores available"}

        final_score = sum(components)
        enrollment.final_score = final_score
        enrollment.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(enrollment)

        return {
            "final_score": final_score,
            "components": {
                "pre_test": enrollment.pre_test_score,
                "post_test": enrollment.post_test_score,
                "practical": enrollment.practical_score,
            },
            "weighting": weighting,
        }

    @staticmethod
    async def check_retake_eligibility(
        db: Session,
        org_id: int,
        enrollment_id: int,
        max_attempts: int = 3,
    ) -> Dict[str, Any]:
        """
        Check if student is eligible for assessment retake.
        """
        enrollment = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.id == enrollment_id,
                TrainingEnrollment.org_id == org_id,
            )
            .first()
        )

        if not enrollment:
            return {"error": "Enrollment not found"}

        # Count attempts (simplified - would track in separate table)
        attempts = 0
        if enrollment.pre_test_score is not None:
            attempts += 1
        if enrollment.post_test_score is not None:
            attempts += 1
        if enrollment.practical_score is not None:
            attempts += 1

        eligible = attempts < max_attempts
        remaining_attempts = max_attempts - attempts

        return {
            "eligible": eligible,
            "attempts": attempts,
            "max_attempts": max_attempts,
            "remaining_attempts": remaining_attempts,
            "current_status": enrollment.status,
        }

    @staticmethod
    async def get_assessment_analytics(
        db: Session,
        org_id: int,
        course_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Get assessment performance analytics.
        """
        query = (
            db.query(TrainingEnrollment)
            .join(TrainingSession)
            .filter(TrainingEnrollment.org_id == org_id)
        )

        if course_id:
            query = query.filter(TrainingSession.course_id == course_id)

        if start_date:
            query = query.filter(TrainingEnrollment.completion_date >= start_date)

        if end_date:
            query = query.filter(TrainingEnrollment.completion_date <= end_date)

        enrollments = query.all()

        # Calculate statistics
        pre_test_scores = [e.pre_test_score for e in enrollments if e.pre_test_score is not None]
        post_test_scores = [e.post_test_score for e in enrollments if e.post_test_score is not None]
        practical_scores = [e.practical_score for e in enrollments if e.practical_score is not None]
        final_scores = [e.final_score for e in enrollments if e.final_score is not None]

        def calculate_stats(scores):
            if not scores:
                return {"avg": 0, "min": 0, "max": 0, "count": 0}
            return {
                "avg": sum(scores) / len(scores),
                "min": min(scores),
                "max": max(scores),
                "count": len(scores),
            }

        return {
            "total_assessments": len(enrollments),
            "pre_test": calculate_stats(pre_test_scores),
            "post_test": calculate_stats(post_test_scores),
            "practical": calculate_stats(practical_scores),
            "final": calculate_stats(final_scores),
            "improvement_rate": (
                (sum(post_test_scores) / len(post_test_scores) - sum(pre_test_scores) / len(pre_test_scores))
                if pre_test_scores and post_test_scores
                else 0
            ),
        }

    @staticmethod
    async def get_skill_checkoff_report(
        db: Session,
        org_id: int,
        personnel_id: Optional[int] = None,
        skill_category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get skill checkoff report for personnel or organization.
        """
        query = db.query(TrainingCompetency).filter(TrainingCompetency.org_id == org_id)

        if personnel_id:
            query = query.filter(TrainingCompetency.personnel_id == personnel_id)

        if skill_category:
            query = query.filter(TrainingCompetency.competency_category == skill_category)

        competencies = query.all()

        # Calculate statistics
        total_skills = len(competencies)
        passed = sum(1 for c in competencies if c.passed_last_evaluation)
        failed = total_skills - passed

        # Due for re-evaluation
        today = date.today()
        due_for_eval = sum(
            1 for c in competencies 
            if c.next_evaluation_due and c.next_evaluation_due <= today
        )

        return {
            "total_skills": total_skills,
            "passed": passed,
            "failed": failed,
            "pass_rate": (passed / total_skills * 100) if total_skills > 0 else 0,
            "due_for_evaluation": due_for_eval,
            "competencies": competencies,
        }

    @staticmethod
    async def validate_prerequisites(
        db: Session,
        org_id: int,
        personnel_id: int,
        prerequisite_skills: List[str],
    ) -> Dict[str, Any]:
        """
        Validate that personnel has completed prerequisite skills.
        """
        missing_skills = []
        completed_skills = []

        for skill in prerequisite_skills:
            competency = (
                db.query(TrainingCompetency)
                .filter(
                    TrainingCompetency.personnel_id == personnel_id,
                    TrainingCompetency.competency_name == skill,
                    TrainingCompetency.org_id == org_id,
                    TrainingCompetency.passed_last_evaluation == True,
                )
                .first()
            )

            if competency:
                completed_skills.append(skill)
            else:
                missing_skills.append(skill)

        return {
            "valid": len(missing_skills) == 0,
            "completed_skills": completed_skills,
            "missing_skills": missing_skills,
            "completion_rate": (
                len(completed_skills) / len(prerequisite_skills) * 100
                if prerequisite_skills
                else 0
            ),
        }
