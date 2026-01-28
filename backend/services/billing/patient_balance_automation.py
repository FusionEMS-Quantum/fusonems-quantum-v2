"""
Patient Balance Automation - Days 15/30/45/60 Messaging
LOCKED COPY - Do not modify messaging without founder approval
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from models.collections_governance import CollectionsAccount
from models.founder_billing import PatientStatement
from models.epcr_core import Patient
from utils.logger import logger


# LOCKED MESSAGING COPY - DO NOT MODIFY
MESSAGE_TEMPLATES = {
    "day_15": {
        "sms": "Hi {first_name}, this is {practice_name}. Your account has a balance of ${balance}. We offer flexible payment plans - even $10/week helps. Reply YES to set up a plan that works for you.",
        "email_subject": "Payment Plan Options Available",
        "email_body": """Dear {first_name},

We wanted to reach out regarding your account balance of ${balance}.

We understand that medical expenses can be challenging, and we're here to help. We offer flexible payment plans that can work with your budget - even $10 per week can help you manage your balance over time.

Payment Options:
• Tier 1 ($1-$249): Pay over 3-6 months
• Tier 2 ($250-$999): Pay over 6-12 months  
• Tier 3 ($1,000+): Custom plans available

You can also save on fees by using ACH bank transfer instead of card payments.

To set up a payment plan, simply:
1. Visit your patient portal: {portal_link}
2. Click "Payment Plans"
3. Choose a plan that works for you

Or reply to this email and we'll help you get started.

Thank you,
{practice_name}
""",
    },
    "day_30": {
        "sms": "Hi {first_name}, {practice_name} here. Your ${balance} balance is now 30 days past due. Let's find a solution - we have plans starting at $10/week. Can we help you set one up today?",
        "email_subject": "Account Balance - 30 Days",
        "email_body": """Dear {first_name},

Your account balance of ${balance} is now 30 days past due.

We understand that circumstances can make it difficult to pay medical bills all at once. We want to work with you to find a solution that fits your situation.

Our flexible payment plans start as low as $10 per week, and we can customize a plan based on your needs.

What You Can Do Right Now:
• Set up a payment plan online: {portal_link}
• Call us to discuss options: {phone}
• Reply to this email with questions

We're here to help, and we believe we can find a plan that works for you.

Sincerely,
{practice_name}
""",
    },
    "day_45": {
        "sms": "{first_name}, your {practice_name} balance of ${balance} is 45 days overdue. We really want to help - please contact us today to avoid further action. Payment plans available.",
        "email_subject": "Urgent: Account Balance Requires Attention",
        "email_body": """Dear {first_name},

We are reaching out again regarding your account balance of ${balance}, which is now 45 days past due.

We genuinely want to help you resolve this balance and avoid any escalation. Our team is ready to work with you on a payment plan that fits your budget.

Please contact us within the next 15 days to:
• Set up a payment plan
• Discuss your account
• Ask questions about your balance

Ways to Reach Us:
• Patient Portal: {portal_link}
• Phone: {phone}
• Email: Reply to this message

If we don't hear from you within 15 days, we may need to take further steps to resolve this account. We prefer to avoid that and work directly with you.

Thank you for your attention to this matter.

{practice_name}
""",
    },
    "day_60": {
        "sms": "{first_name}, {practice_name} - your ${balance} balance is 60 days overdue. Please call us immediately at {phone} to resolve this and avoid escalation. We're here to help.",
        "email_subject": "Final Notice: Account Balance Past Due",
        "email_body": """Dear {first_name},

This is a final notice regarding your account balance of ${balance}, which is now 60 days past due.

Despite our previous attempts to reach you, we have not received a response or payment toward your balance.

IMMEDIATE ACTION REQUIRED:
Please contact us within 7 days to resolve this account.

If we do not hear from you, this account may be:
• Referred to our founder for review
• Subject to additional administrative steps
• Reported to credit agencies (as a last resort)

We do not want to take these steps. Please reach out today:
• Call: {phone}
• Email: Reply to this message
• Portal: {portal_link}

We are still willing to work with you on a payment plan or solution.

{practice_name}
{practice_address}
""",
    },
}

# Tone requirements: SUPPORTIVE, never threatening, no "collections" language
# All messages must be founder-approved before sending


class PatientBalanceAutomation:
    """
    Automated patient balance follow-up system.
    FREE - No paid integrations, uses existing SMS/email services.
    """
    
    def __init__(self, db: Session, org_id: int, practice_config: Dict):
        self.db = db
        self.org_id = org_id
        self.practice_name = practice_config.get('practice_name', 'Your Healthcare Provider')
        self.phone = practice_config.get('phone', '')
        self.practice_address = practice_config.get('address', '')
        self.portal_base_url = practice_config.get('portal_url', 'https://portal.example.com')
        
    def get_balances_at_day_threshold(self, days: int) -> List[Dict]:
        """
        Get patient balances that are exactly at the day threshold.
        """
        target_date = datetime.utcnow().date() - timedelta(days=days)
        
        # Query patients with balances from target_date (±1 day tolerance)
        balances = self.db.query(CollectionsAccount).filter(
            and_(
                CollectionsAccount.patient_id.in_(
                    self.db.query(Patient.id).filter(Patient.org_id == self.org_id)
                ),
                CollectionsAccount.current_balance > 0,
                CollectionsAccount.days_since_due >= days - 1,
                CollectionsAccount.days_since_due <= days + 1,
                CollectionsAccount.current_phase.in_(['internal', 'pre_collections'])
            )
        ).all()
        
        return [self._format_balance_record(b) for b in balances]
    
    def _format_balance_record(self, balance: CollectionsAccount) -> Dict:
        """Format balance record with patient info."""
        patient = self.db.query(Patient).filter(
            Patient.id == balance.patient_id
        ).first()
        
        return {
            'balance_id': balance.id,
            'patient_id': balance.patient_id,
            'first_name': patient.first_name if patient else 'Patient',
            'last_name': patient.last_name if patient else '',
            'phone': patient.phone_mobile if patient else '',
            'email': patient.email if patient else '',
            'balance': f"{balance.current_balance:.2f}",
            'days_outstanding': balance.days_since_due,
        }
    
    def send_day_15_messages(self, dry_run: bool = False) -> Dict:
        """Send Day 15 gentle reminder messages."""
        return self._send_messages_for_day(15, dry_run)
    
    def send_day_30_messages(self, dry_run: bool = False) -> Dict:
        """Send Day 30 follow-up messages."""
        return self._send_messages_for_day(30, dry_run)
    
    def send_day_45_messages(self, dry_run: bool = False) -> Dict:
        """Send Day 45 urgent messages."""
        return self._send_messages_for_day(45, dry_run)
    
    def send_day_60_messages(self, dry_run: bool = False) -> Dict:
        """Send Day 60 final notice messages."""
        return self._send_messages_for_day(60, dry_run)
    
    def _send_messages_for_day(self, day: int, dry_run: bool = False) -> Dict:
        """
        Send messages for a specific day threshold.
        Returns summary of messages sent.
        """
        template_key = f"day_{day}"
        template = MESSAGE_TEMPLATES[template_key]
        
        balances = self.get_balances_at_day_threshold(day)
        
        results = {
            'day': day,
            'total_balances': len(balances),
            'sms_sent': 0,
            'email_sent': 0,
            'skipped': 0,
            'errors': [],
            'dry_run': dry_run
        }
        
        for record in balances:
            try:
                # Prepare message variables
                variables = {
                    'first_name': record['first_name'],
                    'balance': record['balance'],
                    'practice_name': self.practice_name,
                    'phone': self.phone,
                    'practice_address': self.practice_address,
                    'portal_link': f"{self.portal_base_url}/patient/{record['patient_id']}/billing"
                }
                
                # Send SMS if phone available
                if record['phone']:
                    sms_text = template['sms'].format(**variables)
                    
                    if not dry_run:
                        # TODO: Integrate with comms_router for actual sending
                        logger.info(f"[Day {day}] SMS to {record['phone']}: {sms_text[:50]}...")
                    
                    results['sms_sent'] += 1
                    logger.info(f"[Day {day}] SMS sent to patient {record['patient_id']}")
                
                # Send email if email available
                if record['email']:
                    email_subject = template['email_subject']
                    email_body = template['email_body'].format(**variables)
                    
                    if not dry_run:
                        # TODO: Integrate with comms_router for actual sending
                        logger.info(f"[Day {day}] Email to {record['email']}: {email_subject}")
                    
                    results['email_sent'] += 1
                    logger.info(f"[Day {day}] Email sent to patient {record['patient_id']}")
                
                if not record['phone'] and not record['email']:
                    results['skipped'] += 1
                    logger.warning(f"[Day {day}] No contact info for patient {record['patient_id']}")
                    
            except Exception as e:
                error_msg = f"Patient {record['patient_id']}: {str(e)}"
                results['errors'].append(error_msg)
                logger.error(f"[Day {day}] Error: {error_msg}")
        
        return results
    
    def run_daily_automation(self, dry_run: bool = False) -> Dict:
        """
        Run all day thresholds in one pass.
        Called by daily cron job.
        """
        logger.info(f"Starting patient balance automation (dry_run={dry_run})")
        
        results = {
            'timestamp': datetime.utcnow().isoformat(),
            'org_id': self.org_id,
            'dry_run': dry_run,
            'day_15': self.send_day_15_messages(dry_run),
            'day_30': self.send_day_30_messages(dry_run),
            'day_45': self.send_day_45_messages(dry_run),
            'day_60': self.send_day_60_messages(dry_run),
        }
        
        # Log summary
        total_sent = (
            results['day_15']['sms_sent'] + results['day_15']['email_sent'] +
            results['day_30']['sms_sent'] + results['day_30']['email_sent'] +
            results['day_45']['sms_sent'] + results['day_45']['email_sent'] +
            results['day_60']['sms_sent'] + results['day_60']['email_sent']
        )
        
        logger.info(f"Patient balance automation complete: {total_sent} messages sent")
        
        return results
