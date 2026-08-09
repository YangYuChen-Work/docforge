import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.models import GeneratedDocument, DocumentChapter, Export, DocumentTemplate
from app.services.validator import validate_document
from app.services.docx_renderer import render_to_docx
from app.services import audit_service


def create_export(db: Session, doc_id: str, fmt: str) -> Export:
    doc = db.get(GeneratedDocument, doc_id)
    if not doc:
        raise HTTPException(404, {"error_code": "DOCUMENT_NOT_FOUND"})

    chapters = (
        db.query(DocumentChapter)
        .filter(DocumentChapter.document_id == doc_id)
        .order_by(DocumentChapter.order_index)
        .all()
    )
    tpl = db.get(DocumentTemplate, doc.template_id)

    validation = validate_document(chapters, tpl.source_path if tpl else None)
    if not validation["can_export"]:
        audit_service.log(
            db, "export", "generated_document", doc_id,
            result="failed",
            payload_summary=f"format={fmt}",
            error_message="导出前校验未通过: " + "; ".join(validation["errors"][:3]),
        )
        raise HTTPException(
            400,
            {
                "error_code": "VALIDATION_FAILED",
                "message": "导出前校验未通过",
                "validation_report": validation,
            },
        )

    export = Export(
        id=uuid.uuid4().hex,
        document_id=doc_id,
        format=fmt,
        status="running",
        has_missing_info=validation["has_missing_info"],
        validation_report=json.dumps(validation, ensure_ascii=False),
    )
    db.add(export)
    db.commit()

    try:
        template_path = tpl.source_path if tpl else None
        if fmt == "docx":
            path = render_to_docx(doc_id, chapters, template_path)
        elif fmt == "pdf":
            docx_path = render_to_docx(doc_id, chapters, template_path)
            from app.services.pdf_exporter import convert_to_pdf
            path = convert_to_pdf(docx_path)
        elif fmt == "xlsx":
            from app.services.xlsx_exporter import export_tables_to_xlsx
            document_meta = {
                "title": doc.title,
                "project_id": doc.project_id,
                "template_name": tpl.name if tpl else "",
                "status": doc.status,
                "missing_items": _collect_issue_summary(chapters, "missing_information_json"),
                "conflicts": _collect_issue_summary(chapters, "conflict_json"),
            }
            path = export_tables_to_xlsx(doc_id, chapters, document_meta)
        else:
            raise ValueError(f"不支持的导出格式: {fmt}")

        export.output_path = path
        export.file_size = Path(path).stat().st_size
        export.status = "completed"
        export.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        doc.output_path = path
    except Exception as e:
        export.status = "failed"
        export.error_message = str(e)[:500]

    db.commit()
    db.refresh(export)
    audit_service.log(
        db, "export", "generated_document", doc_id,
        result="success" if export.status == "completed" else "failed",
        payload_summary=f"format={fmt} export_id={export.id}",
        error_message=export.error_message,
    )
    return export


def _collect_issue_summary(chapters: list, field_name: str) -> list[str]:
    items: list[str] = []
    for chapter in chapters:
        raw = getattr(chapter, field_name, None)
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            continue
        if not isinstance(data, list):
            continue
        for entry in data:
            text = _to_concise_text(entry)
            if text and text not in items:
                items.append(text)
            if len(items) >= 5:
                return items
    return items


def _to_concise_text(entry) -> str:
    if isinstance(entry, dict):
        value = (
            entry.get("description")
            or entry.get("title")
            or entry.get("name")
            or entry
        )
    else:
        value = entry
    text = _normalize_metadata_text(value)
    if len(text) > 80:
        return text[:77] + "..."
    return text


def _normalize_metadata_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple, set, dict)):
        try:
            return json.dumps(value, ensure_ascii=False, default=str).strip()
        except (TypeError, ValueError, RecursionError):
            pass
    return str(value).strip()
