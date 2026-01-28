"""
Denial Alert Workflow API Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.payment_resolution import DenialAppeal, InsuranceFollowUp
from models.billing_claims import BillingClaim
from services.billing.denial_alert_workflow import DenialAlertWorkflow
from utils.logger import logger


router = APIRouter(
    prefix="/api/founder/denials",
    tags=["Denial Alerts"]
)


class ApprovalRequest(BaseModel):
    notes: Optional[str] = ''


class RejectionRequest(BaseModel):
    reason: str


@router.post("/classify/{denial_id}")
def classify_denial(
    denial_id: int,
    notify: bool = True,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Classify a denial and trigger alerts.
    Available to: Founder, billing staff
    """
    denial = db.query(DenialAppeal).filter(
        DenialAppeal.id == denial_id
    ).first()
    
    if not denial:
        raise HTTPException(status_code=404, detail="Denial not found")
    
    # Verify org_id through claim
    claim = db.query(BillingClaim).filter(
        BillingClaim.id == denial.claim_id,
        BillingClaim.org_id == current_user.org_id
    ).first()
    
    if not claim:
        raise HTTPException(status_code=403, detail="Access denied")
    
    workflow = DenialAlertWorkflow(db=db, org_id=current_user.org_id)
    result = workflow.process_new_denial(denial, notify=notify)
    
    return result


@router.get("/high-impact")
def get_high_impact_denials(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all high-impact denials pending founder review.
    Founder only.
    """
    if not current_user.is_founder:
        raise HTTPException(status_code=403, detail="Founder access required")
    
    workflow = DenialAlertWorkflow(db=db, org_id=current_user.org_id)
    denials = workflow.get_pending_high_impact_denials()
    
    return {
        'high_impact_denials': denials,
        'count': len(denials),
        'threshold': 1000.00
    }


@router.get("/aging")
def get_aging_denials(
    days_threshold: int = 30,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get denials older than threshold.
    Available to: Founder, billing staff
    """
    workflow = DenialAlertWorkflow(db=db, org_id=current_user.org_id)
    denials = workflow.get_aging_denials(days_threshold)
    
    return {
        'aging_denials': denials,
        'count': len(denials),
        'days_threshold': days_threshold
    }


@router.post("/{denial_id}/approve")
def approve_appeal(
    denial_id: int,
    request: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Founder approves appeal for high-impact denial.
    Required for denials >$1000.
    Founder only.
    """
    if not current_user.is_founder:
        raise HTTPException(status_code=403, detail="Founder access required")
    
    workflow = DenialAlertWorkflow(db=db, org_id=current_user.org_id)
    result = workflow.founder_approve_appeal(
        denial_id=denial_id,
        founder_id=current_user.id,
        notes=request.notes or ''
    )
    
    return result


@router.post("/{denial_id}/reject")
def reject_appeal(
    denial_id: int,
    request: RejectionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Founder rejects appeal (write-off or alternative action).
    Founder only.
    """
    if not current_user.is_founder:
        raise HTTPException(status_code=403, detail="Founder access required")
    
    workflow = DenialAlertWorkflow(db=db, org_id=current_user.org_id)
    result = workflow.founder_reject_appeal(
        denial_id=denial_id,
        founder_id=current_user.id,
        reason=request.reason
    )
    
    return result
