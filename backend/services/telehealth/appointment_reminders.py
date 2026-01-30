"""
FusionCare Appointment Reminders - SMS & Email before visit.
Integrates with comms for actual delivery.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.telehealth import TelehealthAppointment, TelehealthPatient, TelehealthProvider
from utils.logger import logger


def get_appointments_needing_reminder(
    db: Session,
    org_id: int,
    hours_ahead: int = 24,
) -> List[Dict[str, Any]]:
    """Get appointments in the next N hours that haven't received a reminder."""
    now = datetime.utcnow()
    window_start = now
    window_end = now + timedelta(hours=hours_ahead)
    appointments = (
        db.query(TelehealthAppointment)
        .filter(
            TelehealthAppointment.org_id == org_id,
            TelehealthAppointment.status == "scheduled",
            TelehealthAppointment.reminder_sent == False,
            TelehealthAppointment.scheduled_start >= window_start,
            TelehealthAppointment.scheduled_start <= window_end,
        )
        .all()
    )
    result = []
    for apt in appointments:
        patient = db.query(TelehealthPatient).filter(
            TelehealthPatient.org_id == org_id,
            TelehealthPatient.patient_id == apt.patient_id,
        ).first()
        provider = db.query(TelehealthProvider).filter(
            TelehealthProvider.org_id == org_id,
            TelehealthProvider.provider_id == apt.provider_id,
        ).first()
        if patient:
            result.append({
                "appointment": apt,
                "patient": patient,
                "provider": provider,
            })
    return result


def send_appointment_reminder(
    db: Session,
    appointment_id: str,
) -> Dict[str, Any]:
    """
    Send SMS and/or Email reminder for an appointment.
    Returns {sent_sms: bool, sent_email: bool, error: str|None}
    """
    apt = db.query(TelehealthAppointment).filter(
        TelehealthAppointment.appointment_id == appointment_id,
    ).first()
    if not apt:
        return {"sent_sms": False, "sent_email": False, "error": "Appointment not found"}
    if apt.reminder_sent:
        return {"sent_sms": True, "sent_email": True, "error": None, "already_sent": True}

    patient = db.query(TelehealthPatient).filter(
        TelehealthPatient.org_id == apt.org_id,
        TelehealthPatient.patient_id == apt.patient_id,
    ).first()
    provider = db.query(TelehealthProvider).filter(
        TelehealthProvider.org_id == apt.org_id,
        TelehealthProvider.provider_id == apt.provider_id,
    ).first()
    if not patient:
        return {"sent_sms": False, "sent_email": False, "error": "Patient not found"}

    provider_name = provider.name if provider else "Your provider"
    time_str = apt.scheduled_start.strftime("%B %d at %I:%M %p") if apt.scheduled_start else "your scheduled time"

    sms_text = (
        f"FusionCare Reminder: Telehealth with {provider_name} on {time_str}. "
        f"Reason: {apt.reason_for_visit or 'Consultation'}."
    )
    if apt.session_uuid:
        sms_text += f" Join: https://app.fusionems.com/portals/carefusion/patient/video/{apt.session_uuid}"
    else:
        sms_text += " Your provider will send the video link when the visit starts."

    email_join_section = ""
    if apt.session_uuid:
        email_join_section = f"""
**Join now:** https://app.fusionems.com/portals/carefusion/patient/video/{apt.session_uuid}
"""
    else:
        email_join_section = """
**How to join:** Your provider will send you the direct video link when the visit starts.
"""

    email_subject = "FusionCare: Appointment Reminder"
    email_body = f"""
Hello {patient.name},

Reminder: Telehealth appointment with {provider_name} on {time_str}.

**Reason for visit:** {apt.reason_for_visit or 'Consultation'}
{email_join_section}
Contact us before your appointment time if you need to reschedule.

FusionCare
"""

    sent_sms = False
    sent_email = False
    err_msg = None

    if patient.phone:
        try:
            from services.communications.comms_router import _send_telnyx
            _send_telnyx("sms", patient.phone, sms_text)
            sent_sms = True
            logger.info(f"[FusionCare] SMS reminder sent to {patient.phone} for appointment {appointment_id}")
        except Exception as e:
            logger.error(f"[FusionCare] SMS reminder failed: {e}")
            err_msg = str(e)

    if patient.email:
        try:
            from services.email.email_transport_service import send_smtp_email_simple
            send_smtp_email_simple(
                to=patient.email,
                subject=email_subject,
                text_body=email_body,
            )
            sent_email = True
            logger.info(f"[FusionCare] Email reminder sent to {patient.email} for appointment {appointment_id}")
        except Exception as e:
            logger.error(f"[FusionCare] Email reminder failed: {e}")
            if not err_msg:
                err_msg = str(e)

    if sent_sms or sent_email:
        apt.reminder_sent = True
        db.commit()

    return {
        "sent_sms": sent_sms,
        "sent_email": sent_email,
        "error": err_msg,
    }


def run_reminder_job(db: Session, org_id: int, hours_ahead: int = 24) -> Dict[str, Any]:
    """Run reminder job for all due appointments. Call from cron."""
    due = get_appointments_needing_reminder(db, org_id, hours_ahead)
    results = {"processed": 0, "sent": 0, "errors": []}
    for item in due:
        apt = item["appointment"]
        results["processed"] += 1
        r = send_appointment_reminder(db, apt.appointment_id)
        if r.get("sent_sms") or r.get("sent_email"):
            results["sent"] += 1
        if r.get("error"):
            results["errors"].append(f"{apt.appointment_id}: {r['error']}")
    return results
