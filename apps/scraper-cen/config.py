"""Configuration from environment variables."""

import os


class Settings:
    # CEN Carvajal credentials
    cen_username: str = os.environ.get("CEN_USERNAME", "")
    cen_password: str = os.environ.get("CEN_PASSWORD", "")

    # Supabase
    supabase_url: str = os.environ.get("SUPABASE_URL", "")
    supabase_service_key: str = os.environ.get("SUPABASE_SERVICE_KEY", "")
    supabase_storage_bucket: str = os.environ.get("SUPABASE_STORAGE_BUCKET", "ordenesdecompra")

    # OpenAI
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")

    # Telegram (optional)
    telegram_bot_token: str = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.environ.get("TELEGRAM_CHAT_ID", "")

    # CEN Carvajal URLs
    cen_login_url: str = "https://cencarvajal.com/#/portal/login"
    cen_home_url: str = "https://cencarvajal.com/#/home/welcome"


settings = Settings()
