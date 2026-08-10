from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ai.base import ChapterGenerationResult, CitationItem
from app.db.models import (
    Citation,
    DocumentChapter,
    GeneratedDocument,
    ParsedSourceContent,
    Project,
    SourceDocument,
)
from app.db.session import Base
from app.services.chapter_generator import _build_citation_records
from app.services.chapter_generator import generate_chapter


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


def test_generate_chapter_shows_context_sources_before_provider_returns(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'chapter-generator.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        db.add(
            Project(
                id="P001",
                name="测试项目",
                code="XG-ZX-2026-001",
                model="XCT80L7",
                phase="方案设计",
                category="起重机",
            )
        )
        db.add(
            GeneratedDocument(
                id="doc-1",
                project_id="P001",
                generation_task_id="task-1",
                template_id="tpl-1",
                title="测试文档",
                status="draft",
            )
        )
        chapter = DocumentChapter(
            id="chapter-1",
            document_id="doc-1",
            template_chapter_id="template-chapter-1",
            title="市场需求分析",
            order_index=1,
            status="pending",
        )
        db.add(chapter)
        db.add(
            SourceDocument(
                id="source-1",
                project_id="P001",
                source_type="uploaded",
                original_doc_id=None,
                original_name="市场调研报告.docx",
                stored_path="/tmp/市场调研报告.docx",
                file_type="docx",
                file_size=123,
                sha256="a" * 64,
                parse_status="parsed",
            )
        )
        db.add(
            SourceDocument(
                id="source-2",
                project_id="P001",
                source_type="uploaded",
                original_doc_id=None,
                original_name="采购成本测算.xlsx",
                stored_path="/tmp/采购成本测算.xlsx",
                file_type="xlsx",
                file_size=456,
                sha256="b" * 64,
                parse_status="parsed",
            )
        )
        db.add(
            ParsedSourceContent(
                source_document_id="source-1",
                content_type="paragraph",
                heading_level=1,
                heading_path="市场调研",
                content_text="市场需求分析摘要",
                structured_value=None,
                locator="第2页",
                order_index=1,
            )
        )
        db.add(
            ParsedSourceContent(
                source_document_id="source-1",
                content_type="table",
                heading_level=None,
                heading_path=None,
                content_text=None,
                structured_value='{"caption":"表1","headers":["指标"],"rows":[["20%"]]}',
                locator="表1",
                order_index=2,
            )
        )
        db.add(
            ParsedSourceContent(
                source_document_id="source-2",
                content_type="table",
                heading_level=None,
                heading_path=None,
                content_text=None,
                structured_value='{"caption":"表2","headers":["成本"],"rows":[["500万"]]}',
                locator="表2",
                order_index=1,
            )
        )
        db.commit()

        monkeypatch.setattr(
            "app.services.material_matcher.compute_match_status",
            lambda chapter_info, matched_sources: "matched",
        )
        monkeypatch.setattr(
            "app.services.material_matcher.extract_relevant_excerpts",
            lambda chapter_title, sources, max_chars=3000: [
                {
                    "source_id": "source-1",
                    "source_name": "市场调研报告.docx",
                    "locator": "第2页",
                    "excerpt": "市场需求分析摘要",
                    "relevance": 1,
                }
            ],
        )

        provider_snapshots = {}

        class Provider:
            def generate_chapter(self, request):
                fresh_db = Session()
                try:
                    provider_snapshots["status_during_call"] = fresh_db.get(
                        DocumentChapter, "chapter-1"
                    ).status
                    provider_snapshots["citations_during_call"] = [
                        {
                            "source_document_id": citation.source_document_id,
                            "locator": citation.locator,
                            "source_excerpt": citation.source_excerpt,
                            "citation_type": citation.citation_type,
                        }
                        for citation in fresh_db.query(Citation)
                        .filter(Citation.chapter_id == "chapter-1")
                        .order_by(Citation.created_at)
                        .all()
                    ]
                finally:
                    fresh_db.close()
                provider_snapshots["structured_tables_during_call"] = request.structured_tables
                return ChapterGenerationResult(
                    chapter_id=request.chapter_id,
                    content="生成正文",
                    citations=[CitationItem("source-1", "第2页", "模型明确引用")],
                    missing_information=[],
                    conflicts=[],
                    confidence="medium",
                )

            def ai_action(self, action, selection, instruction, context):
                raise NotImplementedError

        result = generate_chapter(
            db,
            chapter,
            {"gen_instruction": "按资料生成", "material_types": "市场调研报告"},
            ["source-1", "source-2"],
            {"id": "P001", "name": "测试项目", "model": "XCT80L7", "phase": "方案设计"},
            Provider(),
        )

        assert result.status == "generated"
        assert provider_snapshots["status_during_call"] == "generating"
        assert {
            (row["citation_type"], row["locator"], row["source_excerpt"])
            for row in provider_snapshots["citations_during_call"]
        } == {
            ("context", "第2页", "市场需求分析摘要"),
            ("context", "表1", '{"caption":"表1","headers":["指标"],"rows":[["20%"]]}'),
        }
        assert provider_snapshots["structured_tables_during_call"] == [
            {"caption": "表1", "headers": ["指标"], "rows": [["20%"]]}
        ]

        final_rows = [
            {
                "source_document_id": citation.source_document_id,
                "locator": citation.locator,
                "source_excerpt": citation.source_excerpt,
                "citation_type": citation.citation_type,
            }
            for citation in db.query(Citation)
            .filter(Citation.chapter_id == "chapter-1")
            .order_by(Citation.created_at)
            .all()
        ]
        assert final_rows == [
            {
                "source_document_id": "source-1",
                "locator": "第2页",
                "source_excerpt": "模型明确引用",
                "citation_type": "explicit",
            }
        ]
    finally:
        db.close()
