from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from core.config import settings


def _connect_args(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def _resolve_database_url(database_url: str) -> str:
    if database_url:
        return database_url
    return "sqlite:///./runtime.db"


database_url = _resolve_database_url(settings.DATABASE_URL)
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    connect_args=_connect_args(database_url),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

telehealth_database_url = _resolve_database_url(
    settings.TELEHEALTH_DATABASE_URL or settings.DATABASE_URL
)
telehealth_engine = create_engine(
    telehealth_database_url,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    connect_args=_connect_args(telehealth_database_url),
)
TelehealthSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=telehealth_engine
)
TelehealthBase = declarative_base()

fire_database_url = _resolve_database_url(
    settings.FIRE_DATABASE_URL or settings.DATABASE_URL
)
fire_engine = create_engine(
    fire_database_url,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    connect_args=_connect_args(fire_database_url),
)
FireSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=fire_engine)
FireBase = declarative_base()

hems_database_url = _resolve_database_url(settings.DATABASE_URL)
hems_engine = create_engine(
    hems_database_url,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    connect_args=_connect_args(hems_database_url),
)
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
