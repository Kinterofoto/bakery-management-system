from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    app_name: str = "Bakery API"
    environment: str = "development"
    debug: bool = False

    # Supabase
    supabase_url: str
    supabase_service_key: str
    supabase_storage_bucket: str = "ordenesdecompra"

    # Google Cloud (for production)
    gcp_project_id: str = ""
    gcp_region: str = "us-central1"

    # Microsoft Graph API (Azure AD)
    ms_graph_client_id: str = ""
    ms_graph_client_secret: str = ""
    ms_graph_tenant_id: str = ""
    ms_graph_target_mailbox: str = "comercial@pastrychef.com.co"

    # Webhook Configuration
    webhook_base_url: str = ""
    webhook_secret: str = ""

    # OpenAI
    openai_api_key: str = ""

    # Telegram Bot
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
