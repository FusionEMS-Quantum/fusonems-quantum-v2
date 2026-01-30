"""
Founder Tax E-Filing Service
Prepares and submits tax forms (quarterly estimated, 1099, W-2) with IRS e-file.
Production: integrate with IRS FIRE or a designated e-file provider (e.g. Tax1099, Aatrix).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.founder import FounderMetric
from utils.logger import logger


class TaxEfileService:
    """Service for tax e-file prep and submission"""

    @staticmethod
    def get_efile_status(db: Session, org_id: int, tax_year: Optional[int] = None) -> Dict[str, Any]:
        """Get e-file status for the org (quarterly, 1099, W-2)."""
        year = tax_year or datetime.now(timezone.utc).year
        metrics = (
            db.query(FounderMetric)
            .filter(
                FounderMetric.org_id == org_id,
                FounderMetric.category == "tax_efile",
            )
            .order_by(desc(FounderMetric.created_at))
            .limit(200)
            .all()
        )
        filings = [m for m in metrics if str(m.details.get("tax_year", "")) == str(year)]

        quarterly = [f for f in filings if f.details.get("form_type") == "quarterly_estimated"]
        form_1099 = [f for f in filings if f.details.get("form_type") == "1099"]
        form_w2 = [f for f in filings if f.details.get("form_type") == "w2"]

        return {
            "tax_year": year,
            "quarterly_estimated": {
                "q1": _latest_status(quarterly, "Q1"),
                "q2": _latest_status(quarterly, "Q2"),
                "q3": _latest_status(quarterly, "Q3"),
                "q4": _latest_status(quarterly, "Q4"),
            },
            "1099_filed": len([f for f in form_1099 if f.value == "accepted"]) > 0,
            "w2_filed": len([f for f in form_w2 if f.value == "accepted"]) > 0,
            "recent_filings": [
                {
                    "form_type": f.details.get("form_type"),
                    "period": f.details.get("period"),
                    "status": f.value,
                    "filed_at": f.created_at.isoformat() if f.created_at else None,
                    "irs_ack_id": f.details.get("irs_ack_id"),
                }
                for f in filings[:10]
            ],
        }

    @staticmethod
    def submit_quarterly_estimated(
        db: Session,
        org_id: int,
        quarter: str,
        tax_year: int,
        amount: float,
        payment_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Submit quarterly estimated tax (Form 1040-ES). Stub: stores and returns IRS-style ack."""
        now = datetime.now(timezone.utc)
        irs_ack_id = f"EFILE-{uuid4().hex[:12].upper()}"
        metric = FounderMetric(
            org_id=org_id,
            category="tax_efile",
            value="accepted",
            details={
                "form_type": "quarterly_estimated",
                "period": quarter,
                "tax_year": tax_year,
                "amount": amount,
                "payment_date": payment_date or now.strftime("%Y-%m-%d"),
                "irs_ack_id": irs_ack_id,
                "filed_at": now.isoformat(),
                "provider": "irs_efile_stub",
            },
        )
        db.add(metric)
        db.commit()
        logger.info(f"Tax e-file: quarterly {quarter} {tax_year} submitted for org_id={org_id}, ack={irs_ack_id}")
        return {
            "status": "accepted",
            "irs_ack_id": irs_ack_id,
            "form_type": "quarterly_estimated",
            "period": quarter,
            "tax_year": tax_year,
            "filed_at": metric.created_at.isoformat() if metric.created_at else None,
        }

    @staticmethod
    def submit_1099_prep(
        db: Session,
        org_id: int,
        tax_year: int,
        recipient_count: int,
        amounts_by_type: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """Prepare 1099-NEC/MISC data for e-file. Returns prep summary; actual file via submit_efile."""
        now = datetime.now(timezone.utc)
        amounts_by_type = amounts_by_type or {}
        prep_id = f"1099-PREP-{uuid4().hex[:8].upper()}"
        metric = FounderMetric(
            org_id=org_id,
            category="tax_efile",
            value="prepared",
            details={
                "form_type": "1099",
                "tax_year": tax_year,
                "recipient_count": recipient_count,
                "amounts_by_type": amounts_by_type,
                "prep_id": prep_id,
                "prepared_at": now.isoformat(),
            },
        )
        db.add(metric)
        db.commit()
        return {
            "status": "prepared",
            "prep_id": prep_id,
            "form_type": "1099",
            "tax_year": tax_year,
            "recipient_count": recipient_count,
            "ready_to_file": True,
        }

    @staticmethod
    def submit_w2_prep(
        db: Session,
        org_id: int,
        tax_year: int,
        employee_count: int,
    ) -> Dict[str, Any]:
        """Prepare W-2 data for e-file. Returns prep summary; actual file via submit_efile."""
        now = datetime.now(timezone.utc)
        prep_id = f"W2-PREP-{uuid4().hex[:8].upper()}"
        metric = FounderMetric(
            org_id=org_id,
            category="tax_efile",
            value="prepared",
            details={
                "form_type": "w2",
                "tax_year": tax_year,
                "employee_count": employee_count,
                "prep_id": prep_id,
                "prepared_at": now.isoformat(),
            },
        )
        db.add(metric)
        db.commit()
        return {
            "status": "prepared",
            "prep_id": prep_id,
            "form_type": "w2",
            "tax_year": tax_year,
            "employee_count": employee_count,
            "ready_to_file": True,
        }

    @staticmethod
    def submit_efile(
        db: Session,
        org_id: int,
        form_type: str,
        tax_year: int,
        prep_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Submit prepared form to IRS e-file. Stub returns accepted with irs_ack_id."""
        now = datetime.now(timezone.utc)
        irs_ack_id = f"EFILE-{uuid4().hex[:12].upper()}"
        metric = FounderMetric(
            org_id=org_id,
            category="tax_efile",
            value="accepted",
            details={
                "form_type": form_type,
                "tax_year": tax_year,
                "prep_id": prep_id,
                "irs_ack_id": irs_ack_id,
                "filed_at": now.isoformat(),
                "provider": "irs_efile_stub",
            },
        )
        db.add(metric)
        db.commit()
        logger.info(f"Tax e-file: {form_type} {tax_year} submitted for org_id={org_id}, ack={irs_ack_id}")
        return {
            "status": "accepted",
            "irs_ack_id": irs_ack_id,
            "form_type": form_type,
            "tax_year": tax_year,
            "filed_at": metric.created_at.isoformat() if metric.created_at else None,
        }


def _latest_status(filings: List[FounderMetric], period: str) -> Optional[str]:
    for f in filings:
        if f.details.get("period") == period:
            return f.value
    return None
