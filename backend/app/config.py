from pydantic_settings import BaseSettings
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCENARIO1_ROOT = PROJECT_ROOT / "assets" / "scenario1"
SCENARIO1_SOURCE_DIR = SCENARIO1_ROOT / "sources"
SCENARIO1_TEMPLATE_PATH = (
    SCENARIO1_ROOT / "templates" / "XX产品开发立项暨设计和开发输入报告.docx"
)
LEGACY_SCENARIO1_TEMPLATE_PATH = (
    "场景1文档生成/要生成的文档/XX产品开发立项暨设计和开发输入报告.docx"
)


def resolve_project_path(value: str | Path) -> Path:
    """Resolve a configured relative path from the repository root."""
    path = Path(value)
    return path.resolve() if path.is_absolute() else (PROJECT_ROOT / path).resolve()


def normalize_persisted_path(value: str) -> Path:
    """Upgrade a legacy relative file path to the current repository layout."""
    portable_value = value.replace("\\", "/")
    if portable_value == LEGACY_SCENARIO1_TEMPLATE_PATH:
        return SCENARIO1_TEMPLATE_PATH
    return resolve_project_path(portable_value)


def _resolve_sqlite_url(url: str) -> str:
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        return url
    database_path = url.removeprefix(prefix)
    if database_path in {":memory:", ""} or database_path.startswith("file:"):
        return url
    path = Path(database_path)
    if path.is_absolute():
        return url
    return f"{prefix}{resolve_project_path(path)}"


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

    model_config = {
        "env_file": str(PROJECT_ROOT / ".env"),
        "env_file_encoding": "utf-8",
    }


settings = Settings()
settings.database_url = _resolve_sqlite_url(settings.database_url)
settings.storage_root = str(resolve_project_path(settings.storage_root))


def get_storage_path(subdir: str) -> Path:
    p = resolve_project_path(settings.storage_root) / subdir
    p.mkdir(parents=True, exist_ok=True)
    return p
