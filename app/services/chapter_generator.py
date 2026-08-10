import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.ai.base import ChapterGenerationRequest, ChapterGenerationResult
from app.db.models import DocumentChapter, ParsedSourceContent, Citation, SourceDocument


@dataclass
class PreparedChapterGeneration:
    """Prepared provider input plus the provenance needed for persistence."""

    chapter_id: str
    request: ChapterGenerationRequest
    generation_context: list[dict]
    valid_source_ids: set[str]
    context_rows: list[dict]
    match_status: str
    known_missing: list[str]


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
        table_entries = [
            {
                "table": json.loads(c.structured_value),
                "context": {
                    "source_id": sid,
                    "source_name": src.original_name,
                    "locator": c.locator,
                    "excerpt": c.structured_value,
                },
            }
            for c in contents
            if c.content_type == "table" and c.structured_value
        ]
        result[sid] = {
            "id": sid,
            "original_name": src.original_name,
            "content_texts": [c.content_text for c in contents if c.content_text],
            "content_items": [
                {"text": c.content_text, "locator": c.locator}
                for c in contents
                if c.content_text
            ],
            "structured_tables": [entry["table"] for entry in table_entries],
            "structured_table_contexts": [entry["context"] for entry in table_entries],
            "structured_table_entries": table_entries,
        }
    return result


def _build_citation_records(
    result: ChapterGenerationResult,
    matched_excerpts: list[dict],
    valid_source_ids: set[str],
) -> tuple[list[dict], list[str]]:
    """Build explicit citations or preserve the exact context sent to the AI."""
    missing = list(result.missing_information or [])
    invalid_citations = [
        cit
        for cit in (result.citations or [])
        if cit.source_document_id not in valid_source_ids
    ]
    valid_citations = [
        cit
        for cit in (result.citations or [])
        if cit.source_document_id in valid_source_ids
    ]

    if invalid_citations:
        warning = "AI 返回了超出当前来源范围的引用，以下记录已降级为本次生成使用的参考上下文，请补充明确引用。"
        if warning not in missing:
            missing.append(warning)
        context_rows, _ = _build_context_citation_records(
            matched_excerpts,
            valid_source_ids,
        )
        if not context_rows:
            missing.append("本章未匹配到可用来源，AI 生成内容缺少可核验引用。")
        return context_rows, missing

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

    context_rows, context_missing = _build_context_citation_records(
        matched_excerpts,
        valid_source_ids,
    )
    for message in context_missing:
        if message not in missing:
            missing.append(message)

    return context_rows, missing


def _build_context_citation_records(
    matched_excerpts: list[dict],
    valid_source_ids: set[str],
) -> tuple[list[dict], list[str]]:
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
    return context_rows, [message]


def _chapter_title_terms(chapter_title: str) -> list[str]:
    normalized = (
        chapter_title.replace("（", " ")
        .replace("）", " ")
        .replace("/", " ")
        .replace("、", " ")
    )
    return [term.strip().lower() for term in normalized.split() if len(term.strip()) >= 2]


def _select_relevant_table_entries(
    chapter_title: str,
    material_types: str,
    sources: list[dict],
    limit: int = 5,
) -> list[dict]:
    material_terms = [
        term.strip().lower()
        for term in material_types.split(",")
        if term.strip()
    ]
    title_terms = _chapter_title_terms(chapter_title)
    selected = []

    for src in sources:
        source_name = (src.get("original_name") or "").lower()
        if material_terms:
            matches_source = any(term in source_name for term in material_terms)
        else:
            matches_source = any(term in source_name for term in title_terms)
        if not matches_source:
            continue
        selected.extend(src.get("structured_table_entries", []))
        if len(selected) >= limit:
            return selected[:limit]

    return selected[:limit]


def _build_filename_matched_fallback_excerpts(
    material_types: str,
    sources: list[dict],
    max_chars: int = 1200,
    max_items: int = 3,
) -> list[dict]:
    material_terms = [
        term.strip().lower()
        for term in (material_types or "").split(",")
        if term.strip()
    ]
    if not material_terms:
        return []

    fallback_excerpts = []
    total_chars = 0

    for src in sources:
        source_name = (src.get("original_name") or "").lower()
        if not any(term in source_name for term in material_terms):
            continue

        for item in src.get("content_items", []):
            text = (item.get("text") or "").strip()
            if len(text) < 4:
                continue
            remaining_chars = max_chars - total_chars
            if remaining_chars <= 0:
                return fallback_excerpts
            excerpt = text[: min(500, remaining_chars)]
            fallback_excerpts.append(
                {
                    "source_id": src["id"],
                    "source_name": src["original_name"],
                    "locator": item.get("locator"),
                    "excerpt": excerpt,
                    "relevance": 0,
                }
            )
            total_chars += len(excerpt)
            if len(fallback_excerpts) >= max_items:
                return fallback_excerpts

    return fallback_excerpts


def _mark_chapter_failed(db: Session, chapter: DocumentChapter, error: Exception) -> DocumentChapter:
    db.rollback()
    failed_chapter = db.get(DocumentChapter, chapter.id) or chapter
    failed_chapter.status = "failed"
    failed_chapter.error_message = str(error)[:500]
    db.commit()
    db.refresh(failed_chapter)
    return failed_chapter


def generate_chapter(
    db: Session,
    chapter: DocumentChapter,
    template_chapter: dict,
    source_ids: list[str],
    project_info: dict,
    provider,
    user_instruction: str | None = None,
) -> DocumentChapter:
    try:
        return _generate_chapter(
            db,
            chapter,
            template_chapter,
            source_ids,
            project_info,
            provider,
            user_instruction,
        )
    except Exception as error:
        return _mark_chapter_failed(db, chapter, error)


def _generate_chapter(
    db: Session,
    chapter: DocumentChapter,
    template_chapter: dict,
    source_ids: list[str],
    project_info: dict,
    provider,
    user_instruction: str | None = None,
) -> DocumentChapter:
    prepared = prepare_chapter_generation(
        db,
        chapter,
        template_chapter,
        source_ids,
        project_info,
        user_instruction=user_instruction,
    )
    initialize_chapter_generation(db, chapter, prepared)
    db.commit()
    result = provider.generate_chapter(prepared.request)

    return persist_chapter_result(db, chapter, prepared, result)


def prepare_chapter_generation(
    db: Session,
    chapter: DocumentChapter,
    template_chapter: dict,
    source_ids: list[str],
    project_info: dict,
    user_instruction: str | None = None,
    source_data: dict[str, dict] | None = None,
) -> PreparedChapterGeneration:
    """Build a chapter request from parsed sources.

    ``source_data`` is optional for the single-chapter API. The task runner
    passes one preloaded snapshot so every chapter avoids re-reading the same
    parsed source rows from SQLite.
    """
    from app.services.material_matcher import compute_match_status, extract_relevant_excerpts

    source_data = source_data if source_data is not None else _load_source_data(db, source_ids)
    sources_list = list(source_data.values())
    match_status = compute_match_status(template_chapter, sources_list)

    excerpts = extract_relevant_excerpts(chapter.title, sources_list, max_chars=3000)
    if not excerpts:
        excerpts = _build_filename_matched_fallback_excerpts(
            template_chapter.get("material_types", ""),
            sources_list,
        )
    relevant_table_entries = _select_relevant_table_entries(
        chapter.title,
        template_chapter.get("material_types", ""),
        sources_list,
    )
    tables = [entry["table"] for entry in relevant_table_entries]
    table_contexts = [entry["context"] for entry in relevant_table_entries]
    generation_context = excerpts + table_contexts
    valid_source_ids = {
        source_id
        for source_id in (row.get("source_id") for row in generation_context)
        if source_id
    }
    context_rows, _ = _build_context_citation_records(
        generation_context,
        valid_source_ids,
    )

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
        structured_tables=tables,
        user_instruction=user_instruction,
        known_missing=known_missing,
    )
    return PreparedChapterGeneration(
        chapter_id=chapter.id,
        request=request,
        generation_context=generation_context,
        valid_source_ids=valid_source_ids,
        context_rows=context_rows,
        match_status=match_status,
        known_missing=known_missing,
    )


def initialize_chapter_generation(
    db: Session,
    chapter: DocumentChapter,
    prepared: PreparedChapterGeneration,
) -> None:
    """Mark a chapter running and expose its exact input context."""
    db.query(Citation).filter(Citation.chapter_id == chapter.id).delete(
        synchronize_session=False
    )
    for row in prepared.context_rows:
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
    chapter.match_status = prepared.match_status
    chapter.status = "generating"
    chapter.generated_at = datetime.now(timezone.utc).replace(tzinfo=None)


def persist_chapter_result(
    db: Session,
    chapter: DocumentChapter,
    prepared: PreparedChapterGeneration,
    result: ChapterGenerationResult,
) -> DocumentChapter:
    """Validate and persist one provider result on the coordinator thread."""
    citation_rows, missing_information = _build_citation_records(
        result,
        prepared.generation_context,
        prepared.valid_source_ids,
    )

    db.query(Citation).filter(Citation.chapter_id == chapter.id).delete(
        synchronize_session=False
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

    for known_item in prepared.known_missing:
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
