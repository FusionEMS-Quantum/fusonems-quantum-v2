"""
Daily AI Briefing for Founder
Calm, concise, 1-2 minute read format
FREE - No paid AI services, uses existing data aggregation
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from models.billing_accounts import BillingPayment
from models.collections_governance import CollectionsAccount
from models.payment_resolution import DenialAppeal, InsuranceFollowUp, PaymentPlan
from models.billing_claims import BillingClaim
from models.epcr_core import Patient
from models.communications import CommsMessage
from models.agency_portal import AgencyPortalMessage
from models.cad import CADIncident
from utils.logger import logger


# LOCKED UI LABELS
BRIEFING_TITLE = "Daily Briefing"
SECTION_HEADERS = {
    "revenue": "Revenue & Collections",
    "denials": "Denials Requiring Attention",
    "agency": "Agency Communications",
    "operations": "Operations Snapshot",
    "action_items": "Recommended Actions"
}


class DailyBriefing:
    """
    Daily AI Briefing generator for founder.
    Calm, concise, actionable format.
    FREE - No paid AI APIs, uses rule-based aggregation.
    """
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self.today = datetime.utcnow().date()
        self.yesterday = self.today - timedelta(days=1)
        self.last_7_days = self.today - timedelta(days=7)
        self.last_30_days = self.today - timedelta(days=30)
    
    def generate_briefing(self) -> Dict:
        """
        Generate complete daily briefing.
        Returns structured data for display.
        """
        logger.info(f"Generating daily briefing for org {self.org_id}")
        
        briefing = {
            "date": self.today.isoformat(),
            "title": BRIEFING_TITLE,
            "sections": {
                "revenue": self._generate_revenue_section(),
                "denials": self._generate_denials_section(),
                "agency": self._generate_agency_section(),
                "operations": self._generate_operations_section(),
                "action_items": []  # Populated at end
            },
            "summary": "",  # Generated at end
            "tone": "calm",  # Always calm, never alarming
        }
        
        # Generate action items based on all sections
        briefing["sections"]["action_items"] = self._generate_action_items(briefing)
        
        # Generate executive summary
        briefing["summary"] = self._generate_summary(briefing)
        
        return briefing
    
    def _generate_revenue_section(self) -> Dict:
        """Revenue & Collections section."""
        
        # Yesterday's payments
        payments_yesterday = self.db.query(
            func.sum(BillingPayment.amount)
        ).filter(
            and_(
                BillingPayment.org_id == self.org_id,
                func.date(BillingPayment.received_at) == self.yesterday
            )
        ).scalar() or 0
        
        # Last 7 days payments
        payments_7d = self.db.query(
            func.sum(BillingPayment.amount)
        ).filter(
            and_(
                BillingPayment.org_id == self.org_id,
                func.date(BillingPayment.received_at) >= self.last_7_days
            )
        ).scalar() or 0
        
        # Payment plans active
        active_plans = self.db.query(
            func.count(PaymentPlan.id)
        ).join(
            CollectionsAccount, PaymentPlan.account_id == CollectionsAccount.id
        ).join(
            Patient, CollectionsAccount.patient_id == Patient.id
        ).filter(
            and_(
                Patient.org_id == self.org_id,
                PaymentPlan.status == 'active'
            )
        ).scalar() or 0
        
        # Outstanding patient balances
        total_ar = self.db.query(
            func.sum(CollectionsAccount.current_balance)
        ).join(
            Patient, CollectionsAccount.patient_id == Patient.id
        ).filter(
            and_(
                Patient.org_id == self.org_id,
                CollectionsAccount.current_balance > 0
            )
        ).scalar() or 0
        
        # Balances >60 days
        ar_60_plus = self.db.query(
            func.sum(CollectionsAccount.current_balance)
        ).join(
            Patient, CollectionsAccount.patient_id == Patient.id
        ).filter(
            and_(
                Patient.org_id == self.org_id,
                CollectionsAccount.current_balance > 0,
                CollectionsAccount.days_since_due >= 60
            )
        ).scalar() or 0
        
        return {
            "header": SECTION_HEADERS["revenue"],
            "metrics": {
                "payments_yesterday": float(payments_yesterday),
                "payments_7d": float(payments_7d),
                "active_payment_plans": active_plans,
                "total_ar": float(total_ar),
                "ar_60_plus_days": float(ar_60_plus),
                "ar_60_plus_percentage": (float(ar_60_plus) / float(total_ar) * 100) if total_ar > 0 else 0
            },
            "narrative": self._format_revenue_narrative(
                payments_yesterday, payments_7d, active_plans, total_ar, ar_60_plus
            )
        }
    
    def _format_revenue_narrative(self, yesterday, week, plans, ar, ar_60) -> str:
        """Format revenue narrative in calm, concise tone."""
        lines = []
        
        if yesterday > 0:
            lines.append(f"Collected ${yesterday:,.2f} yesterday.")
        else:
            lines.append("No payments received yesterday.")
        
        if week > 0:
            daily_avg = week / 7
            lines.append(f"7-day total: ${week:,.2f} (${daily_avg:,.2f}/day avg).")
        
        if plans > 0:
            lines.append(f"{plans} patients on active payment plans.")
        
        if ar > 0:
            if ar_60 > 0:
                pct = (ar_60 / ar) * 100
                lines.append(f"Total A/R: ${ar:,.2f} ({pct:.0f}% over 60 days).")
            else:
                lines.append(f"Total A/R: ${ar:,.2f}.")
        
        return " ".join(lines)
    
    def _generate_denials_section(self) -> Dict:
        """Denials requiring attention section."""
        
        # New denials yesterday
        new_denials = self.db.query(DenialAppeal).join(
            InsuranceFollowUp, DenialAppeal.follow_up_id == InsuranceFollowUp.id
        ).join(
            BillingClaim, DenialAppeal.claim_id == BillingClaim.id
        ).filter(
            and_(
                BillingClaim.org_id == self.org_id,
                func.date(DenialAppeal.created_at) == self.yesterday
            )
        ).all()
        
        # High-impact denials (>$1000) requiring action
        high_impact = self.db.query(DenialAppeal).join(
            BillingClaim, DenialAppeal.claim_id == BillingClaim.id
        ).filter(
            and_(
                BillingClaim.org_id == self.org_id,
                BillingClaim.total_charge_cents > 100000,  # >$1000 in cents
                DenialAppeal.submitted == False,
                DenialAppeal.founder_reviewed == False
            )
        ).count()
        
        # Denials >30 days old
        aging_denials = self.db.query(DenialAppeal).join(
            InsuranceFollowUp, DenialAppeal.follow_up_id == InsuranceFollowUp.id
        ).join(
            BillingClaim, DenialAppeal.claim_id == BillingClaim.id
        ).filter(
            and_(
                BillingClaim.org_id == self.org_id,
                InsuranceFollowUp.denial_received_at <= datetime.utcnow() - timedelta(days=30),
                DenialAppeal.outcome == None
            )
        ).count()
        
        return {
            "header": SECTION_HEADERS["denials"],
            "metrics": {
                "new_yesterday": len(new_denials),
                "high_impact_pending": high_impact,
                "aging_30_plus": aging_denials
            },
            "narrative": self._format_denials_narrative(
                len(new_denials), high_impact, aging_denials
            ),
            "urgent_items": [
                {
                    "denial_id": d.id,
                    "claim_id": d.claim_id,
                    "reason": str(d.denial_reason),
                    "appeal_deadline": d.appeal_deadline.isoformat() if d.appeal_deadline else None
                }
                for d in new_denials[:3]  # Show top 3
            ]
        }
    
    def _format_denials_narrative(self, new, high_impact, aging) -> str:
        """Format denials narrative in calm tone."""
        if new == 0 and high_impact == 0 and aging == 0:
            return "No urgent denials requiring attention."
        
        lines = []
        
        if new > 0:
            lines.append(f"{new} new denial{'s' if new > 1 else ''} yesterday.")
        
        if high_impact > 0:
            lines.append(f"{high_impact} high-impact denial{'s' if high_impact > 1 else ''} (>$1K) pending.")
        
        if aging > 0:
            lines.append(f"{aging} denial{'s' if aging > 1 else ''} over 30 days old.")
        
        return " ".join(lines)
    
    def _generate_agency_section(self) -> Dict:
        """Agency communications section."""
        
        # Unread agency messages
        unread_count = self.db.query(AgencyPortalMessage).filter(
            and_(
                AgencyPortalMessage.org_id == self.org_id,
                AgencyPortalMessage.status == 'unread'
            )
        ).count()
        
        # High priority messages
        high_priority = self.db.query(AgencyPortalMessage).filter(
            and_(
                AgencyPortalMessage.org_id == self.org_id,
                AgencyPortalMessage.priority == 'high',
                AgencyPortalMessage.status.in_(['unread', 'pending'])
            )
        ).all()
        
        return {
            "header": SECTION_HEADERS["agency"],
            "metrics": {
                "unread_messages": unread_count,
                "high_priority": len(high_priority)
            },
            "narrative": f"{unread_count} unread agency message{'s' if unread_count != 1 else ''}. " +
                        (f"{len(high_priority)} high priority." if len(high_priority) > 0 else ""),
            "urgent_messages": [
                {
                    "message_id": msg.id,
                    "category": msg.category,
                    "subject": msg.subject,
                    "received": msg.created_at.isoformat()
                }
                for msg in high_priority[:3]
            ]
        }
    
    def _generate_operations_section(self) -> Dict:
        """Operations snapshot section."""
        
        # SMS sent yesterday
        sms_yesterday = self.db.query(CommsMessage).filter(
            and_(
                CommsMessage.org_id == self.org_id,
                func.date(CommsMessage.created_at) == self.yesterday
            )
        ).count()
        
        # CAD incidents yesterday (if applicable)
        incidents_yesterday = self.db.query(CADIncident).filter(
            and_(
                CADIncident.org_id == self.org_id,
                func.date(CADIncident.created_at) == self.yesterday
            )
        ).count()
        
        return {
            "header": SECTION_HEADERS["operations"],
            "metrics": {
                "sms_sent_yesterday": sms_yesterday,
                "incidents_yesterday": incidents_yesterday
            },
            "narrative": f"{sms_yesterday} SMS sent. {incidents_yesterday} CAD incident{'s' if incidents_yesterday != 1 else ''}."
        }
    
    def _generate_action_items(self, briefing: Dict) -> List[Dict]:
        """Generate recommended actions based on all sections."""
        actions = []
        
        # Revenue actions
        revenue = briefing["sections"]["revenue"]["metrics"]
        if revenue["ar_60_plus_percentage"] > 20:
            actions.append({
                "priority": "medium",
                "action": "Review 60+ day balances",
                "reason": f"{revenue['ar_60_plus_percentage']:.0f}% of A/R is over 60 days",
                "estimated_time": "15 min"
            })
        
        # Denial actions
        denials = briefing["sections"]["denials"]["metrics"]
        if denials["high_impact_pending"] > 0:
            actions.append({
                "priority": "high",
                "action": "Review high-impact denials",
                "reason": f"{denials['high_impact_pending']} denials over $1,000 pending",
                "estimated_time": "20 min"
            })
        
        if denials["aging_30_plus"] > 5:
            actions.append({
                "priority": "medium",
                "action": "Triage aging denials",
                "reason": f"{denials['aging_30_plus']} denials over 30 days old",
                "estimated_time": "30 min"
            })
        
        # Agency actions
        agency = briefing["sections"]["agency"]["metrics"]
        if agency["high_priority"] > 0:
            actions.append({
                "priority": "high",
                "action": "Respond to high-priority agency messages",
                "reason": f"{agency['high_priority']} urgent message{'s' if agency['high_priority'] > 1 else ''}",
                "estimated_time": "10 min"
            })
        
        # Sort by priority
        priority_order = {"high": 1, "medium": 2, "low": 3}
        actions.sort(key=lambda x: priority_order[x["priority"]])
        
        return actions
    
    def _generate_summary(self, briefing: Dict) -> str:
        """Generate executive summary (2-3 sentences)."""
        revenue = briefing["sections"]["revenue"]["metrics"]
        denials = briefing["sections"]["denials"]["metrics"]
        actions = briefing["sections"]["action_items"]
        
        summary_parts = []
        
        # Revenue summary
        if revenue["payments_yesterday"] > 0:
            summary_parts.append(f"Collected ${revenue['payments_yesterday']:,.2f} yesterday")
        
        # Denials summary
        if denials["new_yesterday"] > 0 or denials["high_impact_pending"] > 0:
            summary_parts.append(f"{denials['high_impact_pending']} high-impact denials need attention")
        
        # Action summary
        if len(actions) > 0:
            high_priority_count = len([a for a in actions if a["priority"] == "high"])
            if high_priority_count > 0:
                summary_parts.append(f"{high_priority_count} priority action{'s' if high_priority_count > 1 else ''}")
        
        if len(summary_parts) == 0:
            return "Operations running smoothly. No urgent items requiring attention."
        
        return ". ".join(summary_parts) + "."
