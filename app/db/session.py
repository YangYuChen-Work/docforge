from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings


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
