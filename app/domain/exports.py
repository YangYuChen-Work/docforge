import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.models import GeneratedDocument, DocumentChapter, Export, DocumentTemplate
from app.services.validator import validate_document
from app.services.docx_renderer import render_to_docx


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
            path = export_tables_to_xlsx(doc_id, chapters)
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
    return export
