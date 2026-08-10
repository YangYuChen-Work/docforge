from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.documents import _citation_state
from app.db.models import DocumentChapter, GeneratedDocument, Project
from app.db.session import Base, get_db
from app.main import app


client = TestClient(app)


def test_citation_state_distinguishes_pending_from_generating_chapters():
    assert _citation_state("pending", []) == "pending"
    assert _citation_state("generating", []) == "generating"


def test_citation_state_prefers_actual_citations_over_generating_status():
    assert _citation_state(
        "generating", [SimpleNamespace(citation_type="context")]
    ) == "context"
    assert _citation_state(
        "generating", [SimpleNamespace(citation_type="explicit")]
    ) == "explicit"


def test_citation_state_distinguishes_explicit_context_and_missing_sources():
    assert _citation_state(
        "needs_material", [SimpleNamespace(citation_type="explicit")]
    ) == "explicit"
    assert _citation_state(
        "needs_material", [SimpleNamespace(citation_type="context")]
    ) == "context"
    assert _citation_state("needs_material", []) == "missing"


def test_batch_delete_requires_at_least_one_document_id():
    response = client.post("/api/documents/batch-delete", json={"document_ids": []})
    assert response.status_code == 422


def test_batch_delete_reports_unknown_document_ids_without_deleting_anything():
    response = client.post(
        "/api/documents/batch-delete",
        json={"document_ids": ["document-that-does-not-exist"]},
    )
    assert response.status_code == 404


def test_batch_delete_rejects_a_non_list_document_id_payload():
    response = client.post(
        "/api/documents/batch-delete",
        json={"document_ids": "not-a-list"},
    )
    assert response.status_code == 422


def test_batch_delete_removes_existing_document_and_chapters(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'batch-delete.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    db = Session()
    db.add(
        Project(
            id="P-BATCH",
            name="批量删除测试项目",
            code="BATCH-001",
            model="TEST",
            phase="测试",
            category="测试",
        )
    )
    db.add(
        GeneratedDocument(
            id="doc-batch",
            project_id="P-BATCH",
            generation_task_id="task-batch",
            template_id="template-batch",
            title="批量删除测试文档",
            status="draft",
        )
    )
    db.add(
        DocumentChapter(
            id="chapter-batch",
            document_id="doc-batch",
            template_chapter_id=None,
            title="测试章节",
            order_index=1,
            status="pending",
        )
    )
    db.commit()
    db.close()

    def override_get_db():
        test_db = Session()
        try:
            yield test_db
        finally:
            test_db.close()

    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    try:
        isolated_client = TestClient(app, raise_server_exceptions=False)
        response = isolated_client.post(
            "/api/documents/batch-delete",
            json={"document_ids": ["doc-batch"]},
        )

        assert response.status_code == 200, response.text
        assert response.json() == {
            "ids": ["doc-batch"],
            "deleted": True,
            "deleted_count": 1,
        }

        check_db = Session()
        try:
            assert check_db.get(GeneratedDocument, "doc-batch") is None
            assert check_db.get(DocumentChapter, "chapter-batch") is None
        finally:
            check_db.close()
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous_override
