from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import normalize_persisted_path, settings


def _ensure_db_directory(database_url: str) -> None:
    """Create the parent directory for a file-based SQLite database."""
    parsed = urlparse(database_url)
    if parsed.scheme == "sqlite":
        db_path = parsed.path.lstrip("/")
        if db_path and db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)


_ensure_db_directory(settings.database_url)
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _upgrade_local_schema()
    _upgrade_local_paths()


def _upgrade_local_schema():
    """Apply additive SQLite changes for existing local POC databases.

    Alembic remains the migration source of record, while startup keeps an
    already-created local `data/app.db` usable after a small additive change.
    """
    if engine.dialect.name != "sqlite":
        return
    columns = {column["name"] for column in inspect(engine).get_columns("exports")}
    if "include_comments" in columns:
        return
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "ALTER TABLE exports ADD COLUMN include_comments BOOLEAN NOT NULL DEFAULT 0"
        )


def _upgrade_local_paths():
    """Make pre-layout-change SQLite file paths independent of the CWD."""
    from app.db.models import DocumentTemplate, Export, GeneratedDocument, SourceDocument

    path_columns = (
        (DocumentTemplate, "source_path"),
        (SourceDocument, "stored_path"),
        (GeneratedDocument, "output_path"),
        (Export, "output_path"),
    )
    db = SessionLocal()
    try:
        changed = False
        for model, column_name in path_columns:
            column = getattr(model, column_name)
            for record in db.query(model).filter(column.is_not(None)):
                original_path = getattr(record, column_name)
                normalized_path = str(normalize_persisted_path(original_path))
                if normalized_path != original_path:
                    setattr(record, column_name, normalized_path)
                    changed = True
        if changed:
            db.commit()
    finally:
        db.close()
