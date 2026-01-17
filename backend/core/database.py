from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool
import logging

from core.config import settings

logger = logging.getLogger(__name__)


def _connect_args(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def _resolve_database_url(database_url: str) -> str:
    if database_url:
        return database_url
    return "sqlite:///./runtime.db"


def _create_hardened_engine(database_url: str):
    """Create a hardened database engine with pooling and connectivity test."""
    resolved_url = _resolve_database_url(database_url)
    
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_recycle": settings.DB_POOL_RECYCLE,
        "echo": settings.ENV == "development",
    }
    
    # Use QueuePool for non-SQLite databases
    if not resolved_url.startswith("sqlite"):
        engine_kwargs["poolclass"] = QueuePool
        engine_kwargs["pool_size"] = settings.DB_POOL_SIZE
        engine_kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
    else:
        # SQLite requires connect_args
        engine_kwargs["connect_args"] = _connect_args(resolved_url)
    
    engine = create_engine(resolved_url, **engine_kwargs)
    
    # Connectivity test
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        if settings.ENV == "production":
            raise RuntimeError(f"Database connectivity test failed: {e}")
        else:
            logger.warning(f"Database connectivity warning: {e}")
    
    return engine


# Main database engine
engine = _create_hardened_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Telehealth database engine
telehealth_engine = _create_hardened_engine(
    settings.TELEHEALTH_DATABASE_URL or settings.DATABASE_URL
)
TelehealthSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=telehealth_engine
)
TelehealthBase = declarative_base()

# Fire database engine
fire_engine = _create_hardened_engine(
    settings.FIRE_DATABASE_URL or settings.DATABASE_URL
)
FireSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=fire_engine)
FireBase = declarative_base()

# HEMS database engine
hems_engine = _create_hardened_engine(settings.DATABASE_URL)
HemsSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=hems_engine)
HemsBase = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_telehealth_db():
    db = TelehealthSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_fire_db():
    db = FireSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_hems_db():
    db = HemsSessionLocal()
    try:
        yield db
    finally:
        db.close()
