import json
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.ai.base import ChapterGenerationRequest
from app.db.models import DocumentChapter, ParsedSourceContent, Citation, SourceDocument


def _load_source_data(db: Session, source_ids: list[str]) -> dict[str, dict]:
    result = {}
    for sid in source_ids:
        src = db.get(SourceDocument, sid)
        if not src or src.parse_status != "parsed":
            continue
        contents = (
            db.query(ParsedSourceContent)
            .filter(ParsedSourceContent.source_document_id == sid)
            .order_by(ParsedSourceContent.order_index)
            .all()
        )
        result[sid] = {
            "id": sid,
            "original_name": src.original_name,
            "content_texts": [c.content_text for c in contents if c.content_text],
            "structured_tables": [
                json.loads(c.structured_value)
                for c in contents
                if c.content_type == "table" and c.structured_value
            ],
        }
    return result


def generate_chapter(
    db: Session,
    chapter: DocumentChapter,
    template_chapter: dict,
    source_ids: list[str],
    project_info: dict,
    provider,
    user_instruction: str | None = None,
) -> DocumentChapter:
    from app.services.material_matcher import compute_match_status, extract_relevant_excerpts

    source_data = _load_source_data(db, source_ids)
    sources_list = list(source_data.values())

    match_status = compute_match_status(template_chapter, sources_list)
    chapter.match_status = match_status

    excerpts = extract_relevant_excerpts(chapter.title, sources_list, max_chars=3000)
    tables: list[dict] = []
    for src in sources_list:
        tables.extend(src.get("structured_tables", []))

    known_missing: list[str] = []
    if match_status == "unmatched":
        mat = template_chapter.get("material_types", "")
        known_missing.append(f'缺少与"{chapter.title}"相关的资料（期望：{mat}）')

    request = ChapterGenerationRequest(
        chapter_id=chapter.id,
        chapter_title=chapter.title,
        gen_instruction=template_chapter.get("gen_instruction"),
        project_info=project_info,
        matched_excerpts=excerpts,
        structured_tables=tables[:5],
        user_instruction=user_instruction,
        known_missing=known_missing,
    )

    chapter.status = "generating"
    chapter.generated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    try:
        result = provider.generate_chapter(request)

        # Save citations
        for cit in result.citations:
            db.add(
                Citation(
                    id=uuid.uuid4().hex,
                    chapter_id=chapter.id,
                    source_document_id=cit.source_document_id,
                    locator=cit.locator,
                    source_excerpt=cit.quote_or_summary,
                    citation_type="summary",
                )
            )

        # Build ProseMirror JSON for Tiptap rendering
        content_json = _text_to_prosemirror(result.content)

        chapter.plain_text = result.content
        chapter.content_json = json.dumps(content_json, ensure_ascii=False)
        chapter.missing_information_json = json.dumps(
            result.missing_information, ensure_ascii=False
        )
        chapter.conflict_json = json.dumps(
            [{"description": c.description, "sources": c.sources} for c in result.conflicts],
            ensure_ascii=False,
        )
        chapter.status = "needs_material" if result.missing_information else "generated"
        chapter.error_message = None
    except Exception as e:
        chapter.status = "failed"
        chapter.error_message = str(e)[:500]

    db.commit()
    db.refresh(chapter)
    return chapter


def _text_to_prosemirror(text: str) -> dict:
    """Convert plain text (with optional markdown-style headers) to ProseMirror JSON."""
    nodes = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("# "):
            nodes.append({
                "type": "heading",
                "attrs": {"level": 1},
                "content": [{"type": "text", "text": line[2:]}],
            })
        elif line.startswith("## "):
            nodes.append({
                "type": "heading",
                "attrs": {"level": 2},
                "content": [{"type": "text", "text": line[3:]}],
            })
        elif line.startswith("【") and ("待补充" in line or "资料缺失" in line or "Mock" in line):
            nodes.append({
                "type": "paragraph",
                "content": [{
                    "type": "text",
                    "marks": [{"type": "highlight", "attrs": {"color": "#fef3c7"}}],
                    "text": line,
                }],
            })
        else:
            nodes.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": line}],
            })
    if not nodes:
        nodes.append({"type": "paragraph", "content": [{"type": "text", "text": "（内容待生成）"}]})
    return {"type": "doc", "content": nodes}
