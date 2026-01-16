import os
from pathlib import Path

db_path = Path("test.db")
if db_path.exists():
    db_path.unlink()

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["TELEHEALTH_DATABASE_URL"] = "sqlite:///./test.db"
os.environ["FIRE_DATABASE_URL"] = "sqlite:///./test.db"
os.environ["JWT_SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient

from core.database import Base, FireBase, HemsBase, TelehealthBase, engine
from main import app


def create_test_client():
    Base.metadata.create_all(bind=engine)
    FireBase.metadata.create_all(bind=engine)
    TelehealthBase.metadata.create_all(bind=engine)
    HemsBase.metadata.create_all(bind=engine)
    return TestClient(app)


def drop_test_db():
    Base.metadata.drop_all(bind=engine)


import pytest


@pytest.fixture()
def client():
    client = create_test_client()
    try:
        yield client
    finally:
        drop_test_db()
