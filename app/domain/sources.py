import hashlib
import uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from app.db.models import SourceDocument, ParsedSourceContent
from app.config import get_storage_path
from app.services import audit_service

ALLOWED_TYPES = {"docx", "xlsx"}


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def upload_source(db: Session, project_id: str, file: UploadFile) -> SourceDocument:
    suffix = Path(file.filename).suffix.lstrip(".").lower()
    if suffix not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "UNSUPPORTED_FORMAT",
                "message": f"仅支持 .docx 和 .xlsx，收到 .{suffix}",
            },
        )
    uploads_dir = get_storage_path("uploads")
    tmp_path = uploads_dir / f"tmp_{uuid.uuid4().hex}"
    with open(tmp_path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    sha = _sha256(tmp_path)

    # Dedup: same project + same hash
    existing = (
        db.query(SourceDocument)
        .filter(
            SourceDocument.project_id == project_id,
            SourceDocument.sha256 == sha,
        )
        .first()
    )
    if existing:
        tmp_path.unlink()
        return existing

    final_name = f"{uuid.uuid4().hex}_{Path(file.filename).name}"
    final_path = uploads_dir / final_name
    tmp_path.rename(final_path)

    src = SourceDocument(
        id=uuid.uuid4().hex,
        project_id=project_id,
        original_name=file.filename,
        stored_path=str(final_path),
        file_type=suffix,
        file_size=final_path.stat().st_size,
        sha256=sha,
        parse_status="uploaded",
    )
    db.add(src)
    db.commit()
    db.refresh(src)
    audit_service.log(
        db, "upload", "source_document", src.id,
        result="success",
        payload_summary=f"{src.original_name} ({src.file_type})",
    )
    return src


def list_sources(db: Session, project_id: str) -> list[SourceDocument]:
    return db.query(SourceDocument).filter(SourceDocument.project_id == project_id).all()


def get_source(db: Session, source_id: str) -> SourceDocument:
    s = db.get(SourceDocument, source_id)
    if not s:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "SOURCE_NOT_FOUND", "message": f"资料 {source_id} 不存在"},
        )
    return s


def trigger_parse(db: Session, source_id: str) -> SourceDocument:
    from app.services.source_parser import parse_docx, parse_xlsx

    s = get_source(db, source_id)
    if s.parse_status == "parsing":
        return s

    s.parse_status = "parsing"
    db.commit()

    try:
        if s.file_type == "docx":
            items, image_count = parse_docx(s.stored_path)
        else:
            items, image_count = parse_xlsx(s.stored_path)

        # Remove stale parsed content
        db.query(ParsedSourceContent).filter(
            ParsedSourceContent.source_document_id == source_id
        ).delete()

        for item in items:
            db.add(ParsedSourceContent(source_document_id=source_id, **item))

        s.parse_status = "parsed"
        s.image_count = image_count
        s.parsed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        s.parse_error = None
    except Exception as e:
        s.parse_status = "parse_failed"
        s.parse_error = str(e)[:1000]

    db.commit()
    db.refresh(s)
    audit_service.log(
        db, "parse", "source_document", s.id,
        result="success" if s.parse_status == "parsed" else "failed",
        payload_summary=s.original_name,
        error_message=s.parse_error,
    )
    return s


def get_content(db: Session, source_id: str) -> list[ParsedSourceContent]:
    get_source(db, source_id)
    return (
        db.query(ParsedSourceContent)
        .filter(ParsedSourceContent.source_document_id == source_id)
        .order_by(ParsedSourceContent.order_index)
        .all()
    )
