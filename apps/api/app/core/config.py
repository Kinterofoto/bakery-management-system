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

    # Google Cloud (for production)
    gcp_project_id: str = ""
    gcp_region: str = "us-central1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
