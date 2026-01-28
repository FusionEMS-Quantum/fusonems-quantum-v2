"""
Learning Path Service
Handles AI-generated learning paths, prerequisite management, and role-based curricula.
"""
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models.training_management import (
    TrainingCourse,
    TrainingEnrollment,
    TrainingSession,
    TrainingRequirement,
    TrainingCompetency,
    TrainingStatus,
)
from models.hr_personnel import Personnel, Certification


class LearningPathService:
    """Service layer for learning path generation and curriculum management"""

    # Predefined role-based curricula
    ROLE_CURRICULA = {
        "EMT-B": {
            "required_courses": ["BLS Provider", "PHTLS", "AMLS", "Patient Assessment"],
            "recommended_courses": ["Pediatric Emergency Care", "Geriatric Emergency Care"],
            "competencies": ["Vital Signs", "Patient Assessment", "CPR", "AED Use", "Bleeding Control"],
        },
        "AEMT": {
            "required_courses": ["ACLS Provider", "PHTLS", "AMLS", "Advanced Airway Management", "IV Therapy"],
            "recommended_courses": ["12-Lead ECG Interpretation", "Pharmacology"],
            "competencies": ["IV Access", "IO Access", "Advanced Airway", "Cardiac Monitoring"],
        },
        "Paramedic": {
            "required_courses": ["ACLS Provider", "PALS Provider", "PHTLS", "AMLS", "Advanced Cardiac Life Support"],
            "recommended_courses": ["Critical Care Transport", "Flight Paramedic", "Tactical EMS"],
            "competencies": ["Intubation", "Surgical Airway", "12-Lead Interpretation", "Medication Administration"],
        },
        "RN": {
            "required_courses": ["ACLS Provider", "PALS Provider", "TNCC", "Critical Care"],
            "recommended_courses": ["Flight Nursing", "Trauma Nursing"],
            "competencies": ["IV Access", "Medication Administration", "Ventilator Management"],
        },
    }

    @staticmethod
    async def generate_learning_path(
        db: Session,
        org_id: int,
        personnel_id: int,
        target_role: str,
        include_recommendations: bool = True,
    ) -> Dict[str, Any]:
        """
        Generate personalized learning path based on current competencies and target role.
        """
        # Get personnel info
        person = db.query(Personnel).filter(Personnel.id == personnel_id).first()
        if not person:
            return {"error": "Personnel not found"}

        # Get current competencies
        current_competencies = (
            db.query(TrainingCompetency)
            .filter(
                TrainingCompetency.org_id == org_id,
                TrainingCompetency.personnel_id == personnel_id,
                TrainingCompetency.passed_last_evaluation == True,
            )
            .all()
        )

        current_comp_names = [c.competency_name for c in current_competencies]

        # Get completed courses
        completed_courses = (
            db.query(TrainingCourse.course_code)
            .join(TrainingSession)
            .join(TrainingEnrollment)
            .filter(
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.passed == True,
            )
            .all()
        )
        completed_course_codes = [c[0] for c in completed_courses]

        # Get role requirements
        role_data = LearningPathService.ROLE_CURRICULA.get(target_role, {})
        
        # Calculate required courses
        required_courses = role_data.get("required_courses", [])
        missing_required = [c for c in required_courses if c not in completed_course_codes]

        # Calculate recommended courses
        recommended_courses = []
        if include_recommendations:
            recommended_courses = role_data.get("recommended_courses", [])
            recommended_courses = [c for c in recommended_courses if c not in completed_course_codes]

        # Calculate missing competencies
        required_competencies = role_data.get("competencies", [])
        missing_competencies = [c for c in required_competencies if c not in current_comp_names]

        # Build learning path with prerequisites
        learning_path = await LearningPathService._build_path_with_prerequisites(
            db=db,
            org_id=org_id,
            required_courses=missing_required,
            recommended_courses=recommended_courses,
        )

        # Calculate completion estimate
        total_courses = len(missing_required) + len(recommended_courses)
        total_hours = sum(course.get("duration_hours", 0) for course in learning_path)
        estimated_weeks = (total_hours / 40) if total_hours > 0 else 0  # Assuming 40 hours/week

        return {
            "personnel_id": personnel_id,
            "current_role": person.position_title,
            "target_role": target_role,
            "completion_status": {
                "required_courses": {
                    "total": len(required_courses),
                    "completed": len(required_courses) - len(missing_required),
                    "remaining": len(missing_required),
                },
                "competencies": {
                    "total": len(required_competencies),
                    "completed": len(required_competencies) - len(missing_competencies),
                    "remaining": len(missing_competencies),
                },
            },
            "learning_path": learning_path,
            "estimates": {
                "total_courses": total_courses,
                "total_hours": total_hours,
                "estimated_weeks": estimated_weeks,
            },
            "missing_competencies": missing_competencies,
        }

    @staticmethod
    async def _build_path_with_prerequisites(
        db: Session,
        org_id: int,
        required_courses: List[str],
        recommended_courses: List[str],
    ) -> List[Dict[str, Any]]:
        """
        Build ordered learning path considering course prerequisites.
        """
        path = []

        # Process required courses
        for course_code in required_courses:
            course = (
                db.query(TrainingCourse)
                .filter(
                    TrainingCourse.org_id == org_id,
                    TrainingCourse.course_code == course_code,
                    TrainingCourse.active == True,
                )
                .first()
            )

            if course:
                path.append({
                    "course_id": course.id,
                    "course_code": course.course_code,
                    "course_name": course.course_name,
                    "duration_hours": course.duration_hours,
                    "prerequisites": course.prerequisites or [],
                    "priority": "required",
                    "ceu_credits": course.ceu_credits,
                })

        # Process recommended courses
        for course_code in recommended_courses:
            course = (
                db.query(TrainingCourse)
                .filter(
                    TrainingCourse.org_id == org_id,
                    TrainingCourse.course_code == course_code,
                    TrainingCourse.active == True,
                )
                .first()
            )

            if course:
                path.append({
                    "course_id": course.id,
                    "course_code": course.course_code,
                    "course_name": course.course_name,
                    "duration_hours": course.duration_hours,
                    "prerequisites": course.prerequisites or [],
                    "priority": "recommended",
                    "ceu_credits": course.ceu_credits,
                })

        # Sort by prerequisites (courses with no prerequisites first)
        path.sort(key=lambda x: len(x.get("prerequisites", [])))

        return path

    @staticmethod
    async def validate_prerequisites(
        db: Session,
        org_id: int,
        personnel_id: int,
        course_id: int,
    ) -> Dict[str, Any]:
        """
        Validate that personnel has completed all prerequisites for a course.
        """
        course = (
            db.query(TrainingCourse)
            .filter(
                TrainingCourse.id == course_id,
                TrainingCourse.org_id == org_id,
            )
            .first()
        )

        if not course:
            return {"error": "Course not found"}

        if not course.prerequisites:
            return {"valid": True, "prerequisites": [], "missing": []}

        # Check each prerequisite
        missing = []
        completed = []

        for prereq_code in course.prerequisites:
            prereq_completed = (
                db.query(TrainingEnrollment)
                .join(TrainingSession)
                .join(TrainingCourse)
                .filter(
                    TrainingEnrollment.personnel_id == personnel_id,
                    TrainingEnrollment.org_id == org_id,
                    TrainingCourse.course_code == prereq_code,
                    TrainingEnrollment.passed == True,
                )
                .first()
            )

            if prereq_completed:
                completed.append(prereq_code)
            else:
                missing.append(prereq_code)

        return {
            "valid": len(missing) == 0,
            "course_id": course_id,
            "course_name": course.course_name,
            "prerequisites": course.prerequisites,
            "completed": completed,
            "missing": missing,
        }

    @staticmethod
    async def recommend_next_courses(
        db: Session,
        org_id: int,
        personnel_id: int,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """
        AI-powered recommendation of next courses based on completed courses and competencies.
        """
        # Get completed courses
        completed = (
            db.query(TrainingCourse)
            .join(TrainingSession)
            .join(TrainingEnrollment)
            .filter(
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.passed == True,
            )
            .all()
        )

        completed_categories = [c.course_category for c in completed]
        completed_codes = [c.course_code for c in completed]

        # Get available courses
        available = (
            db.query(TrainingCourse)
            .filter(
                TrainingCourse.org_id == org_id,
                TrainingCourse.active == True,
            )
            .all()
        )

        # Score each course
        recommendations = []
        for course in available:
            if course.course_code in completed_codes:
                continue

            score = 0

            # Same category as completed courses (relevance)
            if course.course_category in completed_categories:
                score += 3

            # Prerequisites met
            prereqs_met = True
            if course.prerequisites:
                for prereq in course.prerequisites:
                    if prereq not in completed_codes:
                        prereqs_met = False
                        break
            
            if prereqs_met:
                score += 5
            else:
                continue  # Skip if prerequisites not met

            # Grants certification (high value)
            if course.grants_certification:
                score += 4

            # Mandatory courses (high priority)
            if course.mandatory:
                score += 6

            # CEU credits (professional development value)
            score += course.ceu_credits * 0.5

            recommendations.append({
                "course": course,
                "score": score,
                "reason": LearningPathService._generate_recommendation_reason(
                    course, completed_categories, prereqs_met
                ),
            })

        # Sort by score and limit
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        recommendations = recommendations[:limit]

        return {
            "personnel_id": personnel_id,
            "recommendations": [
                {
                    "course_id": r["course"].id,
                    "course_code": r["course"].course_code,
                    "course_name": r["course"].course_name,
                    "category": r["course"].course_category,
                    "duration_hours": r["course"].duration_hours,
                    "ceu_credits": r["course"].ceu_credits,
                    "score": r["score"],
                    "reason": r["reason"],
                }
                for r in recommendations
            ],
        }

    @staticmethod
    def _generate_recommendation_reason(
        course: TrainingCourse,
        completed_categories: List[str],
        prereqs_met: bool,
    ) -> str:
        """Generate human-readable recommendation reason."""
        reasons = []

        if course.mandatory:
            reasons.append("Required course for your role")
        
        if course.grants_certification:
            reasons.append(f"Grants {course.certification_name} certification")
        
        if course.course_category in completed_categories:
            reasons.append("Builds on your previous training")
        
        if course.ceu_credits > 0:
            reasons.append(f"Provides {course.ceu_credits} CEU credits")
        
        if prereqs_met and course.prerequisites:
            reasons.append("You meet all prerequisites")

        return "; ".join(reasons) if reasons else "Recommended based on your profile"

    @staticmethod
    async def create_training_plan(
        db: Session,
        org_id: int,
        personnel_id: int,
        course_ids: List[int],
        target_completion_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Create structured training plan with scheduled requirements.
        """
        if not target_completion_date:
            target_completion_date = date.today() + timedelta(days=365)

        # Get courses
        courses = (
            db.query(TrainingCourse)
            .filter(
                TrainingCourse.id.in_(course_ids),
                TrainingCourse.org_id == org_id,
            )
            .all()
        )

        # Create training requirements
        requirements = []
        total_hours = sum(c.duration_hours for c in courses)
        days_available = (target_completion_date - date.today()).days
        
        # Distribute courses evenly over available time
        courses_sorted = sorted(courses, key=lambda x: len(x.prerequisites or []))
        
        current_date = date.today()
        for i, course in enumerate(courses_sorted):
            # Calculate due date
            time_fraction = (i + 1) / len(courses_sorted)
            days_offset = int(days_available * time_fraction)
            due_date = current_date + timedelta(days=days_offset)

            # Create requirement
            requirement = TrainingRequirement(
                org_id=org_id,
                personnel_id=personnel_id,
                course_id=course.id,
                required_by_date=due_date,
                status=TrainingStatus.NOT_STARTED,
            )
            db.add(requirement)
            requirements.append({
                "course_id": course.id,
                "course_name": course.course_name,
                "due_date": due_date,
                "duration_hours": course.duration_hours,
            })

        db.commit()

        return {
            "success": True,
            "personnel_id": personnel_id,
            "plan_created": datetime.utcnow(),
            "target_completion_date": target_completion_date,
            "total_courses": len(courses),
            "total_hours": total_hours,
            "requirements": requirements,
        }

    @staticmethod
    async def get_career_progression_path(
        db: Session,
        org_id: int,
        current_role: str,
        target_role: str,
    ) -> Dict[str, Any]:
        """
        Generate career progression path from current role to target role.
        """
        # Define career ladder
        career_ladder = ["EMT-B", "AEMT", "Paramedic", "Critical Care Paramedic", "Flight Paramedic"]
        
        try:
            current_index = career_ladder.index(current_role)
            target_index = career_ladder.index(target_role)
        except ValueError:
            return {"error": "Role not found in career ladder"}

        if current_index >= target_index:
            return {"error": "Target role must be higher than current role"}

        # Build progression path
        progression = []
        for i in range(current_index + 1, target_index + 1):
            role = career_ladder[i]
            role_data = LearningPathService.ROLE_CURRICULA.get(role, {})
            
            progression.append({
                "role": role,
                "required_courses": role_data.get("required_courses", []),
                "recommended_courses": role_data.get("recommended_courses", []),
                "competencies": role_data.get("competencies", []),
            })

        # Calculate total requirements
        total_courses = sum(
            len(step["required_courses"]) + len(step["recommended_courses"])
            for step in progression
        )

        return {
            "current_role": current_role,
            "target_role": target_role,
            "progression_steps": len(progression),
            "total_courses": total_courses,
            "progression_path": progression,
        }

    @staticmethod
    async def get_learning_analytics(
        db: Session,
        org_id: int,
        personnel_id: int,
    ) -> Dict[str, Any]:
        """
        Get learning analytics and progress metrics for personnel.
        """
        # Completed courses
        completed = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.passed == True,
            )
            .count()
        )

        # In progress
        in_progress = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.status == TrainingStatus.IN_PROGRESS,
            )
            .count()
        )

        # Outstanding requirements
        outstanding = (
            db.query(TrainingRequirement)
            .filter(
                TrainingRequirement.personnel_id == personnel_id,
                TrainingRequirement.org_id == org_id,
                TrainingRequirement.status != TrainingStatus.COMPLETED,
            )
            .count()
        )

        # Total training hours
        total_hours = (
            db.query(func.sum(TrainingCourse.duration_hours))
            .join(TrainingSession)
            .join(TrainingEnrollment)
            .filter(
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.passed == True,
            )
            .scalar() or 0
        )

        # Average score
        avg_score = (
            db.query(func.avg(TrainingEnrollment.final_score))
            .filter(
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.final_score.isnot(None),
            )
            .scalar() or 0
        )

        return {
            "personnel_id": personnel_id,
            "courses_completed": completed,
            "courses_in_progress": in_progress,
            "outstanding_requirements": outstanding,
            "total_training_hours": float(total_hours),
            "average_score": float(avg_score),
        }
