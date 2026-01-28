"""
Payment Plan Tiers & ACH Optimization
Tier 1: $1-249 | Tier 2: $250-999 | Tier 3: $1000+
ACH encouraged to save on card processing fees
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session

from models.payment_resolution import PaymentPlan, PaymentPlanStatus, PaymentMethod, PaymentPlanTier
from models.collections_governance import CollectionsAccount
from models.founder_billing import PatientStatement
from models.epcr_core import Patient
from utils.logger import logger


# LOCKED UI LABELS - Do not modify
TIER_LABELS = {
    "tier_1": "Quick Pay Plan",
    "tier_2": "Standard Plan", 
    "tier_3": "Custom Plan"
}

ACH_MESSAGING = {
    "save_fees": "Save on processing fees with ACH",
    "ach_recommended": "ACH Recommended - No card fees",
    "card_fee_notice": "Card payments include 3% processing fee"
}


class PaymentPlanTiers:
    """
    Payment plan tier logic with ACH optimization.
    FREE - No paid integrations.
    """
    
    # Tier thresholds (LOCKED - founder approval required to change)
    TIER_1_MAX = Decimal('249.99')
    TIER_2_MAX = Decimal('999.99')
    
    # Default terms by tier (months)
    TIER_1_MONTHS = [3, 6]
    TIER_2_MONTHS = [6, 9, 12]
    TIER_3_MONTHS = [12, 18, 24, 36]
    
    # Minimum payment amounts
    MIN_PAYMENT_TIER_1 = Decimal('10.00')
    MIN_PAYMENT_TIER_2 = Decimal('25.00')
    MIN_PAYMENT_TIER_3 = Decimal('50.00')
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
    
    def determine_tier(self, balance_amount: Decimal) -> PaymentPlanTier:
        """Determine payment plan tier based on balance."""
        if balance_amount <= self.TIER_1_MAX:
            return PaymentPlanTier.SHORT_TERM
        elif balance_amount <= self.TIER_2_MAX:
            return PaymentPlanTier.STANDARD
        else:
            return PaymentPlanTier.EXTENDED
    
    def get_tier_options(self, balance_amount: Decimal) -> Dict:
        """
        Get payment plan options for a given balance.
        Returns tier info, available terms, and ACH savings.
        """
        tier = self.determine_tier(balance_amount)
        
        if tier == 1:
            term_options = self.TIER_1_MONTHS
            min_payment = self.MIN_PAYMENT_TIER_1
            tier_label = TIER_LABELS['tier_1']
            description = f"Pay ${balance_amount} over {min(term_options)}-{max(term_options)} months"
        elif tier == 2:
            term_options = self.TIER_2_MONTHS
            min_payment = self.MIN_PAYMENT_TIER_2
            tier_label = TIER_LABELS['tier_2']
            description = f"Pay ${balance_amount} over {min(term_options)}-{max(term_options)} months"
        else:  # tier 3
            term_options = self.TIER_3_MONTHS
            min_payment = self.MIN_PAYMENT_TIER_3
            tier_label = TIER_LABELS['tier_3']
            description = f"Custom plan for balances over $1,000"
        
        # Calculate payment amounts for each term option
        payment_schedules = []
        for months in term_options:
            monthly_payment = balance_amount / Decimal(months)
            
            # Round up to nearest dollar
            monthly_payment = monthly_payment.quantize(Decimal('1.00'))
            
            # Apply minimum payment constraint
            if monthly_payment < min_payment:
                monthly_payment = min_payment
                adjusted_months = int(balance_amount / min_payment) + 1
                months = adjusted_months
            
            # Calculate card fee (3%)
            card_fee_per_payment = monthly_payment * Decimal('0.03')
            card_fee_total = card_fee_per_payment * Decimal(months)
            
            payment_schedules.append({
                'months': months,
                'monthly_payment': float(monthly_payment),
                'total_with_ach': float(balance_amount),
                'card_fee_per_payment': float(card_fee_per_payment),
                'total_card_fees': float(card_fee_total),
                'total_with_card': float(balance_amount + card_fee_total),
                'savings_with_ach': float(card_fee_total),
                'recommended': True,  # ACH always recommended
            })
        
        return {
            'tier': tier,
            'tier_label': tier_label,
            'description': description,
            'balance_amount': float(balance_amount),
            'min_payment': float(min_payment),
            'payment_schedules': payment_schedules,
            'ach_message': ACH_MESSAGING['ach_recommended'],
            'card_fee_notice': ACH_MESSAGING['card_fee_notice'],
        }
    
    def create_payment_plan(
        self, 
        patient_id: int, 
        balance_id: int,
        balance_amount: Decimal,
        term_months: int,
        payment_method: str = 'ach',  # ach or card
        down_payment: Decimal = Decimal('0.00'),
        auto_pay: bool = True
    ) -> Dict:
        """
        Create a new payment plan for patient.
        
        Args:
            patient_id: Patient ID
            balance_id: PatientBalance ID
            balance_amount: Total balance amount
            term_months: Number of months for plan
            payment_method: 'ach' or 'card'
            down_payment: Optional down payment amount
            auto_pay: Enable automatic payments (recommended)
        
        Returns:
            Created payment plan details
        """
        tier = self.determine_tier(balance_amount)
        
        # Calculate payment schedule
        remaining_balance = balance_amount - down_payment
        monthly_payment = remaining_balance / Decimal(term_months)
        monthly_payment = monthly_payment.quantize(Decimal('1.00'))
        
        # Apply card fees if using card
        card_fee_per_payment = Decimal('0.00')
        if payment_method == 'card':
            card_fee_per_payment = monthly_payment * Decimal('0.03')
            monthly_payment_with_fee = monthly_payment + card_fee_per_payment
        else:
            monthly_payment_with_fee = monthly_payment
        
        # Create payment plan record
        plan = PaymentPlan(
            org_id=self.org_id,
            patient_id=patient_id,
            balance_id=balance_id,
            tier=tier,
            original_balance=float(balance_amount),
            remaining_balance=float(remaining_balance),
            term_months=term_months,
            monthly_payment=float(monthly_payment),
            payment_method=payment_method,
            card_fee_per_payment=float(card_fee_per_payment),
            down_payment=float(down_payment),
            auto_pay_enabled=auto_pay,
            status='active',
            start_date=datetime.utcnow(),
            next_payment_date=datetime.utcnow() + timedelta(days=30),
            created_at=datetime.utcnow()
        )
        
        self.db.add(plan)
        
        # Update patient balance status
        balance = self.db.query(PatientBalance).filter(
            PatientBalance.id == balance_id
        ).first()
        
        if balance:
            balance.payment_plan_id = plan.id
            balance.status = 'payment_plan'
        
        self.db.commit()
        self.db.refresh(plan)
        
        logger.info(
            f"Payment plan created: Patient {patient_id}, "
            f"Tier {tier}, ${monthly_payment_with_fee}/mo for {term_months} months, "
            f"Method: {payment_method}"
        )
        
        return {
            'plan_id': plan.id,
            'tier': tier,
            'tier_label': TIER_LABELS[f'tier_{tier}'],
            'original_balance': float(balance_amount),
            'down_payment': float(down_payment),
            'remaining_balance': float(remaining_balance),
            'term_months': term_months,
            'monthly_payment': float(monthly_payment),
            'card_fee_per_payment': float(card_fee_per_payment),
            'monthly_payment_with_fees': float(monthly_payment_with_fee),
            'payment_method': payment_method,
            'auto_pay_enabled': auto_pay,
            'next_payment_date': plan.next_payment_date.isoformat(),
            'status': 'active',
            'savings_with_ach': float(card_fee_per_payment * term_months) if payment_method == 'card' else 0,
        }
    
    def get_patient_active_plans(self, patient_id: int) -> List[Dict]:
        """Get all active payment plans for a patient."""
        plans = self.db.query(PaymentPlan).filter(
            PaymentPlan.patient_id == patient_id,
            PaymentPlan.org_id == self.org_id,
            PaymentPlan.status == 'active'
        ).all()
        
        return [self._format_plan(p) for p in plans]
    
    def _format_plan(self, plan: PaymentPlan) -> Dict:
        """Format payment plan for API response."""
        payments_made = plan.payments_made or 0
        payments_remaining = plan.term_months - payments_made
        
        return {
            'id': plan.id,
            'tier': plan.tier,
            'tier_label': TIER_LABELS[f'tier_{plan.tier}'],
            'original_balance': plan.original_balance,
            'remaining_balance': plan.remaining_balance,
            'monthly_payment': plan.monthly_payment,
            'payment_method': plan.payment_method,
            'card_fee_per_payment': plan.card_fee_per_payment,
            'auto_pay_enabled': plan.auto_pay_enabled,
            'payments_made': payments_made,
            'payments_remaining': payments_remaining,
            'next_payment_date': plan.next_payment_date.isoformat() if plan.next_payment_date else None,
            'status': plan.status,
            'start_date': plan.start_date.isoformat() if plan.start_date else None,
        }
    
    def calculate_ach_savings(self, balance_amount: Decimal, term_months: int) -> Dict:
        """
        Calculate savings by using ACH instead of card.
        Used to encourage ACH adoption.
        """
        monthly_payment = (balance_amount / Decimal(term_months)).quantize(Decimal('1.00'))
        
        card_fee_per_payment = monthly_payment * Decimal('0.03')
        total_card_fees = card_fee_per_payment * Decimal(term_months)
        
        return {
            'monthly_payment': float(monthly_payment),
            'card_fee_per_payment': float(card_fee_per_payment),
            'total_card_fees': float(total_card_fees),
            'ach_savings': float(total_card_fees),
            'message': f"Save ${float(total_card_fees):.2f} by using ACH instead of card",
            'recommendation': ACH_MESSAGING['ach_recommended']
        }
