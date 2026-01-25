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
