from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Export
from app.domain import exports as domain

router = APIRouter()


@router.post("/documents/{doc_id}/export")
def create_export(doc_id: str, body: dict | None = None, db: Session = Depends(get_db)):
    body = body or {}
    fmt = body.get("format", "docx")
    include_comments = body.get("include_comments", False) is True
    try:
        exp = domain.create_export(db, doc_id, fmt, include_comments=include_comments)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, {"error_code": "EXPORT_ERROR", "message": str(e)})
    return {
        "export_id": exp.id,
        "status": exp.status,
        "include_comments": exp.include_comments,
        "error_message": exp.error_message,
        "output_path": exp.output_path,
    }


@router.get("/exports/{export_id}")
def get_export(export_id: str, db: Session = Depends(get_db)):
    exp = db.get(Export, export_id)
    if not exp:
        raise HTTPException(404)
    return {
        "id": exp.id,
        "document_id": exp.document_id,
        "format": exp.format,
        "include_comments": exp.include_comments,
        "status": exp.status,
        "output_path": exp.output_path,
        "file_size": exp.file_size,
        "has_missing_info": exp.has_missing_info,
        "error_message": exp.error_message,
        "created_at": exp.created_at.isoformat(),
        "completed_at": exp.completed_at.isoformat() if exp.completed_at else None,
    }


@router.get("/exports/{export_id}/download")
def download_export(export_id: str, db: Session = Depends(get_db)):
    exp = db.get(Export, export_id)
    if not exp or exp.status != "completed" or not exp.output_path:
        raise HTTPException(404, "导出文件不存在或尚未完成")
    p = Path(exp.output_path)
    if not p.exists():
        raise HTTPException(404, "导出文件已被移除")
    media_types = {
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pdf": "application/pdf",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    return FileResponse(
        str(p),
        media_type=media_types.get(exp.format, "application/octet-stream"),
        filename=p.name,
    )
