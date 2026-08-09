"""Render confirmed chapter content into a copy of the Word template.

This walks each chapter's `content_json` (the same ProseMirror JSON that
Tiptap renders on screen in ContentPanel.vue) node by node, so the exported
DOCX reproduces the same headings, bold/highlight runs, bullet lists and
tables the user sees in the editor — instead of the previous behavior of
dumping `chapter.plain_text` (raw markdown-ish text with literal "##",
"**bold**", "| a | b |" that was never parsed) as flat unstyled paragraphs.
"""
import json
import shutil
from pathlib import Path
from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Mm
from app.config import get_storage_path
from app.services.export_fonts import get_export_font_config

EXPORT_FONTS = get_export_font_config()
DEFAULT_LATIN_FONT = EXPORT_FONTS.latin
DEFAULT_EAST_ASIA_FONT = EXPORT_FONTS.cjk
DEFAULT_COMPLEX_SCRIPT_FONT = EXPORT_FONTS.cjk


def render_to_docx(doc_id: str, chapters: list, template_source_path: str | None) -> str:
    """Write confirmed chapter content into a copy of the Word template."""
    out_dir = get_storage_path("generated") / doc_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "output.docx"

    if template_source_path and Path(template_source_path).exists():
        shutil.copy2(template_source_path, out_path)
        doc = Document(str(out_path))
        _configure_styles(doc)
        _inject_into_template(doc, chapters)
    else:
        doc = Document()
        _build_from_scratch(doc, chapters)

    doc.save(str(out_path))
    return str(out_path)


def _inject_into_template(doc: Document, chapters: list):
    """Find each chapter's heading paragraph in the template and insert the
    chapter's rendered content (headings/paragraphs/lists/tables) after it."""
    for chapter in chapters:
        nodes = _nodes_for_template(chapter)
        if not nodes:
            continue
        for para in doc.paragraphs:
            if chapter.title in para.text and para.style.name.startswith("Heading"):
                _insert_nodes_after(doc, para, nodes)
                break


def _build_from_scratch(doc: Document, chapters: list):
    """Fallback used when the target template file is unavailable."""
    _configure_generated_document(doc, chapters)
    for chapter in chapters:
        heading = doc.add_heading(chapter.title, level=1)
        _style_generated_heading(heading)
        for node in _chapter_nodes(chapter):
            _append_node(doc, node)


def _chapter_nodes(chapter) -> list[dict]:
    """Return the ProseMirror content nodes for a chapter, plus a trailing
    highlighted note for any missing-information / conflict items — mirroring
    exactly what ContentPanel.vue shows on screen (missingItems/conflictItems
    alert boxes + the Tiptap-rendered content_json body)."""
    nodes: list[dict] = []
    if chapter.content_json:
        try:
            parsed = json.loads(chapter.content_json)
            nodes.extend(parsed.get("content", []))
        except (json.JSONDecodeError, AttributeError):
            pass
    if not nodes and chapter.plain_text:
        nodes.append({"type": "paragraph", "content": [{"type": "text", "text": chapter.plain_text}]})

    missing = _safe_json_list(getattr(chapter, "missing_information_json", None))
    if missing:
        nodes.append(_notice_node("待补充：", '; '.join(str(item) for item in missing[:5])))

    conflicts = _safe_json_list(getattr(chapter, "conflict_json", None))
    if conflicts:
        descriptions = [_conflict_detail(conflict) for conflict in conflicts]
        descriptions = [description for description in descriptions if description]
        if descriptions:
            nodes.append(_notice_node("内容冲突：", '; '.join(descriptions[:5]), kind="conflict"))

    if not nodes:
        nodes.append({"type": "paragraph", "content": [{"type": "text", "text": "（内容待生成）"}]})
    return nodes


def _conflict_detail(entry) -> str:
    if isinstance(entry, dict):
        detail = (
            entry.get("description")
            or entry.get("title")
            or entry.get("name")
            or json.dumps(entry, ensure_ascii=False)
        )
    elif entry is None:
        return ""
    else:
        detail = str(entry).strip()
    return str(detail).strip()


def _notice_node(label: str, detail: str, kind: str = "missing") -> dict:
    return {
        "type": "paragraph",
        "attrs": {"notice_kind": kind},
        "content": [
            {"type": "text", "marks": [{"type": "highlight"}, {"type": "bold"}], "text": f"【{label}"},
            {"type": "text", "marks": [{"type": "highlight"}], "text": f"{detail}】"},
        ],
    }


def _insert_nodes_after(doc: Document, heading_para, nodes: list[dict]):
    """Render each node by appending it to the end of `doc` (via the normal
    high-level python-docx API, so styles/borders/runs are built correctly),
    then detach it from the body and re-insert it right after the heading in
    document order."""
    anchor = heading_para._element
    for node in nodes:
        for element in _render_node_elements(doc, node):
            element.getparent().remove(element)
            anchor.addnext(element)
            anchor = element


def _append_node(doc: Document, node: dict):
    for element in _render_node_elements(doc, node):
        pass  # already appended to doc; nothing further to do in from-scratch mode


def _render_node_elements(doc: Document, node: dict) -> list:
    """Append `node` to the end of `doc` using python-docx's high-level API
    and return the created XML element(s), in document order."""
    node_type = node.get("type")

    if node_type == "heading":
        level = min(node.get("attrs", {}).get("level", 1), 3)
        para = doc.add_paragraph(style=f"Heading {level}")
        _add_runs(para, node.get("content", []))
        _style_generated_heading(para)
        return [para._element]

    if node_type == "paragraph":
        para = doc.add_paragraph()
        _add_runs(para, node.get("content", []))
        _style_paragraph(para)
        if node.get("attrs", {}).get("notice_kind"):
            _style_notice(para, node["attrs"]["notice_kind"])
        return [para._element]

    if node_type == "bulletList":
        elements = []
        for item in node.get("content", []):
            for inner in item.get("content", []):
                para = doc.add_paragraph()
                bullet_run = para.add_run("• ")
                _style_run_font(bullet_run)
                _add_runs(para, inner.get("content", []))
                elements.append(para._element)
        return elements

    if node_type == "table":
        return [_render_table(doc, node)]

    # Unsupported node types (e.g. horizontalRule) fall back to an empty
    # paragraph rather than raising, so one odd node never breaks the export.
    return [doc.add_paragraph()._element]


def _add_runs(paragraph, inline_content: list[dict]):
    for run_node in inline_content:
        text = run_node.get("text", "")
        if not text:
            continue
        marks = {m.get("type") for m in run_node.get("marks", [])}
        run = paragraph.add_run(text)
        _style_run_font(run)
        if "bold" in marks:
            run.bold = True
        if "italic" in marks:
            run.italic = True
        if "highlight" in marks:
            run.font.highlight_color = WD_COLOR_INDEX.YELLOW


def _render_table(doc: Document, node: dict):
    rows = node.get("content", [])
    if not rows:
        return doc.add_paragraph()._element

    n_cols = max(len(r.get("content", [])) for r in rows)
    table = doc.add_table(rows=len(rows), cols=n_cols)
    _set_table_borders(table)

    for r, row_node in enumerate(rows):
        is_header_row = row_node.get("content", [{}])[0].get("type") == "tableHeader"
        for c, cell_node in enumerate(row_node.get("content", [])):
            cell = table.cell(r, c)
            cell.text = ""
            cell_para = cell.paragraphs[0]
            _style_paragraph(cell_para)
            for cell_content in cell_node.get("content", []):
                _add_runs(cell_para, cell_content.get("content", []))
            if is_header_row:
                for run in cell_para.runs:
                    run.bold = True
                _shade_cell(cell, "D9E2F3")

    _style_table(table)
    return table._element


def _style_table(table):
    """Apply borders and bounded proportional widths.

    Widths are distributed from a fixed printable width budget so narrow
    identifier columns stay compact while longer text columns receive more
    room without depending on renderer-specific autofit heuristics.
    """
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    n_cols = max(len(row.cells) for row in table.rows) if table.rows else 1
    total_width = Cm(16.5)
    col_widths = _proportional_column_widths(table, total_width)
    for row in table.rows:
        for index, cell in enumerate(row.cells):
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            cell.width = col_widths[index]
            _set_cell_width(cell, col_widths[index])
            _set_cell_margins(cell, top=90, start=100, bottom=90, end=100)


def _set_table_borders(table):
    """The scenario1 target template has no 'Table Grid' style defined, so
    borders are applied directly via OOXML (0.5pt on every edge) to match
    the visual table styling used in ContentPanel.vue's word-body CSS."""
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    existing = tbl_pr.find(qn("w:tblBorders"))
    if existing is not None:
        tbl_pr.remove(existing)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "333333")
        borders.append(el)
    tbl_pr.append(borders)


def _nodes_for_template(chapter) -> list[dict]:
    nodes = _chapter_nodes(chapter)
    while nodes and nodes[0].get("type") == "heading":
        heading_text = _node_text(nodes[0]).strip()
        if heading_text and heading_text == getattr(chapter, "title", "").strip():
            nodes = nodes[1:]
            continue
        break
    return nodes


def _configure_generated_document(doc: Document, chapters: list):
    section = doc.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    for attr in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(section, attr, Cm(2))
    section.footer_distance = Cm(1.2)

    title = " / ".join(ch.title for ch in chapters if getattr(ch, "title", None))
    doc.core_properties.title = title or "导出文档"

    _configure_styles(doc)
    _ensure_footer_page_field(section)


def _configure_styles(doc: Document):
    for style_name in ("Normal", "Heading 1", "Heading 2", "Heading 3"):
        style = doc.styles[style_name]
        style.font.name = DEFAULT_LATIN_FONT
        r_pr = _ensure_child(style._element, "w:rPr")
        r_fonts = _ensure_child(r_pr, "w:rFonts")
        r_fonts.set(qn("w:ascii"), DEFAULT_LATIN_FONT)
        r_fonts.set(qn("w:hAnsi"), DEFAULT_LATIN_FONT)
        r_fonts.set(qn("w:eastAsia"), DEFAULT_EAST_ASIA_FONT)
        r_fonts.set(qn("w:cs"), DEFAULT_COMPLEX_SCRIPT_FONT)


def _style_run_font(run):
    run.font.name = DEFAULT_LATIN_FONT
    r_pr = _ensure_child(run._r, "w:rPr")
    r_fonts = _ensure_child(r_pr, "w:rFonts")
    r_fonts.set(qn("w:ascii"), DEFAULT_LATIN_FONT)
    r_fonts.set(qn("w:hAnsi"), DEFAULT_LATIN_FONT)
    r_fonts.set(qn("w:eastAsia"), DEFAULT_EAST_ASIA_FONT)
    r_fonts.set(qn("w:cs"), DEFAULT_COMPLEX_SCRIPT_FONT)


def _style_generated_heading(paragraph):
    paragraph.paragraph_format.space_before = Mm(6)
    paragraph.paragraph_format.space_after = Mm(3)
    paragraph.paragraph_format.keep_with_next = True
    for run in paragraph.runs:
        _style_run_font(run)


def _style_paragraph(paragraph):
    paragraph.paragraph_format.space_after = Mm(2)


def _style_notice(paragraph, kind: str):
    paragraph.paragraph_format.space_before = Mm(2)
    paragraph.paragraph_format.space_after = Mm(2)
    p_pr = _ensure_child(paragraph._element, "w:pPr")
    _append_border_block(
        p_pr,
        "w:pBdr",
        color="C00000" if kind == "conflict" else "C9A227",
    )
    shd = p_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        p_pr.append(shd)
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), "FDE9D9" if kind == "conflict" else "FFF2CC")


def _shade_cell(cell, fill: str):
    tc_pr = _ensure_child(cell._tc, "w:tcPr")
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)


def _set_cell_margins(cell, top: int, start: int, bottom: int, end: int):
    tc_pr = _ensure_child(cell._tc, "w:tcPr")
    tc_mar = tc_pr.find(qn("w:tcMar"))
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for edge, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        el = tc_mar.find(qn(f"w:{edge}"))
        if el is None:
            el = OxmlElement(f"w:{edge}")
            tc_mar.append(el)
        el.set(qn("w:w"), str(value))
        el.set(qn("w:type"), "dxa")


def _set_cell_width(cell, width: int):
    tc_pr = _ensure_child(cell._tc, "w:tcPr")
    tc_w = tc_pr.find(qn("w:tcW"))
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    tc_w.set(qn("w:w"), str(width))
    tc_w.set(qn("w:type"), "dxa")


def _proportional_column_widths(table, total_width):
    n_cols = max(len(row.cells) for row in table.rows) if table.rows else 1
    text_weights = [1] * n_cols
    for col_index in range(n_cols):
        col_text_length = max(
            (len((row.cells[col_index].text or "").strip()) for row in table.rows if col_index < len(row.cells)),
            default=1,
        )
        text_weights[col_index] = max(1, min(col_text_length, 8))

    total_weight = sum(text_weights) or n_cols
    min_width = int(total_width * 0.18)
    remaining_width = max(int(total_width) - (min_width * n_cols), 0)
    widths = []
    for weight in text_weights:
        proportional_extra = int(remaining_width * weight / total_weight) if remaining_width else 0
        widths.append(min_width + proportional_extra)

    width_delta = int(total_width) - sum(widths)
    if widths and width_delta:
        widths[-1] += width_delta
    return widths


def _safe_json_list(raw_value) -> list:
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return []
    return parsed if isinstance(parsed, list) else []


def _ensure_footer_page_field(section):
    footer = section.footer
    paragraph = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    paragraph.alignment = 1
    if "PAGE" in paragraph._element.xml:
        return

    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")

    run = paragraph.add_run()
    _style_run_font(run)
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_sep)
    run._r.append(fld_end)


def _append_border_block(parent, tag_name: str, color: str):
    border_block = parent.find(qn(tag_name))
    if border_block is None:
        border_block = OxmlElement(tag_name)
        parent.append(border_block)
    for edge in ("top", "left", "bottom", "right"):
        edge_el = border_block.find(qn(f"w:{edge}"))
        if edge_el is None:
            edge_el = OxmlElement(f"w:{edge}")
            border_block.append(edge_el)
        edge_el.set(qn("w:val"), "single")
        edge_el.set(qn("w:sz"), "6")
        edge_el.set(qn("w:space"), "2")
        edge_el.set(qn("w:color"), color)


def _ensure_child(parent, tag_name: str):
    child = parent.find(qn(tag_name))
    if child is None:
        child = OxmlElement(tag_name)
        parent.append(child)
    return child


def _node_text(node: dict) -> str:
    parts: list[str] = []
    for child in node.get("content", []):
        if child.get("type") == "text":
            parts.append(child.get("text", ""))
        else:
            parts.append(_node_text(child))
    return "".join(parts)
