from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./data/app.db"
    storage_root: str = "./data"
    frontend_origin: str = "http://localhost:5173"
    ai_provider: str = "mock"
    ai_base_url: str = ""
    ai_api_key: str = ""
    ai_model: str = "deepseekv4-pro"
    ai_timeout_seconds: int = 60
    ai_max_retries: int = 2
    generation_concurrency: int = 4
    libreoffice_path: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()


def get_storage_path(subdir: str) -> Path:
    p = Path(settings.storage_root) / subdir
    p.mkdir(parents=True, exist_ok=True)
    return p
