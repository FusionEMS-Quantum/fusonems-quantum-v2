from datetime import datetime, date
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
import logging

from models.notifications import NotificationType, NotificationSeverity
from services.notifications.notification_dispatcher import NotificationDispatcher
from models.user import User

logger = logging.getLogger(__name__)


class SchedulingNotificationType:
    SHIFT_ASSIGNED = "scheduling.shift_assigned"
    SHIFT_UNASSIGNED = "scheduling.shift_unassigned"
    SCHEDULE_PUBLISHED = "scheduling.schedule_published"
    TIME_OFF_APPROVED = "scheduling.time_off_approved"
    TIME_OFF_DENIED = "scheduling.time_off_denied"
    SWAP_REQUEST_RECEIVED = "scheduling.swap_request"
    SWAP_APPROVED = "scheduling.swap_approved"
    SHIFT_REMINDER = "scheduling.shift_reminder"
    COVERAGE_ALERT = "scheduling.coverage_alert"


class SchedulingNotificationService:
    @staticmethod
    def _get_email_template(notification_type: str, data: Dict[str, Any]) -> str:
        templates = {
            SchedulingNotificationType.SHIFT_ASSIGNED: f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1a1a1a; border-radius: 8px; padding: 24px; border-left: 4px solid #f97316;">
                        <h2 style="color: #f97316; margin: 0 0 16px 0;">New Shift Assignment</h2>
                        <p style="color: #e4e4e7; margin: 0 0 16px 0;">You have been assigned to a new shift:</p>
                        <div style="background: #27272a; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Date</p>
                            <p style="color: #ffffff; margin: 0 0 16px 0; font-weight: 600;">{data.get('shift_date', 'TBD')}</p>
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Time</p>
                            <p style="color: #ffffff; margin: 0 0 16px 0; font-weight: 600;">{data.get('start_time', 'TBD')} - {data.get('end_time', 'TBD')}</p>
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Station</p>
                            <p style="color: #ffffff; margin: 0; font-weight: 600;">{data.get('station', 'Not specified')}</p>
                        </div>
                        <p style="color: #a1a1aa; font-size: 14px; margin: 0;">Please acknowledge this assignment in the scheduling portal.</p>
                    </div>
                </div>
            """,
            SchedulingNotificationType.SHIFT_UNASSIGNED: f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1a1a1a; border-radius: 8px; padding: 24px; border-left: 4px solid #ef4444;">
                        <h2 style="color: #ef4444; margin: 0 0 16px 0;">Shift Assignment Removed</h2>
                        <p style="color: #e4e4e7; margin: 0 0 16px 0;">Your assignment has been removed from the following shift:</p>
                        <div style="background: #27272a; border-radius: 6px; padding: 16px;">
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Date</p>
                            <p style="color: #ffffff; margin: 0; font-weight: 600;">{data.get('shift_date', 'TBD')}</p>
                        </div>
                    </div>
                </div>
            """,
            SchedulingNotificationType.SCHEDULE_PUBLISHED: f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1a1a1a; border-radius: 8px; padding: 24px; border-left: 4px solid #22c55e;">
                        <h2 style="color: #22c55e; margin: 0 0 16px 0;">Schedule Published</h2>
                        <p style="color: #e4e4e7; margin: 0 0 16px 0;">A new schedule has been published for your review:</p>
                        <div style="background: #27272a; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Period</p>
                            <p style="color: #ffffff; margin: 0; font-weight: 600;">{data.get('start_date', 'TBD')} - {data.get('end_date', 'TBD')}</p>
                        </div>
                        <p style="color: #a1a1aa; font-size: 14px; margin: 0;">Please review your assignments and acknowledge them promptly.</p>
                    </div>
                </div>
            """,
            SchedulingNotificationType.TIME_OFF_APPROVED: f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1a1a1a; border-radius: 8px; padding: 24px; border-left: 4px solid #22c55e;">
                        <h2 style="color: #22c55e; margin: 0 0 16px 0;">Time Off Approved</h2>
                        <p style="color: #e4e4e7; margin: 0 0 16px 0;">Your time off request has been approved:</p>
                        <div style="background: #27272a; border-radius: 6px; padding: 16px;">
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Dates</p>
                            <p style="color: #ffffff; margin: 0 0 16px 0; font-weight: 600;">{data.get('start_date', 'TBD')} - {data.get('end_date', 'TBD')}</p>
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Type</p>
                            <p style="color: #ffffff; margin: 0; font-weight: 600;">{data.get('request_type', 'Time Off')}</p>
                        </div>
                    </div>
                </div>
            """,
            SchedulingNotificationType.TIME_OFF_DENIED: f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1a1a1a; border-radius: 8px; padding: 24px; border-left: 4px solid #ef4444;">
                        <h2 style="color: #ef4444; margin: 0 0 16px 0;">Time Off Request Denied</h2>
                        <p style="color: #e4e4e7; margin: 0 0 16px 0;">Your time off request has been denied:</p>
                        <div style="background: #27272a; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Dates</p>
                            <p style="color: #ffffff; margin: 0 0 16px 0; font-weight: 600;">{data.get('start_date', 'TBD')} - {data.get('end_date', 'TBD')}</p>
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Reason</p>
                            <p style="color: #ffffff; margin: 0; font-weight: 600;">{data.get('reason', 'No reason provided')}</p>
                        </div>
                        <p style="color: #a1a1aa; font-size: 14px; margin: 0;">Please contact your supervisor if you have questions.</p>
                    </div>
                </div>
            """,
            SchedulingNotificationType.SWAP_REQUEST_RECEIVED: f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1a1a1a; border-radius: 8px; padding: 24px; border-left: 4px solid #3b82f6;">
                        <h2 style="color: #3b82f6; margin: 0 0 16px 0;">Shift Swap Request</h2>
                        <p style="color: #e4e4e7; margin: 0 0 16px 0;">You have received a shift swap request:</p>
                        <div style="background: #27272a; border-radius: 6px; padding: 16px;">
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">From</p>
                            <p style="color: #ffffff; margin: 0 0 16px 0; font-weight: 600;">{data.get('requester_name', 'A colleague')}</p>
                            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Shift Date</p>
                            <p style="color: #ffffff; margin: 0; font-weight: 600;">{data.get('shift_date', 'TBD')}</p>
                        </div>
                    </div>
                </div>
            """,
        }
        return templates.get(notification_type, f"<p>{data.get('body', '')}</p>")

    @staticmethod
    def _get_sms_text(notification_type: str, data: Dict[str, Any]) -> str:
        messages = {
            SchedulingNotificationType.SHIFT_ASSIGNED: f"FusionEMS: You've been assigned to a shift on {data.get('shift_date', 'TBD')} ({data.get('start_time', 'TBD')} - {data.get('end_time', 'TBD')}). Check the portal for details.",
            SchedulingNotificationType.SHIFT_UNASSIGNED: f"FusionEMS: Your assignment for {data.get('shift_date', 'TBD')} has been removed.",
            SchedulingNotificationType.SCHEDULE_PUBLISHED: f"FusionEMS: New schedule published for {data.get('start_date', 'TBD')} - {data.get('end_date', 'TBD')}. Review and acknowledge your shifts.",
            SchedulingNotificationType.TIME_OFF_APPROVED: f"FusionEMS: Your time off request ({data.get('start_date', 'TBD')} - {data.get('end_date', 'TBD')}) has been APPROVED.",
            SchedulingNotificationType.TIME_OFF_DENIED: f"FusionEMS: Your time off request has been DENIED. Reason: {data.get('reason', 'Contact supervisor')}",
            SchedulingNotificationType.SWAP_REQUEST_RECEIVED: f"FusionEMS: {data.get('requester_name', 'A colleague')} has requested a shift swap with you. Check the portal.",
            SchedulingNotificationType.SHIFT_REMINDER: f"FusionEMS: Reminder - You have a shift tomorrow at {data.get('start_time', 'TBD')} at {data.get('station', 'your station')}.",
        }
        return messages.get(notification_type, data.get('body', 'FusionEMS notification'))

    @staticmethod
    def notify_shift_assigned(
        db: Session,
        user_id: int,
        org_id: int,
        shift_id: int,
        shift_date: str,
        start_time: str,
        end_time: str,
        station: Optional[str] = None,
        training_mode: bool = False,
    ) -> None:
        data = {
            "shift_id": shift_id,
            "shift_date": shift_date,
            "start_time": start_time,
            "end_time": end_time,
            "station": station or "Not specified",
        }
        
        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=user_id,
            org_id=org_id,
            notification_type=NotificationType.TASK_ASSIGNED,
            title="New Shift Assignment",
            body=f"You have been assigned to a shift on {shift_date} from {start_time} to {end_time} at {station or 'your station'}.",
            severity=NotificationSeverity.INFO,
            linked_resource_type="scheduled_shift",
            linked_resource_id=shift_id,
            metadata=data,
            training_mode=training_mode,
            email_subject="New Shift Assignment - FusionEMS Scheduling",
            email_html_template=SchedulingNotificationService._get_email_template(
                SchedulingNotificationType.SHIFT_ASSIGNED, data
            ),
        )
        
        logger.info(f"Shift assignment notification sent to user {user_id} for shift {shift_id}")

    @staticmethod
    def notify_shift_unassigned(
        db: Session,
        user_id: int,
        org_id: int,
        shift_id: int,
        shift_date: str,
        training_mode: bool = False,
    ) -> None:
        data = {
            "shift_id": shift_id,
            "shift_date": shift_date,
        }
        
        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=user_id,
            org_id=org_id,
            notification_type=NotificationType.TASK_ASSIGNED,
            title="Shift Assignment Removed",
            body=f"Your assignment for the shift on {shift_date} has been removed.",
            severity=NotificationSeverity.WARNING,
            linked_resource_type="scheduled_shift",
            linked_resource_id=shift_id,
            metadata=data,
            training_mode=training_mode,
            email_subject="Shift Assignment Removed - FusionEMS Scheduling",
            email_html_template=SchedulingNotificationService._get_email_template(
                SchedulingNotificationType.SHIFT_UNASSIGNED, data
            ),
        )
        
        logger.info(f"Shift unassignment notification sent to user {user_id} for shift {shift_id}")

    @staticmethod
    def notify_schedule_published(
        db: Session,
        user_ids: List[int],
        org_id: int,
        period_id: int,
        start_date: str,
        end_date: str,
        training_mode: bool = False,
    ) -> None:
        data = {
            "period_id": period_id,
            "start_date": start_date,
            "end_date": end_date,
        }
        
        for user_id in user_ids:
            try:
                NotificationDispatcher.dispatch_notification(
                    db=db,
                    user_id=user_id,
                    org_id=org_id,
                    notification_type=NotificationType.DOCUMENT_READY,
                    title="Schedule Published",
                    body=f"A new schedule has been published for {start_date} to {end_date}. Please review your assignments.",
                    severity=NotificationSeverity.INFO,
                    linked_resource_type="schedule_period",
                    linked_resource_id=period_id,
                    metadata=data,
                    training_mode=training_mode,
                    email_subject="New Schedule Published - FusionEMS Scheduling",
                    email_html_template=SchedulingNotificationService._get_email_template(
                        SchedulingNotificationType.SCHEDULE_PUBLISHED, data
                    ),
                )
            except Exception as e:
                logger.error(f"Failed to notify user {user_id} of schedule publication: {e}")
        
        logger.info(f"Schedule publication notifications sent to {len(user_ids)} users")

    @staticmethod
    def notify_time_off_approved(
        db: Session,
        user_id: int,
        org_id: int,
        request_id: int,
        start_date: str,
        end_date: str,
        request_type: str,
        training_mode: bool = False,
    ) -> None:
        data = {
            "request_id": request_id,
            "start_date": start_date,
            "end_date": end_date,
            "request_type": request_type,
        }
        
        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=user_id,
            org_id=org_id,
            notification_type=NotificationType.DOCUMENT_READY,
            title="Time Off Request Approved",
            body=f"Your time off request for {start_date} to {end_date} has been approved.",
            severity=NotificationSeverity.INFO,
            linked_resource_type="time_off_request",
            linked_resource_id=request_id,
            metadata=data,
            training_mode=training_mode,
            email_subject="Time Off Request Approved - FusionEMS Scheduling",
            email_html_template=SchedulingNotificationService._get_email_template(
                SchedulingNotificationType.TIME_OFF_APPROVED, data
            ),
        )
        
        logger.info(f"Time off approval notification sent to user {user_id}")

    @staticmethod
    def notify_time_off_denied(
        db: Session,
        user_id: int,
        org_id: int,
        request_id: int,
        start_date: str,
        end_date: str,
        reason: str,
        training_mode: bool = False,
    ) -> None:
        data = {
            "request_id": request_id,
            "start_date": start_date,
            "end_date": end_date,
            "reason": reason,
        }
        
        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=user_id,
            org_id=org_id,
            notification_type=NotificationType.DOCUMENT_READY,
            title="Time Off Request Denied",
            body=f"Your time off request for {start_date} to {end_date} has been denied. Reason: {reason}",
            severity=NotificationSeverity.WARNING,
            linked_resource_type="time_off_request",
            linked_resource_id=request_id,
            metadata=data,
            training_mode=training_mode,
            email_subject="Time Off Request Denied - FusionEMS Scheduling",
            email_html_template=SchedulingNotificationService._get_email_template(
                SchedulingNotificationType.TIME_OFF_DENIED, data
            ),
        )
        
        logger.info(f"Time off denial notification sent to user {user_id}")

    @staticmethod
    def notify_swap_request(
        db: Session,
        target_user_id: int,
        org_id: int,
        swap_request_id: int,
        requester_name: str,
        shift_date: str,
        training_mode: bool = False,
    ) -> None:
        data = {
            "swap_request_id": swap_request_id,
            "requester_name": requester_name,
            "shift_date": shift_date,
        }
        
        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=target_user_id,
            org_id=org_id,
            notification_type=NotificationType.TASK_ASSIGNED,
            title="Shift Swap Request",
            body=f"{requester_name} has requested to swap shifts with you for {shift_date}.",
            severity=NotificationSeverity.INFO,
            linked_resource_type="shift_swap_request",
            linked_resource_id=swap_request_id,
            metadata=data,
            training_mode=training_mode,
            email_subject="Shift Swap Request - FusionEMS Scheduling",
            email_html_template=SchedulingNotificationService._get_email_template(
                SchedulingNotificationType.SWAP_REQUEST_RECEIVED, data
            ),
        )
        
        logger.info(f"Swap request notification sent to user {target_user_id}")


def get_scheduling_notification_service() -> SchedulingNotificationService:
    return SchedulingNotificationService()
