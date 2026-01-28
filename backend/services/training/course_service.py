"""
Training Course Service
Handles course catalog CRUD, session scheduling, enrollment management,
automatic certification expiration tracking, and requirement generation.
"""
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from models.training_management import (
    TrainingCourse,
    TrainingSession,
    TrainingEnrollment,
    TrainingRequirement,
    TrainingCompetency,
    FieldTrainingOfficerRecord,
    ContinuingEducationCredit,
    CourseStatus,
    TrainingStatus,
    EducationFollowUp,
)
from models.hr_personnel import Personnel, Certification, CertificationStatus
from utils.tenancy import scoped_query
from utils.time import utc_now


class CourseService:
    """Service layer for training course management"""

    @staticmethod
    def get_courses(
        db: Session,
        org_id: int,
        category: Optional[str] = None,
        mandatory_only: bool = False,
        active_only: bool = True,
        search: Optional[str] = None,
    ) -> List[TrainingCourse]:
        """Get course catalog with filtering"""
        query = scoped_query(db, TrainingCourse, org_id)

        if active_only:
            query = query.filter(TrainingCourse.active == True)

        if category:
            query = query.filter(TrainingCourse.course_category == category)

        if mandatory_only:
            query = query.filter(TrainingCourse.mandatory == True)

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    TrainingCourse.course_name.ilike(search_pattern),
                    TrainingCourse.course_code.ilike(search_pattern),
                    TrainingCourse.course_description.ilike(search_pattern),
                )
            )

        return query.order_by(TrainingCourse.course_category, TrainingCourse.course_name).all()

    @staticmethod
    def get_course_by_id(db: Session, org_id: int, course_id: int) -> Optional[TrainingCourse]:
        """Get single course by ID"""
        return scoped_query(db, TrainingCourse, org_id).filter(TrainingCourse.id == course_id).first()

    @staticmethod
    def create_course(db: Session, org_id: int, course_data: Dict[str, Any]) -> TrainingCourse:
        """Create new training course"""
        course = TrainingCourse(org_id=org_id, **course_data)
        db.add(course)
        db.commit()
        db.refresh(course)
        return course

    @staticmethod
    def update_course(
        db: Session, org_id: int, course_id: int, course_data: Dict[str, Any]
    ) -> Optional[TrainingCourse]:
        """Update existing course"""
        course = CourseService.get_course_by_id(db, org_id, course_id)
        if not course:
            return None

        for key, value in course_data.items():
            if hasattr(course, key):
                setattr(course, key, value)

        course.updated_at = utc_now()
        db.commit()
        db.refresh(course)
        return course

    @staticmethod
    def get_sessions(
        db: Session,
        org_id: int,
        course_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[CourseStatus] = None,
    ) -> List[TrainingSession]:
        """Get training sessions with filtering"""
        query = scoped_query(db, TrainingSession, org_id)

        if course_id:
            query = query.filter(TrainingSession.course_id == course_id)

        if start_date:
            query = query.filter(TrainingSession.session_date >= start_date)

        if end_date:
            query = query.filter(TrainingSession.session_date <= end_date)

        if status:
            query = query.filter(TrainingSession.status == status)

        return query.order_by(TrainingSession.session_date, TrainingSession.start_time).all()

    @staticmethod
    def create_session(db: Session, org_id: int, session_data: Dict[str, Any]) -> TrainingSession:
        """Create new training session"""
        session = TrainingSession(org_id=org_id, **session_data)
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def enroll_in_session(
        db: Session, org_id: int, session_id: int, personnel_id: int
    ) -> Optional[TrainingEnrollment]:
        """Enroll personnel in training session"""
        session = (
            scoped_query(db, TrainingSession, org_id).filter(TrainingSession.id == session_id).first()
        )

        if not session:
            return None

        # Check capacity
        if session.max_students and session.students_enrolled >= session.max_students:
            return None

        # Check if already enrolled
        existing = (
            scoped_query(db, TrainingEnrollment, org_id)
            .filter(
                TrainingEnrollment.session_id == session_id,
                TrainingEnrollment.personnel_id == personnel_id,
            )
            .first()
        )

        if existing:
            return existing

        enrollment = TrainingEnrollment(
            org_id=org_id,
            session_id=session_id,
            personnel_id=personnel_id,
            status=TrainingStatus.NOT_STARTED,
        )

        session.students_enrolled += 1

        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        return enrollment

    @staticmethod
    def get_personnel_training(
        db: Session, org_id: int, personnel_id: int
    ) -> Dict[str, Any]:
        """Get employee's training requirements and completions"""
        # Get requirements
        requirements = (
            scoped_query(db, TrainingRequirement, org_id)
            .filter(TrainingRequirement.personnel_id == personnel_id)
            .order_by(TrainingRequirement.required_by_date)
            .all()
        )

        # Get enrollments
        enrollments = (
            scoped_query(db, TrainingEnrollment, org_id)
            .filter(TrainingEnrollment.personnel_id == personnel_id)
            .order_by(TrainingEnrollment.enrollment_date.desc())
            .all()
        )

        # Get competencies
        competencies = (
            scoped_query(db, TrainingCompetency, org_id)
            .filter(TrainingCompetency.personnel_id == personnel_id)
            .all()
        )

        # Get FTO records
        fto_records = (
            scoped_query(db, FieldTrainingOfficerRecord, org_id)
            .filter(FieldTrainingOfficerRecord.trainee_id == personnel_id)
            .order_by(FieldTrainingOfficerRecord.created_at.desc())
            .all()
        )

        # Get CEU credits
        ceu_credits = (
            scoped_query(db, ContinuingEducationCredit, org_id)
            .filter(ContinuingEducationCredit.personnel_id == personnel_id)
            .order_by(ContinuingEducationCredit.completion_date.desc())
            .all()
        )

        return {
            "requirements": requirements,
            "enrollments": enrollments,
            "competencies": competencies,
            "fto_records": fto_records,
            "ceu_credits": ceu_credits,
        }

    @staticmethod
    def get_overdue_requirements(db: Session, org_id: int) -> List[TrainingRequirement]:
        """Get all overdue training requirements across organization"""
        today = date.today()
        return (
            scoped_query(db, TrainingRequirement, org_id)
            .filter(
                TrainingRequirement.required_by_date < today,
                TrainingRequirement.status.in_([TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS]),
            )
            .order_by(TrainingRequirement.required_by_date)
            .all()
        )

    @staticmethod
    def submit_fto_evaluation(
        db: Session, org_id: int, evaluation_data: Dict[str, Any]
    ) -> FieldTrainingOfficerRecord:
        """Submit FTO daily evaluation"""
        evaluation = FieldTrainingOfficerRecord(org_id=org_id, **evaluation_data)
        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)
        return evaluation

    @staticmethod
    def get_competency_matrix(
        db: Session, org_id: int, personnel_id: int
    ) -> List[TrainingCompetency]:
        """Get skills competency matrix for personnel"""
        return (
            scoped_query(db, TrainingCompetency, org_id)
            .filter(TrainingCompetency.personnel_id == personnel_id)
            .order_by(TrainingCompetency.competency_category, TrainingCompetency.competency_name)
            .all()
        )

    @staticmethod
    def submit_external_ceu(
        db: Session, org_id: int, ceu_data: Dict[str, Any]
    ) -> ContinuingEducationCredit:
        """Submit external CEU credit"""
        ceu = ContinuingEducationCredit(org_id=org_id, **ceu_data)
        db.add(ceu)
        db.commit()
        db.refresh(ceu)
        return ceu

    @staticmethod
    def track_certification_expirations(db: Session, org_id: int) -> Dict[str, Any]:
        """
        Automatic certification expiration tracking.
        Returns certifications expiring in 90, 60, and 30 days.
        """
        today = date.today()
        ninety_days = today + timedelta(days=90)
        sixty_days = today + timedelta(days=60)
        thirty_days = today + timedelta(days=30)

        # Get all active certifications
        certifications = (
            scoped_query(db, Certification, org_id)
            .filter(Certification.status == CertificationStatus.ACTIVE)
            .all()
        )

        expiring_90 = []
        expiring_60 = []
        expiring_30 = []
        expired = []

        for cert in certifications:
            if cert.expiration_date <= today:
                expired.append(cert)
                # Mark as expired
                cert.status = CertificationStatus.EXPIRED
            elif cert.expiration_date <= thirty_days:
                expiring_30.append(cert)
                if not cert.reminder_30_days_sent:
                    cert.reminder_30_days_sent = True
            elif cert.expiration_date <= sixty_days:
                expiring_60.append(cert)
                if not cert.reminder_60_days_sent:
                    cert.reminder_60_days_sent = True
            elif cert.expiration_date <= ninety_days:
                expiring_90.append(cert)
                if not cert.reminder_90_days_sent:
                    cert.reminder_90_days_sent = True

        db.commit()

        return {
            "expiring_90_days": expiring_90,
            "expiring_60_days": expiring_60,
            "expiring_30_days": expiring_30,
            "expired": expired,
            "total_tracked": len(certifications),
        }

    @staticmethod
    def generate_recurring_requirements(db: Session, org_id: int) -> List[TrainingRequirement]:
        """
        Generate training requirements for mandatory recurring courses.
        Checks completed requirements and creates new ones based on recurrence schedule.
        """
        # Get all mandatory courses with recurrence
        mandatory_courses = (
            scoped_query(db, TrainingCourse, org_id)
            .filter(
                TrainingCourse.mandatory == True,
                TrainingCourse.recurrence_months.isnot(None),
                TrainingCourse.active == True,
            )
            .all()
        )

        # Get all active personnel
        personnel_list = (
            scoped_query(db, Personnel, org_id)
            .filter(Personnel.employment_status == "active")
            .all()
        )

        new_requirements = []
        today = date.today()

        for course in mandatory_courses:
            for person in personnel_list:
                # Check if there's already an active requirement
                existing = (
                    scoped_query(db, TrainingRequirement, org_id)
                    .filter(
                        TrainingRequirement.personnel_id == person.id,
                        TrainingRequirement.course_id == course.id,
                        TrainingRequirement.status != TrainingStatus.COMPLETED,
                    )
                    .first()
                )

                if existing:
                    continue

                # Check last completed requirement
                last_completed = (
                    scoped_query(db, TrainingRequirement, org_id)
                    .filter(
                        TrainingRequirement.personnel_id == person.id,
                        TrainingRequirement.course_id == course.id,
                        TrainingRequirement.status == TrainingStatus.COMPLETED,
                    )
                    .order_by(TrainingRequirement.completed_date.desc())
                    .first()
                )

                # Determine due date
                if last_completed and last_completed.next_due_date:
                    due_date = last_completed.next_due_date
                else:
                    # First time requirement - due in recurrence period
                    due_date = today + timedelta(days=course.recurrence_months * 30)

                # Only create if due date is within next 90 days
                if due_date <= today + timedelta(days=90):
                    requirement = TrainingRequirement(
                        org_id=org_id,
                        personnel_id=person.id,
                        course_id=course.id,
                        required_by_date=due_date,
                        status=TrainingStatus.NOT_STARTED,
                    )
                    db.add(requirement)
                    new_requirements.append(requirement)

        if new_requirements:
            db.commit()
            for req in new_requirements:
                db.refresh(req)

        return new_requirements

    @staticmethod
    def complete_enrollment(
        db: Session,
        org_id: int,
        enrollment_id: int,
        final_score: float,
        passed: bool,
        completion_date: Optional[date] = None,
    ) -> Optional[TrainingEnrollment]:
        """Mark enrollment as completed and update related requirements"""
        enrollment = (
            scoped_query(db, TrainingEnrollment, org_id)
            .filter(TrainingEnrollment.id == enrollment_id)
            .first()
        )

        if not enrollment:
            return None

        enrollment.status = TrainingStatus.COMPLETED if passed else TrainingStatus.FAILED
        enrollment.final_score = final_score
        enrollment.passed = passed
        enrollment.completion_date = completion_date or date.today()

        # Update session stats
        session = (
            scoped_query(db, TrainingSession, org_id)
            .filter(TrainingSession.id == enrollment.session_id)
            .first()
        )
        if session:
            if passed:
                session.students_completed += 1
            else:
                session.students_failed += 1

        # Update related requirement
        if passed:
            session_obj = (
                scoped_query(db, TrainingSession, org_id)
                .filter(TrainingSession.id == enrollment.session_id)
                .first()
            )
            if session_obj:
                requirement = (
                    scoped_query(db, TrainingRequirement, org_id)
                    .filter(
                        TrainingRequirement.personnel_id == enrollment.personnel_id,
                        TrainingRequirement.course_id == session_obj.course_id,
                        TrainingRequirement.status != TrainingStatus.COMPLETED,
                    )
                    .first()
                )

                if requirement:
                    requirement.status = TrainingStatus.COMPLETED
                    requirement.completed_date = enrollment.completion_date

                    # Calculate next due date if recurring
                    course = (
                        scoped_query(db, TrainingCourse, org_id)
                        .filter(TrainingCourse.id == session_obj.course_id)
                        .first()
                    )
                    if course and course.recurrence_months:
                        requirement.next_due_date = enrollment.completion_date + timedelta(
                            days=course.recurrence_months * 30
                        )

        db.commit()
        db.refresh(enrollment)
        return enrollment

    @staticmethod
    def get_education_follow_ups(
        db: Session, org_id: int, personnel_id: Optional[int] = None, status: Optional[str] = None
    ) -> List[EducationFollowUp]:
        """Get education follow-ups from QA cases"""
        query = scoped_query(db, EducationFollowUp, org_id)

        if personnel_id:
            query = query.filter(EducationFollowUp.personnel_id == personnel_id)

        if status:
            query = query.filter(EducationFollowUp.status == status)

        return query.order_by(EducationFollowUp.due_date).all()

    @staticmethod
    def update_competency(
        db: Session,
        org_id: int,
        competency_id: int,
        evaluation_data: Dict[str, Any],
    ) -> Optional[TrainingCompetency]:
        """Update competency evaluation"""
        competency = (
            scoped_query(db, TrainingCompetency, org_id)
            .filter(TrainingCompetency.id == competency_id)
            .first()
        )

        if not competency:
            return None

        for key, value in evaluation_data.items():
            if hasattr(competency, key):
                setattr(competency, key, value)

        competency.updated_at = utc_now()
        db.commit()
        db.refresh(competency)
        return competency
