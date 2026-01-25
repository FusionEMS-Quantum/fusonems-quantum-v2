import logging
from sqlalchemy.orm import Session
from typing import Optional

from models.notifications import NotificationType, NotificationSeverity
from services.notifications.notification_dispatcher import NotificationDispatcher
from utils.events import event_bus
from core.database import SessionLocal

logger = logging.getLogger(__name__)


def register_notification_handlers(db: Session = None) -> None:
    if not db:
        db = SessionLocal()

    @event_bus.on("incident.dispatched")
    def on_incident_dispatched(event_data: dict) -> None:
        incident_id = event_data.get("incident_id")
        assigned_user_id = event_data.get("assigned_user_id")
        org_id = event_data.get("org_id")
        incident_type = event_data.get("type", "Unknown")
        location = event_data.get("location", "Unknown location")

        if not assigned_user_id or not org_id:
            logger.warning(f"Missing user_id or org_id in incident.dispatched event")
            return

        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=assigned_user_id,
            org_id=org_id,
            notification_type=NotificationType.INCIDENT_DISPATCHED,
            title=f"Incident Dispatched",
            body=f"You have been dispatched to a {incident_type} incident at {location}.",
            severity=NotificationSeverity.CRITICAL,
            linked_resource_type="Incident",
            linked_resource_id=incident_id,
            metadata={"incident_type": incident_type, "location": location},
            email_subject=f"[URGENT] Incident Dispatched - {incident_type}",
            email_html_template=f"""
            <h2>Incident Dispatched</h2>
            <p><strong>Type:</strong> {incident_type}</p>
            <p><strong>Location:</strong> {location}</p>
            <p>You have been assigned to this incident. Please respond immediately.</p>
            """,
        )

    @event_bus.on("fire.export.generated")
    def on_fire_export_generated(event_data: dict) -> None:
        org_id = event_data.get("org_id")
        export_id = event_data.get("export_id")
        user_id = event_data.get("user_id")

        if not user_id or not org_id:
            logger.warning(f"Missing user_id or org_id in fire.export.generated event")
            return

        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=user_id,
            org_id=org_id,
            notification_type=NotificationType.DOCUMENT_READY,
            title="Fire Export Ready",
            body="Your fire incident export has been generated and is ready for download.",
            severity=NotificationSeverity.INFO,
            linked_resource_type="FireExport",
            linked_resource_id=export_id,
            metadata={"export_id": export_id},
            email_subject="Your Fire Export is Ready",
            email_html_template="""
            <h2>Export Ready</h2>
            <p>Your fire incident export has been successfully generated.</p>
            <p>You can download it from your dashboard.</p>
            """,
        )

    @event_bus.on("carefusion.export.generated")
    def on_carefusion_export_generated(event_data: dict) -> None:
        org_id = event_data.get("org_id")
        export_id = event_data.get("export_id")
        user_id = event_data.get("user_id")

        if not user_id or not org_id:
            logger.warning(f"Missing user_id or org_id in carefusion.export.generated event")
            return

        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=user_id,
            org_id=org_id,
            notification_type=NotificationType.DOCUMENT_READY,
            title="CareFusion Export Ready",
            body="Your CareFusion billing export has been generated and is ready for download.",
            severity=NotificationSeverity.INFO,
            linked_resource_type="CareFusionExport",
            linked_resource_id=export_id,
            metadata={"export_id": export_id},
            email_subject="Your CareFusion Export is Ready",
            email_html_template="""
            <h2>Billing Export Ready</h2>
            <p>Your CareFusion billing export has been successfully generated.</p>
            <p>You can download it from your dashboard.</p>
            """,
        )

    @event_bus.on("billing.claim.denied")
    def on_billing_claim_denied(event_data: dict) -> None:
        org_id = event_data.get("org_id")
        claim_id = event_data.get("claim_id")
        billing_admin_user_id = event_data.get("billing_admin_user_id")
        denial_reason = event_data.get("denial_reason", "Unknown reason")

        if not billing_admin_user_id or not org_id:
            logger.warning(f"Missing user_id or org_id in billing.claim.denied event")
            return

        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=billing_admin_user_id,
            org_id=org_id,
            notification_type=NotificationType.SYSTEM_ALERT,
            title="Billing Claim Denied",
            body=f"A billing claim has been denied: {denial_reason}",
            severity=NotificationSeverity.WARNING,
            linked_resource_type="BillingClaim",
            linked_resource_id=claim_id,
            metadata={"denial_reason": denial_reason},
            email_subject="Billing Claim Denied - Action Required",
            email_html_template=f"""
            <h2>Claim Denial Alert</h2>
            <p><strong>Reason:</strong> {denial_reason}</p>
            <p>Please review the claim details and resubmit if applicable.</p>
            """,
        )

    @event_bus.on("compliance.violation.detected")
    def on_compliance_violation_detected(event_data: dict) -> None:
        org_id = event_data.get("org_id")
        violation_id = event_data.get("violation_id")
        compliance_officer_user_id = event_data.get("compliance_officer_user_id")
        violation_type = event_data.get("violation_type", "Unknown")

        if not compliance_officer_user_id or not org_id:
            logger.warning(f"Missing user_id or org_id in compliance.violation.detected event")
            return

        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=compliance_officer_user_id,
            org_id=org_id,
            notification_type=NotificationType.COMPLIANCE_REMINDER,
            title="Compliance Violation Detected",
            body=f"A compliance violation has been detected: {violation_type}",
            severity=NotificationSeverity.CRITICAL,
            linked_resource_type="ComplianceViolation",
            linked_resource_id=violation_id,
            metadata={"violation_type": violation_type},
            email_subject="[URGENT] Compliance Violation Detected",
            email_html_template=f"""
            <h2>Compliance Alert</h2>
            <p><strong>Violation Type:</strong> {violation_type}</p>
            <p>Please take immediate action to address this compliance issue.</p>
            """,
        )

    @event_bus.on("patient.alert.triggered")
    def on_patient_alert_triggered(event_data: dict) -> None:
        org_id = event_data.get("org_id")
        patient_id = event_data.get("patient_id")
        assigned_user_id = event_data.get("assigned_user_id")
        alert_message = event_data.get("alert_message", "Patient alert")

        if not assigned_user_id or not org_id:
            logger.warning(f"Missing user_id or org_id in patient.alert.triggered event")
            return

        NotificationDispatcher.dispatch_notification(
            db=db,
            user_id=assigned_user_id,
            org_id=org_id,
            notification_type=NotificationType.PATIENT_ALERT,
            title="Patient Alert",
            body=alert_message,
            severity=NotificationSeverity.CRITICAL,
            linked_resource_type="Patient",
            linked_resource_id=patient_id,
            metadata={"alert_message": alert_message},
            email_subject="[URGENT] Patient Alert",
            email_html_template=f"""
            <h2>Patient Alert</h2>
            <p>{alert_message}</p>
            <p>Please review the patient record immediately.</p>
            """,
        )

    logger.info("Notification event handlers registered")
