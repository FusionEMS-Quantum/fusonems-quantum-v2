from sqlalchemy import inspect
from sqlalchemy.orm import Session

from core.database import get_engine, get_hems_engine
from core.modules import MODULE_KEYS
from models.module_registry import ModuleRegistry


def check_upgrade_readiness(db: Session, org_id: int) -> dict:
    missing_modules = []
    for key in MODULE_KEYS:
        exists = (
            db.query(ModuleRegistry)
            .filter(ModuleRegistry.org_id == org_id, ModuleRegistry.module_key == key)
            .first()
        )
        if not exists:
            missing_modules.append(key)

    issues = []
    if missing_modules:
        issues.append("module_registry_incomplete")

    inspector = inspect(get_engine())
    if not inspector.has_table("event_logs"):
        issues.append("event_logs_missing")

    hems_engine = get_hems_engine()
    hems_inspector = inspect(hems_engine)
    if hems_engine.url.drivername == "sqlite":
        if not hems_inspector.has_table("hems_missions"):
            issues.append("hems_schema_missing")
    else:
        if not hems_inspector.has_table("hems_missions", schema="hems"):
            issues.append("hems_schema_missing")

    status = "PASS" if not issues else "FAIL"
    return {"status": status, "issues": issues, "missing_modules": missing_modules}
