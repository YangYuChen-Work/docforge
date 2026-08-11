from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.models import DocumentTemplate, TemplateChapter


def list_templates(
    db: Session,
    category: str | None = None,
    enabled: bool | None = None,
) -> list[DocumentTemplate]:
    q = db.query(DocumentTemplate)
    if category:
        q = q.filter(DocumentTemplate.category == category)
    if enabled is not None:
        q = q.filter(DocumentTemplate.enabled == enabled)
    return q.order_by(DocumentTemplate.id).all()


def get_template(db: Session, template_id: str) -> DocumentTemplate:
    t = db.get(DocumentTemplate, template_id)
    if not t:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "TEMPLATE_NOT_FOUND", "message": f"模板 {template_id} 不存在"},
        )
    return t


def get_chapters(db: Session, template_id: str) -> list[TemplateChapter]:
    get_template(db, template_id)
    return (
        db.query(TemplateChapter)
        .filter(TemplateChapter.template_id == template_id)
        .order_by(TemplateChapter.order_index)
        .all()
    )


def toggle_template(db: Session, template_id: str) -> DocumentTemplate:
    t = get_template(db, template_id)
    t.enabled = not t.enabled
    db.commit()
    db.refresh(t)
    return t
