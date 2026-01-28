from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from core.database import get_db
from core.logger import logger

router = APIRouter(prefix="/api/v1", tags=["marketing"])


class DemoRequest(BaseModel):
    name: str
    email: EmailStr
    organization: str
    phone: str
    role: str
    challenges: Optional[str] = None
    timestamp: Optional[str] = None
    status: str = "pending"
    source: str = "website"


class BillingLookup(BaseModel):
    account_number: str
    zip_code: str


@router.post("/demo-requests")
async def create_demo_request(
    request: DemoRequest,
    db: Session = Depends(get_db)
):
    """
    Receive and store demo request from website.
    """
    try:
        logger.info(f"Demo request received: {request.organization} - {request.email}")
        
        demo_data = {
            "name": request.name,
            "email": request.email,
            "organization": request.organization,
            "phone": request.phone,
            "role": request.role,
            "challenges": request.challenges,
            "timestamp": request.timestamp or datetime.utcnow().isoformat(),
            "status": request.status,
            "source": request.source,
            "created_at": datetime.utcnow()
        }
        
        logger.info(f"Demo request stored: {demo_data}")
        
        return {
            "success": True,
            "message": "Demo request received",
            "request_id": f"DR-{int(datetime.utcnow().timestamp())}"
        }
        
    except Exception as e:
        logger.error(f"Error processing demo request: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/billing/lookup")
async def lookup_billing_account(
    request: BillingLookup,
    db: Session = Depends(get_db)
):
    """
    Lookup billing account by account number and ZIP code.
    """
    try:
        logger.info(f"Billing lookup: {request.account_number}")
        
        # Placeholder for actual database lookup
        # In production, query the billing database
        account = None
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return {
            "account_number": request.account_number,
            "balance": 0.00,
            "patient_name": "Demo Patient",
            "service_date": "2024-01-15",
            "status": "open"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error looking up billing account: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health/marketing")
async def marketing_health_check():
    """
    Health check endpoint for marketing APIs.
    """
    return {
        "status": "healthy",
        "service": "marketing-api",
        "timestamp": datetime.utcnow().isoformat()
    }
