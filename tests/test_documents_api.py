from types import SimpleNamespace

from app.api.documents import _citation_state


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
