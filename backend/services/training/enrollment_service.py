"""
Training Enrollment Service
Handles user enrollments, progress tracking, completion management, and certificate generation.
"""
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models.training_management import (
    TrainingEnrollment,
    TrainingSession,
    TrainingCourse,
    TrainingRequirement,
    TrainingStatus,
    CourseStatus,
)
from models.hr_personnel import Personnel


class EnrollmentService:
    """Service layer for training enrollment and progress tracking"""

    @staticmethod
    async def create_enrollment(
        db: Session,
        org_id: int,
        session_id: int,
        personnel_id: int,
        auto_enroll: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Create new training enrollment with validation and capacity checking.
        """
        # Get session details
        session = (
            db.query(TrainingSession)
            .filter(
                TrainingSession.id == session_id,
                TrainingSession.org_id == org_id,
            )
            .first()
        )

        if not session:
            return {"error": "Session not found"}

        if session.status == CourseStatus.CANCELLED:
            return {"error": "Session cancelled"}

        if session.status == CourseStatus.COMPLETED:
            return {"error": "Session already completed"}

        # Check capacity
        if session.max_students and session.students_enrolled >= session.max_students:
            return {"error": "Session full", "waitlist": True}

        # Check prerequisites
        course = (
            db.query(TrainingCourse)
            .filter(
                TrainingCourse.id == session.course_id,
                TrainingCourse.org_id == org_id,
            )
            .first()
        )

        if course and course.prerequisites:
            person = db.query(Personnel).filter(Personnel.id == personnel_id).first()
            if person:
                # Validate prerequisites (simplified - would need certification checking)
                missing_prereqs = []
                for prereq in course.prerequisites:
                    # Check if person has completed prerequisite course
                    prereq_completed = (
                        db.query(TrainingEnrollment)
                        .join(TrainingSession)
                        .join(TrainingCourse)
                        .filter(
                            TrainingEnrollment.personnel_id == personnel_id,
                            TrainingCourse.course_code == prereq,
                            TrainingEnrollment.passed == True,
                        )
                        .first()
                    )
                    if not prereq_completed:
                        missing_prereqs.append(prereq)

                if missing_prereqs:
                    return {"error": "Missing prerequisites", "missing": missing_prereqs}

        # Check for duplicate enrollment
        existing = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.session_id == session_id,
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
            )
            .first()
        )

        if existing:
            return {"error": "Already enrolled", "enrollment": existing}

        # Create enrollment
        enrollment = TrainingEnrollment(
            org_id=org_id,
            session_id=session_id,
            personnel_id=personnel_id,
            status=TrainingStatus.NOT_STARTED,
            enrollment_date=datetime.utcnow(),
        )

        db.add(enrollment)
        session.students_enrolled += 1
        db.commit()
        db.refresh(enrollment)

        return {
            "success": True,
            "enrollment": enrollment,
            "course": course,
            "session": session,
        }

    @staticmethod
    async def get_enrollments(
        db: Session,
        org_id: int,
        personnel_id: Optional[int] = None,
        session_id: Optional[int] = None,
        status: Optional[TrainingStatus] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get enrollments with filtering, sorting, and pagination.
        """
        query = db.query(TrainingEnrollment).filter(TrainingEnrollment.org_id == org_id)

        if personnel_id:
            query = query.filter(TrainingEnrollment.personnel_id == personnel_id)

        if session_id:
            query = query.filter(TrainingEnrollment.session_id == session_id)

        if status:
            query = query.filter(TrainingEnrollment.status == status)

        if start_date:
            query = query.filter(TrainingEnrollment.enrollment_date >= start_date)

        if end_date:
            query = query.filter(TrainingEnrollment.enrollment_date <= end_date)

        total = query.count()
        enrollments = query.order_by(desc(TrainingEnrollment.enrollment_date)).limit(limit).offset(offset).all()

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "enrollments": enrollments,
        }

    @staticmethod
    async def update_progress(
        db: Session,
        org_id: int,
        enrollment_id: int,
        progress_data: Dict[str, Any],
    ) -> Optional[TrainingEnrollment]:
        """
        Update enrollment progress including scores, attendance, and status.
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
            return None

        # Update progress fields
        if "attendance_confirmed" in progress_data:
            enrollment.attendance_confirmed = progress_data["attendance_confirmed"]
            if progress_data["attendance_confirmed"] and enrollment.status == TrainingStatus.NOT_STARTED:
                enrollment.status = TrainingStatus.IN_PROGRESS

        if "pre_test_score" in progress_data:
            enrollment.pre_test_score = progress_data["pre_test_score"]

        if "post_test_score" in progress_data:
            enrollment.post_test_score = progress_data["post_test_score"]

        if "practical_score" in progress_data:
            enrollment.practical_score = progress_data["practical_score"]

        if "feedback" in progress_data:
            enrollment.feedback = progress_data["feedback"]

        enrollment.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(enrollment)

        return enrollment

    @staticmethod
    async def complete_enrollment(
        db: Session,
        org_id: int,
        enrollment_id: int,
        final_score: float,
        passed: bool,
        issue_certificate: bool = True,
    ) -> Optional[Dict[str, Any]]:
        """
        Mark enrollment as completed, calculate final results, and issue certificate.
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
            return None

        # Update enrollment
        enrollment.final_score = final_score
        enrollment.passed = passed
        enrollment.completion_date = date.today()
        enrollment.status = TrainingStatus.COMPLETED if passed else TrainingStatus.FAILED

        # Update session statistics
        session = db.query(TrainingSession).filter(TrainingSession.id == enrollment.session_id).first()
        if session:
            if passed:
                session.students_completed += 1
            else:
                session.students_failed += 1

        # Update related training requirement
        course = db.query(TrainingCourse).filter(TrainingCourse.id == session.course_id).first()
        if passed and course:
            requirement = (
                db.query(TrainingRequirement)
                .filter(
                    TrainingRequirement.personnel_id == enrollment.personnel_id,
                    TrainingRequirement.course_id == course.id,
                    TrainingRequirement.org_id == org_id,
                    TrainingRequirement.status.in_([TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS]),
                )
                .first()
            )

            if requirement:
                requirement.status = TrainingStatus.COMPLETED
                requirement.completed_date = date.today()

                # Calculate next due date for recurring courses
                if course.recurrence_months:
                    requirement.next_due_date = date.today() + timedelta(days=course.recurrence_months * 30)

        # Issue certificate
        certificate_data = None
        if passed and issue_certificate and course:
            certificate_number = f"{course.course_code}-{enrollment.personnel_id}-{int(datetime.utcnow().timestamp())}"
            enrollment.certificate_issued = True
            enrollment.certificate_number = certificate_number
            enrollment.certificate_path = f"/certificates/{certificate_number}.pdf"

            certificate_data = {
                "certificate_number": certificate_number,
                "course_name": course.course_name,
                "completion_date": enrollment.completion_date,
                "ceu_credits": course.ceu_credits,
                "cme_credits": course.cme_credits,
            }

        db.commit()
        db.refresh(enrollment)

        return {
            "enrollment": enrollment,
            "certificate": certificate_data,
            "requirement_updated": bool(requirement) if passed else False,
        }

    @staticmethod
    async def get_personnel_progress(
        db: Session,
        org_id: int,
        personnel_id: int,
    ) -> Dict[str, Any]:
        """
        Get comprehensive training progress for a specific employee.
        """
        # Active enrollments
        active_enrollments = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.status.in_([TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS]),
            )
            .all()
        )

        # Completed enrollments
        completed_enrollments = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.status == TrainingStatus.COMPLETED,
                TrainingEnrollment.passed == True,
            )
            .order_by(desc(TrainingEnrollment.completion_date))
            .limit(20)
            .all()
        )

        # Outstanding requirements
        requirements = (
            db.query(TrainingRequirement)
            .filter(
                TrainingRequirement.personnel_id == personnel_id,
                TrainingRequirement.org_id == org_id,
                TrainingRequirement.status != TrainingStatus.COMPLETED,
            )
            .order_by(TrainingRequirement.required_by_date)
            .all()
        )

        # Calculate statistics
        total_completed = (
            db.query(func.count(TrainingEnrollment.id))
            .filter(
                TrainingEnrollment.personnel_id == personnel_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.passed == True,
            )
            .scalar()
        )

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

        overdue_count = sum(1 for req in requirements if req.required_by_date < date.today())

        return {
            "active_enrollments": active_enrollments,
            "completed_enrollments": completed_enrollments,
            "outstanding_requirements": requirements,
            "statistics": {
                "total_courses_completed": total_completed,
                "total_training_hours": float(total_hours),
                "overdue_requirements": overdue_count,
                "active_enrollments_count": len(active_enrollments),
            },
        }

    @staticmethod
    async def bulk_enroll(
        db: Session,
        org_id: int,
        session_id: int,
        personnel_ids: List[int],
    ) -> Dict[str, Any]:
        """
        Bulk enrollment for multiple personnel in a single session.
        """
        results = {
            "successful": [],
            "failed": [],
            "total_processed": len(personnel_ids),
        }

        for personnel_id in personnel_ids:
            result = await EnrollmentService.create_enrollment(
                db=db,
                org_id=org_id,
                session_id=session_id,
                personnel_id=personnel_id,
            )

            if result.get("success"):
                results["successful"].append({"personnel_id": personnel_id, "enrollment_id": result["enrollment"].id})
            else:
                results["failed"].append({"personnel_id": personnel_id, "error": result.get("error")})

        return results

    @staticmethod
    async def cancel_enrollment(
        db: Session,
        org_id: int,
        enrollment_id: int,
        reason: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Cancel an enrollment and update session capacity.
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
            return None

        if enrollment.status == TrainingStatus.COMPLETED:
            return {"error": "Cannot cancel completed enrollment"}

        # Update session capacity
        session = db.query(TrainingSession).filter(TrainingSession.id == enrollment.session_id).first()
        if session and session.students_enrolled > 0:
            session.students_enrolled -= 1

        # Soft delete by marking as cancelled (using feedback field)
        enrollment.feedback = f"Cancelled: {reason or 'No reason provided'}"
        enrollment.status = TrainingStatus.FAILED
        enrollment.updated_at = datetime.utcnow()

        db.commit()

        return {
            "success": True,
            "enrollment_id": enrollment_id,
            "seats_available": session.max_students - session.students_enrolled if session else 0,
        }

    @staticmethod
    async def get_completion_analytics(
        db: Session,
        org_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Get enrollment completion analytics for reporting.
        """
        query = db.query(TrainingEnrollment).filter(TrainingEnrollment.org_id == org_id)

        if start_date:
            query = query.filter(TrainingEnrollment.completion_date >= start_date)
        if end_date:
            query = query.filter(TrainingEnrollment.completion_date <= end_date)

        total_enrollments = query.count()
        completed = query.filter(TrainingEnrollment.status == TrainingStatus.COMPLETED).count()
        passed = query.filter(TrainingEnrollment.passed == True).count()
        failed = query.filter(TrainingEnrollment.passed == False).count()

        avg_score = (
            query.filter(TrainingEnrollment.final_score.isnot(None))
            .with_entities(func.avg(TrainingEnrollment.final_score))
            .scalar() or 0
        )

        certificates_issued = query.filter(TrainingEnrollment.certificate_issued == True).count()

        return {
            "total_enrollments": total_enrollments,
            "completed": completed,
            "passed": passed,
            "failed": failed,
            "completion_rate": (completed / total_enrollments * 100) if total_enrollments > 0 else 0,
            "pass_rate": (passed / completed * 100) if completed > 0 else 0,
            "average_score": float(avg_score),
            "certificates_issued": certificates_issued,
        }
