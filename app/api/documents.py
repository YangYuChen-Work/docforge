from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Citation, DocumentTemplate
from app.domain import documents as domain
from app.domain.generation import get_provider

router = APIRouter()


def _citation_state(chapter_status: str, citations: list[Citation]) -> str:
    """Derive the source-panel state without changing persisted data."""
    if chapter_status == "pending":
        return "pending"
    if any((citation.citation_type or "summary") != "context" for citation in citations):
        return "explicit"
    if citations:
        return "context"
    if chapter_status == "generating":
        return "generating"
    return "missing"


@router.get("/documents")
def list_documents(
    project_id: str | None = None,
    status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    docs = domain.list_documents(db, project_id, status, search)
    result = []
    for d in docs:
        tpl = db.get(DocumentTemplate, d.template_id)
        result.append({
            "id": d.id,
            "project_id": d.project_id,
            "title": d.title,
            "template_name": tpl.name if tpl else "",
            "status": d.status,
            "updated_at": d.updated_at.isoformat(),
        })
    return result


@router.get("/documents/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = domain.get_document(db, doc_id)
    chapters = [
        {
            "id": c.id,
            "title": c.title,
            "order_index": c.order_index,
            "status": c.status,
            "match_status": c.match_status,
        }
        for c in doc.chapters
    ]
    return {
        "id": doc.id,
        "project_id": doc.project_id,
        "template_id": doc.template_id,
        "title": doc.title,
        "status": doc.status,
        "output_path": doc.output_path,
        "chapters": chapters,
    }


@router.patch("/documents/{doc_id}")
def rename_document(doc_id: str, body: dict, db: Session = Depends(get_db)):
    title = (body or {}).get("title", "")
    document = domain.rename_document(db, doc_id, title)
    return {
        "id": document.id,
        "title": document.title,
        "updated_at": document.updated_at.isoformat(),
    }


@router.post("/documents/batch-delete")
def batch_delete_documents(body: dict | None = None, db: Session = Depends(get_db)):
    return domain.delete_documents(db, (body or {}).get("document_ids", []))


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    return domain.delete_document(db, doc_id)


@router.post("/documents/{doc_id}/chapters")
def create_chapter(doc_id: str, body: dict, db: Session = Depends(get_db)):
    title = (body or {}).get("title", "").strip()
    if not title:
        raise HTTPException(422, {"error_code": "TITLE_REQUIRED"})
    ch = domain.create_custom_chapter(db, doc_id, title)
    return {"id": ch.id, "title": ch.title, "order_index": ch.order_index, "status": ch.status}


@router.get("/documents/{doc_id}/chapters/{chapter_id}")
def get_chapter(doc_id: str, chapter_id: str, db: Session = Depends(get_db)):
    ch = domain.get_chapter(db, doc_id, chapter_id)
    citations = db.query(Citation).filter(Citation.chapter_id == chapter_id).all()
    return {
        "id": ch.id,
        "document_id": doc_id,
        "title": ch.title,
        "status": ch.status,
        "content_json": ch.content_json,
        "plain_text": ch.plain_text,
        "diagram_mermaid": ch.diagram_mermaid,
        "missing_information_json": ch.missing_information_json,
        "conflict_json": ch.conflict_json,
        "match_status": ch.match_status,
        "citation_state": _citation_state(ch.status, citations),
        "citations": [
            {
                "id": c.id,
                "source_document_id": c.source_document_id,
                "locator": c.locator,
                "source_excerpt": c.source_excerpt,
                "citation_type": c.citation_type or "summary",
            }
            for c in citations
        ],
        "confirmed_at": ch.confirmed_at.isoformat() if ch.confirmed_at else None,
        "error_message": ch.error_message,
    }


@router.post("/documents/{doc_id}/chapters/{chapter_id}/edit")
def edit_chapter(doc_id: str, chapter_id: str, body: dict, db: Session = Depends(get_db)):
    ch = domain.edit_chapter(db, doc_id, chapter_id, body["plain_text"], body.get("content_json"))
    return {"updated_at": ch.document.updated_at.isoformat()}


@router.post("/documents/{doc_id}/chapters/{chapter_id}/confirm")
def confirm_chapter(doc_id: str, chapter_id: str, db: Session = Depends(get_db)):
    ch = domain.confirm_chapter(db, doc_id, chapter_id)
    return {"confirmed_at": ch.confirmed_at.isoformat()}


@router.post("/documents/{doc_id}/chapters/{chapter_id}/regenerate")
def regenerate_chapter(
    doc_id: str, chapter_id: str, body: dict | None = None, db: Session = Depends(get_db)
):
    ch = domain.regenerate_chapter(
        db, doc_id, chapter_id, (body or {}).get("instruction")
    )
    return {"status": ch.status}


@router.get("/documents/{doc_id}/versions")
def list_versions(doc_id: str, db: Session = Depends(get_db)):
    versions = domain.list_versions(db, doc_id)
    return [
        {
            "id": v.id,
            "chapter_id": v.chapter_id,
            "version_number": v.version_number,
            "change_type": v.change_type,
            "created_by": v.created_by,
            "created_at": v.created_at.isoformat(),
        }
        for v in versions
    ]


@router.post("/documents/{doc_id}/validate")
def validate_document(doc_id: str, db: Session = Depends(get_db)):
    from app.services.validator import validate_document as _validate
    doc = domain.get_document(db, doc_id)
    tpl = db.get(DocumentTemplate, doc.template_id)
    result = _validate(doc.chapters, tpl.source_path if tpl else None)
    return result


@router.post("/documents/{doc_id}/chapters/{chapter_id}/ai-action")
def ai_action(doc_id: str, chapter_id: str, body: dict, db: Session = Depends(get_db)):
    ch = domain.get_chapter(db, doc_id, chapter_id)
    provider = get_provider()
    action = body.get("action", "polish")
    selection = body.get("selection", "")
    instruction = body.get("instruction", "")
    context = ch.plain_text or ""
    result_text = provider.ai_action(action, selection, instruction, context)
    diagram = result_text if action == "generate_diagram" else None
    if action == "generate_diagram" and diagram:
        ch.diagram_mermaid = diagram
        db.commit()
    return {
        "suggestion": result_text if action != "generate_diagram" else "",
        "diagram_mermaid": diagram,
    }


# --- Annotation endpoints ---

@router.get("/documents/{doc_id}/chapters/{chapter_id}/annotations")
def list_annotations(doc_id: str, chapter_id: str, db: Session = Depends(get_db)):
    domain.get_chapter(db, doc_id, chapter_id)
    items = domain.list_annotations(db, chapter_id)
    return [
        {
            "id": a.id,
            "type": a.type,
            "label": a.label,
            "target_text": a.target_text,
            "content": a.content,
            "source_doc_id": a.source_doc_id,
            "locator": a.locator,
            "status": a.status,
            "created_by": a.created_by,
            "created_at": a.created_at.isoformat(),
        }
        for a in items
    ]


@router.post("/documents/{doc_id}/chapters/{chapter_id}/annotations")
def create_annotation(doc_id: str, chapter_id: str, body: dict, db: Session = Depends(get_db)):
    domain.get_chapter(db, doc_id, chapter_id)
    allowed = {"type", "label", "target_text", "content", "source_doc_id", "locator"}
    data = {k: v for k, v in body.items() if k in allowed}
    a = domain.create_annotation(db, chapter_id, data)
    return {"annotation_id": a.id}


@router.patch("/documents/{doc_id}/chapters/{chapter_id}/annotations/{aid}")
def update_annotation(
    doc_id: str, chapter_id: str, aid: str, body: dict, db: Session = Depends(get_db)
):
    a = domain.update_annotation_status(db, chapter_id, aid, body["status"])
    return {"updated": True, "status": a.status}
