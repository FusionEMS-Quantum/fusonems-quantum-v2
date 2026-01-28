from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Tuple
from decimal import Decimal
import logging
from models.payment_resolution import (
    PaymentPlan, PaymentPlanInstallment, InsuranceFollowUp, DenialAppeal,
    StripePaymentRecord, BillingPerformanceKPI, PaymentOptimizationRule,
    PaymentPlanTier, PaymentPlanStatus, PaymentMethod, InsuranceClaimStatus,
    DenialReason
)
from models.collections_governance import CollectionsAccount
from models.founder_billing import PatientStatement
import stripe

logger = logging.getLogger(__name__)


class PaymentResolutionService:
    """
    Payment Plans, Insurance Follow-Up, and Resolution Automation.
    
    Resolution Priority:
    1. Insurance payment
    2. Patient full payment
    3. Patient payment plan
    4. Internal review for write-off or hold
    
    Operating Principle: Resolution over escalation.
    """
    
    def __init__(self, db: Session, stripe_api_key: str):
        self.db = db
        stripe.api_key = stripe_api_key
        
        # Default payment plan language (pre-approved)
        self.payment_plan_language = """We understand that paying a balance all at once isn't always easy. To help, we can offer a payment plan that allows you to make smaller payments over time. There are no penalties for choosing a payment plan, and you may pay off the balance early at any time. If you would like assistance setting this up or have questions, please contact us. We're here to help."""
    
    def offer_payment_plan(
        self,
        account: CollectionsAccount,
        statement: PatientStatement
    ) -> PaymentPlan:
        """
        AI offers payment plan based on balance and account status.
        Suspends collections escalation while active and in good standing.
        """
        balance = account.current_balance
        
        # AI selects tier
        tier, rationale = self._select_payment_plan_tier(balance, account)
        
        # Calculate plan terms
        down_payment = 0.0
        financed_amount = balance - down_payment
        
        installment_amount, num_installments = self._calculate_installments(
            financed_amount, tier
        )
        
        first_payment_date = date.today() + timedelta(days=15)
        
        plan = PaymentPlan(
            account_id=account.id,
            statement_id=statement.id,
            patient_id=account.patient_id,
            tier=tier,
            status=PaymentPlanStatus.PENDING_ACCEPTANCE,
            total_balance=balance,
            down_payment=down_payment,
            financed_amount=financed_amount,
            installment_amount=installment_amount,
            number_of_installments=num_installments,
            first_payment_date=first_payment_date,
            remaining_balance=financed_amount,
            ai_selected_tier=True,
            tier_selection_rationale=rationale,
            patient_facing_language=self.payment_plan_language,
            governance_version="v1.0"
        )
        
        self.db.add(plan)
        self.db.flush()
        
        # Create installments
        self._create_installments(plan)
        
        # Pause collections
        account.escalation_paused = True
        account.pause_reason = f"Payment plan offered ({tier.value})"
        
        logger.info(f"Payment plan offered: {tier.value}, ${installment_amount:.2f}/month x {num_installments}")
        
        return plan
    
    def _select_payment_plan_tier(
        self,
        balance: float,
        account: CollectionsAccount
    ) -> Tuple[PaymentPlanTier, str]:
        """
        AI selects payment plan tier based on balance, age, payment history.
        
        Tiers:
        - Short-term: < 6 months (small balances)
        - Standard: 6-12 months (moderate balances)
        - Extended: 12+ months (larger balances)
        """
        if balance <= 200:
            return PaymentPlanTier.SHORT_TERM, \
                   f"Small balance ${balance:.2f} eligible for short-term plan (3-6 months)"
        elif balance <= 1000:
            return PaymentPlanTier.STANDARD, \
                   f"Moderate balance ${balance:.2f} eligible for standard plan (6-12 months)"
        else:
            return PaymentPlanTier.EXTENDED, \
                   f"Larger balance ${balance:.2f} eligible for extended plan (12-18 months)"
    
    def _calculate_installments(
        self,
        amount: float,
        tier: PaymentPlanTier
    ) -> Tuple[float, int]:
        """Calculate installment amount and count based on tier."""
        if tier == PaymentPlanTier.SHORT_TERM:
            num_installments = min(6, max(3, int(amount / 50)))
        elif tier == PaymentPlanTier.STANDARD:
            num_installments = min(12, max(6, int(amount / 100)))
        else:  # EXTENDED
            num_installments = min(18, max(12, int(amount / 100)))
        
        installment_amount = amount / num_installments
        
        return round(installment_amount, 2), num_installments
    
    def _create_installments(self, plan: PaymentPlan):
        """Create installment schedule for payment plan."""
        current_date = plan.first_payment_date
        
        for i in range(1, plan.number_of_installments + 1):
            installment = PaymentPlanInstallment(
                plan_id=plan.id,
                installment_number=i,
                amount_due=plan.installment_amount,
                due_date=current_date
            )
            self.db.add(installment)
            
            # Next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        plan.next_payment_date = plan.first_payment_date
    
    def accept_payment_plan(
        self,
        plan_id: int,
        enable_auto_pay: bool = False,
        stripe_payment_method_id: Optional[str] = None
    ):
        """
        Accept payment plan and optionally enable auto-pay.
        Auto-pay is optional and requires explicit consent.
        """
        plan = self.db.query(PaymentPlan).filter_by(id=plan_id).first()
        if not plan:
            raise ValueError("Payment plan not found")
        
        plan.status = PaymentPlanStatus.ACTIVE
        plan.accepted_at = datetime.utcnow()
        
        if enable_auto_pay:
            if not stripe_payment_method_id:
                raise ValueError("Payment method required for auto-pay")
            
            # Create Stripe customer if needed
            patient = plan.patient
            if not plan.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=patient.email,
                    name=f"{patient.first_name} {patient.last_name}",
                    metadata={"patient_id": patient.id}
                )
                plan.stripe_customer_id = customer.id
            
            # Attach payment method
            stripe.PaymentMethod.attach(
                stripe_payment_method_id,
                customer=plan.stripe_customer_id
            )
            
            plan.auto_pay_enabled = True
            plan.stripe_payment_method_id = stripe_payment_method_id
            
            # Detect payment method type
            pm = stripe.PaymentMethod.retrieve(stripe_payment_method_id)
            if pm.type == "card":
                plan.payment_method_type = PaymentMethod.CARD
            elif pm.type == "us_bank_account":
                plan.payment_method_type = PaymentMethod.ACH
            
            logger.info(f"Auto-pay enabled for plan {plan.id} with {plan.payment_method_type.value}")
        
        # Update collections account
        account = self.db.query(CollectionsAccount).filter_by(id=plan.account_id).first()
        if account:
            account.escalation_paused = True
            account.pause_reason = "Payment plan active and in good standing"
    
    def process_auto_pay_charges(self):
        """
        Process auto-pay charges for active payment plans.
        Run daily to charge upcoming installments.
        """
        today = date.today()
        
        # Find installments due today with auto-pay enabled
        plans_due = self.db.query(PaymentPlan).join(PaymentPlanInstallment).filter(
            PaymentPlan.status == PaymentPlanStatus.ACTIVE,
            PaymentPlan.auto_pay_enabled == True,
            PaymentPlanInstallment.due_date <= today,
            PaymentPlanInstallment.paid == False,
            PaymentPlanInstallment.auto_charge_attempted == False
        ).all()
        
        for plan in plans_due:
            installment = next(
                (i for i in plan.installments if i.due_date <= today and not i.paid and not i.auto_charge_attempted),
                None
            )
            
            if installment:
                self._charge_installment(plan, installment)
    
    def _charge_installment(self, plan: PaymentPlan, installment: PaymentPlanInstallment):
        """Charge installment via Stripe auto-pay."""
        installment.auto_charge_attempted = True
        
        try:
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=int(installment.amount_due * 100),  # cents
                currency="usd",
                customer=plan.stripe_customer_id,
                payment_method=plan.stripe_payment_method_id,
                off_session=True,
                confirm=True,
                description=f"Payment plan installment {installment.installment_number}/{plan.number_of_installments}",
                metadata={
                    "plan_id": plan.id,
                    "installment_id": installment.id,
                    "patient_id": plan.patient_id
                }
            )
            
            if intent.status == "succeeded":
                installment.paid = True
                installment.paid_amount = installment.amount_due
                installment.paid_date = date.today()
                installment.auto_charge_success = True
                installment.stripe_payment_intent_id = intent.id
                installment.payment_method = plan.payment_method_type
                
                plan.payments_made += 1
                plan.total_paid += installment.amount_due
                plan.remaining_balance -= installment.amount_due
                plan.last_payment_date = date.today()
                
                # Record payment
                self._record_stripe_payment(
                    plan=plan,
                    installment=installment,
                    intent=intent,
                    success=True
                )
                
                # Check if plan complete
                if plan.payments_made >= plan.number_of_installments:
                    self._complete_payment_plan(plan)
                else:
                    # Update next payment date
                    next_unpaid = next(
                        (i for i in plan.installments if not i.paid),
                        None
                    )
                    if next_unpaid:
                        plan.next_payment_date = next_unpaid.due_date
                
                logger.info(f"Auto-pay successful: Plan {plan.id}, Installment {installment.installment_number}")
            
            else:
                raise Exception(f"Payment intent status: {intent.status}")
        
        except stripe.error.CardError as e:
            installment.auto_charge_success = False
            installment.auto_charge_failure_reason = str(e)
            
            plan.missed_payments += 1
            
            self._record_stripe_payment(
                plan=plan,
                installment=installment,
                intent=None,
                success=False,
                failure_reason=str(e)
            )
            
            # Send gentle reminder (not immediate escalation)
            self._send_failed_payment_reminder(plan, installment)
            
            logger.warning(f"Auto-pay failed: Plan {plan.id}, Reason: {str(e)}")
    
    def _send_failed_payment_reminder(self, plan: PaymentPlan, installment: PaymentPlanInstallment):
        """Send gentle reminder for failed auto-payment."""
        # Would integrate with Wisconsin template system
        logger.info(f"Sending failed payment reminder for plan {plan.id}")
    
    def _complete_payment_plan(self, plan: PaymentPlan):
        """Mark payment plan as completed."""
        plan.status = PaymentPlanStatus.COMPLETED
        plan.completed_at = datetime.utcnow()
        
        # Resume or resolve collections account
        account = self.db.query(CollectionsAccount).filter_by(id=plan.account_id).first()
        if account:
            if plan.remaining_balance <= 0:
                from services.founder_billing.collections_governance_service import CollectionsGovernanceService
                service = CollectionsGovernanceService(self.db)
                service._resolve_account(account)
            else:
                account.escalation_paused = False
    
    def _record_stripe_payment(
        self,
        plan: PaymentPlan,
        installment: PaymentPlanInstallment,
        intent: Optional[stripe.PaymentIntent],
        success: bool,
        failure_reason: Optional[str] = None
    ):
        """Record Stripe payment in audit log."""
        record = StripePaymentRecord(
            plan_id=plan.id,
            installment_id=installment.id,
            patient_id=plan.patient_id,
            stripe_payment_intent_id=intent.id if intent else None,
            stripe_customer_id=plan.stripe_customer_id,
            amount=installment.amount_due,
            payment_method=plan.payment_method_type,
            status=intent.status if intent else "failed",
            success=success,
            failure_reason=failure_reason,
            auto_charge=True
        )
        self.db.add(record)
    
    def recommend_ach(self, balance: float, plan: Optional[PaymentPlan] = None) -> Dict:
        """
        AI recommends ACH for larger balances or ongoing plans.
        Framed as cost-saving and convenience, never coercive.
        """
        threshold = 500.0  # Conservative threshold
        
        should_recommend = False
        rationale = ""
        
        if balance >= threshold:
            should_recommend = True
            rationale = f"Balance ${balance:.2f} exceeds ${threshold:.2f}. ACH reduces processing fees and payment interruptions."
        
        if plan and plan.number_of_installments >= 6:
            should_recommend = True
            rationale += f" Payment plan spans {plan.number_of_installments} months. ACH provides more reliable recurring payments."
        
        return {
            "recommend_ach": should_recommend,
            "rationale": rationale.strip(),
            "card_available": True,
            "patient_choice": True
        }


class RevenueHealthService:
    """
    Founder Revenue Health Oversight.
    
    Answers: Is revenue stable, improving, or at risk?
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_revenue_health_snapshot(self, period: str = "monthly") -> BillingPerformanceKPI:
        """
        Generate Founder Revenue Health summary.
        
        High-level understanding without transaction-level review.
        """
        from sqlalchemy import func
        
        # Date range
        if period == "monthly":
            start_date = date.today().replace(day=1)
            end_date = date.today()
        elif period == "quarterly":
            # Q1/Q2/Q3/Q4
            month = date.today().month
            quarter_start = ((month - 1) // 3) * 3 + 1
            start_date = date.today().replace(month=quarter_start, day=1)
            end_date = date.today()
        else:
            start_date = date.today().replace(month=1, day=1)
            end_date = date.today()
        
        # Total charges
        total_charges = self.db.query(func.sum(PatientStatement.total_charges)).filter(
            PatientStatement.statement_date >= start_date
        ).scalar() or 0
        
        # Total payments
        total_payments = self.db.query(func.sum(StripePaymentRecord.amount)).filter(
            StripePaymentRecord.processed_at >= start_date,
            StripePaymentRecord.success == True
        ).scalar() or 0
        
        # Outstanding balance
        outstanding = self.db.query(func.sum(CollectionsAccount.current_balance)).filter(
            CollectionsAccount.current_balance > 0
        ).scalar() or 0
        
        # Collection rate
        collection_rate = (total_payments / total_charges * 100) if total_charges > 0 else 0
        
        # Payment success rate
        total_attempts = self.db.query(func.count(StripePaymentRecord.id)).filter(
            StripePaymentRecord.processed_at >= start_date
        ).scalar() or 0
        
        successful = self.db.query(func.count(StripePaymentRecord.id)).filter(
            StripePaymentRecord.processed_at >= start_date,
            StripePaymentRecord.success == True
        ).scalar() or 0
        
        success_rate = (successful / total_attempts * 100) if total_attempts > 0 else 0
        failure_rate = 100 - success_rate
        
        # Payment plans
        plans_active = self.db.query(func.count(PaymentPlan.id)).filter(
            PaymentPlan.status == PaymentPlanStatus.ACTIVE
        ).scalar() or 0
        
        plans_balance = self.db.query(func.sum(PaymentPlan.remaining_balance)).filter(
            PaymentPlan.status == PaymentPlanStatus.ACTIVE
        ).scalar() or 0
        
        # Card vs ACH
        card_count = self.db.query(func.count(StripePaymentRecord.id)).filter(
            StripePaymentRecord.payment_method == PaymentMethod.CARD,
            StripePaymentRecord.processed_at >= start_date,
            StripePaymentRecord.success == True
        ).scalar() or 0
        
        card_amount = self.db.query(func.sum(StripePaymentRecord.amount)).filter(
            StripePaymentRecord.payment_method == PaymentMethod.CARD,
            StripePaymentRecord.processed_at >= start_date,
            StripePaymentRecord.success == True
        ).scalar() or 0
        
        ach_count = self.db.query(func.count(StripePaymentRecord.id)).filter(
            StripePaymentRecord.payment_method == PaymentMethod.ACH,
            StripePaymentRecord.processed_at >= start_date,
            StripePaymentRecord.success == True
        ).scalar() or 0
        
        ach_amount = self.db.query(func.sum(StripePaymentRecord.amount)).filter(
            StripePaymentRecord.payment_method == PaymentMethod.ACH,
            StripePaymentRecord.processed_at >= start_date,
            StripePaymentRecord.success == True
        ).scalar() or 0
        
        # AI explanation
        explanation = self._generate_revenue_explanation(
            collection_rate, success_rate, plans_active
        )
        
        kpi = BillingPerformanceKPI(
            period=period,
            period_start=start_date,
            period_end=end_date,
            total_charges_billed=total_charges,
            total_payments_collected=total_payments,
            net_outstanding_balance=outstanding,
            collection_rate=collection_rate,
            payment_success_rate=success_rate,
            payment_failure_rate=failure_rate,
            balances_on_payment_plans_count=plans_active,
            balances_on_payment_plans_amount=plans_balance or 0,
            card_payment_count=card_count,
            card_payment_amount=card_amount or 0,
            ach_payment_count=ach_count,
            ach_payment_amount=ach_amount or 0,
            ai_explanation=explanation
        )
        
        self.db.add(kpi)
        return kpi
    
    def _generate_revenue_explanation(
        self,
        collection_rate: float,
        success_rate: float,
        plans_active: int
    ) -> str:
        """Generate plain-language revenue health explanation."""
        status = "stable"
        
        if collection_rate > 85 and success_rate > 90:
            status = "strong"
        elif collection_rate < 70 or success_rate < 80:
            status = "needs attention"
        
        return f"Revenue health is {status}. Collection rate: {collection_rate:.1f}%. " \
               f"Payment success rate: {success_rate:.1f}%. {plans_active} active payment plans."
