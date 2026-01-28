from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.epcr_core import (
    EpcrRecord,
    EpcrVitals,
    EpcrIntervention,
    EpcrMedication,
    EpcrNarrative,
    OfflineSyncQueue,
    PreArrivalNotification,
    ProtocolPathway,
)
from models.user import User, UserRole
from utils.tenancy import scoped_query

router = APIRouter(
    prefix="/api/epcr/dashboard",
    tags=["ePCR Dashboard"],
    dependencies=[Depends(require_module("EPCR"))],
)

VALID_ROLES = [
    "admin",
    "provider",
    "medic",
    "billing",
    "cad",
    "ops",
    "safety",
    "qa",
]


def _build_metrics(db: Session, user: User) -> Dict[str, int]:
    base_query = scoped_query(db, EpcrRecord, user.org_id)
    total_records = base_query.count()
    draft = base_query.filter(EpcrRecord.status == "draft").count()
    finalized = base_query.filter(EpcrRecord.status == "finalized").count()
    vitals = scoped_query(db, EpcrVitals, user.org_id).count()
    interventions = scoped_query(db, EpcrIntervention, user.org_id).count()
    medications = scoped_query(db, EpcrMedication, user.org_id).count()
    narratives = scoped_query(db, EpcrNarrative, user.org_id).count()
    offline_pending = scoped_query(db, OfflineSyncQueue, user.org_id).filter(OfflineSyncQueue.status == "queued").count()
    offline_synced = scoped_query(db, OfflineSyncQueue, user.org_id).filter(OfflineSyncQueue.status == "synced").count()
    prearrival = scoped_query(db, PreArrivalNotification, user.org_id).count()
    protocol_matches = scoped_query(db, ProtocolPathway, user.org_id).filter(ProtocolPathway.active == True).count()

    now = datetime.now(timezone.utc)
    extras = {
        "scene_arrivals": finalized,
        "hospital_arrivals": finalized,
        "vitals_entries_today": vitals,
        "interventions_logged": interventions,
        "medications_logged": medications,
        "narratives_generated": narratives,
        "offline_sync_pending": offline_pending,
        "offline_sync_synced": offline_synced,
        "prearrival_notifications": prearrival,
        "protocol_suggestions": protocol_matches,
        "roles_supported": len(VALID_ROLES),
        "server_timestamp": int(now.timestamp()),
        "total_records": total_records,
        "draft_records": draft,
        "finalized_records": finalized,
        "validation_passes": max(finalized - offline_pending, 0),
        "validation_failures": offline_pending,
        "voice_sessions": narratives,
        "ocr_snapshots": vitals,
        "cad_integrations": finalized,
        "billing_actions": medications,
        "workflow_tasks_linked": interventions,
        "qa_reviews_open": draft,
        "training_cases_open": draft,
        "fleet_alerts": 0,
        "notifications_sent": prearrival,
        "legal_holds": 0,
        "transportlink_bookings": 0,
        "support_tickets": draft,
        "inventory_outages": 0,
        "comms_threads_open": 0,
        "documents_shared": narratives,
        "telehealth_sessions": 0,
        "average_vitals_per_record": vitals // (total_records or 1),
        "avg_interventions_per_record": interventions // (total_records or 1),
        "avg_medications_per_record": medications // (total_records or 1),
        "validation_rules_active": protocol_matches,
        "protocol_pathway_confident": protocol_matches,
        "nemsis_exports_pending": max(total_records - finalized, 0),
        "ai_endpoint_triggers": 0,
        "rule_builder_active": 1,
        "scene_departures": draft,
        "dispatch_to_arrival_secs": 0,
        "alert_count": 0,
        "error_events": 0,
        "avg_sync_latency_secs": 0,
    }
    return extras


@router.get("/{role}")
def dashboard_for_role(
    role: str,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(
            UserRole.admin,
            UserRole.provider,
            UserRole.dispatcher,
            UserRole.ops_admin,
            UserRole.billing,
            UserRole.support,
            UserRole.medical_director,
            UserRole.aviation_qa,
        )
    ),
):
    if role not in VALID_ROLES:
        raise HTTPException(status_code=404, detail="Role not supported")
    metrics = _build_metrics(db, user)
    filtered = {k: v for i, (k, v) in enumerate(metrics.items()) if i < 40}
    return {"role": role, "metrics": filtered, "total_metrics": len(metrics)}
