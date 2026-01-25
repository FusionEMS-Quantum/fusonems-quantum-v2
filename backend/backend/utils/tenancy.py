from __future__ import annotations
from typing import Optional, Type, TypeVar
from sqlalchemy.orm import Session

T = TypeVar("T")

def scoped_query(db: Session, model: Type[T], *, org_id: Optional[int]):
    q = db.query(model)
    if org_id is None:
        return q
    if hasattr(model, "org_id"):
        return q.filter(getattr(model, "org_id") == org_id)
    return q

def get_scoped_record(db: Session, model: Type[T], record_id, *, org_id: Optional[int]) -> Optional[T]:
    q = scoped_query(db, model, org_id=org_id)
    return q.filter(getattr(model, "id") == record_id).first()
