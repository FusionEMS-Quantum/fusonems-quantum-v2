set -euo pipefail

ROOT="$(pwd)"
BACKEND_DIR="${ROOT}/backend"
CORE_DIR="${BACKEND_DIR}/core"
UTILS_DIR="${BACKEND_DIR}/utils"

mkdir -p "${CORE_DIR}" "${UTILS_DIR}"

write_if_missing () {
  local path="$1"
  shift
  if [[ -f "$path" ]]; then
    echo "OK (exists): $path"
  else
    echo "CREATE: $path"
    cat > "$path" <<'EOF'
'"$@"'
EOF
  fi
}

# -------------------------
# backend/core/__init__.py
# -------------------------
if [[ ! -f "${CORE_DIR}/__init__.py" ]]; then
cat > "${CORE_DIR}/__init__.py" <<'EOF'
from .config import Settings, settings, validate_settings_runtime
from .database import (
    Base,
    SessionLocal,
    get_db,
    get_engine,
)
from .security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
    get_current_user,
    require_roles,
    require_module,
)
EOF
fi

# -------------------------
# backend/utils/time.py
# -------------------------
if [[ ! -f "${UTILS_DIR}/time.py" ]]; then
cat > "${UTILS_DIR}/time.py" <<'EOF'
from __future__ import annotations
from datetime import datetime, timezone

def utcnow() -> datetime:
    return datetime.now(timezone.utc)
EOF
fi

# -------------------------
# backend/utils/events.py
# -------------------------
if [[ ! -f "${UTILS_DIR}/events.py" ]]; then
cat > "${UTILS_DIR}/events.py" <<'EOF'
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, DefaultDict
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

Handler = Callable[[Dict[str, Any]], None]

class EventBus:
    def __init__(self) -> None:
        self._handlers: DefaultDict[str, List[Handler]] = defaultdict(list)

    def on(self, event_name: str) -> Callable[[Handler], Handler]:
        def decorator(fn: Handler) -> Handler:
            self._handlers[event_name].append(fn)
            return fn
        return decorator

    def emit(self, event_name: str, payload: Dict[str, Any]) -> None:
        handlers = list(self._handlers.get(event_name, []))
        for h in handlers:
            try:
                h(payload)
            except Exception:
                logger.exception("event handler failed: %s", event_name)

event_bus = EventBus()
EOF
fi

# -------------------------
# backend/utils/audit.py
# -------------------------
if [[ ! -f "${UTILS_DIR}/audit.py" ]]; then
cat > "${UTILS_DIR}/audit.py" <<'EOF'
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
EOF
fi

# -------------------------
# backend/utils/tenancy.py
# -------------------------
if [[ ! -f "${UTILS_DIR}/tenancy.py" ]]; then
cat > "${UTILS_DIR}/tenancy.py" <<'EOF'
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
EOF
fi

# -------------------------
# backend/utils/rate_limit.py
# -------------------------
if [[ ! -f "${UTILS_DIR}/rate_limit.py" ]]; then
cat > "${UTILS_DIR}/rate_limit.py" <<'EOF'
from __future__ import annotations
import time
from collections import defaultdict
from typing import Dict, Tuple

# Simple in-memory limiter. For production multi-instance, replace with Redis.
_BUCKETS: Dict[str, Tuple[int, float]] = defaultdict(lambda: (0, 0.0))

def allow(key: str, limit_per_minute: int) -> bool:
    now = time.time()
    count, window_start = _BUCKETS[key]
    if now - window_start >= 60:
        _BUCKETS[key] = (1, now)
        return True
    if count >= limit_per_minute:
        return False
    _BUCKETS[key] = (count + 1, window_start)
    return True
EOF
fi

# -------------------------
# backend/utils/storage.py
# -------------------------
if [[ ! -f "${UTILS_DIR}/storage.py" ]]; then
cat > "${UTILS_DIR}/storage.py" <<'EOF'
from __future__ import annotations
from pathlib import Path
from typing import Optional
import os

DEFAULT_STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", "/app/storage"))

def ensure_storage_dir(path: Optional[Path] = None) -> Path:
    p = path or DEFAULT_STORAGE_DIR
    p.mkdir(parents=True, exist_ok=True)
    return p
EOF
fi

# -------------------------
# backend/utils/retention.py
# -------------------------
if [[ ! -f "${UTILS_DIR}/retention.py" ]]; then
cat > "${UTILS_DIR}/retention.py" <<'EOF'
from __future__ import annotations
from dataclasses import dataclass

@dataclass(frozen=True)
class RetentionPolicy:
    name: str
    days: int

DEFAULT_POLICIES = [
    RetentionPolicy("audit", 3650),
    RetentionPolicy("events", 365),
    RetentionPolicy("uploads", 365),
]
EOF
fi

# -------------------------
# backend/core/modules.py
# -------------------------
if [[ ! -f "${CORE_DIR}/modules.py" ]]; then
cat > "${CORE_DIR}/modules.py" <<'EOF'
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List

@dataclass(frozen=True)
class ModuleSpec:
    key: str
    deps: List[str]

MODULES: Dict[str, ModuleSpec] = {
    "core": ModuleSpec("core", []),
    "billing": ModuleSpec("billing", ["core"]),
    "cad": ModuleSpec("cad", ["core"]),
    "transportlink": ModuleSpec("transportlink", ["core", "cad"]),
    "fire": ModuleSpec("fire", ["core"]),
    "hems": ModuleSpec("hems", ["core", "cad"]),
    "epcr": ModuleSpec("epcr", ["core"]),
    "telehealth": ModuleSpec("telehealth", ["core"]),
    "support": ModuleSpec("support", ["core"]),
    "founder": ModuleSpec("founder", ["core"]),
    "notifications": ModuleSpec("notifications", ["core"]),
    "telnyx": ModuleSpec("telnyx", ["core"]),
    "postmark": ModuleSpec("postmark", ["core"]),
}

def resolve_deps(module_key: str) -> List[str]:
    seen = set()
    order: List[str] = []

    def dfs(k: str):
        if k in seen:
            return
        seen.add(k)
        spec = MODULES.get(k)
        if not spec:
            return
        for d in spec.deps:
            dfs(d)
        order.append(k)

    dfs(module_key)
    return order
EOF
fi

# -------------------------
# backend/core/guards.py
# -------------------------
if [[ ! -f "${CORE_DIR}/guards.py" ]]; then
cat > "${CORE_DIR}/guards.py" <<'EOF'
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
EOF
fi

# -------------------------
# backend/core/config.py (Pydantic v2)
# -------------------------
if [[ ! -f "${CORE_DIR}/config.py" ]]; then
cat > "${CORE_DIR}/config.py" <<'EOF'
from __future__ import annotations

import os
from typing import Optional, List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

def _in_docker() -> bool:
    return os.path.exists("/.dockerenv") or os.environ.get("IN_DOCKER") == "1"

def _sanitize_database_url(url: str) -> str:
    # Replace placeholders used in chat history
    if "<droplet-ip>" in url:
        url = url.replace("<droplet-ip>", "db" if _in_docker() else "127.0.0.1")
    # If any angle brackets remain, fail fast (prevents psycopg2 hostname translation errors)
    if "<" in url or ">" in url:
        raise ValueError(f"Invalid DATABASE_URL (contains placeholder brackets): {url}")
    return url

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    ENV: str = Field(default="development")
    DATABASE_URL: str = Field(default="sqlite:///./fusonems.db")

    # DB pool settings for Postgres (ignored for sqlite)
    DB_POOL_SIZE: int = Field(default=5)
    DB_MAX_OVERFLOW: int = Field(default=10)

    # Auth
    JWT_SECRET_KEY: str = Field(default="change-me")
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_EXPIRES_MINUTES: int = Field(default=60 * 24)

    # CORS
    ALLOWED_ORIGINS: str = Field(default="*")

    # Vendors (optional until enabled)
    TELNYX_API_KEY: str = Field(default="")
    TELNYX_FROM_NUMBER: str = Field(default="")
    POSTMARK_SERVER_TOKEN: str = Field(default="")

    # Feature flags
    OIDC_ENABLED: bool = Field(default=False)

    def normalized_database_url(self) -> str:
        return _sanitize_database_url(self.DATABASE_URL)

    def allowed_origins_list(self) -> List[str]:
        if self.ALLOWED_ORIGINS.strip() == "*":
            return ["*"]
        return [x.strip() for x in self.ALLOWED_ORIGINS.split(",") if x.strip()]

settings = Settings()

def validate_settings_runtime(s: Optional[Settings] = None) -> None:
    s = s or settings
    # Always validate DB URL placeholders
    _ = s.normalized_database_url()

    # Production invariants
    if s.ENV.lower() == "production":
        if not s.DATABASE_URL or s.DATABASE_URL.startswith("sqlite"):
            raise RuntimeError("ENV=production requires a real Postgres DATABASE_URL")
        if not s.JWT_SECRET_KEY or s.JWT_SECRET_KEY == "change-me":
            raise RuntimeError("ENV=production requires JWT_SECRET_KEY to be set")
EOF
fi

# -------------------------
# backend/core/database.py
# -------------------------
if [[ ! -f "${CORE_DIR}/database.py" ]]; then
cat > "${CORE_DIR}/database.py" <<'EOF'
from __future__ import annotations

from typing import Generator, Optional, Dict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool
from .config import settings

Base = declarative_base()

_ENGINES: Dict[str, object] = {}
_SESSIONMAKERS: Dict[str, sessionmaker] = {}

def get_engine(url: Optional[str] = None):
    url = url or settings.normalized_database_url()

    if url in _ENGINES:
        return _ENGINES[url]

    if url.startswith("sqlite"):
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,   # critical: makes in-memory/sqlite stable for tests
        )
    else:
        engine = create_engine(
            url,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_pre_ping=True,
        )

    _ENGINES[url] = engine
    return engine

def _get_sessionmaker(url: Optional[str] = None):
    url = url or settings.normalized_database_url()
    if url in _SESSIONMAKERS:
        return _SESSIONMAKERS[url]
    engine = get_engine(url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    _SESSIONMAKERS[url] = SessionLocal
    return SessionLocal

SessionLocal = _get_sessionmaker()

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOF
fi

# -------------------------
# backend/core/security.py
# -------------------------
if [[ ! -f "${CORE_DIR}/security.py" ]]; then
cat > "${CORE_DIR}/security.py" <<'EOF'
from __future__ import annotations

from typing import Optional, Callable, Iterable
from datetime import datetime, timedelta, timezone
from functools import wraps

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    # bcrypt has a 72-byte limit; normalize and truncate deterministically
    b = password.encode("utf-8")[:72]
    return pwd_context.hash(b)

def verify_password(password: str, hashed: str) -> bool:
    b = password.encode("utf-8")[:72]
    return pwd_context.verify(b, hashed)

def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    minutes = expires_minutes or settings.JWT_EXPIRES_MINUTES
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {"sub": subject, "exp": exp}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from e

# NOTE: this is intentionally minimal. If your repo has User model, replace lookup accordingly.
def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(creds.credentials)
    return {"id": payload.get("sub"), "roles": ["user"], "org_id": None}

def require_roles(*roles: str) -> Callable:
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = kwargs.get("user")
            if not user:
                raise HTTPException(status_code=401, detail="Not authenticated")
            user_roles = set(user.get("roles", []))
            if roles and not (user_roles & set(roles)):
                raise HTTPException(status_code=403, detail="Forbidden")
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def require_module(module_key: str) -> Callable:
    # placeholder: wire into core/guards.py + org enabled modules when available
    def decorator(fn: Callable) -> Callable:
        return fn
    return decorator
EOF
fi

echo "=============================="
echo "Module Core built."
echo "Next steps:"
echo "1) Ensure backend requirements include: pydantic-settings, sqlalchemy, python-jose, passlib[bcrypt], fastapi"
echo "2) Import validate_settings_runtime(settings) correctly (signature supports optional arg)."
echo "3) Start backend: cd backend && uvicorn main:app --host 0.0.0.0 --port 8000"
echo "=============================="
