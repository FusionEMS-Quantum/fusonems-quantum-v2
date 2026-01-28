from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from models.storage import StorageAuditLog, AuditActionType, FileRecord
from utils.logger import logger


class AuditLogger:
    
    @staticmethod
    def log(
        db: Session,
        action_type: AuditActionType,
        file_path: str,
        user_id: Optional[int] = None,
        role: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
        related_object_type: Optional[str] = None,
        related_object_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> StorageAuditLog:
        try:
            audit_entry = StorageAuditLog(
                user_id=user_id,
                role=role,
                action_type=action_type.value,
                file_path=file_path,
                ip_address=ip_address,
                device_info=device_info,
                related_object_type=related_object_type,
                related_object_id=related_object_id,
                metadata=metadata or {},
                success="true" if success else "false",
                error_message=error_message
            )
            
            db.add(audit_entry)
            db.commit()
            db.refresh(audit_entry)
            
            logger.info(f"Audit log created: {action_type.value} on {file_path} by user {user_id}")
            return audit_entry
            
        except Exception as e:
            logger.error(f"CRITICAL: Failed to write audit log: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def log_upload(
        db: Session,
        file_path: str,
        user_id: Optional[int] = None,
        role: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
        related_object_type: Optional[str] = None,
        related_object_id: Optional[str] = None,
        file_size: Optional[int] = None,
        mime_type: Optional[str] = None
    ) -> StorageAuditLog:
        metadata = {}
        if file_size:
            metadata['file_size'] = file_size
        if mime_type:
            metadata['mime_type'] = mime_type
        
        return AuditLogger.log(
            db=db,
            action_type=AuditActionType.UPLOAD,
            file_path=file_path,
            user_id=user_id,
            role=role,
            ip_address=ip_address,
            device_info=device_info,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            metadata=metadata
        )
    
    @staticmethod
    def log_signed_url(
        db: Session,
        file_path: str,
        user_id: Optional[int] = None,
        role: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
        related_object_type: Optional[str] = None,
        related_object_id: Optional[str] = None,
        expires_in: Optional[int] = None
    ) -> StorageAuditLog:
        metadata = {}
        if expires_in:
            metadata['expires_in'] = expires_in
        
        return AuditLogger.log(
            db=db,
            action_type=AuditActionType.SIGNED_URL_GENERATED,
            file_path=file_path,
            user_id=user_id,
            role=role,
            ip_address=ip_address,
            device_info=device_info,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            metadata=metadata
        )
    
    @staticmethod
    def log_delete(
        db: Session,
        file_path: str,
        user_id: Optional[int] = None,
        role: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
        related_object_type: Optional[str] = None,
        related_object_id: Optional[str] = None,
        soft_delete: bool = True
    ) -> StorageAuditLog:
        metadata = {'soft_delete': soft_delete}
        
        return AuditLogger.log(
            db=db,
            action_type=AuditActionType.DELETE,
            file_path=file_path,
            user_id=user_id,
            role=role,
            ip_address=ip_address,
            device_info=device_info,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            metadata=metadata
        )
    
    @staticmethod
    def get_audit_logs(
        db: Session,
        user_id: Optional[int] = None,
        file_path: Optional[str] = None,
        action_type: Optional[AuditActionType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[StorageAuditLog]:
        query = db.query(StorageAuditLog)
        
        if user_id:
            query = query.filter(StorageAuditLog.user_id == user_id)
        if file_path:
            query = query.filter(StorageAuditLog.file_path == file_path)
        if action_type:
            query = query.filter(StorageAuditLog.action_type == action_type.value)
        if start_date:
            query = query.filter(StorageAuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(StorageAuditLog.timestamp <= end_date)
        
        return query.order_by(StorageAuditLog.timestamp.desc()).limit(limit).all()


class FileRecordService:
    
    @staticmethod
    def create_file_record(
        db: Session,
        org_id: str,
        file_path: str,
        original_filename: str,
        file_size: int,
        mime_type: str,
        system: str,
        object_type: str,
        object_id: str,
        uploaded_by: Optional[int] = None
    ) -> FileRecord:
        file_record = FileRecord(
            org_id=org_id,
            file_path=file_path,
            original_filename=original_filename,
            file_size=file_size,
            mime_type=mime_type,
            system=system,
            object_type=object_type,
            object_id=object_id,
            uploaded_by=uploaded_by
        )
        
        db.add(file_record)
        db.commit()
        db.refresh(file_record)
        
        logger.info(f"File record created: {file_path}")
        return file_record
    
    @staticmethod
    def get_file_record(db: Session, file_path: str) -> Optional[FileRecord]:
        return db.query(FileRecord).filter(
            FileRecord.file_path == file_path,
            FileRecord.deleted == "false"
        ).first()
    
    @staticmethod
    def soft_delete_file(
        db: Session,
        file_path: str,
        deleted_by: Optional[int] = None
    ) -> Optional[FileRecord]:
        file_record = db.query(FileRecord).filter(
            FileRecord.file_path == file_path
        ).first()
        
        if file_record:
            file_record.deleted = "true"
            file_record.deleted_at = datetime.utcnow()
            file_record.deleted_by = deleted_by
            db.commit()
            db.refresh(file_record)
            logger.info(f"File soft-deleted: {file_path}")
        
        return file_record
    
    @staticmethod
    def list_files_by_context(
        db: Session,
        org_id: str,
        system: Optional[str] = None,
        object_type: Optional[str] = None,
        object_id: Optional[str] = None,
        include_deleted: bool = False
    ) -> List[FileRecord]:
        query = db.query(FileRecord).filter(FileRecord.org_id == org_id)
        
        if system:
            query = query.filter(FileRecord.system == system)
        if object_type:
            query = query.filter(FileRecord.object_type == object_type)
        if object_id:
            query = query.filter(FileRecord.object_id == object_id)
        if not include_deleted:
            query = query.filter(FileRecord.deleted == "false")
        
        return query.order_by(FileRecord.created_at.desc()).all()
