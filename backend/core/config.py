from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Basic app settings
    PROJECT_NAME: str = Field("FusonEMS Quantum", env="PROJECT_NAME")
    ENV: str = Field("development", env="ENV")  # development | staging | production
    ALLOWED_ORIGINS: str = Field("http://localhost:5173", env="ALLOWED_ORIGINS")

    # Database
    DATABASE_URL: Optional[str] = Field("", env="DATABASE_URL")
    TELEHEALTH_DATABASE_URL: Optional[str] = Field("", env="TELEHEALTH_DATABASE_URL")
    FIRE_DATABASE_URL: Optional[str] = Field("", env="FIRE_DATABASE_URL")
    DB_POOL_SIZE: int = Field(5, env="DB_POOL_SIZE")
    DB_MAX_OVERFLOW: int = Field(10, env="DB_MAX_OVERFLOW")

    # Pool tuning (seconds)
    DB_POOL_TIMEOUT: int = Field(30, env="DB_POOL_TIMEOUT")
    DB_POOL_RECYCLE: int = Field(1800, env="DB_POOL_RECYCLE")

    # Auth / Session / CSRF
    JWT_SECRET_KEY: Optional[str] = Field("change-me", env="JWT_SECRET_KEY")  # production secret
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(60, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    SESSION_COOKIE_NAME: str = Field("fusonems_session", env="SESSION_COOKIE_NAME")
    CSRF_COOKIE_NAME: str = Field("fusonems_csrf", env="CSRF_COOKIE_NAME")
    LOCAL_AUTH_ENABLED: bool = Field(True, env="LOCAL_AUTH_ENABLED")
    AUTH_RATE_LIMIT_PER_MIN: int = Field(10, env="AUTH_RATE_LIMIT_PER_MIN")

    # OIDC / SSO (optional)
    OIDC_ENABLED: bool = Field(False, env="OIDC_ENABLED")
    OIDC_ISSUER_URL: Optional[str] = Field("", env="OIDC_ISSUER_URL")
    OIDC_CLIENT_ID: Optional[str] = Field("", env="OIDC_CLIENT_ID")
    OIDC_CLIENT_SECRET: Optional[str] = Field("", env="OIDC_CLIENT_SECRET")
    OIDC_REDIRECT_URI: Optional[str] = Field("", env="OIDC_REDIRECT_URI")

    # Storage / Documents
    STORAGE_ENCRYPTION_KEY: Optional[str] = Field("change-me", env="STORAGE_ENCRYPTION_KEY")
    DOCS_STORAGE_BACKEND: str = Field("local", env="DOCS_STORAGE_BACKEND")
    DOCS_STORAGE_LOCAL_DIR: str = Field("storage/documents", env="DOCS_STORAGE_LOCAL_DIR")
    DOCS_S3_ENDPOINT: Optional[str] = Field("", env="DOCS_S3_ENDPOINT")
    DOCS_S3_REGION: Optional[str] = Field("", env="DOCS_S3_REGION")
    DOCS_S3_BUCKET: Optional[str] = Field("", env="DOCS_S3_BUCKET")
    DOCS_S3_ACCESS_KEY: Optional[str] = Field("", env="DOCS_S3_ACCESS_KEY")
    DOCS_S3_SECRET_KEY: Optional[str] = Field("", env="DOCS_S3_SECRET_KEY")
    DOCS_ENCRYPTION_KEY: Optional[str] = Field("change-me", env="DOCS_ENCRYPTION_KEY")

    # Integrations
    TELNYX_API_KEY: Optional[str] = Field("", env="TELNYX_API_KEY")
    TELNYX_NUMBER: Optional[str] = Field("", env="TELNYX_NUMBER")
    TELNYX_CONNECTION_ID: Optional[str] = Field("", env="TELNYX_CONNECTION_ID")
    TELNYX_MESSAGING_PROFILE_ID: Optional[str] = Field("", env="TELNYX_MESSAGING_PROFILE_ID")
    TELNYX_PUBLIC_KEY: Optional[str] = Field("", env="TELNYX_PUBLIC_KEY")
    TELNYX_REQUIRE_SIGNATURE: bool = Field(False, env="TELNYX_REQUIRE_SIGNATURE")

    POSTMARK_SERVER_TOKEN: Optional[str] = Field("", env="POSTMARK_SERVER_TOKEN")
    POSTMARK_DEFAULT_SENDER: Optional[str] = Field("", env="POSTMARK_DEFAULT_SENDER")
    POSTMARK_REQUIRE_SIGNATURE: bool = Field(False, env="POSTMARK_REQUIRE_SIGNATURE")
    POSTMARK_API_BASE: str = Field("https://api.postmarkapp.com", env="POSTMARK_API_BASE")
    POSTMARK_SEND_DISABLED: bool = Field(False, env="POSTMARK_SEND_DISABLED")

    LOB_API_KEY: Optional[str] = Field("", env="LOB_API_KEY")
    OFFICEALLY_FTP_HOST: Optional[str] = Field("", env="OFFICEALLY_FTP_HOST")
    OFFICEALLY_FTP_USER: Optional[str] = Field("", env="OFFICEALLY_FTP_USER")
    OFFICEALLY_FTP_PASSWORD: Optional[str] = Field("", env="OFFICEALLY_FTP_PASSWORD")
    OFFICEALLY_FTP_PORT: int = Field(21, env="OFFICEALLY_FTP_PORT")

    # Stripe (optional)
    STRIPE_SECRET_KEY: Optional[str] = Field("", env="STRIPE_SECRET_KEY")
    STRIPE_ENV: Optional[str] = Field("", env="STRIPE_ENV")  # test | live
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field("", env="STRIPE_WEBHOOK_SECRET")
    STRIPE_ENFORCE_ENTITLEMENTS: bool = Field(False, env="STRIPE_ENFORCE_ENTITLEMENTS")

    STRIPE_PRICE_ID_CAD: Optional[str] = Field("", env="STRIPE_PRICE_ID_CAD")
    STRIPE_PRICE_ID_EPCR: Optional[str] = Field("", env="STRIPE_PRICE_ID_EPCR")
    STRIPE_PRICE_ID_BILLING: Optional[str] = Field("", env="STRIPE_PRICE_ID_BILLING")
    STRIPE_PRICE_ID_COMMS: Optional[str] = Field("", env="STRIPE_PRICE_ID_COMMS")
    STRIPE_PRICE_ID_SCHEDULING: Optional[str] = Field("", env="STRIPE_PRICE_ID_SCHEDULING")
    STRIPE_PRICE_ID_FIRE: Optional[str] = Field("", env="STRIPE_PRICE_ID_FIRE")
    STRIPE_PRICE_ID_HEMS: Optional[str] = Field("", env="STRIPE_PRICE_ID_HEMS")
    STRIPE_PRICE_ID_INVENTORY: Optional[str] = Field("", env="STRIPE_PRICE_ID_INVENTORY")
    STRIPE_PRICE_ID_TRAINING: Optional[str] = Field("", env="STRIPE_PRICE_ID_TRAINING")
    STRIPE_PRICE_ID_QA_LEGAL: Optional[str] = Field("", env="STRIPE_PRICE_ID_QA_LEGAL")

    SMART_MODE: bool = Field(True, env="SMART_MODE")
    SENTRY_DSN: Optional[str] = Field("", env="SENTRY_DSN")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
        case_sensitive = False


settings = Settings()


def validate_settings_runtime(settings: Settings) -> None:
    errors: list[str] = []
    env = getattr(settings, "ENV", "development")

    if env == "production":
        if not (getattr(settings, "DATABASE_URL", None) or "").strip():
            errors.append("DATABASE_URL must be set for production.")
        jwt = getattr(settings, "JWT_SECRET_KEY", "")
        if not jwt or jwt == "change-me":
            errors.append("JWT_SECRET_KEY must be set to a secure value for production.")
        storage_key = getattr(settings, "STORAGE_ENCRYPTION_KEY", "")
        if not storage_key or storage_key == "change-me":
            errors.append("STORAGE_ENCRYPTION_KEY must be set for production.")
        docs_key = getattr(settings, "DOCS_ENCRYPTION_KEY", "")
        if not docs_key or docs_key == "change-me":
            errors.append("DOCS_ENCRYPTION_KEY must be set for production.")
        docs_backend = (getattr(settings, "DOCS_STORAGE_BACKEND", "local") or "local").lower()
        if docs_backend not in {"local", "s3"}:
            errors.append("DOCS_STORAGE_BACKEND must be 'local' or 's3'.")
        if docs_backend == "s3":
            if not getattr(settings, "DOCS_S3_BUCKET", ""):
                errors.append("DOCS_S3_BUCKET must be set when DOCS_STORAGE_BACKEND=s3.")
            if not getattr(settings, "DOCS_S3_ACCESS_KEY", "") or not getattr(
                settings, "DOCS_S3_SECRET_KEY", ""
            ):
                errors.append("DOCS_S3_ACCESS_KEY and DOCS_S3_SECRET_KEY are required for S3 storage.")

    if getattr(settings, "OIDC_ENABLED", False):
        if not getattr(settings, "OIDC_ISSUER_URL", ""):
            errors.append("OIDC_ISSUER_URL must be set when OIDC_ENABLED is true.")
        if not getattr(settings, "OIDC_CLIENT_ID", ""):
            errors.append("OIDC_CLIENT_ID must be set when OIDC_ENABLED is true.")
        if not getattr(settings, "OIDC_CLIENT_SECRET", ""):
            errors.append("OIDC_CLIENT_SECRET should be set when OIDC is enabled.")

    if getattr(settings, "STRIPE_SECRET_KEY", ""):
        stripe_env = getattr(settings, "STRIPE_ENV", "")
        if stripe_env not in {"test", "live"}:
            errors.append("STRIPE_ENV must be 'test' or 'live' when STRIPE_SECRET_KEY is provided.")
        if not getattr(settings, "STRIPE_WEBHOOK_SECRET", ""):
            errors.append("STRIPE_WEBHOOK_SECRET must be set when STRIPE_SECRET_KEY is provided.")

    if getattr(settings, "TELNYX_REQUIRE_SIGNATURE", False) and not getattr(
        settings, "TELNYX_PUBLIC_KEY", ""
    ):
        errors.append("TELNYX_PUBLIC_KEY must be set when TELNYX_REQUIRE_SIGNATURE is true.")
    if getattr(settings, "POSTMARK_REQUIRE_SIGNATURE", False) and not getattr(
        settings, "POSTMARK_SERVER_TOKEN", ""
    ):
        errors.append("POSTMARK_SERVER_TOKEN must be set when POSTMARK_REQUIRE_SIGNATURE is true.")

    if errors and env == "production":
        human = "\n".join(f"- {e}" for e in errors)
        raise RuntimeError(f"Invalid runtime configuration (production). Fix the following:\n{human}")

    if errors and env != "production":
        warning_text = "\n".join(f"- {e}" for e in errors)
        logger.warning("Configuration validation warnings (non-production):\n" + warning_text)
