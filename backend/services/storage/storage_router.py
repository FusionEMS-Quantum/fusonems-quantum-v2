from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Request, Form
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_user
from models.user import User
from models.storage import AuditActionType
from services.storage.storage_service import get_storage_service, UploadContext
from services.storage.audit_service import AuditLogger, FileRecordService
from services.storage.schemas import (
    UploadFileRequest,
    FileUploadResponse,
    SignedUrlRequest,
    SignedUrlResponse,
    DeleteFileRequest,
    DeleteFileResponse,
    FileMetadataResponse,
    AuditLogsResponse,
    AuditLogEntry
)
from utils.logger import logger

router = APIRouter(prefix="/api/storage", tags=["storage"])


def get_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    ip_address = request.client.host if request.client else None
    device_info = request.headers.get("User-Agent")
    return ip_address, device_info


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    org_id: str = Form(...),
    system: str = Form(...),
    object_type: str = Form(...),
    object_id: str = Form(...),
    related_object_type: Optional[str] = Form(None),
    related_object_id: Optional[str] = Form(None),
    request: Request = None,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    try:
        storage_service = get_storage_service()
        ip_address, device_info = get_client_info(request)
        
        file_data = await file.read()
        
        context = UploadContext(
            org_id=org_id,
            system=system,
            object_type=object_type,
            object_id=object_id,
            user_id=current_user.id,
            role=getattr(current_user, 'role', None),
            ip_address=ip_address,
            device_info=device_info,
            related_object_type=related_object_type,
            related_object_id=related_object_id
        )
        
        metadata = storage_service.upload_file(
            file_data=file_data,
            filename=file.filename,
            context=context,
            mime_type=file.content_type or "application/octet-stream"
        )
        
        FileRecordService.create_file_record(
            db=db,
            org_id=org_id,
            file_path=metadata.file_path,
            original_filename=metadata.original_filename,
            file_size=metadata.size,
            mime_type=metadata.mime_type,
            system=system,
            object_type=object_type,
            object_id=object_id,
            uploaded_by=current_user.id
        )
        
        AuditLogger.log_upload(
            db=db,
            file_path=metadata.file_path,
            user_id=current_user.id,
            role=getattr(current_user, 'role', None),
            ip_address=ip_address,
            device_info=device_info,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            file_size=metadata.size,
            mime_type=metadata.mime_type
        )
        
        return FileUploadResponse(
            success=True,
            file_path=metadata.file_path,
            metadata={
                "size": metadata.size,
                "mime_type": metadata.mime_type,
                "uploaded_at": metadata.uploaded_at.isoformat(),
                "original_filename": metadata.original_filename
            }
        )
        
    except ValueError as e:
        logger.error(f"Validation error during file upload: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during file upload: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")


@router.post("/signed-url", response_model=SignedUrlResponse)
async def generate_signed_url(
    req: SignedUrlRequest,
    request: Request = None,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    try:
        storage_service = get_storage_service()
        ip_address, device_info = get_client_info(request)
        
        file_record = FileRecordService.get_file_record(db, req.file_path)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found or has been deleted")
        
        url = storage_service.generate_signed_url(
            file_path=req.file_path,
            expires_in=req.expires_in
        )
        
        AuditLogger.log_signed_url(
            db=db,
            file_path=req.file_path,
            user_id=current_user.id,
            role=getattr(current_user, 'role', None),
            ip_address=ip_address,
            device_info=device_info,
            related_object_type=req.related_object_type,
            related_object_id=req.related_object_id,
            expires_in=req.expires_in
        )
        
        expires_at = datetime.utcnow() + timedelta(seconds=req.expires_in)
        
        return SignedUrlResponse(
            success=True,
            url=url,
            expires_at=expires_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating signed URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate signed URL")


@router.delete("/delete", response_model=DeleteFileResponse)
async def delete_file(
    req: DeleteFileRequest,
    request: Request = None,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    try:
        storage_service = get_storage_service()
        ip_address, device_info = get_client_info(request)
        
        file_record = FileRecordService.get_file_record(db, req.file_path)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        if req.hard_delete:
            storage_service.delete_file(req.file_path)
            message = "File permanently deleted from storage"
        else:
            FileRecordService.soft_delete_file(db, req.file_path, current_user.id)
            message = "File soft-deleted (marked as deleted in database)"
        
        AuditLogger.log_delete(
            db=db,
            file_path=req.file_path,
            user_id=current_user.id,
            role=getattr(current_user, 'role', None),
            ip_address=ip_address,
            device_info=device_info,
            related_object_type=req.related_object_type,
            related_object_id=req.related_object_id,
            soft_delete=not req.hard_delete
        )
        
        return DeleteFileResponse(
            success=True,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail="File deletion failed")


@router.get("/metadata/{file_path:path}", response_model=FileMetadataResponse)
async def get_file_metadata(
    file_path: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    try:
        file_record = db.query(FileRecordService).filter(
            FileRecordService.file_path == file_path
        ).first()
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileMetadataResponse(
            success=True,
            file_path=file_record.file_path,
            size=file_record.file_size,
            mime_type=file_record.mime_type,
            uploaded_at=file_record.created_at,
            original_filename=file_record.original_filename,
            system=file_record.system,
            object_type=file_record.object_type,
            deleted=file_record.deleted == "true"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving file metadata: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metadata")


@router.post("/receipt-upload", response_model=FileUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    org_id: str = Form(...),
    object_id: str = Form(...),
    related_object_type: Optional[str] = Form(None),
    related_object_id: Optional[str] = Form(None),
    request: Request = None,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    return await upload_file(
        file=file,
        org_id=org_id,
        system="accounting",
        object_type="receipt",
        object_id=object_id,
        related_object_type=related_object_type,
        related_object_id=related_object_id,
        request=request,
        current_user=current_user,
        db=db
    )


@router.post("/app-zip-upload", response_model=FileUploadResponse)
async def upload_app_zip(
    file: UploadFile = File(...),
    org_id: str = Form(...),
    object_id: str = Form(...),
    request: Request = None,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are allowed for app uploads")
    
    return await upload_file(
        file=file,
        org_id=org_id,
        system="app-builder",
        object_type="source",
        object_id=object_id,
        related_object_type="app",
        related_object_id=object_id,
        request=request,
        current_user=current_user,
        db=db
    )


@router.get("/audit-logs", response_model=AuditLogsResponse)
async def get_audit_logs(
    file_path: Optional[str] = None,
    action_type: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    try:
        action_enum = None
        if action_type:
            try:
                action_enum = AuditActionType[action_type.upper()]
            except KeyError:
                raise HTTPException(status_code=400, detail=f"Invalid action type: {action_type}")
        
        logs = AuditLogger.get_audit_logs(
            db=db,
            file_path=file_path,
            action_type=action_enum,
            limit=limit
        )
        
        log_entries = [
            AuditLogEntry(
                id=log.id,
                user_id=log.user_id,
                role=log.role,
                timestamp=log.timestamp,
                action_type=log.action_type,
                file_path=log.file_path,
                related_object_type=log.related_object_type,
                related_object_id=log.related_object_id,
                metadata=log.metadata or {},
                success=log.success
            )
            for log in logs
        ]
        
        return AuditLogsResponse(
            success=True,
            logs=log_entries,
            count=len(log_entries)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving audit logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs")
