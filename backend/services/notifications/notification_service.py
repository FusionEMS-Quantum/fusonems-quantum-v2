from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from models.notifications import InAppNotification, NotificationPreference, NotificationType, NotificationSeverity
from models.user import User
from core.database import get_db
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def get_or_create_preference(db: Session, user_id: int, org_id: int) -> NotificationPreference:
        pref = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id,
            NotificationPreference.org_id == org_id
        ).first()
        
        if not pref:
            pref = NotificationPreference(
                user_id=user_id,
                org_id=org_id,
                in_app_enabled=True,
                email_enabled=True,
                sms_enabled=False,
                critical_override=True,
            )
            db.add(pref)
            db.commit()
            db.refresh(pref)
        
        return pref

    @staticmethod
    def send_notification(
        db: Session,
        user_id: int,
        org_id: int,
        notification_type: NotificationType,
        title: str,
        body: str,
        severity: NotificationSeverity = NotificationSeverity.INFO,
        linked_resource_type: Optional[str] = None,
        linked_resource_id: Optional[int] = None,
        metadata: Optional[dict] = None,
        training_mode: bool = False,
    ) -> InAppNotification:
        notif = InAppNotification(
            org_id=org_id,
            user_id=user_id,
            notification_type=notification_type,
            severity=severity,
            title=title,
            body=body,
            linked_resource_type=linked_resource_type,
            linked_resource_id=linked_resource_id,
            metadata=metadata or {},
            training_mode=training_mode,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        
        logger.info(f"Notification created: {notification_type} for user {user_id}")
        
        return notif

    @staticmethod
    def mark_as_read(db: Session, notification_id: int) -> InAppNotification:
        notif = db.query(InAppNotification).filter(
            InAppNotification.id == notification_id
        ).first()
        
        if not notif:
            return None
        
        notif.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notif)
        
        return notif

    @staticmethod
    def mark_as_dismissed(db: Session, notification_id: int) -> InAppNotification:
        notif = db.query(InAppNotification).filter(
            InAppNotification.id == notification_id
        ).first()
        
        if not notif:
            return None
        
        notif.dismissed_at = datetime.utcnow()
        db.commit()
        db.refresh(notif)
        
        return notif

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        org_id: int,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> List[InAppNotification]:
        query = db.query(InAppNotification).filter(
            InAppNotification.user_id == user_id,
            InAppNotification.org_id == org_id,
            InAppNotification.dismissed_at.is_(None),
        )
        
        if unread_only:
            query = query.filter(InAppNotification.read_at.is_(None))
        
        return query.order_by(InAppNotification.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def get_unread_count(db: Session, user_id: int, org_id: int) -> int:
        return db.query(InAppNotification).filter(
            InAppNotification.user_id == user_id,
            InAppNotification.org_id == org_id,
            InAppNotification.read_at.is_(None),
            InAppNotification.dismissed_at.is_(None),
        ).count()

    @staticmethod
    def update_preferences(
        db: Session,
        user_id: int,
        org_id: int,
        in_app_enabled: Optional[bool] = None,
        email_enabled: Optional[bool] = None,
        sms_enabled: Optional[bool] = None,
        quiet_hours_start: Optional[str] = None,
        quiet_hours_end: Optional[str] = None,
        critical_override: Optional[bool] = None,
    ) -> NotificationPreference:
        pref = NotificationService.get_or_create_preference(db, user_id, org_id)
        
        if in_app_enabled is not None:
            pref.in_app_enabled = in_app_enabled
        if email_enabled is not None:
            pref.email_enabled = email_enabled
        if sms_enabled is not None:
            pref.sms_enabled = sms_enabled
        if quiet_hours_start is not None:
            pref.quiet_hours_start = quiet_hours_start
        if quiet_hours_end is not None:
            pref.quiet_hours_end = quiet_hours_end
        if critical_override is not None:
            pref.critical_override = critical_override
        
        pref.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(pref)
        
        return pref
