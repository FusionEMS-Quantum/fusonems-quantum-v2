"""
ePCR Import Endpoints for Founder Dashboard
Handles ImageTrend Elite and ZOLL RescueNet imports
"""
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_roles
from models.user import User, UserRole
from services.epcr.imports.import_service import EPCRImportService
from utils.logger import logger
from utils.write_ops import audit_and_event


router = APIRouter(
    prefix="/api/founder/epcr-import",
    tags=["founder_epcr_import"]
)


# ========= REQUEST/RESPONSE MODELS =========

class ImportRequest(BaseModel):
    source: str
    xml_content: str


class ImportResponse(BaseModel):
    success: bool
    job_id: Optional[int] = None
    source: str
    total_records: int
    successful_records: int
    failed_records: int
    validation_errors: list = []
    summary: dict = {}
    error: Optional[str] = None


class ImportStatsResponse(BaseModel):
    total_imports: int
    successful_imports: int
    failed_imports: int
    total_records_imported: int
    total_errors: int
    success_rate: float
    vendor_breakdown: dict
    last_import: Optional[str] = None


# ========= ENDPOINTS =========

@router.post("/import")
def import_epcr_data(
    payload: ImportRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin, UserRole.admin))
):
    """
    Import ePCR data from external vendors (ImageTrend/ZOLL)
    
    Args:
        payload: Import request with source vendor and XML content
        request: FastAPI request
        db: Database session
        user: Authenticated user
        
    Returns:
        Import result with success/failure details
    """
    try:
        if payload.source not in ["imagetrend", "zoll"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid source. Must be 'imagetrend' or 'zoll'"
            )
        
        if not payload.xml_content:
            raise HTTPException(
                status_code=400,
                detail="XML content is required"
            )
        
        # Execute import
        service = EPCRImportService(db, user.org_id)
        result = service.import_from_vendor(
            source=payload.source,
            xml_content=payload.xml_content,
            user_id=user.id,
            request=request
        )
        
        # Audit log
        audit_and_event(
            db=db,
            request=request,
            user=user,
            action="import",
            resource="epcr_import",
            classification="PHI",
            after_state={
                "source": payload.source,
                "total_records": result.get("total_records", 0),
                "successful_records": result.get("successful_records", 0),
                "failed_records": result.get("failed_records", 0)
            },
            event_type="founder.epcr.import.completed",
            event_payload={
                "source": payload.source,
                "success": result.get("success", False)
            }
        )
        
        return ImportResponse(**result)
        
    except ValueError as e:
        logger.error(f"ePCR import validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"ePCR import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.post("/import/file")
async def import_epcr_file(
    source: str = Query(..., description="Source vendor: imagetrend or zoll"),
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin, UserRole.admin))
):
    """
    Import ePCR data from uploaded XML file
    
    Args:
        source: Vendor name (imagetrend or zoll)
        file: Uploaded XML file
        request: FastAPI request
        db: Database session
        user: Authenticated user
        
    Returns:
        Import result with success/failure details
    """
    try:
        if source not in ["imagetrend", "zoll"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid source. Must be 'imagetrend' or 'zoll'"
            )
        
        # Read file content
        xml_content = await file.read()
        xml_string = xml_content.decode("utf-8")
        
        # Execute import
        service = EPCRImportService(db, user.org_id)
        result = service.import_from_vendor(
            source=source,
            xml_content=xml_string,
            user_id=user.id,
            request=request
        )
        
        # Audit log
        audit_and_event(
            db=db,
            request=request,
            user=user,
            action="import",
            resource="epcr_import_file",
            classification="PHI",
            after_state={
                "source": source,
                "filename": file.filename,
                "total_records": result.get("total_records", 0),
                "successful_records": result.get("successful_records", 0)
            },
            event_type="founder.epcr.import.file.completed",
            event_payload={
                "source": source,
                "filename": file.filename
            }
        )
        
        return ImportResponse(**result)
        
    except Exception as e:
        logger.error(f"ePCR file import failed: {e}")
        raise HTTPException(status_code=500, detail=f"File import failed: {str(e)}")


@router.get("/history")
def get_import_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin, UserRole.admin))
):
    """
    Get ePCR import history
    
    Args:
        limit: Maximum number of records to return
        db: Database session
        user: Authenticated user
        
    Returns:
        List of recent import jobs
    """
    try:
        service = EPCRImportService(db, user.org_id)
        history = service.get_import_history(limit=limit)
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        logger.error(f"Error getting import history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get import history: {str(e)}")


@router.get("/stats")
def get_import_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin, UserRole.admin))
):
    """
    Get ePCR import statistics
    
    Args:
        db: Database session
        user: Authenticated user
        
    Returns:
        Aggregate import statistics
    """
    try:
        service = EPCRImportService(db, user.org_id)
        stats = service.get_import_stats()
        
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error getting import stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get import stats: {str(e)}")


@router.get("/validation-errors")
def get_recent_validation_errors(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin, UserRole.admin))
):
    """
    Get recent validation errors from import jobs
    
    Args:
        limit: Maximum number of records to return
        db: Database session
        user: Authenticated user
        
    Returns:
        List of recent validation errors
    """
    try:
        service = EPCRImportService(db, user.org_id)
        history = service.get_import_history(limit=limit)
        
        # Extract all validation errors
        errors = []
        for job in history:
            if job.get("error_count", 0) > 0:
                errors.append({
                    "job_id": job["id"],
                    "source": job["source"],
                    "created_at": job["created_at"],
                    "error_count": job["error_count"],
                    "failed_records": job["failed_records"]
                })
        
        return {
            "success": True,
            "errors": errors,
            "count": len(errors)
        }
    except Exception as e:
        logger.error(f"Error getting validation errors: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get validation errors: {str(e)}")
