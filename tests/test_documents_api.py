from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.documents import _citation_state
from app.main import app


client = TestClient(app)


def test_citation_state_is_generating_for_pending_or_generating_chapters():
    assert _citation_state("pending", []) == "generating"
    assert _citation_state("generating", []) == "generating"


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
