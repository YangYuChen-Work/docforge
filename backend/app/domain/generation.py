import json
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.session import SessionLocal
from app.db.models import (
    GenerationTask, GeneratedDocument, DocumentChapter, TemplateChapter, Project
)
from app.config import settings
from app.services import audit_service


def _run_provider_jobs(prepared_chapters, provider_factory, max_workers: int):
    """Run independent provider calls with bounded concurrency.

    The worker only touches immutable prepared input and returns the provider
    result. Database reads/writes stay outside this function so SQLite and a
    SQLAlchemy Session are never shared across worker threads.
    """
    worker_count = max(1, min(max_workers, len(prepared_chapters)))
    provider_local = threading.local()
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = {
            executor.submit(
                _invoke_provider,
                provider_factory,
                prepared.request,
                provider_local,
            ): prepared.chapter_id
            for prepared in prepared_chapters
        }
        for future in as_completed(futures):
            chapter_id = futures[future]
            try:
                yield chapter_id, future.result(), None
            except Exception as error:
                yield chapter_id, None, error


def _invoke_provider(provider_factory, request, provider_local):
    provider = getattr(provider_local, "provider", None)
    if provider is None:
        provider = provider_factory()
        provider_local.provider = provider
    return provider.generate_chapter(request)


def get_provider():
    if settings.ai_provider == "mock":
        from app.ai.mock_provider import MockAIProvider
        return MockAIProvider()
    elif settings.ai_provider == "deepseek":
        from app.ai.deepseek_provider import DeepSeekProvider
        return DeepSeekProvider()
    raise ValueError(f"Unknown AI_PROVIDER: {settings.ai_provider}")


def _schedule_generation(task_id: str, doc_id: str) -> None:
    thread = threading.Thread(
        target=_run_generation_in_background,
        args=(task_id, doc_id),
        daemon=True,
    )
    thread.start()


def recover_incomplete_generation_tasks(db: Session) -> int:
    """Resume task work left in progress when the app process stopped."""
    tasks = (
        db.query(GenerationTask)
        .filter(GenerationTask.status.in_(["preparing", "generating"]))
        .all()
    )
    recovered = 0
    for task in tasks:
        doc = (
            db.query(GeneratedDocument)
            .filter(GeneratedDocument.generation_task_id == task.id)
            .first()
        )
        if not doc:
            task.status = "failed"
            task.error_message = "服务重启时未找到对应的生成文档"
            db.commit()
            audit_service.log(
                db,
                "recover",
                "generation_task",
                task.id,
                result="failed",
                error_message=task.error_message,
            )
            continue

        pending = (
            db.query(DocumentChapter)
            .filter(
                DocumentChapter.document_id == doc.id,
                DocumentChapter.status.in_(["pending", "generating"]),
            )
            .count()
        )
        if pending:
            task.status = "generating"
            db.commit()
            _schedule_generation(task.id, doc.id)
            recovered += 1
        else:
            task.status = "awaiting_confirmation"
            task.finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
            doc.status = "editing"
            db.commit()
    return recovered


def _mark_generation_failed(
    db: Session,
    task_id: str,
    doc_id: str,
    error: Exception,
) -> None:
    db.rollback()
    task = db.get(GenerationTask, task_id)
    doc = db.get(GeneratedDocument, doc_id)
    message = str(error)[:500]
    if task:
        task.status = "failed"
        task.error_message = message
    if doc:
        doc.status = "failed"
    db.commit()
    if task:
        audit_service.log(
            db,
            "generate",
            "generation_task",
            task.id,
            result="failed",
            payload_summary=f"document={doc_id}",
            error_message=message,
        )


def _finalize_generation_task(
    db: Session,
    task: GenerationTask,
    doc: GeneratedDocument,
) -> None:
    total = db.query(DocumentChapter).filter(DocumentChapter.document_id == doc.id).count()
    failed = (
        db.query(DocumentChapter)
        .filter(
            DocumentChapter.document_id == doc.id,
            DocumentChapter.status == "failed",
        )
        .count()
    )
    task.finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if total == 0 or failed == total:
        task.status = "failed"
        task.error_message = "所有章节生成失败" if total else "没有可生成的章节"
        doc.status = "failed"
        audit_result = "failed"
    else:
        task.status = "awaiting_confirmation"
        doc.status = "editing"
        if failed:
            task.error_message = f"{failed}/{total} 个章节生成失败，请检查章节状态"
        audit_result = "failed" if failed else "success"

    db.commit()
    audit_service.log(
        db,
        "start",
        "generation_task",
        task.id,
        result=audit_result,
        payload_summary=f"document={doc.id} chapters={total}",
        error_message=task.error_message if failed else None,
    )


def create_task(
    db: Session, project_id: str, template_id: str, source_ids: list[str]
) -> GenerationTask:
    task = GenerationTask(
        id=uuid.uuid4().hex,
        project_id=project_id,
        template_id=template_id,
        selected_source_ids=json.dumps(source_ids),
        status="created",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    audit_service.log(
        db, "create", "generation_task", task.id,
        result="success",
        payload_summary=f"project={project_id} template={template_id} sources={len(source_ids)}",
    )
    return task


def start_task(db: Session, task_id: str) -> GenerationTask:
    task = db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(404, {"error_code": "TASK_NOT_FOUND"})
    if task.status != "created":
        audit_service.log(
            db, "start", "generation_task", task_id,
            result="failed",
            error_message=f"Task status is {task.status}",
        )
        raise HTTPException(
            400, {"error_code": "INVALID_STATE", "message": f"Task status is {task.status}"}
        )

    task.status = "preparing"
    task.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    # Create GeneratedDocument
    doc = GeneratedDocument(
        id=uuid.uuid4().hex,
        project_id=task.project_id,
        generation_task_id=task.id,
        template_id=task.template_id,
        title=f"生成文档 - {task.project_id}",
        status="generating",
    )
    db.add(doc)

    # Create DocumentChapters from TemplateChapters
    tpl_chapters = (
        db.query(TemplateChapter)
        .filter(TemplateChapter.template_id == task.template_id)
        .order_by(TemplateChapter.order_index)
        .all()
    )
    for tc in tpl_chapters:
        db.add(DocumentChapter(
            id=uuid.uuid4().hex,
            document_id=doc.id,
            template_chapter_id=tc.id,
            title=tc.title,
            order_index=tc.order_index,
            status="pending",
        ))
    db.commit()

    task.status = "generating"
    db.commit()

    # Run generation in a background thread with its own DB session so the HTTP
    # request returns immediately with the document_id. The frontend navigates to
    # the editor right away and polls per-chapter status instead of blocking on a
    # single request for up to 22 sequential AI calls (which was exceeding the
    # frontend's axios timeout and leaving the wizard stuck with no navigation).
    _schedule_generation(task.id, doc.id)

    return task


def _run_generation_in_background(task_id: str, doc_id: str) -> None:
    db = SessionLocal()
    try:
        task = db.get(GenerationTask, task_id)
        doc = db.get(GeneratedDocument, doc_id)
        _run_generation(db, task, doc)
    finally:
        db.close()


def _run_generation(db: Session, task: GenerationTask, doc: GeneratedDocument):
    try:
        return _run_generation_impl(db, task, doc)
    except Exception as error:
        _mark_generation_failed(db, task.id, doc.id, error)


def _run_generation_impl(db: Session, task: GenerationTask, doc: GeneratedDocument):
    from app.services.chapter_generator import (
        _load_source_data,
        initialize_chapter_generation,
        persist_chapter_result,
        prepare_chapter_generation,
    )

    source_ids = json.loads(task.selected_source_ids)
    project = db.get(Project, task.project_id)
    project_info = {
        "id": project.id,
        "name": project.name,
        "model": project.model,
        "phase": project.phase,
    }

    tpl_chapters = (
        db.query(TemplateChapter)
        .filter(TemplateChapter.template_id == task.template_id)
        .order_by(TemplateChapter.order_index)
        .all()
    )
    tc_map = {
        tc.id: {
            "gen_instruction": tc.gen_instruction,
            "material_types": tc.material_types or "",
        }
        for tc in tpl_chapters
    }

    all_chapters = (
        db.query(DocumentChapter)
        .filter(DocumentChapter.document_id == doc.id)
        .order_by(DocumentChapter.order_index)
        .all()
    )
    chapters = [
        chapter
        for chapter in all_chapters
        if chapter.status in ("pending", "generating")
    ]

    # Read the immutable source snapshot once for the whole task. Each
    # chapter still receives an independently selected context, but no worker
    # repeatedly queries all parsed source rows from SQLite.
    source_data = _load_source_data(db, source_ids)
    prepared_chapters = []
    prepared_by_id = {}
    preparation_failures = []
    for chapter in chapters:
        tc_info = tc_map.get(chapter.template_chapter_id or "", {})
        try:
            prepared = prepare_chapter_generation(
                db,
                chapter,
                tc_info,
                source_ids,
                project_info,
                source_data=source_data,
            )
        except Exception as e:
            chapter.status = "failed"
            chapter.error_message = str(e)[:500]
            preparation_failures.append(chapter)
            continue
        initialize_chapter_generation(db, chapter, prepared)
        prepared_chapters.append(prepared)
        prepared_by_id[prepared.chapter_id] = prepared

    # Publish all running states and context citations before the first model
    # call. This keeps the editor responsive and preserves provenance even if
    # an individual provider request later fails.
    db.commit()
    for chapter in preparation_failures:
        audit_service.log(
            db, "generate", "document_chapter", chapter.id,
            result="failed",
            payload_summary=chapter.title,
            error_message=chapter.error_message,
        )

    for chapter_id, result, error in _run_provider_jobs(
        prepared_chapters,
        get_provider,
        settings.generation_concurrency,
    ):
        chapter = db.get(DocumentChapter, chapter_id)
        if error is not None:
            chapter.status = "failed"
            chapter.error_message = str(error)[:500]
            db.commit()
            audit_service.log(
                db, "generate", "document_chapter", chapter.id,
                result="failed",
                payload_summary=chapter.title,
                error_message=chapter.error_message,
            )
            continue

        prepared = prepared_by_id[chapter_id]
        try:
            persist_chapter_result(db, chapter, prepared, result)
            audit_service.log(
                db, "generate", "document_chapter", chapter.id,
                result="success",
                payload_summary=chapter.title,
            )
        except Exception as e:
            db.rollback()
            chapter = db.get(DocumentChapter, chapter_id)
            chapter.status = "failed"
            chapter.error_message = str(e)[:500]
            db.commit()
            audit_service.log(
                db, "generate", "document_chapter", chapter.id,
                result="failed",
                payload_summary=chapter.title,
                error_message=chapter.error_message,
            )

    _finalize_generation_task(db, task, doc)


def run_chapter_only(
    db: Session,
    chapter: DocumentChapter,
    doc_id: str,
    user_instruction: str | None = None,
):
    from app.services.chapter_generator import generate_chapter

    doc = db.get(GeneratedDocument, doc_id)
    task = db.get(GenerationTask, doc.generation_task_id)
    project = db.get(Project, task.project_id)
    project_info = {
        "id": project.id,
        "name": project.name,
        "model": project.model,
        "phase": project.phase,
    }
    source_ids = json.loads(task.selected_source_ids)

    tc_info: dict = {}
    if chapter.template_chapter_id:
        tc = db.get(TemplateChapter, chapter.template_chapter_id)
        if tc:
            tc_info = {
                "gen_instruction": tc.gen_instruction,
                "material_types": tc.material_types or "",
            }

    provider = get_provider()
    generate_chapter(db, chapter, tc_info, source_ids, project_info, provider, user_instruction)
