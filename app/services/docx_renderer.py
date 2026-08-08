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
from docx.enum.text import WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from app.config import get_storage_path


def render_to_docx(doc_id: str, chapters: list, template_source_path: str | None) -> str:
    """Write confirmed chapter content into a copy of the Word template."""
    out_dir = get_storage_path("generated") / doc_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "output.docx"

    if template_source_path and Path(template_source_path).exists():
        shutil.copy2(template_source_path, out_path)
        doc = Document(str(out_path))
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
        nodes = _chapter_nodes(chapter)
        if not nodes:
            continue
        for para in doc.paragraphs:
            if chapter.title in para.text and para.style.name.startswith("Heading"):
                _insert_nodes_after(doc, para, nodes)
                break


def _build_from_scratch(doc: Document, chapters: list):
    """Fallback used when the target template file is unavailable."""
    for chapter in chapters:
        doc.add_heading(chapter.title, level=1)
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

    missing = json.loads(chapter.missing_information_json or "[]")
    if missing:
        nodes.append(_highlighted_note(f"待补充：{'; '.join(missing[:5])}"))

    conflicts = json.loads(getattr(chapter, "conflict_json", None) or "[]")
    if conflicts:
        descriptions = [c.get("description", "") for c in conflicts if c.get("description")]
        if descriptions:
            nodes.append(_highlighted_note(f"内容冲突：{'; '.join(descriptions[:5])}"))

    if not nodes:
        nodes.append({"type": "paragraph", "content": [{"type": "text", "text": "（内容待生成）"}]})
    return nodes


def _highlighted_note(text: str) -> dict:
    return {
        "type": "paragraph",
        "content": [{"type": "text", "marks": [{"type": "highlight"}], "text": f"【{text}】"}],
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
        return [para._element]

    if node_type == "paragraph":
        para = doc.add_paragraph()
        _add_runs(para, node.get("content", []))
        return [para._element]

    if node_type == "bulletList":
        elements = []
        for item in node.get("content", []):
            for inner in item.get("content", []):
                para = doc.add_paragraph()
                para.add_run("• ")
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
            for cell_content in cell_node.get("content", []):
                _add_runs(cell_para, cell_content.get("content", []))
            if is_header_row:
                for run in cell_para.runs:
                    run.bold = True

    return table._element


def _set_table_borders(table):
    """The scenario1 target template has no 'Table Grid' style defined, so
    borders are applied directly via OOXML (0.5pt on every edge) to match
    the visual table styling used in ContentPanel.vue's word-body CSS."""
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "333333")
        borders.append(el)
    tbl_pr.append(borders)
