from app.ai.base import ChapterGenerationResult, CitationItem
from app.services.chapter_generator import _build_citation_records


def _result(citations):
    return ChapterGenerationResult(
        chapter_id="c1",
        content="正文",
        citations=citations,
        missing_information=[],
        conflicts=[],
        confidence="medium",
    )


def test_build_citation_records_prefers_valid_explicit_citations():
    result = _result(citations=[CitationItem("s1", "第2页", "明确引用")])
    rows, missing = _build_citation_records(
        result,
        [{"source_id": "s1", "excerpt": "上下文"}],
        {"s1"},
    )
    assert rows == [
        {
            "source_document_id": "s1",
            "locator": "第2页",
            "source_excerpt": "明确引用",
            "citation_type": "explicit",
        }
    ]
    assert missing == []


def test_build_citation_records_persists_context_when_ai_returns_no_citation():
    result = _result(citations=[])
    rows, missing = _build_citation_records(
        result,
        [
            {
                "source_id": "s1",
                "source_name": "市场报告.docx",
                "locator": "第3页",
                "excerpt": "市场上下文",
            }
        ],
        {"s1"},
    )
    assert rows[0]["citation_type"] == "context"
    assert rows[0]["source_excerpt"] == "市场上下文"
    assert "未返回有效引用" in missing[0]


def test_build_citation_records_does_not_fabricate_source_without_context():
    rows, missing = _build_citation_records(_result(citations=[]), [], set())
    assert rows == []
    assert "未匹配到可用来源" in missing[0]
