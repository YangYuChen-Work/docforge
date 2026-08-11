import threading
import time
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ai.base import ChapterGenerationResult, CitationItem
from app.db.models import (
    DocumentChapter,
    GeneratedDocument,
    GenerationTask,
    ParsedSourceContent,
    Project,
    SourceDocument,
    TemplateChapter,
)
from app.db.session import Base
from app.domain import generation
from app.domain.generation import _run_provider_jobs


def _prepared(chapter_id: str):
    return SimpleNamespace(chapter_id=chapter_id, request=SimpleNamespace(chapter_id=chapter_id))


def _result(chapter_id: str) -> ChapterGenerationResult:
    return ChapterGenerationResult(
        chapter_id=chapter_id,
        content=f"内容-{chapter_id}",
        citations=[],
        missing_information=[],
        conflicts=[],
        confidence="medium",
    )


def test_run_provider_jobs_respects_concurrency_limit():
    active = 0
    max_active = 0
    provider_creations = 0
    lock = threading.Lock()

    class Provider:
        def generate_chapter(self, request):
            nonlocal active, max_active
            with lock:
                active += 1
                max_active = max(max_active, active)
            time.sleep(0.08)
            with lock:
                active -= 1
            return _result(request.chapter_id)

    def provider_factory():
        nonlocal provider_creations
        with lock:
            provider_creations += 1
        return Provider()

    outcomes = list(
        _run_provider_jobs(
            [_prepared("c1"), _prepared("c2"), _prepared("c3")],
            provider_factory,
            max_workers=2,
        )
    )

    assert max_active == 2
    assert provider_creations == 2
    assert {chapter_id for chapter_id, _, _ in outcomes} == {"c1", "c2", "c3"}
    assert all(error is None for _, _, error in outcomes)


def test_run_provider_jobs_isolates_one_provider_failure():
    class Provider:
        def generate_chapter(self, request):
            if request.chapter_id == "failed":
                raise RuntimeError("provider failed")
            return _result(request.chapter_id)

    outcomes = list(
        _run_provider_jobs(
            [_prepared("ok"), _prepared("failed")],
            lambda: Provider(),
            max_workers=2,
        )
    )
    by_id = {chapter_id: (result, error) for chapter_id, result, error in outcomes}

    assert by_id["ok"][0].content == "内容-ok"
    assert by_id["ok"][1] is None
    assert by_id["failed"][0] is None
    assert isinstance(by_id["failed"][1], RuntimeError)


def test_run_generation_preloads_sources_and_generates_chapters_in_parallel(
    tmp_path, monkeypatch
):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'parallel-generation.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        db.add(
            Project(
                id="P-PARALLEL",
                name="并发测试项目",
                code="PARALLEL-001",
                model="XCT80L7",
                phase="方案设计",
                category="起重机",
            )
        )
        task = GenerationTask(
            id="task-parallel",
            project_id="P-PARALLEL",
            template_id="tpl-parallel",
            selected_source_ids='["source-parallel"]',
            status="generating",
        )
        doc = GeneratedDocument(
            id="doc-parallel",
            project_id="P-PARALLEL",
            generation_task_id=task.id,
            template_id=task.template_id,
            title="并发测试文档",
            status="generating",
        )
        source = SourceDocument(
            id="source-parallel",
            project_id="P-PARALLEL",
            original_name="通用资料.docx",
            stored_path="/tmp/通用资料.docx",
            file_type="docx",
            file_size=1,
            sha256="a" * 64,
            parse_status="parsed",
        )
        db.add_all([task, doc, source])
        db.add(
            ParsedSourceContent(
                source_document_id=source.id,
                content_type="paragraph",
                content_text="章节1 章节2 章节3的并发生成来源内容。",
                locator="第1页",
                order_index=1,
            )
        )
        for index in range(1, 4):
            template_chapter = TemplateChapter(
                id=f"tpl-chapter-{index}",
                template_id=task.template_id,
                title=f"章节{index}",
                order_index=index,
                material_types="",
                gen_instruction="根据来源生成",
            )
            db.add(template_chapter)
            db.add(
                DocumentChapter(
                    id=f"chapter-{index}",
                    document_id=doc.id,
                    template_chapter_id=template_chapter.id,
                    title=template_chapter.title,
                    order_index=index,
                    status="pending",
                )
            )
        db.commit()
        db.refresh(task)
        db.refresh(doc)

        active = 0
        max_active = 0
        lock = threading.Lock()
        load_calls = 0

        class Provider:
            def generate_chapter(self, request):
                nonlocal active, max_active
                with lock:
                    active += 1
                    max_active = max(max_active, active)
                time.sleep(0.08)
                with lock:
                    active -= 1
                return ChapterGenerationResult(
                    chapter_id=request.chapter_id,
                    content=f"内容-{request.chapter_id}",
                    citations=[CitationItem("source-parallel", "第1页", "来源")],
                    missing_information=[],
                    conflicts=[],
                    confidence="medium",
                )

        original_load = generation_module = __import__(
            "app.services.chapter_generator", fromlist=["_load_source_data"]
        )
        original_load_source_data = generation_module._load_source_data

        def counted_load(*args, **kwargs):
            nonlocal load_calls
            load_calls += 1
            return original_load_source_data(*args, **kwargs)

        monkeypatch.setattr(generation_module, "_load_source_data", counted_load)
        monkeypatch.setattr(generation, "get_provider", lambda: Provider())
        monkeypatch.setattr(generation.settings, "generation_concurrency", 2, raising=False)

        generation._run_generation(db, task, doc)

        chapters = (
            db.query(DocumentChapter)
            .filter(DocumentChapter.document_id == doc.id)
            .order_by(DocumentChapter.order_index)
            .all()
        )
        assert max_active == 2
        assert load_calls == 1
        assert [chapter.status for chapter in chapters] == ["generated"] * 3
        assert task.status == "awaiting_confirmation"
        assert doc.status == "editing"
    finally:
        db.close()
