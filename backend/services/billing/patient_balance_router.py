"""
Patient Balance Automation API Router
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.organization import Organization
from services.billing.patient_balance_automation import PatientBalanceAutomation
from utils.logger import logger


router = APIRouter(
    prefix="/api/founder/patient-balance",
    tags=["Patient Balance Automation"]
)


@router.post("/run-daily-automation")
def run_daily_automation(
    dry_run: bool = False,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Run daily patient balance automation (Days 15/30/45/60).
    Founder only.
    
    Args:
        dry_run: If True, only simulate (no actual messages sent)
    """
    if not current_user.is_founder:
        raise HTTPException(status_code=403, detail="Founder access required")
    
    practice_config = {
        'practice_name': getattr(current_user.org, 'name', 'Your Healthcare Provider') if hasattr(current_user, 'org') else 'Your Healthcare Provider',
        'phone': getattr(current_user.org, 'phone', '') if hasattr(current_user, 'org') else '',
        'address': getattr(current_user.org, 'address', '') if hasattr(current_user, 'org') else '',
        'portal_url': f'https://portal.{getattr(current_user.org, "domain", "example.com")}' if hasattr(current_user, 'org') else 'https://portal.example.com'
    }
    
    automation = PatientBalanceAutomation(
        db=db,
        org_id=current_user.org_id,
        practice_config=practice_config
    )
    
    results = automation.run_daily_automation(dry_run=dry_run)
    
    return results


@router.post("/send-day-messages/{day}")
def send_day_messages(
    day: int,
    dry_run: bool = False,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Send messages for a specific day threshold (15, 30, 45, or 60).
    Founder only.
    """
    if not current_user.is_founder:
        raise HTTPException(status_code=403, detail="Founder access required")
    
    if day not in [15, 30, 45, 60]:
        raise HTTPException(status_code=400, detail="Day must be 15, 30, 45, or 60")
    
    practice_config = {
        'practice_name': getattr(current_user.org, 'name', 'Your Healthcare Provider') if hasattr(current_user, 'org') else 'Your Healthcare Provider',
        'phone': getattr(current_user.org, 'phone', '') if hasattr(current_user, 'org') else '',
        'address': getattr(current_user.org, 'address', '') if hasattr(current_user, 'org') else '',
        'portal_url': f'https://portal.{getattr(current_user.org, "domain", "example.com")}' if hasattr(current_user, 'org') else 'https://portal.example.com'
    }
    
    automation = PatientBalanceAutomation(
        db=db,
        org_id=current_user.org_id,
        practice_config=practice_config
    )
    
    if day == 15:
        results = automation.send_day_15_messages(dry_run=dry_run)
    elif day == 30:
        results = automation.send_day_30_messages(dry_run=dry_run)
    elif day == 45:
        results = automation.send_day_45_messages(dry_run=dry_run)
    else:  # 60
        results = automation.send_day_60_messages(dry_run=dry_run)
    
    return results


@router.get("/preview-messages/{day}")
def preview_day_messages(
    day: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Preview messages that would be sent for a specific day.
    Shows locked message templates.
    """
    if not current_user.is_founder:
        raise HTTPException(status_code=403, detail="Founder access required")
    
    if day not in [15, 30, 45, 60]:
        raise HTTPException(status_code=400, detail="Day must be 15, 30, 45, or 60")
    
    from services.billing.patient_balance_automation import MESSAGE_TEMPLATES
    
    template_key = f"day_{day}"
    template = MESSAGE_TEMPLATES[template_key]
    
    # Get count of balances at this threshold
    practice_config = {
        'practice_name': getattr(current_user.org, 'name', 'Your Healthcare Provider') if hasattr(current_user, 'org') else 'Your Healthcare Provider',
        'phone': getattr(current_user.org, 'phone', '') if hasattr(current_user, 'org') else '',
        'address': getattr(current_user.org, 'address', '') if hasattr(current_user, 'org') else '',
        'portal_url': f'https://portal.{getattr(current_user.org, "domain", "example.com")}' if hasattr(current_user, 'org') else 'https://portal.example.com'
    }
    
    automation = PatientBalanceAutomation(
        db=db,
        org_id=current_user.org_id,
        practice_config=practice_config
    )
    
    balances = automation.get_balances_at_day_threshold(day)
    
    return {
        'day': day,
        'template': template,
        'balances_count': len(balances),
        'balances_preview': balances[:5],  # Show first 5
        'note': 'These are LOCKED templates - do not modify without founder approval'
    }
