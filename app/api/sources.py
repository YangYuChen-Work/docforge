from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.domain import sources as domain

router = APIRouter()


def _fmt(s):
    return {
        "id": s.id,
        "source_type": s.source_type,
        "original_name": s.original_name,
        "file_type": s.file_type,
        "file_size": s.file_size,
        "parse_status": s.parse_status,
        "parse_error": s.parse_error,
        "image_count": s.image_count,
        "uploaded_at": s.uploaded_at.isoformat(),
        "parsed_at": s.parsed_at.isoformat() if s.parsed_at else None,
    }


@router.get("/projects/{project_id}/sources")
def list_sources(project_id: str, db: Session = Depends(get_db)):
    return [_fmt(s) for s in domain.list_sources(db, project_id)]


@router.post("/projects/{project_id}/sources")
def upload_source(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    s = domain.upload_source(db, project_id, file)
    return {
        "source_id": s.id,
        "stored_path": s.stored_path,
        "sha256": s.sha256,
        "parse_status": s.parse_status,
    }


@router.get("/sources/{source_id}")
def get_source(source_id: str, db: Session = Depends(get_db)):
    return _fmt(domain.get_source(db, source_id))


@router.post("/sources/{source_id}/parse")
def parse_source(source_id: str, db: Session = Depends(get_db)):
    s = domain.trigger_parse(db, source_id)
    return {
        "source_id": s.id,
        "parse_status": s.parse_status,
        "parse_error": s.parse_error,
    }


@router.get("/sources/{source_id}/content")
def get_content(source_id: str, db: Session = Depends(get_db)):
    items = domain.get_content(db, source_id)
    return {
        "contents": [
            {
                "content_type": c.content_type,
                "heading_path": c.heading_path,
                "content_text": c.content_text,
                "structured_value": c.structured_value,
                "locator": c.locator,
                "order_index": c.order_index,
            }
            for c in items
        ]
    }
