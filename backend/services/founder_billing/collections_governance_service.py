from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import logging
from models.collections_governance import (
    CollectionsGovernancePolicy, CollectionsAccount, CollectionsActionLog,
    CollectionsDecisionRequest, WriteOffRecord, CollectionsProhibitedAction,
    CollectionsPhase, CollectionsAction, WriteOffReason
)
from models.founder_billing import PatientStatement, StatementLifecycleState
from models.wisconsin_billing import TemplateType
from services.founder_billing.wisconsin_service import WisconsinBillingService

logger = logging.getLogger(__name__)


class CollectionsGovernanceService:
    """
    Immutable Collections Governance - Internal Collections Only.
    
    Authoritative Rules:
    1. Policy is immutable once activated
    2. Internal + Pre-Collections only (External disabled)
    3. Time-based escalation (0/15/30/60/90 days)
    4. Payment pauses escalation immediately
    5. 90-day flag for Founder decision
    6. No threatening language, credit reporting, or legal action
    7. Write-offs require Founder approval
    8. Full audit trail for every action
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.policy = self._get_active_policy()
        if not self.policy:
            self.policy = self._create_default_policy()
        self.wisconsin_service = WisconsinBillingService(db)
    
    def _get_active_policy(self) -> Optional[CollectionsGovernancePolicy]:
        """Get active immutable governance policy."""
        return self.db.query(CollectionsGovernancePolicy).filter_by(
            active=True,
            immutable=True
        ).order_by(CollectionsGovernancePolicy.version_date.desc()).first()
    
    def _create_default_policy(self) -> CollectionsGovernancePolicy:
        """Create default immutable governance policy."""
        final_notice = """Hello {{PatientName}},

This notice is regarding the outstanding balance for emergency medical services provided on {{ServiceDate}}.

Our records indicate that the balance below remains unresolved despite prior statements.

Outstanding Balance: {{BalanceDue}}

If you have insurance information to provide, questions about this statement, or would like to discuss payment options, please contact us as soon as possible. We are happy to assist.

If we do not hear from you, this account may require further internal review.

Thank you for your attention to this matter.

{{CompanyName}}
{{CompanyPhone}}
{{CompanyEmail}}"""
        
        policy = CollectionsGovernancePolicy(
            version="v1.0",
            immutable=True,
            active=True,
            internal_collections_enabled=True,
            pre_collections_enabled=True,
            external_collections_enabled=False,
            credit_reporting_enabled=False,
            legal_action_enabled=False,
            escalation_day_0=0,
            escalation_day_15=15,
            escalation_day_30=30,
            escalation_day_60=60,
            escalation_day_90=90,
            pause_on_any_payment=True,
            reset_timeline_on_payment=True,
            small_balance_threshold=25.0,
            auto_writeoff_small_balances=False,
            write_off_requires_founder_approval=True,
            flag_for_decision_at_days=90,
            final_internal_notice_template=final_notice,
            prohibited_language=[
                "credit report",
                "credit bureau",
                "legal action",
                "lawsuit",
                "collections agency",
                "garnish",
                "lien"
            ]
        )
        self.db.add(policy)
        self.db.flush()
        return policy
    
    def create_collections_account(self, statement: PatientStatement) -> CollectionsAccount:
        """
        Create collections account for statement.
        Called automatically when statement is generated.
        """
        account = CollectionsAccount(
            statement_id=statement.id,
            patient_id=statement.patient_id,
            original_balance=statement.balance_due,
            current_balance=statement.balance_due,
            governance_version=self.policy.version
        )
        self.db.add(account)
        self.db.flush()
        
        self._log_action(
            account=account,
            action=CollectionsAction.STATEMENT_SENT,
            description=f"Collections account created. Initial balance: ${account.original_balance:.2f}",
            policy_reference="Internal Collections - Day 0"
        )
        
        return account
    
    def process_collections_cycle(self):
        """
        Process collections cycle for all active accounts.
        Time-based escalation with payment pause logic.
        """
        accounts = self.db.query(CollectionsAccount).filter(
            CollectionsAccount.current_balance > 0,
            CollectionsAccount.written_off == False,
            CollectionsAccount.escalation_paused == False
        ).all()
        
        for account in accounts:
            statement = self.db.query(PatientStatement).filter_by(id=account.statement_id).first()
            if not statement:
                continue
            
            # Update days since due
            account.days_since_due = (datetime.utcnow() - statement.due_date).days
            
            # Check if should flag for decision
            if (account.days_since_due >= self.policy.flag_for_decision_at_days and 
                not account.flagged_for_founder_decision):
                self._flag_for_founder_decision(account, statement)
                continue
            
            # Process escalation stages
            if account.days_since_due >= self.policy.escalation_day_90:
                self._process_day_90(account, statement)
            elif account.days_since_due >= self.policy.escalation_day_60:
                self._process_day_60(account, statement)
            elif account.days_since_due >= self.policy.escalation_day_30:
                self._process_day_30(account, statement)
            elif account.days_since_due >= self.policy.escalation_day_15:
                self._process_day_15(account, statement)
    
    def _process_day_15(self, account: CollectionsAccount, statement: PatientStatement):
        """Day 15: Friendly reminder."""
        if self._already_sent_at_stage(account, self.policy.escalation_day_15):
            return
        
        self.wisconsin_service.send_statement(
            statement,
            TemplateType.FRIENDLY_REMINDER
        )
        
        self._log_action(
            account=account,
            action=CollectionsAction.REMINDER_SENT,
            description=f"Day 15 reminder sent. Balance: ${account.current_balance:.2f}",
            policy_reference=f"Governance v{self.policy.version} - Day 15 Escalation"
        )
        
        account.notices_sent += 1
        account.last_notice_sent_at = datetime.utcnow()
    
    def _process_day_30(self, account: CollectionsAccount, statement: PatientStatement):
        """Day 30: Second notice."""
        if self._already_sent_at_stage(account, self.policy.escalation_day_30):
            return
        
        self.wisconsin_service.send_statement(
            statement,
            TemplateType.SECOND_NOTICE
        )
        
        self._log_action(
            account=account,
            action=CollectionsAction.NOTICE_SENT,
            description=f"Day 30 second notice sent. Balance: ${account.current_balance:.2f}",
            policy_reference=f"Governance v{self.policy.version} - Day 30 Escalation"
        )
        
        account.notices_sent += 1
        account.last_notice_sent_at = datetime.utcnow()
    
    def _process_day_60(self, account: CollectionsAccount, statement: PatientStatement):
        """Day 60: Final notice."""
        if self._already_sent_at_stage(account, self.policy.escalation_day_60):
            return
        
        self.wisconsin_service.send_statement(
            statement,
            TemplateType.FINAL_NOTICE
        )
        
        self._log_action(
            account=account,
            action=CollectionsAction.NOTICE_SENT,
            description=f"Day 60 final notice sent. Balance: ${account.current_balance:.2f}",
            policy_reference=f"Governance v{self.policy.version} - Day 60 Escalation"
        )
        
        account.notices_sent += 1
        account.last_notice_sent_at = datetime.utcnow()
    
    def _process_day_90(self, account: CollectionsAccount, statement: PatientStatement):
        """Day 90: Final internal notice (Pre-Collections)."""
        if self._already_sent_at_stage(account, self.policy.escalation_day_90):
            return
        
        # Send final internal notice
        from models.wisconsin_billing import PatientStatementTemplate, TemplateTone
        from jinja2 import Template
        
        # Check if we have a pre-collections template
        final_template = self.db.query(PatientStatementTemplate).filter_by(
            template_type=TemplateType.FINAL_NOTICE,
            state="WI",
            active=True
        ).first()
        
        if final_template:
            self.wisconsin_service.send_statement(
                statement,
                TemplateType.FINAL_NOTICE
            )
        
        account.current_phase = CollectionsPhase.PRE_COLLECTIONS
        
        self._log_action(
            account=account,
            action=CollectionsAction.FINAL_INTERNAL_NOTICE_SENT,
            description=f"Day 90 final internal notice sent. Pre-Collections phase. Balance: ${account.current_balance:.2f}",
            policy_reference=f"Governance v{self.policy.version} - Day 90 Pre-Collections"
        )
        
        account.notices_sent += 1
        account.last_notice_sent_at = datetime.utcnow()
    
    def _flag_for_founder_decision(self, account: CollectionsAccount, statement: PatientStatement):
        """
        Flag account for Founder decision at 90+ days.
        No irreversible action without Founder intent.
        """
        account.flagged_for_founder_decision = True
        account.flagged_at = datetime.utcnow()
        account.current_phase = CollectionsPhase.DECISION_REQUIRED
        
        # Create decision request
        decision_request = CollectionsDecisionRequest(
            account_id=account.id,
            balance=account.current_balance,
            days_overdue=account.days_since_due,
            notices_sent_count=account.notices_sent,
            payment_attempts=account.payment_attempts,
            insurance_status="Pending" if account.insurance_pending else "None",
            ai_recommendation=self._generate_ai_recommendation(account),
            ai_recommendation_rationale=self._generate_recommendation_rationale(account)
        )
        self.db.add(decision_request)
        
        self._log_action(
            account=account,
            action=CollectionsAction.FLAGGED_FOR_DECISION,
            description=f"Account flagged for Founder decision. {account.days_since_due} days overdue. "
                       f"Balance: ${account.current_balance:.2f}. {account.notices_sent} notices sent.",
            policy_reference=f"Governance v{self.policy.version} - Decision Required at 90+ days"
        )
    
    def _generate_ai_recommendation(self, account: CollectionsAccount) -> str:
        """Generate AI recommendation for Founder."""
        if account.current_balance < self.policy.small_balance_threshold:
            return "write_off_small_balance"
        elif account.payment_attempts > 0:
            return "continue_internal_collections"
        elif account.insurance_pending:
            return "hold_for_insurance"
        else:
            return "founder_review_required"
    
    def _generate_recommendation_rationale(self, account: CollectionsAccount) -> str:
        """Generate rationale for AI recommendation."""
        if account.current_balance < self.policy.small_balance_threshold:
            return f"Balance ${account.current_balance:.2f} below small-balance threshold ${self.policy.small_balance_threshold:.2f}. Cost of continued collection exceeds balance value."
        elif account.payment_attempts > 0:
            return f"Patient has made {account.payment_attempts} payment attempts, indicating willingness to pay. Recommend continued internal follow-up."
        elif account.insurance_pending:
            return "Insurance claim pending. Recommend hold until insurance resolution."
        else:
            return f"{account.notices_sent} notices sent over {account.days_since_due} days with no response. Founder decision required."
    
    def record_payment(self, account: CollectionsAccount, payment_amount: float):
        """
        Record payment and pause/reset escalation.
        Any payment activity pauses escalation immediately.
        """
        account.total_paid += payment_amount
        account.current_balance -= payment_amount
        account.payment_attempts += 1
        
        if self.policy.pause_on_any_payment:
            account.escalation_paused = True
            account.pause_reason = f"Payment of ${payment_amount:.2f} received"
            account.paused_at = datetime.utcnow()
        
        self._log_action(
            account=account,
            action=CollectionsAction.ESCALATION_PAUSED,
            description=f"Payment received: ${payment_amount:.2f}. Escalation paused. "
                       f"Remaining balance: ${account.current_balance:.2f}",
            policy_reference=f"Governance v{self.policy.version} - Payment Pause Rule"
        )
        
        if account.current_balance <= 0:
            self._resolve_account(account)
    
    def _resolve_account(self, account: CollectionsAccount):
        """Mark account as resolved (paid in full)."""
        account.current_phase = CollectionsPhase.RESOLVED
        
        self._log_action(
            account=account,
            action=CollectionsAction.RESOLVED,
            description=f"Account resolved. Total paid: ${account.total_paid:.2f}. Balance: $0.00",
            policy_reference=f"Governance v{self.policy.version} - Resolution"
        )
    
    def write_off_account(
        self,
        account: CollectionsAccount,
        reason: WriteOffReason,
        rationale: str,
        approved_by: str
    ):
        """
        Write off account balance.
        Requires Founder approval per policy.
        """
        if self.policy.write_off_requires_founder_approval and approved_by.startswith("AI"):
            raise ValueError("Write-off requires Founder approval per governance policy")
        
        write_off = WriteOffRecord(
            account_id=account.id,
            statement_id=account.statement_id,
            patient_id=account.patient_id,
            original_balance=account.original_balance,
            amount_paid=account.total_paid,
            write_off_amount=account.current_balance,
            reason=reason,
            detailed_rationale=rationale,
            approved_by=approved_by,
            governance_version=self.policy.version
        )
        self.db.add(write_off)
        
        account.written_off = True
        account.written_off_at = datetime.utcnow()
        account.write_off_amount = account.current_balance
        account.write_off_reason = reason
        account.current_phase = CollectionsPhase.WRITTEN_OFF
        account.current_balance = 0.0
        
        self._log_action(
            account=account,
            action=CollectionsAction.WRITTEN_OFF,
            description=f"Account written off. Amount: ${write_off.write_off_amount:.2f}. "
                       f"Reason: {reason.value}. Approved by: {approved_by}",
            policy_reference=f"Governance v{self.policy.version} - Write-Off Policy"
        )
    
    def process_founder_decision(
        self,
        decision_request_id: int,
        founder_decision: str,
        founder_rationale: str
    ):
        """Process Founder decision on flagged account."""
        decision = self.db.query(CollectionsDecisionRequest).filter_by(
            id=decision_request_id
        ).first()
        
        if not decision:
            raise ValueError("Decision request not found")
        
        decision.founder_reviewed = True
        decision.founder_decision = founder_decision
        decision.founder_decision_rationale = founder_rationale
        decision.founder_decided_at = datetime.utcnow()
        
        account = self.db.query(CollectionsAccount).filter_by(
            id=decision.account_id
        ).first()
        
        account.founder_decision = founder_decision
        account.founder_decision_at = datetime.utcnow()
        
        # Execute decision
        if founder_decision == "write_off":
            self.write_off_account(
                account,
                WriteOffReason.FOUNDER_DECISION,
                founder_rationale,
                "Founder"
            )
        elif founder_decision == "continue_collections":
            account.escalation_paused = False
            account.pause_reason = None
        elif founder_decision == "hold":
            account.escalation_paused = True
            account.pause_reason = f"Founder hold: {founder_rationale}"
        
        decision.outcome = founder_decision
    
    def block_prohibited_action(self, action_name: str, reason: str, attempted_by: str):
        """
        Block prohibited action (external collections, credit reporting, legal).
        Immutable governance enforcement.
        """
        block = CollectionsProhibitedAction(
            action_attempted=action_name,
            prohibited_reason=reason,
            attempted_by=attempted_by,
            governance_version=self.policy.version,
            blocked=True
        )
        self.db.add(block)
        
        logger.warning(f"BLOCKED PROHIBITED ACTION: {action_name} by {attempted_by}. Reason: {reason}")
        
        raise PermissionError(
            f"Action '{action_name}' is prohibited by immutable governance policy v{self.policy.version}. "
            f"Reason: {reason}"
        )
    
    def _already_sent_at_stage(self, account: CollectionsAccount, stage_day: int) -> bool:
        """Check if notice already sent at this escalation stage."""
        if not account.last_notice_sent_at:
            return False
        
        days_since_last_notice = (datetime.utcnow() - account.last_notice_sent_at).days
        
        # Consider already sent if within 5 days of target
        return abs(account.days_since_due - stage_day) <= 5 and days_since_last_notice < 10
    
    def _log_action(
        self,
        account: CollectionsAccount,
        action: CollectionsAction,
        description: str,
        policy_reference: str
    ):
        """Log collections action with full audit trail."""
        log = CollectionsActionLog(
            account_id=account.id,
            action=action,
            action_description=description,
            governance_version=self.policy.version,
            policy_reference=policy_reference,
            balance_at_action=account.current_balance,
            days_overdue_at_action=account.days_since_due
        )
        self.db.add(log)
