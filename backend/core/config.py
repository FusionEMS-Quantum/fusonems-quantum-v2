from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    ENV: str = "development"
    DATABASE_URL: str = "sqlite:///./app.db"
    JWT_SECRET_KEY: str = "dev-secret"
    STORAGE_ENCRYPTION_KEY: str = "dev-storage"
    DOCS_ENCRYPTION_KEY: str = "dev-docs"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    SESSION_COOKIE_NAME: str = "session"
    CSRF_COOKIE_NAME: str = "csrf_token"
    stripe_price_id_cad: str = ""
    stripe_price_id_epcr: str = ""
    stripe_price_id_billing: str = ""
    stripe_price_id_comms: str = ""
    stripe_price_id_scheduling: str = ""
    stripe_price_id_fire: str = ""
    stripe_price_id_hems: str = ""
    stripe_price_id_inventory: str = ""
    stripe_price_id_training: str = ""
    stripe_price_id_qa_legal: str = ""

    model_config = SettingsConfigDict(
        extra="allow",
        env_file=".env",
        env_file_encoding="utf-8"
    )

settings = Settings()

def validate_settings_runtime(_settings: Optional[Settings] = None) -> None:
    s = _settings or settings
    if s.ENV == "production":
        missing = []
        for key in [
            "DATABASE_URL",
            "JWT_SECRET_KEY",
            "STORAGE_ENCRYPTION_KEY",
            "DOCS_ENCRYPTION_KEY",
        ]:
            if not getattr(s, key, None):
                missing.append(key)
        if missing:
            raise RuntimeError(f"Missing required production settings: {missing}")
