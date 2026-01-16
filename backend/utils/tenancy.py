from typing import Any, Optional, Type

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from utils.audit import record_audit
from models.user import User


def scoped_query(db: Session, model: Type[Any], org_id: int, training_mode: Optional[bool] = None):
    query = db.query(model).filter(model.org_id == org_id)
    if training_mode is not None and hasattr(model, "training_mode"):
        query = query.filter(model.training_mode == training_mode)
    return query


def get_scoped_record(
    db: Session,
    request: Request,
    model: Type[Any],
    record_id: Any,
    user: User,
    id_field: str = "id",
    resource_label: Optional[str] = None,
):
    record = db.query(model).filter(getattr(model, id_field) == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    training_flag = getattr(request.state, "training_mode", None) if request is not None else None
    if training_flag is not None and hasattr(record, "training_mode"):
        if record.training_mode != training_flag:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    if getattr(record, "org_id", None) != user.org_id:
        record_audit(
            db=db,
            request=request,
            user=user,
            action="cross-tenant-access",
            resource=resource_label or model.__tablename__,
            outcome="Blocked",
            classification="LEGAL_HOLD",
            training_mode=getattr(request.state, "training_mode", False),
            reason_code="ORG_SCOPE_VIOLATION",
            before_state={"record_id": record_id},
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access blocked")
    return record
