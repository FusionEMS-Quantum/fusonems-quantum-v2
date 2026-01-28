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
    
    # Office Ally Configuration
    OFFICEALLY_ENABLED: bool = False
    OFFICEALLY_INTERCHANGE_ID: str = "FUSIONEMS"
    OFFICEALLY_TRADING_PARTNER_ID: str = "FUSIONEMS001"
    OFFICEALLY_SUBMITTER_NAME: str = "FUSION EMS BILLING"
    OFFICEALLY_SUBMITTER_ID: str = "FUSIONEMS001"
    OFFICEALLY_CONTACT_PHONE: str = "555-555-5555"
    OFFICEALLY_DEFAULT_NPI: str = "1234567890"
    OFFICEALLY_FTP_HOST: str = ""
    OFFICEALLY_FTP_PORT: int = 22
    OFFICEALLY_FTP_USER: str = ""
    OFFICEALLY_FTP_PASSWORD: str = ""
    OFFICEALLY_SFTP_DIRECTORY: str = "/claims/inbox"
    
    # CAD Backend Socket.io Bridge
    CAD_BACKEND_URL: str = "http://localhost:3000"
    CAD_BACKEND_AUTH_TOKEN: str = "fastapi-bridge-secure-token-change-in-production"
    
    # Metriport Configuration
    METRIPORT_ENABLED: bool = False
    METRIPORT_API_KEY: str = ""
    METRIPORT_BASE_URL: str = "https://api.metriport.com/medical/v1"
    METRIPORT_FACILITY_ID: str = ""
    METRIPORT_WEBHOOK_SECRET: str = ""
    
    SPACES_ENDPOINT: Optional[str] = None
    
    SPACES_ENDPOINT: Optional[str] = None
    SPACES_REGION: Optional[str] = None
    SPACES_BUCKET: Optional[str] = None
    SPACES_ACCESS_KEY: Optional[str] = None
    SPACES_SECRET_KEY: Optional[str] = None
    SPACES_CDN_ENDPOINT: Optional[str] = None
    
    # Telnyx Configuration (Phone + Fax)
    TELNYX_API_KEY: str = ""
    TELNYX_FROM_NUMBER: str = ""
    TELNYX_FAX_FROM_NUMBER: Optional[str] = None
    TELNYX_FAX_CONNECTION_ID: Optional[str] = None
    TELNYX_FAX_WEBHOOK_URL: Optional[str] = None

    # Postmark Configuration (Email)
    POSTMARK_SERVER_TOKEN: Optional[str] = None
    POSTMARK_ACCOUNT_TOKEN: Optional[str] = None
    POSTMARK_FROM_EMAIL: Optional[str] = None

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
