from __future__ import annotations

import secrets
from typing import Tuple

from core.database import SessionLocal
from core.modules import MODULE_DEPENDENCIES
from core.security import create_access_token, hash_password
from models.module_registry import ModuleRegistry
from models.organization import Organization
from models.user import User, UserRole
from utils.retention import seed_retention_policies


def create_test_user(
    email: str,
    org_name: str,
    role: str | UserRole = UserRole.dispatcher,
    password: str = "securepass",
    full_name: str | None = None,
) -> Tuple[dict, int, int]:
    role_value = role.value if isinstance(role, UserRole) else role
    full_name = full_name or "Test User"
    with SessionLocal() as db:
        org = Organization(name=org_name, encryption_key=secrets.token_hex(32))
        db.add(org)
        db.commit()
        db.refresh(org)
        for module_key, deps in MODULE_DEPENDENCIES.items():
            module = ModuleRegistry(
                org_id=org.id,
                module_key=module_key,
                dependencies=deps,
                enabled=True,
                kill_switch=False,
            )
            db.add(module)
        db.commit()
        seed_retention_policies(db, org.id)
        try:
            hashed_password = hash_password(password)
        except ValueError:
            hashed_password = password[:72]
        user = User(
            org_id=org.id,
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            role=role_value,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        org_id = org.id
        user_id = user.id
        token = create_access_token({"sub": user_id, "org": org_id, "role": user.role, "mfa": False})
    return {"Authorization": f"Bearer {token}"}, org_id, user_id
