"""
Agency Bulk Messaging API Router
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from services.agency_portal.agency_bulk_messaging import AgencyBulkMessaging
from utils.logger import logger


router = APIRouter(
    prefix="/api/agency/bulk-messaging",
    tags=["Agency Bulk Messaging"]
)


class ClaimStatusUpdateRequest(BaseModel):
    claim_ids: List[int]
    custom_message: Optional[str] = None
    include_details: bool = True


class DocumentationRequest(BaseModel):
    claim_ids: List[int]
    requested_documents: List[str]
    due_date: Optional[datetime] = None


@router.post("/send-claim-status")
def send_claim_status_update(
    request: ClaimStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Send claim status updates to agencies (bulk).
    LOCKED LABEL: "Send Claim Status Update"
    Available to: Founder, billing staff with permission
    """
    messaging = AgencyBulkMessaging(db=db, org_id=current_user.org_id)
    
    results = messaging.send_claim_status_update(
        claim_ids=request.claim_ids,
        custom_message=request.custom_message,
        include_details=request.include_details,
        founder_id=current_user.id if current_user.is_founder else None
    )
    
    return results


@router.post("/send-remittance")
def send_remittance_notice(
    remittance_ids: List[int],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Send remittance notices to agencies (bulk).
    Available to: Founder, billing staff
    """
    messaging = AgencyBulkMessaging(db=db, org_id=current_user.org_id)
    
    results = messaging.send_remittance_notice(
        remittance_ids=remittance_ids,
        founder_id=current_user.id if current_user.is_founder else None
    )
    
    return results


@router.post("/request-documentation")
def request_documentation(
    request: DocumentationRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Request documentation from agencies (bulk).
    Available to: Founder, billing staff
    """
    messaging = AgencyBulkMessaging(db=db, org_id=current_user.org_id)
    
    results = messaging.send_documentation_request(
        claim_ids=request.claim_ids,
        requested_documents=request.requested_documents,
        due_date=request.due_date,
        founder_id=current_user.id if current_user.is_founder else None
    )
    
    return results


@router.get("/history")
def get_message_history(
    category: Optional[str] = None,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get history of bulk messages sent.
    Available to: Founder, billing staff
    """
    messaging = AgencyBulkMessaging(db=db, org_id=current_user.org_id)
    
    history = messaging.get_bulk_message_history(
        category=category,
        days=days
    )
    
    return {
        'messages': history,
        'count': len(history),
        'days': days,
        'category': category
    }
