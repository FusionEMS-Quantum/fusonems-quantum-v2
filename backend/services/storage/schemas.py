from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class UploadFileRequest(BaseModel):
    org_id: str = Field(..., description="Organization ID")
    system: str = Field(..., description="System: workspace, accounting, communications, app-builder")
    object_type: str = Field(..., description="Object type within the system")
    object_id: str = Field(..., description="Unique identifier for the related object")
    related_object_type: Optional[str] = Field(None, description="Related business object type")
    related_object_id: Optional[str] = Field(None, description="Related business object ID")


class FileUploadResponse(BaseModel):
    success: bool
    file_path: str
    metadata: dict


class SignedUrlRequest(BaseModel):
    file_path: str = Field(..., description="Full path to file in Spaces")
    expires_in: Optional[int] = Field(600, description="URL expiration time in seconds (default 600 = 10 min)")
    related_object_type: Optional[str] = Field(None, description="Related business object type for audit")
    related_object_id: Optional[str] = Field(None, description="Related business object ID for audit")


class SignedUrlResponse(BaseModel):
    success: bool
    url: str
    expires_at: datetime


class DeleteFileRequest(BaseModel):
    file_path: str = Field(..., description="Full path to file in Spaces")
    hard_delete: Optional[bool] = Field(False, description="Immediate physical deletion (requires elevated permissions)")
    related_object_type: Optional[str] = Field(None, description="Related business object type for audit")
    related_object_id: Optional[str] = Field(None, description="Related business object ID for audit")


class DeleteFileResponse(BaseModel):
    success: bool
    message: str


class FileMetadataResponse(BaseModel):
    success: bool
    file_path: str
    size: int
    mime_type: str
    uploaded_at: datetime
    original_filename: str
    system: str
    object_type: str
    deleted: bool


class AuditLogEntry(BaseModel):
    id: int
    user_id: Optional[int]
    role: Optional[str]
    timestamp: datetime
    action_type: str
    file_path: str
    related_object_type: Optional[str]
    related_object_id: Optional[str]
    metadata: dict
    success: str
    
    class Config:
        from_attributes = True


class AuditLogsResponse(BaseModel):
    success: bool
    logs: list[AuditLogEntry]
    count: int
