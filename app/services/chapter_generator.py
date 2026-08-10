import json
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.ai.base import ChapterGenerationRequest, ChapterGenerationResult
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
            "content_items": [
                {"text": c.content_text, "locator": c.locator}
                for c in contents
                if c.content_text
            ],
            "structured_tables": [
                json.loads(c.structured_value)
                for c in contents
                if c.content_type == "table" and c.structured_value
            ],
            "structured_table_contexts": [
                {
                    "source_id": sid,
                    "source_name": src.original_name,
                    "locator": c.locator,
                    "excerpt": c.structured_value,
                }
                for c in contents
                if c.content_type == "table" and c.structured_value
            ],
        }
    return result


def _build_citation_records(
    result: ChapterGenerationResult,
    matched_excerpts: list[dict],
    valid_source_ids: set[str],
) -> tuple[list[dict], list[str]]:
    """Build explicit citations or preserve the exact context sent to the AI."""
    missing = list(result.missing_information or [])
    valid_citations = [
        cit
        for cit in (result.citations or [])
        if cit.source_document_id in valid_source_ids
    ]
    if valid_citations:
        return [
            {
                "source_document_id": cit.source_document_id,
                "locator": cit.locator,
                "source_excerpt": cit.quote_or_summary,
                "citation_type": "explicit",
            }
            for cit in valid_citations
        ], missing

    seen: set[tuple[str, str | None, str]] = set()
    context_rows = []
    for excerpt in matched_excerpts:
        source_id = excerpt.get("source_id")
        source_excerpt = (excerpt.get("excerpt") or "").strip()
        if source_id not in valid_source_ids or not source_excerpt:
            continue
        key = (source_id, excerpt.get("locator"), source_excerpt)
        if key in seen:
            continue
        seen.add(key)
        context_rows.append(
            {
                "source_document_id": source_id,
                "locator": excerpt.get("locator"),
                "source_excerpt": source_excerpt,
                "citation_type": "context",
            }
        )

    if context_rows:
        message = "AI 未返回有效引用；以下记录的是本次生成实际使用的参考上下文，请补充明确引用。"
    else:
        message = "本章未匹配到可用来源，AI 生成内容缺少可核验引用。"
    if message not in missing:
        missing.append(message)
    return context_rows, missing


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
    table_contexts: list[dict] = []
    for src in sources_list:
        tables.extend(src.get("structured_tables", []))
        table_contexts.extend(src.get("structured_table_contexts", []))
    generation_context = excerpts + table_contexts[:5]

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

    # Remove stale provenance before starting so the source panel cannot show
    # the previous generation while this one is in flight.
    db.query(Citation).filter(Citation.chapter_id == chapter.id).delete(
        synchronize_session=False
    )
    chapter.status = "generating"
    chapter.generated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    try:
        result = provider.generate_chapter(request)

        citation_rows, missing_information = _build_citation_records(
            result,
            generation_context,
            set(source_data),
        )
        for row in citation_rows:
            db.add(
                Citation(
                    id=uuid.uuid4().hex,
                    chapter_id=chapter.id,
                    source_document_id=row["source_document_id"],
                    locator=row["locator"],
                    source_excerpt=row["source_excerpt"],
                    citation_type=row["citation_type"],
                )
            )

        for known_item in known_missing:
            if known_item not in missing_information:
                missing_information.insert(0, known_item)

        # Build ProseMirror JSON for Tiptap rendering
        content_json = _result_to_prosemirror(result)

        chapter.plain_text = result.content
        chapter.content_json = json.dumps(content_json, ensure_ascii=False)
        chapter.missing_information_json = json.dumps(
            missing_information, ensure_ascii=False
        )
        chapter.conflict_json = json.dumps(
            [{"description": c.description, "sources": c.sources} for c in result.conflicts],
            ensure_ascii=False,
        )
        chapter.status = "needs_material" if missing_information else "generated"
        chapter.error_message = None
    except Exception as e:
        chapter.status = "failed"
        chapter.error_message = str(e)[:500]

    db.commit()
    db.refresh(chapter)
    return chapter


def _table_to_prosemirror(table) -> list[dict]:
    """将一个TableData转换为ProseMirror节点列表：一个caption段落 + 一个table节点。"""
    nodes = []
    if table.caption:
        nodes.append({
            "type": "paragraph",
            "content": [{"type": "text", "marks": [{"type": "bold"}], "text": table.caption}],
        })

    table_rows = []
    # 表头行
    if table.headers:
        header_cells = [
            {
                "type": "tableHeader",
                "attrs": {"colspan": 1, "rowspan": 1, "colwidth": None},
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": str(h)}] if h else []}],
            }
            for h in table.headers
        ]
        table_rows.append({"type": "tableRow", "content": header_cells})

    # 数据行
    for row in table.rows:
        cells = [
            {
                "type": "tableCell",
                "attrs": {"colspan": 1, "rowspan": 1, "colwidth": None},
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": str(cell)}] if cell else []}],
            }
            for cell in row
        ]
        table_rows.append({"type": "tableRow", "content": cells})

    if table_rows:
        nodes.append({"type": "table", "content": table_rows})
    return nodes


def _result_to_prosemirror(result) -> dict:
    """Convert AI result (markdown content + structured tables field) to ProseMirror JSON.

    The AI's `content` field may itself contain markdown tables/headings/bold text
    (some models emit tables inline even when also asked for a structured `tables`
    field), so markdown parsing runs first and any structured TableData objects are
    appended after — this can occasionally double up a table, which is preferable to
    losing structured data.
    """
    from app.services.markdown_to_prosemirror import parse_markdown_to_prosemirror

    nodes = parse_markdown_to_prosemirror(result.content)

    for table in result.tables:
        nodes.extend(_table_to_prosemirror(table))

    if not nodes:
        nodes.append({"type": "paragraph", "content": [{"type": "text", "text": "（内容待生成）"}]})
    return {"type": "doc", "content": nodes}
