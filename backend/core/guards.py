from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.modules import MODULE_DEPENDENCIES
from core.security import get_current_user
from models.module_registry import ModuleRegistry
from models.user import User


def require_user(
    user: User = Depends(get_current_user),
) -> User:
    return user


def require_module(module_key: str):
    def _require(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        module = (
            db.query(ModuleRegistry)
            .filter(ModuleRegistry.org_id == user.org_id, ModuleRegistry.module_key == module_key)
            .first()
        )
        if not module or not module.enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"MODULE_DISABLED:{module_key}",
            )
        if module.kill_switch:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"MODULE_KILLED:{module_key}",
            )
        for dependency in MODULE_DEPENDENCIES.get(module_key, []):
            dependency_row = (
                db.query(ModuleRegistry)
                .filter(
                    ModuleRegistry.org_id == user.org_id,
                    ModuleRegistry.module_key == dependency,
                )
                .first()
            )
            if not dependency_row or not dependency_row.enabled or dependency_row.kill_switch:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"MODULE_DEPENDENCY_BLOCKED:{dependency}",
                )
        return user

    return _require


def require_role(*allowed_roles: str):
    """Dependency that verifies the user has one of the allowed roles."""
    def _require(
        user: User = Depends(get_current_user),
    ) -> User:
        if not user.role or user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"ROLE_REQUIRED:{','.join(allowed_roles)}",
            )
        return user

    return _require


def require_founders(user: User = Depends(get_current_user)) -> User:
    """Dependency that verifies the user has founder access."""
    if not user.role or user.role not in ('founder', 'admin', 'superadmin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="FOUNDER_ACCESS_REQUIRED",
        )
    return user


# Alias for require_user
require_auth = require_user
