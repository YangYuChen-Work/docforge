import json
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.models import (
    GenerationTask, GeneratedDocument, DocumentChapter, TemplateChapter, Project
)
from app.config import settings


def get_provider():
    if settings.ai_provider == "mock":
        from app.ai.mock_provider import MockAIProvider
        return MockAIProvider()
    elif settings.ai_provider == "deepseek":
        from app.ai.deepseek_provider import DeepSeekProvider
        return DeepSeekProvider()
    raise ValueError(f"Unknown AI_PROVIDER: {settings.ai_provider}")


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
    return task


def start_task(db: Session, task_id: str) -> GenerationTask:
    task = db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(404, {"error_code": "TASK_NOT_FOUND"})
    if task.status != "created":
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

    _run_generation(db, task, doc)
    return task


def _run_generation(db: Session, task: GenerationTask, doc: GeneratedDocument):
    from app.services.chapter_generator import generate_chapter

    provider = get_provider()
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

    chapters = (
        db.query(DocumentChapter)
        .filter(DocumentChapter.document_id == doc.id)
        .order_by(DocumentChapter.order_index)
        .all()
    )

    for chapter in chapters:
        tc_info = tc_map.get(chapter.template_chapter_id or "", {})
        try:
            generate_chapter(db, chapter, tc_info, source_ids, project_info, provider)
        except Exception as e:
            chapter.status = "failed"
            chapter.error_message = str(e)[:500]
            db.commit()

    task.status = "awaiting_confirmation"
    task.finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
    doc.status = "editing"
    db.commit()


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
