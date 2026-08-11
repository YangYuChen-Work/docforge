from pathlib import Path
from uuid import uuid4

from app.config import (
    PROJECT_ROOT,
    SCENARIO1_SOURCE_DIR,
    SCENARIO1_TEMPLATE_PATH,
    resolve_project_path,
)
from app.db.models import DocumentTemplate, Project, SourceDocument
from app.db.session import SessionLocal, create_tables


def test_project_paths_are_rooted_outside_the_backend_working_directory():
    """Backend commands must find shared assets and runtime data from backend/."""
    assert PROJECT_ROOT == Path(__file__).resolve().parents[2]
    assert SCENARIO1_SOURCE_DIR == PROJECT_ROOT / "assets" / "scenario1" / "sources"
    assert SCENARIO1_TEMPLATE_PATH == (
        PROJECT_ROOT
        / "assets"
        / "scenario1"
        / "templates"
        / "XX产品开发立项暨设计和开发输入报告.docx"
    )
    assert resolve_project_path("data") == PROJECT_ROOT / "data"


def test_create_tables_migrates_legacy_relative_source_paths():
    """Existing local databases keep working after the backend directory move."""
    create_tables()
    identifier = uuid4().hex
    project_id = f"L{identifier[:8]}"
    legacy_path = PROJECT_ROOT / "data" / "uploads" / f"{identifier}.docx"
    legacy_path.parent.mkdir(parents=True, exist_ok=True)
    legacy_path.touch()

    db = SessionLocal()
    try:
        db.add(
            Project(
                id=project_id,
                name="layout migration test",
                code=identifier,
                model="test",
                phase="test",
                category="test",
            )
        )
        source = SourceDocument(
            id=identifier,
            project_id=project_id,
            original_name="legacy.docx",
            stored_path=f"data/uploads/{legacy_path.name}",
            file_type="docx",
            sha256=identifier + identifier,
        )
        db.add(source)
        db.commit()

        create_tables()
        db.expire_all()
        assert db.get(SourceDocument, identifier).stored_path == str(legacy_path)
    finally:
        source = db.get(SourceDocument, identifier)
        if source:
            db.delete(source)
        project = db.get(Project, project_id)
        if project:
            db.delete(project)
        db.commit()
        db.close()
        legacy_path.unlink(missing_ok=True)


def test_create_tables_maps_the_moved_scenario_template_path():
    """A persisted Scenario 1 template remains valid after its asset move."""
    create_tables()
    template_id = f"T{uuid4().hex[:8]}"
    db = SessionLocal()
    try:
        db.add(
            DocumentTemplate(
                id=template_id,
                name="legacy scenario template",
                phase="test",
                category="test",
                source_path="场景1文档生成/要生成的文档/XX产品开发立项暨设计和开发输入报告.docx",
            )
        )
        db.commit()

        create_tables()
        db.expire_all()
        assert db.get(DocumentTemplate, template_id).source_path == str(SCENARIO1_TEMPLATE_PATH)
    finally:
        template = db.get(DocumentTemplate, template_id)
        if template:
            db.delete(template)
        db.commit()
        db.close()
