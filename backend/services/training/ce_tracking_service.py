"""
Continuing Education Tracking Service
Handles CE credits, state requirements, accreditation tracking, and compliance reporting.
"""
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models.training_management import (
    ContinuingEducationCredit,
    TrainingCourse,
    TrainingEnrollment,
    TrainingSession,
)
from models.hr_personnel import Personnel, Certification


class CETrackingService:
    """Service layer for continuing education credit tracking and compliance"""

    # State CE requirements (hours per 2-year cycle)
    STATE_REQUIREMENTS = {
        "EMT": {"hours": 40, "cycle_years": 2},
        "AEMT": {"hours": 50, "cycle_years": 2},
        "Paramedic": {"hours": 60, "cycle_years": 2},
        "RN": {"hours": 30, "cycle_years": 2},
        "MD": {"hours": 50, "cycle_years": 2},
    }

    @staticmethod
    async def record_ce_credit(
        db: Session,
        org_id: int,
        personnel_id: int,
        credit_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Record CE credit from external or internal source.
        """
        # Create CE credit record
        ce_credit = ContinuingEducationCredit(
            org_id=org_id,
            personnel_id=personnel_id,
            credit_type=credit_data.get("credit_type", "CEU"),
            course_name=credit_data["course_name"],
            provider=credit_data.get("provider"),
            credit_hours=credit_data["credit_hours"],
            completion_date=credit_data.get("completion_date", date.today()),
            certificate_number=credit_data.get("certificate_number"),
            certificate_path=credit_data.get("certificate_path"),
            reporting_period=credit_data.get("reporting_period", str(date.today().year)),
        )

        db.add(ce_credit)
        db.commit()
        db.refresh(ce_credit)

        # Calculate updated totals
        totals = await CETrackingService.get_ce_totals(
            db=db,
            org_id=org_id,
            personnel_id=personnel_id,
            reporting_period=ce_credit.reporting_period,
        )

        return {
            "success": True,
            "ce_credit": ce_credit,
            "period_totals": totals,
        }

    @staticmethod
    async def get_ce_credits(
        db: Session,
        org_id: int,
        personnel_id: Optional[int] = None,
        reporting_period: Optional[str] = None,
        credit_type: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get CE credits with filtering and pagination.
        """
        query = db.query(ContinuingEducationCredit).filter(ContinuingEducationCredit.org_id == org_id)

        if personnel_id:
            query = query.filter(ContinuingEducationCredit.personnel_id == personnel_id)

        if reporting_period:
            query = query.filter(ContinuingEducationCredit.reporting_period == reporting_period)

        if credit_type:
            query = query.filter(ContinuingEducationCredit.credit_type == credit_type)

        if start_date:
            query = query.filter(ContinuingEducationCredit.completion_date >= start_date)

        if end_date:
            query = query.filter(ContinuingEducationCredit.completion_date <= end_date)

        total = query.count()
        credits = query.order_by(desc(ContinuingEducationCredit.completion_date)).limit(limit).offset(offset).all()

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "credits": credits,
        }

    @staticmethod
    async def get_ce_totals(
        db: Session,
        org_id: int,
        personnel_id: int,
        reporting_period: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculate CE credit totals for a reporting period.
        """
        if not reporting_period:
            reporting_period = str(date.today().year)

        query = db.query(ContinuingEducationCredit).filter(
            ContinuingEducationCredit.org_id == org_id,
            ContinuingEducationCredit.personnel_id == personnel_id,
            ContinuingEducationCredit.reporting_period == reporting_period,
        )

        # Total by credit type
        ceu_total = (
            query.filter(ContinuingEducationCredit.credit_type == "CEU")
            .with_entities(func.sum(ContinuingEducationCredit.credit_hours))
            .scalar() or 0
        )

        cme_total = (
            query.filter(ContinuingEducationCredit.credit_type == "CME")
            .with_entities(func.sum(ContinuingEducationCredit.credit_hours))
            .scalar() or 0
        )

        cne_total = (
            query.filter(ContinuingEducationCredit.credit_type == "CNE")
            .with_entities(func.sum(ContinuingEducationCredit.credit_hours))
            .scalar() or 0
        )

        total_hours = float(ceu_total) + float(cme_total) + float(cne_total)

        return {
            "reporting_period": reporting_period,
            "total_hours": total_hours,
            "ceu_hours": float(ceu_total),
            "cme_hours": float(cme_total),
            "cne_hours": float(cne_total),
        }

    @staticmethod
    async def check_ce_compliance(
        db: Session,
        org_id: int,
        personnel_id: int,
        certification_level: str,
    ) -> Dict[str, Any]:
        """
        Check if personnel meets CE requirements for their certification level.
        """
        # Get state requirements
        requirements = CETrackingService.STATE_REQUIREMENTS.get(
            certification_level,
            {"hours": 40, "cycle_years": 2}
        )

        # Calculate reporting period (2-year cycle)
        current_year = date.today().year
        cycle_start_year = current_year - (current_year % requirements["cycle_years"])
        reporting_period = f"{cycle_start_year}-{cycle_start_year + requirements['cycle_years'] - 1}"

        # Get CE totals
        totals = await CETrackingService.get_ce_totals(
            db=db,
            org_id=org_id,
            personnel_id=personnel_id,
            reporting_period=reporting_period,
        )

        # Calculate compliance
        required_hours = requirements["hours"]
        completed_hours = totals["total_hours"]
        remaining_hours = max(0, required_hours - completed_hours)
        compliance_percentage = (completed_hours / required_hours * 100) if required_hours > 0 else 0
        is_compliant = completed_hours >= required_hours

        return {
            "personnel_id": personnel_id,
            "certification_level": certification_level,
            "reporting_period": reporting_period,
            "required_hours": required_hours,
            "completed_hours": completed_hours,
            "remaining_hours": remaining_hours,
            "compliance_percentage": compliance_percentage,
            "is_compliant": is_compliant,
            "breakdown": totals,
        }

    @staticmethod
    async def auto_record_course_ce(
        db: Session,
        org_id: int,
        enrollment_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Automatically record CE credits when course is completed.
        """
        enrollment = (
            db.query(TrainingEnrollment)
            .filter(
                TrainingEnrollment.id == enrollment_id,
                TrainingEnrollment.org_id == org_id,
                TrainingEnrollment.passed == True,
            )
            .first()
        )

        if not enrollment:
            return None

        # Get course and session
        session = db.query(TrainingSession).filter(TrainingSession.id == enrollment.session_id).first()
        if not session:
            return None

        course = db.query(TrainingCourse).filter(TrainingCourse.id == session.course_id).first()
        if not course:
            return None

        # Check if course grants CE credits
        if course.ceu_credits == 0 and course.cme_credits == 0:
            return {"success": False, "message": "Course does not grant CE credits"}

        # Record CEU credits
        if course.ceu_credits > 0:
            ceu_credit = ContinuingEducationCredit(
                org_id=org_id,
                personnel_id=enrollment.personnel_id,
                credit_type="CEU",
                course_name=course.course_name,
                provider="FusionEMS Training Center",
                credit_hours=course.ceu_credits,
                completion_date=enrollment.completion_date,
                certificate_number=enrollment.certificate_number,
                certificate_path=enrollment.certificate_path,
                reporting_period=str(enrollment.completion_date.year),
            )
            db.add(ceu_credit)

        # Record CME credits
        if course.cme_credits > 0:
            cme_credit = ContinuingEducationCredit(
                org_id=org_id,
                personnel_id=enrollment.personnel_id,
                credit_type="CME",
                course_name=course.course_name,
                provider="FusionEMS Training Center",
                credit_hours=course.cme_credits,
                completion_date=enrollment.completion_date,
                certificate_number=enrollment.certificate_number,
                certificate_path=enrollment.certificate_path,
                reporting_period=str(enrollment.completion_date.year),
            )
            db.add(cme_credit)

        db.commit()

        return {
            "success": True,
            "ceu_credits": course.ceu_credits,
            "cme_credits": course.cme_credits,
            "total_credits": course.ceu_credits + course.cme_credits,
        }

    @staticmethod
    async def get_organization_ce_report(
        db: Session,
        org_id: int,
        reporting_period: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate organization-wide CE compliance report.
        """
        if not reporting_period:
            reporting_period = str(date.today().year)

        # Get all active personnel
        personnel = db.query(Personnel).filter(
            Personnel.org_id == org_id,
            Personnel.employment_status == "active",
        ).all()

        compliance_data = []
        compliant_count = 0
        non_compliant_count = 0

        for person in personnel:
            # Get primary certification
            certification = (
                db.query(Certification)
                .filter(
                    Certification.personnel_id == person.id,
                    Certification.is_primary == True,
                )
                .first()
            )

            if not certification:
                continue

            # Check compliance
            compliance = await CETrackingService.check_ce_compliance(
                db=db,
                org_id=org_id,
                personnel_id=person.id,
                certification_level=certification.certification_type,
            )

            compliance_data.append({
                "personnel_id": person.id,
                "name": f"{person.first_name} {person.last_name}",
                "certification": certification.certification_type,
                "compliance": compliance,
            })

            if compliance["is_compliant"]:
                compliant_count += 1
            else:
                non_compliant_count += 1

        return {
            "reporting_period": reporting_period,
            "total_personnel": len(personnel),
            "compliant": compliant_count,
            "non_compliant": non_compliant_count,
            "compliance_rate": (compliant_count / len(personnel) * 100) if personnel else 0,
            "personnel_details": compliance_data,
        }

    @staticmethod
    async def get_expiring_certifications(
        db: Session,
        org_id: int,
        days_until_expiration: int = 90,
    ) -> Dict[str, Any]:
        """
        Get certifications expiring soon with CE compliance status.
        """
        expiration_date = date.today() + timedelta(days=days_until_expiration)

        certifications = (
            db.query(Certification)
            .join(Personnel)
            .filter(
                Personnel.org_id == org_id,
                Certification.expiration_date <= expiration_date,
                Certification.expiration_date >= date.today(),
            )
            .order_by(Certification.expiration_date)
            .all()
        )

        expiring_list = []
        for cert in certifications:
            # Check CE compliance
            compliance = await CETrackingService.check_ce_compliance(
                db=db,
                org_id=org_id,
                personnel_id=cert.personnel_id,
                certification_level=cert.certification_type,
            )

            days_remaining = (cert.expiration_date - date.today()).days

            expiring_list.append({
                "certification_id": cert.id,
                "personnel_id": cert.personnel_id,
                "certification_type": cert.certification_type,
                "expiration_date": cert.expiration_date,
                "days_remaining": days_remaining,
                "ce_compliant": compliance["is_compliant"],
                "ce_hours_remaining": compliance["remaining_hours"],
            })

        return {
            "total_expiring": len(expiring_list),
            "days_until_expiration": days_until_expiration,
            "certifications": expiring_list,
        }

    @staticmethod
    async def generate_ce_transcript(
        db: Session,
        org_id: int,
        personnel_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Generate CE transcript for personnel.
        """
        if not start_date:
            start_date = date.today() - timedelta(days=730)  # 2 years
        if not end_date:
            end_date = date.today()

        credits = (
            db.query(ContinuingEducationCredit)
            .filter(
                ContinuingEducationCredit.org_id == org_id,
                ContinuingEducationCredit.personnel_id == personnel_id,
                ContinuingEducationCredit.completion_date >= start_date,
                ContinuingEducationCredit.completion_date <= end_date,
            )
            .order_by(ContinuingEducationCredit.completion_date)
            .all()
        )

        # Calculate totals
        total_ceu = sum(c.credit_hours for c in credits if c.credit_type == "CEU")
        total_cme = sum(c.credit_hours for c in credits if c.credit_type == "CME")
        total_cne = sum(c.credit_hours for c in credits if c.credit_type == "CNE")
        total_hours = total_ceu + total_cme + total_cne

        # Get personnel info
        person = db.query(Personnel).filter(Personnel.id == personnel_id).first()

        return {
            "personnel_id": personnel_id,
            "name": f"{person.first_name} {person.last_name}" if person else "Unknown",
            "date_range": {
                "start": start_date,
                "end": end_date,
            },
            "totals": {
                "total_hours": float(total_hours),
                "ceu_hours": float(total_ceu),
                "cme_hours": float(total_cme),
                "cne_hours": float(total_cne),
            },
            "credits": credits,
            "generated_at": datetime.utcnow(),
        }

    @staticmethod
    async def bulk_import_ce_credits(
        db: Session,
        org_id: int,
        credits_data: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Bulk import CE credits from external source.
        """
        successful = []
        failed = []

        for credit_data in credits_data:
            try:
                result = await CETrackingService.record_ce_credit(
                    db=db,
                    org_id=org_id,
                    personnel_id=credit_data["personnel_id"],
                    credit_data=credit_data,
                )
                successful.append(result)
            except Exception as e:
                failed.append({
                    "data": credit_data,
                    "error": str(e),
                })

        return {
            "total_processed": len(credits_data),
            "successful": len(successful),
            "failed": len(failed),
            "failed_records": failed,
        }
