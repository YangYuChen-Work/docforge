from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pathlib import Path
from app.db.session import get_db
from app.domain import templates as domain

router = APIRouter()


def _fmt(t):
    return {
        "id": t.id,
        "name": t.name,
        "phase": t.phase,
        "category": t.category,
        "enabled": t.enabled,
        "chapter_count": len(t.chapters),
    }


@router.get("/templates")
def list_templates(
    category: str | None = None,
    enabled: bool | None = None,
    db: Session = Depends(get_db),
):
    return [_fmt(t) for t in domain.list_templates(db, category, enabled)]


@router.get("/templates/{template_id}")
def get_template(template_id: str, db: Session = Depends(get_db)):
    t = domain.get_template(db, template_id)
    chapters = [
        {
            "id": c.id,
            "title": c.title,
            "order_index": c.order_index,
            "material_types": c.material_types,
            "required": c.required,
        }
        for c in t.chapters
    ]
    return {
        "id": t.id,
        "name": t.name,
        "phase": t.phase,
        "category": t.category,
        "source_path": t.source_path,
        "version": t.version,
        "enabled": t.enabled,
        "gen_rule": t.gen_rule,
        "export_format": t.export_format,
        "chapters": chapters,
    }


@router.get("/templates/{template_id}/chapters")
def get_chapters(template_id: str, db: Session = Depends(get_db)):
    chapters = domain.get_chapters(db, template_id)
    return [
        {
            "id": c.id,
            "title": c.title,
            "order_index": c.order_index,
            "material_types": c.material_types,
            "keywords": c.keywords,
            "gen_instruction": c.gen_instruction,
            "required": c.required,
        }
        for c in chapters
    ]


@router.post("/templates/{template_id}/validate")
def validate_template(template_id: str, db: Session = Depends(get_db)):
    t = domain.get_template(db, template_id)
    if t.source_path:
        p = Path(t.source_path)
        if not p.exists():
            return {"valid": False, "error": f"模板文件不存在: {t.source_path}"}
    return {"valid": True, "error": None}


@router.patch("/templates/{template_id}/toggle")
def toggle_template(template_id: str, db: Session = Depends(get_db)):
    t = domain.toggle_template(db, template_id)
    return {"id": t.id, "enabled": t.enabled}
