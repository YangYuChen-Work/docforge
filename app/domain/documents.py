import json
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.models import (
    GeneratedDocument, DocumentChapter, Citation, DocumentVersion, Annotation
)
from app.services import audit_service


def list_documents(
    db: Session,
    project_id: str | None = None,
    status: str | None = None,
    search: str | None = None,
) -> list[GeneratedDocument]:
    q = db.query(GeneratedDocument)
    if project_id:
        q = q.filter(GeneratedDocument.project_id == project_id)
    if status:
        q = q.filter(GeneratedDocument.status == status)
    if search:
        q = q.filter(GeneratedDocument.title.ilike(f"%{search}%"))
    return q.order_by(GeneratedDocument.created_at.desc()).all()


def get_document(db: Session, doc_id: str) -> GeneratedDocument:
    doc = db.get(GeneratedDocument, doc_id)
    if not doc:
        raise HTTPException(404, {"error_code": "DOCUMENT_NOT_FOUND"})
    return doc


def rename_document(db: Session, doc_id: str, title: str) -> GeneratedDocument:
    title = (title or "").strip()
    if not title:
        raise HTTPException(422, {"error_code": "TITLE_REQUIRED"})
    if len(title) > 300:
        raise HTTPException(422, {"error_code": "TITLE_TOO_LONG"})

    doc = get_document(db, doc_id)
    doc.title = title
    db.commit()
    db.refresh(doc)
    audit_service.log(
        db, "rename_document", "generated_document", doc.id,
        result="success", payload_summary=title,
    )
    return doc


def get_chapter(db: Session, doc_id: str, chapter_id: str) -> DocumentChapter:
    ch = (
        db.query(DocumentChapter)
        .filter(DocumentChapter.id == chapter_id, DocumentChapter.document_id == doc_id)
        .first()
    )
    if not ch:
        raise HTTPException(404, {"error_code": "CHAPTER_NOT_FOUND"})
    return ch


def create_custom_chapter(db: Session, doc_id: str, title: str) -> DocumentChapter:
    """Add a user-defined chapter not backed by any TemplateChapter (BR-002 exception:
    user may extend the document beyond the template's fixed structure, but this never
    removes or reorders the template-driven chapters already present)."""
    doc = get_document(db, doc_id)
    max_order = max((c.order_index for c in doc.chapters), default=0)
    ch = DocumentChapter(
        id=uuid.uuid4().hex,
        document_id=doc_id,
        template_chapter_id=None,
        title=title,
        order_index=max_order + 1,
        status="pending",
    )
    db.add(ch)
    db.commit()
    db.refresh(ch)
    audit_service.log(
        db, "create_chapter", "document_chapter", ch.id,
        result="success", payload_summary=title,
    )
    return ch


def edit_chapter(
    db: Session, doc_id: str, chapter_id: str, plain_text: str, content_json: str | None
) -> DocumentChapter:
    ch = get_chapter(db, doc_id, chapter_id)
    _save_version(db, ch, "manual_edit")
    ch.plain_text = plain_text
    if content_json:
        ch.content_json = content_json
    db.commit()
    db.refresh(ch)
    return ch


def confirm_chapter(db: Session, doc_id: str, chapter_id: str) -> DocumentChapter:
    ch = get_chapter(db, doc_id, chapter_id)
    if ch.status not in ("generated", "needs_material", "failed", "pending"):
        audit_service.log(
            db, "confirm", "document_chapter", chapter_id,
            result="failed",
            error_message=f"章节状态 {ch.status} 不可确认",
        )
        raise HTTPException(
            400,
            {"error_code": "INVALID_STATE", "message": f"章节状态 {ch.status} 不可确认"},
        )
    ch.status = "confirmed"
    ch.confirmed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(ch)
    audit_service.log(
        db, "confirm", "document_chapter", chapter_id,
        result="success", payload_summary=ch.title,
    )
    return ch


def regenerate_chapter(
    db: Session, doc_id: str, chapter_id: str, instruction: str | None
) -> DocumentChapter:
    ch = get_chapter(db, doc_id, chapter_id)
    _save_version(db, ch, "regenerated")
    # Clear stale citations
    db.query(Citation).filter(Citation.chapter_id == chapter_id).delete()
    ch.status = "pending"
    ch.plain_text = None
    ch.content_json = None
    ch.confirmed_at = None
    ch.error_message = None
    db.commit()
    from app.domain.generation import run_chapter_only
    run_chapter_only(db, ch, doc_id, instruction)
    db.refresh(ch)
    audit_service.log(
        db, "regenerate", "document_chapter", chapter_id,
        result="success" if ch.status != "failed" else "failed",
        payload_summary=ch.title,
        error_message=ch.error_message,
    )
    return ch


def _save_version(db: Session, ch: DocumentChapter, change_type: str):
    count = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.chapter_id == ch.id)
        .count()
    )
    citations = db.query(Citation).filter(Citation.chapter_id == ch.id).all()
    cit_snapshot = json.dumps(
        [{"source_document_id": c.source_document_id, "locator": c.locator} for c in citations],
        ensure_ascii=False,
    )
    db.add(DocumentVersion(
        id=uuid.uuid4().hex,
        document_id=ch.document_id,
        chapter_id=ch.id,
        version_number=count + 1,
        change_type=change_type,
        content_snapshot=ch.plain_text,
        content_json_snapshot=ch.content_json,
        citations_snapshot=cit_snapshot,
    ))
    db.commit()


def list_versions(db: Session, doc_id: str) -> list[DocumentVersion]:
    return (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == doc_id)
        .order_by(DocumentVersion.created_at.desc())
        .all()
    )


# --- Annotations ---

def list_annotations(db: Session, chapter_id: str) -> list[Annotation]:
    return (
        db.query(Annotation)
        .filter(Annotation.chapter_id == chapter_id)
        .order_by(Annotation.created_at)
        .all()
    )


def create_annotation(db: Session, chapter_id: str, data: dict) -> Annotation:
    a = Annotation(id=uuid.uuid4().hex, chapter_id=chapter_id, **data)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def update_annotation_status(
    db: Session, chapter_id: str, annotation_id: str, status: str
) -> Annotation:
    a = (
        db.query(Annotation)
        .filter(Annotation.id == annotation_id, Annotation.chapter_id == chapter_id)
        .first()
    )
    if not a:
        raise HTTPException(404, {"error_code": "ANNOTATION_NOT_FOUND"})
    a.status = status
    db.commit()
    db.refresh(a)
    return a
