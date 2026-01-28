from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from core.guards import require_module
from core.security import require_roles
from core.database import get_db
from services.founder.fax_service import FounderFaxService
from models.user import User, UserRole
from models.organization import Organization
from utils.logger import logger

router = APIRouter(
    prefix="/api/founder/fax",
    tags=["founder_fax"],
    dependencies=[Depends(require_module("FOUNDER"))]
)


# ========= REQUEST/RESPONSE MODELS =========

class SendFaxRequest(BaseModel):
    recipient_number: str
    recipient_name: str = ""
    document_url: Optional[str] = None
    cover_page_enabled: bool = False
    cover_page_subject: str = ""
    cover_page_message: str = ""
    cover_page_from: str = ""
    
    @field_validator('recipient_number')
    @classmethod
    def validate_fax_number(cls, v):
        # Strip non-numeric characters
        cleaned = ''.join(filter(str.isdigit, v))
        if len(cleaned) < 10:
            raise ValueError('Fax number must be at least 10 digits')
        return cleaned


class FaxResponse(BaseModel):
    success: bool
    fax_id: int
    status: str
    provider_fax_id: Optional[str] = None


class FaxStatsResponse(BaseModel):
    success: bool
    stats: Dict[str, Any]


class FaxListResponse(BaseModel):
    success: bool
    faxes: List[Dict[str, Any]]
    count: int


class FaxDetailResponse(BaseModel):
    success: bool
    fax: Dict[str, Any]


class RetryFaxResponse(BaseModel):
    success: bool
    fax_id: int
    retry_count: int
    status: str
    error: Optional[str] = None


# ========= ENDPOINTS =========

@router.get("/stats")
def get_fax_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Get fax statistics for founder dashboard"""
    try:
        service = FounderFaxService(db, user.org_id)
        stats = service.get_fax_stats()
        
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error getting fax stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get fax stats: {str(e)}")


@router.get("/inbox")
def get_inbox(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Get received faxes"""
    try:
        service = FounderFaxService(db, user.org_id)
        faxes = service.get_inbox(limit=limit, offset=offset)
        
        return {
            "success": True,
            "faxes": faxes,
            "count": len(faxes)
        }
    except Exception as e:
        logger.error(f"Error getting inbox: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get inbox: {str(e)}")


@router.get("/outbox")
def get_outbox(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Get sent faxes"""
    try:
        service = FounderFaxService(db, user.org_id)
        faxes = service.get_outbox(limit=limit, offset=offset)
        
        return {
            "success": True,
            "faxes": faxes,
            "count": len(faxes)
        }
    except Exception as e:
        logger.error(f"Error getting outbox: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get outbox: {str(e)}")


@router.get("/recent")
def get_recent_faxes(
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Get recent fax activity"""
    try:
        service = FounderFaxService(db, user.org_id)
        faxes = service.get_recent_faxes(limit=limit)
        
        return {
            "success": True,
            "faxes": faxes,
            "count": len(faxes)
        }
    except Exception as e:
        logger.error(f"Error getting recent faxes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recent faxes: {str(e)}")


@router.get("/failed")
def get_failed_faxes(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Get failed faxes that need attention"""
    try:
        service = FounderFaxService(db, user.org_id)
        faxes = service.get_failed_faxes(limit=limit)
        
        return {
            "success": True,
            "faxes": faxes,
            "count": len(faxes)
        }
    except Exception as e:
        logger.error(f"Error getting failed faxes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get failed faxes: {str(e)}")


@router.get("/{fax_id}")
def get_fax_detail(
    fax_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Get fax details by ID"""
    try:
        service = FounderFaxService(db, user.org_id)
        fax = service.get_fax_by_id(fax_id)
        
        if not fax:
            raise HTTPException(status_code=404, detail="Fax not found")
        
        return {
            "success": True,
            "fax": fax
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fax detail: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get fax detail: {str(e)}")


@router.post("/send")
def send_fax(
    payload: SendFaxRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Send a fax"""
    try:
        service = FounderFaxService(db, user.org_id)
        
        # Prepare cover page if enabled
        cover_page = None
        if payload.cover_page_enabled:
            cover_page = {
                'subject': payload.cover_page_subject,
                'message': payload.cover_page_message,
                'from_name': payload.cover_page_from or user.name,
                'to_name': payload.recipient_name
            }
        
        result = service.send_fax(
            recipient_number=payload.recipient_number,
            recipient_name=payload.recipient_name,
            document_url=payload.document_url,
            cover_page=cover_page,
            user_id=user.id
        )
        
        if result['success']:
            return {
                "success": True,
                "fax_id": result['fax_id'],
                "status": result['status'],
                "provider_fax_id": result.get('provider_fax_id')
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to send fax'))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending fax: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send fax: {str(e)}")


@router.post("/send/upload")
async def send_fax_with_upload(
    recipient_number: str = Form(...),
    recipient_name: str = Form(""),
    cover_page_enabled: bool = Form(False),
    cover_page_subject: str = Form(""),
    cover_page_message: str = Form(""),
    cover_page_from: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Send a fax with file upload"""
    try:
        # Validate file type
        if not file.content_type or file.content_type not in ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff']:
            raise HTTPException(status_code=400, detail="Invalid file type. Must be PDF or image.")
        
        # Read file data
        file_data = await file.read()
        
        service = FounderFaxService(db, user.org_id)
        
        # Prepare cover page if enabled
        cover_page = None
        if cover_page_enabled:
            cover_page = {
                'subject': cover_page_subject,
                'message': cover_page_message,
                'from_name': cover_page_from or user.name,
                'to_name': recipient_name
            }
        
        result = service.send_fax(
            recipient_number=recipient_number,
            recipient_name=recipient_name,
            document_data=file_data,
            cover_page=cover_page,
            user_id=user.id
        )
        
        if result['success']:
            return {
                "success": True,
                "fax_id": result['fax_id'],
                "status": result['status'],
                "provider_fax_id": result.get('provider_fax_id')
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to send fax'))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending fax with upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send fax: {str(e)}")


@router.post("/{fax_id}/retry")
def retry_fax(
    fax_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Retry a failed fax"""
    try:
        service = FounderFaxService(db, user.org_id)
        result = service.retry_fax(fax_id, user_id=user.id)
        
        if result['success']:
            return {
                "success": True,
                "fax_id": result['fax_id'],
                "retry_count": result['retry_count'],
                "status": result['status']
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to retry fax'))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying fax: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retry fax: {str(e)}")


@router.delete("/{fax_id}")
def delete_fax(
    fax_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Delete a fax record"""
    try:
        service = FounderFaxService(db, user.org_id)
        success = service.delete_fax(fax_id)
        
        if success:
            return {
                "success": True,
                "message": "Fax deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Fax not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting fax: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete fax: {str(e)}")


@router.get("/{fax_id}/download")
def download_fax(
    fax_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Download fax document"""
    try:
        service = FounderFaxService(db, user.org_id)
        fax = service.get_fax_by_id(fax_id)
        
        if not fax:
            raise HTTPException(status_code=404, detail="Fax not found")
        
        if not fax.get('document_url'):
            raise HTTPException(status_code=404, detail="Document not available")
        
        # TODO: Implement actual file download from storage
        # For now, return the URL
        return {
            "success": True,
            "download_url": fax['document_url'],
            "filename": fax.get('document_filename', f"fax_{fax_id}.pdf")
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading fax: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download fax: {str(e)}")


@router.post("/webhook")
async def fax_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle incoming fax webhooks from provider"""
    try:
        # Get payload based on content type
        content_type = request.headers.get('content-type', '')
        
        if 'application/json' in content_type:
            payload = await request.json()
        else:
            # Form data
            form = await request.form()
            payload = dict(form)
        
        logger.info(f"Received fax webhook: {payload}")
        
        # Determine org from webhook data
        # This is a simplified approach - in production you'd need proper webhook validation
        org_id = payload.get('org_id', 1)  # TODO: Proper org identification
        
        service = FounderFaxService(db, org_id)
        result = service.handle_webhook(payload)
        
        return {
            "success": result.get('success', True),
            "message": "Webhook processed"
        }
        
    except Exception as e:
        logger.error(f"Error processing fax webhook: {e}")
        # Still return 200 to prevent webhook retries
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/generate-cover-page")
def generate_cover_page(
    to_name: str = Form(...),
    to_number: str = Form(...),
    from_name: str = Form(...),
    from_number: str = Form(...),
    subject: str = Form(...),
    message: str = Form(""),
    page_count: int = Form(1),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder))
):
    """Generate a fax cover page PDF"""
    try:
        service = FounderFaxService(db, user.org_id)
        
        pdf_data = service.generate_cover_page(
            to_name=to_name,
            to_number=to_number,
            from_name=from_name,
            from_number=from_number,
            subject=subject,
            message=message,
            page_count=page_count
        )
        
        # Return PDF as download
        from fastapi.responses import Response
        
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=fax_cover_page.pdf"
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating cover page: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate cover page: {str(e)}")
