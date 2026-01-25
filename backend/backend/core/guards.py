from __future__ import annotations
from typing import Iterable
from fastapi import HTTPException, status
from .modules import resolve_deps

def ensure_module_enabled(org_enabled_modules: Iterable[str], requested: str) -> None:
    enabled = set(org_enabled_modules or [])
    required = set(resolve_deps(requested))
    missing = [m for m in required if m not in enabled]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Module not enabled or missing dependencies: {missing}",
        )
