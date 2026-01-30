"""
Founder Billing Service (stable, DB-backed)

This powers the Founder dashboard billing widgets.
It is intentionally conservative: it uses local DB tables that exist in this repo
and returns safe defaults when tables are empty.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.billing import BillingRecord
from models.billing_ai import BillingAiInsight
from models.billing_claims import BillingClaim
from utils.logger import logger


class FounderBillingService:
    @staticmethod
    def _money_from_cents(value: Optional[int]) -> float:
        return float((value or 0) / 100.0)

    @staticmethod
    async def get_founder_billing_stats(db: Session, org_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Return dashboard stats expected by `AIBillingWidget`.
        """
        try:
            filters = []
            if org_id is not None:
                filters.append(BillingClaim.org_id == org_id)

            now = datetime.now(timezone.utc)
            thirty_days_ago = now - timedelta(days=30)
            seven_days_ago = now - timedelta(days=7)

            unpaid_statuses = ["draft", "submitted", "pending", "pended", "under_review"]

            unpaid_cents = (
                db.query(func.coalesce(func.sum(BillingClaim.total_charge_cents), 0))
                .filter(BillingClaim.status.in_(unpaid_statuses), *filters)
                .scalar()
            )
            unpaid_claims_value = FounderBillingService._money_from_cents(int(unpaid_cents or 0))

            overdue_cents = (
                db.query(func.coalesce(func.sum(BillingClaim.total_charge_cents), 0))
                .filter(
                    BillingClaim.status.in_(["submitted", "pending", "pended"]),
                    BillingClaim.submitted_at.isnot(None),
                    BillingClaim.submitted_at < thirty_days_ago,
                    *filters,
                )
                .scalar()
            )
            overdue_claims_value = FounderBillingService._money_from_cents(int(overdue_cents or 0))

            # Avg days to payment (paid_at - submitted_at)
            avg_days = (
                db.query(
                    func.avg(
                        func.extract("epoch", BillingClaim.paid_at - BillingClaim.submitted_at) / 86400.0
                    )
                )
                .filter(
                    BillingClaim.paid_at.isnot(None),
                    BillingClaim.submitted_at.isnot(None),
                    BillingClaim.paid_at >= thirty_days_ago,
                    *filters,
                )
                .scalar()
            )
            avg_days_to_payment = float(avg_days or 45.0)

            # "Accuracy" = % paid among submitted in last 30 days
            submitted_last_30 = (
                db.query(func.count(BillingClaim.id))
                .filter(BillingClaim.submitted_at.isnot(None), BillingClaim.submitted_at >= thirty_days_ago, *filters)
                .scalar()
            ) or 0
            paid_last_30 = (
                db.query(func.count(BillingClaim.id))
                .filter(BillingClaim.paid_at.isnot(None), BillingClaim.paid_at >= thirty_days_ago, *filters)
                .scalar()
            ) or 0
            billing_accuracy_score = (float(paid_last_30) / max(float(submitted_last_30), 1.0)) * 100.0

            claims_out_for_review = (
                db.query(func.count(BillingClaim.id))
                .filter(BillingClaim.status.in_(["under_review", "pended"]), *filters)
                .scalar()
            ) or 0

            payer_responses_pending = (
                db.query(func.count(BillingClaim.id))
                .filter(
                    BillingClaim.status.in_(["submitted", "pending"]),
                    BillingClaim.updated_at < seven_days_ago,
                    *filters,
                )
                .scalar()
            ) or 0

            # Draft invoices (best-effort: use BillingRecord "Open" as a stand-in)
            record_filters = []
            if org_id is not None:
                record_filters.append(BillingRecord.org_id == org_id)

            draft_invoices_count = (
                db.query(func.count(BillingRecord.id))
                .filter(BillingRecord.status.in_(["Open", "Draft"]), *record_filters)
                .scalar()
            ) or 0
            draft_invoices_value = float(
                db.query(func.coalesce(func.sum(BillingRecord.amount_due), 0))
                .filter(BillingRecord.status.in_(["Open", "Draft"]), *record_filters)
                .scalar()
                or 0
            )

            potential_billing_issues = (
                db.query(func.count(BillingClaim.id))
                .filter(
                    (BillingClaim.denial_reason != "") | (BillingClaim.status == "denied"),
                    *filters,
                )
                .scalar()
            ) or 0

            ai_suggestions_available = (
                db.query(func.count(BillingAiInsight.id))
                .filter(BillingAiInsight.created_at >= seven_days_ago, *( [BillingAiInsight.org_id == org_id] if org_id is not None else []))
                .scalar()
            ) or 0

            return {
                "unpaid_claims_value": float(unpaid_claims_value),
                "overdue_claims_value": float(overdue_claims_value),
                "avg_days_to_payment": round(avg_days_to_payment, 1),
                "billing_accuracy_score": round(billing_accuracy_score, 1),
                "claims_out_for_review": int(claims_out_for_review),
                "payer_responses_pending": int(payer_responses_pending),
                "draft_invoices_count": int(draft_invoices_count),
                "draft_invoices_value": float(draft_invoices_value),
                "potential_billing_issues": int(potential_billing_issues),
                "ai_suggestions_available": int(ai_suggestions_available),
            }
        except Exception as e:
            logger.error(f"Error getting founder billing stats: {e}", exc_info=True)
            return {
                "unpaid_claims_value": 0.0,
                "overdue_claims_value": 0.0,
                "avg_days_to_payment": 45.0,
                "billing_accuracy_score": 85.0,
                "claims_out_for_review": 0,
                "payer_responses_pending": 0,
                "draft_invoices_count": 0,
                "draft_invoices_value": 0.0,
                "potential_billing_issues": 0,
                "ai_suggestions_available": 0,
            }

    @staticmethod
    async def get_recent_billing_activity(
        db: Session, limit: int = 10, org_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        try:
            q = db.query(BillingClaim).order_by(BillingClaim.updated_at.desc())
            if org_id is not None:
                q = q.filter(BillingClaim.org_id == org_id)
            rows = q.limit(limit).all()

            activities: List[Dict[str, Any]] = []
            for c in rows:
                activities.append(
                    {
                        "id": str(c.id),
                        "date": (c.updated_at or c.created_at).isoformat() if (c.updated_at or c.created_at) else "",
                        "type": "claim",
                        "payer": c.payer_name or c.payer_type or "Unknown",
                        "amount": FounderBillingService._money_from_cents(c.total_charge_cents),
                        "status": c.status,
                        "ai_flagged": bool(c.denial_reason) or bool(c.denial_risk_flags),
                    }
                )
            return activities
        except Exception as e:
            logger.error(f"Error getting recent billing activity: {e}", exc_info=True)
            return []

    @staticmethod
    async def get_billing_ai_insights(db: Session, org_id: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            q = db.query(BillingAiInsight).order_by(BillingAiInsight.created_at.desc())
            if org_id is not None:
                q = q.filter(BillingAiInsight.org_id == org_id)
            rows = q.limit(10).all()

            insights: List[Dict[str, Any]] = []
            for i in rows:
                out = i.output_payload or {}
                insights.append(
                    {
                        "category": i.insight_type or "billing_issue",
                        "title": out.get("title") or "Billing insight",
                        "description": i.description or out.get("description") or "",
                        "impact": out.get("impact") or "medium",
                        "related_claims": out.get("related_claims") or [],
                        "suggested_action": out.get("suggested_action") or "Review the flagged claim(s) and take the recommended next step.",
                        "ai_confidence": float(out.get("confidence") or 0.7),
                    }
                )
            return insights
        except Exception as e:
            logger.error(f"Error getting billing AI insights: {e}", exc_info=True)
            return []

    @staticmethod
    async def generate_billing_ai_chat_response(
        db: Session, question: str, org_id: Optional[int] = None
    ) -> str:
        # Safe “no external dependency” response for now.
        stats = await FounderBillingService.get_founder_billing_stats(db=db, org_id=org_id)
        return (
            "Billing assistant (safe mode):\n\n"
            f"- Unpaid value: ${stats['unpaid_claims_value']:.2f}\n"
            f"- Overdue value: ${stats['overdue_claims_value']:.2f}\n"
            f"- Pending payer responses: {stats['payer_responses_pending']}\n\n"
            f"Question: {question}\n\n"
            "Next actions:\n"
            "1) Open the highest-value unpaid claims.\n"
            "2) Verify payer/eligibility, then confirm demographics + modifiers.\n"
            "3) If pending > 7 days, re-check Office Ally ack/EOB status and follow up.\n"
        )

    @staticmethod
    async def explain_billing_topic(db: Session, topic: str, context: Optional[str] = None) -> str:
        _ = db  # reserved for future context-aware explanations
        base = (
            f"Topic: {topic}\n\n"
            "Explanation:\n"
            "In EMS billing, a 'claim' is the packet sent to a payer requesting reimbursement. "
            "Most denials come from missing demographics, invalid payer details, coding/modifier issues, "
            "or missing medical necessity documentation.\n\n"
            "What to do next:\n"
            "- Confirm patient demographics + insurance.\n"
            "- Confirm ICD-10/SNOMED/RXNorm alignment.\n"
            "- Ensure signatures and required attachments are complete.\n"
        )
        if context:
            base += f"\nContext noted: {context}\n"
        return base

