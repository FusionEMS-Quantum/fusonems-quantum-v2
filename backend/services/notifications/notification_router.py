from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from core.database import get_db
from core.security import get_current_user
from models.notifications import InAppNotification, NotificationPreference, NotificationSeverity
from models.user import User
from services.notifications.notification_service import NotificationService
from utils.audit import record_audit

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: int
    notification_type: str
    severity: str
    title: str
    body: str
    linked_resource_type: str | None
    linked_resource_id: int | None
    metadata: dict | None
    read_at: datetime | None
    dismissed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferenceResponse(BaseModel):
    id: int
    in_app_enabled: bool
    email_enabled: bool
    sms_enabled: bool
    quiet_hours_start: str | None
    quiet_hours_end: str | None
    critical_override: bool

    class Config:
        from_attributes = True


class UpdatePreferenceRequest(BaseModel):
    in_app_enabled: bool | None = None
    email_enabled: bool | None = None
    sms_enabled: bool | None = None
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
    critical_override: bool | None = None


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications = NotificationService.get_user_notifications(
        db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )
    return notifications


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = NotificationService.get_unread_count(db, current_user.id, current_user.org_id)
    return {"unread_count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(InAppNotification).filter(
        InAppNotification.id == notification_id,
        InAppNotification.user_id == current_user.id,
        InAppNotification.org_id == current_user.org_id,
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif = NotificationService.mark_as_read(db, notification_id)

    record_audit(
        db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="notification.marked_read",
        resource_type="InAppNotification",
        resource_id=notification_id,
        change_summary=f"Marked notification {notification_id} as read",
    )

    return notif


@router.post("/{notification_id}/dismiss", response_model=NotificationResponse)
def dismiss_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(InAppNotification).filter(
        InAppNotification.id == notification_id,
        InAppNotification.user_id == current_user.id,
        InAppNotification.org_id == current_user.org_id,
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif = NotificationService.mark_as_dismissed(db, notification_id)

    record_audit(
        db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="notification.dismissed",
        resource_type="InAppNotification",
        resource_id=notification_id,
        change_summary=f"Dismissed notification {notification_id}",
    )

    return notif


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = NotificationService.get_or_create_preference(db, current_user.id, current_user.org_id)
    return pref


@router.put("/preferences", response_model=NotificationPreferenceResponse)
def update_preferences(
    request: UpdatePreferenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = NotificationService.update_preferences(
        db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        in_app_enabled=request.in_app_enabled,
        email_enabled=request.email_enabled,
        sms_enabled=request.sms_enabled,
        quiet_hours_start=request.quiet_hours_start,
        quiet_hours_end=request.quiet_hours_end,
        critical_override=request.critical_override,
    )

    record_audit(
        db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="notification.preferences_updated",
        resource_type="NotificationPreference",
        resource_id=pref.id,
        change_summary="Updated notification preferences",
    )

    return pref
