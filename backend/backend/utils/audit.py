from __future__ import annotations
from typing import Any, Dict, Optional
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

def record_audit(
    db: Session,
    *,
    org_id: Optional[int],
    user_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    change_summary: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Minimal audit hook. If your repo already has AccessAudit/ForensicAuditLog models,
    swap this implementation to persist rows.
    """
    # Safe no-op persistence fallback: log it.
    logger.info(
        "AUDIT org=%s user=%s action=%s resource=%s:%s summary=%s meta=%s",
        org_id, user_id, action, resource_type, resource_id, change_summary, metadata
    )
