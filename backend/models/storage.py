from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, JSON, func
from datetime import datetime
import enum

from core.database import Base


class AuditActionType(str, enum.Enum):
    UPLOAD = "UPLOAD"
    VIEW = "VIEW"
    EDIT = "EDIT"
    DELETE = "DELETE"
    SIGNED_URL_GENERATED = "SIGNED_URL_GENERATED"
    DOWNLOAD = "DOWNLOAD"


class StorageAuditLog(Base):
    __tablename__ = "storage_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    role = Column(String(100), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    device_info = Column(String(500), nullable=True)
    action_type = Column(String(50), nullable=False, index=True)
    file_path = Column(String(1000), nullable=False, index=True)
    related_object_type = Column(String(100), nullable=True, index=True)
    related_object_id = Column(String(100), nullable=True, index=True)
    audit_metadata = Column(JSON, nullable=True)
    success = Column(String(10), default="true")
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FileRecord(Base):
    __tablename__ = "file_records"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String(100), nullable=False, index=True)
    file_path = Column(String(1000), nullable=False, unique=True, index=True)
    original_filename = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(200), nullable=False)
    system = Column(String(100), nullable=False, index=True)
    object_type = Column(String(100), nullable=False, index=True)
    object_id = Column(String(100), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    deleted = Column(String(10), default="false", index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    version = Column(Integer, default=1)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
