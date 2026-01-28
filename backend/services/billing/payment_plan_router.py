"""
Payment Plan Tiers API Router
"""
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from services.billing.payment_plan_tiers import PaymentPlanTiers
from utils.logger import logger


router = APIRouter(
    prefix="/api/billing/payment-plans",
    tags=["Payment Plans"]
)


class CreatePlanRequest(BaseModel):
    patient_id: int
    balance_id: int
    balance_amount: float
    term_months: int
    payment_method: str = 'ach'
    down_payment: float = 0.0
    auto_pay: bool = True


@router.get("/tier-options")
def get_tier_options(
    balance_amount: float,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get payment plan tier options for a balance amount.
    Shows all tiers, payment schedules, and ACH savings.
    """
    tiers = PaymentPlanTiers(db=db, org_id=current_user.org_id)
    options = tiers.get_tier_options(Decimal(str(balance_amount)))
    
    return options


@router.post("/create")
def create_payment_plan(
    request: CreatePlanRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new payment plan for patient.
    Available to: Founder, billing staff
    """
    tiers = PaymentPlanTiers(db=db, org_id=current_user.org_id)
    
    plan = tiers.create_payment_plan(
        patient_id=request.patient_id,
        balance_id=request.balance_id,
        balance_amount=Decimal(str(request.balance_amount)),
        term_months=request.term_months,
        payment_method=request.payment_method,
        down_payment=Decimal(str(request.down_payment)),
        auto_pay=request.auto_pay
    )
    
    return plan


@router.get("/patient/{patient_id}")
def get_patient_plans(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all active payment plans for a patient.
    """
    tiers = PaymentPlanTiers(db=db, org_id=current_user.org_id)
    plans = tiers.get_patient_active_plans(patient_id)
    
    return {
        'patient_id': patient_id,
        'active_plans': plans,
        'total_plans': len(plans)
    }


@router.get("/ach-savings")
def calculate_ach_savings(
    balance_amount: float,
    term_months: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Calculate savings by using ACH instead of card.
    Used to encourage ACH adoption in UI.
    """
    tiers = PaymentPlanTiers(db=db, org_id=current_user.org_id)
    savings = tiers.calculate_ach_savings(
        Decimal(str(balance_amount)),
        term_months
    )
    
    return savings
