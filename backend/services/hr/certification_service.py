"""
Certification Management Service
Handles certification tracking, expiration alerts, and compliance monitoring
"""
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from collections import defaultdict

from models.hr_personnel import (
    Certification,
    CertificationStatus,
    Personnel,
    EmploymentStatus
)
from utils.tenancy import scoped_query


class CertificationService:
    """Service for managing personnel certifications and compliance"""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    async def get_certifications(
        self,
        personnel_id: Optional[int] = None,
        certification_type: Optional[str] = None,
        status: Optional[CertificationStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Certification]:
        """Get certifications with optional filters"""
        query = scoped_query(self.db, Certification, self.org_id)

        if personnel_id:
            query = query.filter(Certification.personnel_id == personnel_id)
        if certification_type:
            query = query.filter(Certification.certification_type.ilike(f"%{certification_type}%"))
        if status:
            query = query.filter(Certification.status == status)

        return query.order_by(Certification.expiration_date.asc()).offset(skip).limit(limit).all()

    async def get_certification_by_id(self, certification_id: int) -> Optional[Certification]:
        """Get a single certification by ID"""
        return scoped_query(self.db, Certification, self.org_id).filter(
            Certification.id == certification_id
        ).first()

    async def create_certification(self, data: Dict[str, Any]) -> Certification:
        """Create a new certification record"""
        certification = Certification(
            org_id=self.org_id,
            **data
        )
        
        # Auto-set status based on expiration date
        if certification.expiration_date < date.today():
            certification.status = CertificationStatus.EXPIRED
        elif certification.expiration_date <= date.today() + timedelta(days=30):
            certification.status = CertificationStatus.EXPIRING_SOON
        else:
            certification.status = CertificationStatus.ACTIVE

        self.db.add(certification)
        self.db.commit()
        self.db.refresh(certification)
        return certification

    async def update_certification(
        self,
        certification_id: int,
        data: Dict[str, Any]
    ) -> Optional[Certification]:
        """Update certification record"""
        certification = await self.get_certification_by_id(certification_id)
        if not certification:
            return None

        for key, value in data.items():
            if hasattr(certification, key):
                setattr(certification, key, value)

        certification.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(certification)
        return certification

    async def delete_certification(self, certification_id: int) -> bool:
        """Delete a certification record"""
        certification = await self.get_certification_by_id(certification_id)
        if not certification:
            return False

        self.db.delete(certification)
        self.db.commit()
        return True

    async def get_expiring_certifications(
        self,
        days: int = 30
    ) -> List[Certification]:
        """
        Get certifications expiring within specified days
        Returns active certifications that will expire soon
        """
        expiry_date = date.today() + timedelta(days=days)
        return scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date <= expiry_date,
                Certification.expiration_date >= date.today(),
                Certification.status.in_([
                    CertificationStatus.ACTIVE,
                    CertificationStatus.EXPIRING_SOON
                ])
            )
        ).order_by(Certification.expiration_date.asc()).all()

    async def get_expired_certifications(self) -> List[Certification]:
        """Get all expired certifications for active personnel"""
        return scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date < date.today(),
                Certification.status == CertificationStatus.EXPIRED
            )
        ).join(Personnel).filter(
            Personnel.employment_status == EmploymentStatus.ACTIVE
        ).all()

    async def check_certification_expirations(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Comprehensive expiration check with categorization
        Returns certifications in different urgency categories
        """
        today = date.today()
        
        expired = await self.get_expired_certifications()
        expiring_7_days = await self.get_expiring_certifications(7)
        expiring_30_days = await self.get_expiring_certifications(30)
        expiring_60_days = await self.get_expiring_certifications(60)
        expiring_90_days = await self.get_expiring_certifications(90)

        def format_cert(cert: Certification) -> Dict[str, Any]:
            personnel = scoped_query(self.db, Personnel, self.org_id).filter(
                Personnel.id == cert.personnel_id
            ).first()
            
            return {
                "certification_id": cert.id,
                "personnel_id": cert.personnel_id,
                "personnel_name": f"{personnel.first_name} {personnel.last_name}" if personnel else "Unknown",
                "employee_id": personnel.employee_id if personnel else None,
                "certification_type": cert.certification_type,
                "certification_number": cert.certification_number,
                "expiration_date": cert.expiration_date.isoformat(),
                "days_until_expiration": (cert.expiration_date - today).days,
                "status": cert.status.value
            }

        return {
            "expired": [format_cert(c) for c in expired],
            "expiring_7_days": [format_cert(c) for c in expiring_7_days if c not in expired],
            "expiring_30_days": [format_cert(c) for c in expiring_30_days if c not in expiring_7_days and c not in expired],
            "expiring_60_days": [format_cert(c) for c in expiring_60_days if c not in expiring_30_days],
            "expiring_90_days": [format_cert(c) for c in expiring_90_days if c not in expiring_60_days]
        }

    async def update_certification_statuses(self) -> Dict[str, int]:
        """
        Batch update certification statuses based on expiration dates
        Should be run daily via scheduled job
        """
        today = date.today()
        counts = {
            "marked_expired": 0,
            "marked_expiring_soon": 0,
            "marked_active": 0
        }

        # Mark expired certifications
        expired = scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date < today,
                Certification.status != CertificationStatus.EXPIRED
            )
        )
        counts["marked_expired"] = expired.update(
            {Certification.status: CertificationStatus.EXPIRED},
            synchronize_session=False
        )

        # Mark expiring soon (within 30 days)
        expiring_soon = scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date >= today,
                Certification.expiration_date <= today + timedelta(days=30),
                Certification.status == CertificationStatus.ACTIVE
            )
        )
        counts["marked_expiring_soon"] = expiring_soon.update(
            {Certification.status: CertificationStatus.EXPIRING_SOON},
            synchronize_session=False
        )

        # Mark active (more than 30 days out)
        active = scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date > today + timedelta(days=30),
                Certification.status == CertificationStatus.EXPIRING_SOON
            )
        )
        counts["marked_active"] = active.update(
            {Certification.status: CertificationStatus.ACTIVE},
            synchronize_session=False
        )

        self.db.commit()
        return counts

    async def get_certification_compliance_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive compliance report
        Shows certification status across the organization
        """
        active_personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employment_status == EmploymentStatus.ACTIVE
        ).all()

        all_certifications = scoped_query(self.db, Certification, self.org_id).all()

        # Group by certification type
        cert_types = defaultdict(lambda: {
            "total": 0,
            "active": 0,
            "expiring_soon": 0,
            "expired": 0,
            "suspended": 0,
            "revoked": 0
        })

        for cert in all_certifications:
            cert_types[cert.certification_type]["total"] += 1
            cert_types[cert.certification_type][cert.status.value] += 1

        # Calculate compliance rate per type
        compliance_by_type = {}
        for cert_type, counts in cert_types.items():
            compliant = counts["active"] + counts["expiring_soon"]
            total = counts["total"]
            compliance_by_type[cert_type] = {
                "counts": counts,
                "compliance_rate": (compliant / total * 100) if total > 0 else 0
            }

        return {
            "total_personnel": len(active_personnel),
            "total_certifications": len(all_certifications),
            "compliance_by_type": compliance_by_type,
            "overall_compliance_rate": self._calculate_overall_compliance(all_certifications)
        }

    def _calculate_overall_compliance(self, certifications: List[Certification]) -> float:
        """Calculate overall compliance percentage"""
        if not certifications:
            return 100.0

        compliant = sum(
            1 for c in certifications
            if c.status in [CertificationStatus.ACTIVE, CertificationStatus.EXPIRING_SOON]
        )
        return (compliant / len(certifications)) * 100

    async def get_personnel_certifications(self, personnel_id: int) -> Dict[str, Any]:
        """
        Get all certifications for a specific personnel member
        Includes compliance status and warnings
        """
        personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.id == personnel_id
        ).first()

        if not personnel:
            return None

        certifications = scoped_query(self.db, Certification, self.org_id).filter(
            Certification.personnel_id == personnel_id
        ).order_by(Certification.expiration_date.asc()).all()

        return {
            "personnel": {
                "id": personnel.id,
                "employee_id": personnel.employee_id,
                "name": f"{personnel.first_name} {personnel.last_name}",
                "job_title": personnel.job_title,
                "department": personnel.department
            },
            "certifications": [
                {
                    "id": cert.id,
                    "type": cert.certification_type,
                    "number": cert.certification_number,
                    "issuing_authority": cert.issuing_authority,
                    "issue_date": cert.issue_date.isoformat(),
                    "expiration_date": cert.expiration_date.isoformat(),
                    "status": cert.status.value,
                    "days_until_expiration": (cert.expiration_date - date.today()).days,
                    "verified": cert.verification_date is not None
                }
                for cert in certifications
            ],
            "compliance_status": self._get_personnel_compliance_status(certifications)
        }

    def _get_personnel_compliance_status(self, certifications: List[Certification]) -> str:
        """Determine overall compliance status for a personnel member"""
        if not certifications:
            return "no_certifications"

        has_expired = any(c.status == CertificationStatus.EXPIRED for c in certifications)
        has_expiring_soon = any(c.status == CertificationStatus.EXPIRING_SOON for c in certifications)

        if has_expired:
            return "non_compliant"
        elif has_expiring_soon:
            return "warning"
        else:
            return "compliant"

    async def mark_reminder_sent(
        self,
        certification_id: int,
        reminder_type: str
    ) -> Optional[Certification]:
        """
        Mark that a reminder has been sent for a certification
        reminder_type: '90_days', '60_days', '30_days'
        """
        certification = await self.get_certification_by_id(certification_id)
        if not certification:
            return None

        field_map = {
            "90_days": "reminder_90_days_sent",
            "60_days": "reminder_60_days_sent",
            "30_days": "reminder_30_days_sent"
        }

        field = field_map.get(reminder_type)
        if field and hasattr(certification, field):
            setattr(certification, field, True)
            certification.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(certification)

        return certification

    async def get_certifications_needing_reminders(self) -> Dict[str, List[Certification]]:
        """
        Get certifications that need expiration reminders sent
        Returns certs that haven't had reminders sent yet
        """
        today = date.today()

        needing_90_day = scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date <= today + timedelta(days=90),
                Certification.expiration_date > today + timedelta(days=60),
                Certification.reminder_90_days_sent == False,
                Certification.status == CertificationStatus.ACTIVE
            )
        ).all()

        needing_60_day = scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date <= today + timedelta(days=60),
                Certification.expiration_date > today + timedelta(days=30),
                Certification.reminder_60_days_sent == False,
                Certification.status.in_([
                    CertificationStatus.ACTIVE,
                    CertificationStatus.EXPIRING_SOON
                ])
            )
        ).all()

        needing_30_day = scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date <= today + timedelta(days=30),
                Certification.expiration_date >= today,
                Certification.reminder_30_days_sent == False,
                Certification.status == CertificationStatus.EXPIRING_SOON
            )
        ).all()

        return {
            "90_day_reminders": needing_90_day,
            "60_day_reminders": needing_60_day,
            "30_day_reminders": needing_30_day
        }

    async def verify_certification(
        self,
        certification_id: int,
        verified_by: str
    ) -> Optional[Certification]:
        """Mark a certification as verified"""
        certification = await self.get_certification_by_id(certification_id)
        if not certification:
            return None

        certification.verification_date = date.today()
        certification.verified_by = verified_by
        certification.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(certification)
        return certification

    async def get_certification_statistics(self) -> Dict[str, Any]:
        """Get statistical overview of certifications"""
        all_certs = scoped_query(self.db, Certification, self.org_id).all()

        status_counts = defaultdict(int)
        for cert in all_certs:
            status_counts[cert.status.value] += 1

        return {
            "total_certifications": len(all_certs),
            "by_status": dict(status_counts),
            "expiring_this_month": len(await self.get_expiring_certifications(30)),
            "expiring_this_quarter": len(await self.get_expiring_certifications(90)),
            "compliance_rate": self._calculate_overall_compliance(all_certs)
        }
