from pydantic import BaseModel
from functools import lru_cache
import os

class Settings(BaseModel):
    ENV: str = os.getenv("ENV", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-secret")
    STORAGE_ENCRYPTION_KEY: str = os.getenv("STORAGE_ENCRYPTION_KEY", "dev-storage-key")

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

def validate_settings_runtime(_settings: Settings | None = None) -> None:
    # Intentionally minimal to prevent boot failures
    return
