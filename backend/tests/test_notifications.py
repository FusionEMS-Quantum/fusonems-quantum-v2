import pytest
from sqlalchemy.orm import Session
from models.notifications import InAppNotification, NotificationPreference, NotificationType, NotificationSeverity
from services.notifications.notification_service import NotificationService


def test_send_notification(db: Session, test_user_id: int, test_org_id: int):
    notif = NotificationService.send_notification(
        db,
        user_id=test_user_id,
        org_id=test_org_id,
        notification_type=NotificationType.INCIDENT_DISPATCHED,
        title="Incident Dispatched",
        body="You have been dispatched to an incident",
        severity=NotificationSeverity.CRITICAL,
        linked_resource_type="Incident",
        linked_resource_id=1,
    )
    
    assert notif.id is not None
    assert notif.user_id == test_user_id
    assert notif.notification_type == NotificationType.INCIDENT_DISPATCHED
    assert notif.title == "Incident Dispatched"
    assert notif.read_at is None
    assert notif.dismissed_at is None


def test_mark_as_read(db: Session, test_user_id: int, test_org_id: int):
    notif = NotificationService.send_notification(
        db,
        user_id=test_user_id,
        org_id=test_org_id,
        notification_type=NotificationType.MESSAGE_RECEIVED,
        title="New Message",
        body="You have a new message",
    )
    
    updated_notif = NotificationService.mark_as_read(db, notif.id)
    
    assert updated_notif.read_at is not None


def test_mark_as_dismissed(db: Session, test_user_id: int, test_org_id: int):
    notif = NotificationService.send_notification(
        db,
        user_id=test_user_id,
        org_id=test_org_id,
        notification_type=NotificationType.PAYMENT_FAILED,
        title="Payment Failed",
        body="Your payment did not go through",
    )
    
    updated_notif = NotificationService.mark_as_dismissed(db, notif.id)
    
    assert updated_notif.dismissed_at is not None


def test_get_user_notifications(db: Session, test_user_id: int, test_org_id: int):
    for i in range(3):
        NotificationService.send_notification(
            db,
            user_id=test_user_id,
            org_id=test_org_id,
            notification_type=NotificationType.INCIDENT_UPDATED,
            title=f"Update {i}",
            body=f"Body {i}",
        )
    
    notifications = NotificationService.get_user_notifications(db, test_user_id, test_org_id)
    
    assert len(notifications) == 3


def test_get_unread_count(db: Session, test_user_id: int, test_org_id: int):
    NotificationService.send_notification(
        db,
        user_id=test_user_id,
        org_id=test_org_id,
        notification_type=NotificationType.CALL_RECEIVED,
        title="Incoming Call",
        body="You have an incoming call",
    )
    
    count = NotificationService.get_unread_count(db, test_user_id, test_org_id)
    
    assert count == 1


def test_get_or_create_preference(db: Session, test_user_id: int, test_org_id: int):
    pref = NotificationService.get_or_create_preference(db, test_user_id, test_org_id)
    
    assert pref.user_id == test_user_id
    assert pref.in_app_enabled is True
    assert pref.email_enabled is True
    assert pref.sms_enabled is False
    
    pref2 = NotificationService.get_or_create_preference(db, test_user_id, test_org_id)
    
    assert pref.id == pref2.id


def test_update_preferences(db: Session, test_user_id: int, test_org_id: int):
    updated_pref = NotificationService.update_preferences(
        db,
        user_id=test_user_id,
        org_id=test_org_id,
        email_enabled=False,
        sms_enabled=True,
        quiet_hours_start="22:00",
        quiet_hours_end="08:00",
    )
    
    assert updated_pref.email_enabled is False
    assert updated_pref.sms_enabled is True
    assert updated_pref.quiet_hours_start == "22:00"
    assert updated_pref.quiet_hours_end == "08:00"
