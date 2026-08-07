import json
import shutil
from pathlib import Path
from docx import Document
from docx.oxml import OxmlElement
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
    """Find each chapter's heading paragraph in the template and insert content after it."""
    for chapter in chapters:
        content_text = _build_chapter_text(chapter)
        if not content_text:
            continue
        for i, para in enumerate(doc.paragraphs):
            if chapter.title in para.text and para.style.name.startswith("Heading"):
                _insert_paragraph_after(doc, para, content_text)
                break


def _build_chapter_text(chapter) -> str:
    missing = json.loads(chapter.missing_information_json or "[]")
    text = chapter.plain_text or ""
    if missing:
        text += f"\n\n【待补充：{'; '.join(missing[:3])}】"
    if not text.strip():
        text = "（内容待生成）"
    return text


def _insert_paragraph_after(doc: Document, heading_para, content: str):
    body = doc.element.body
    idx = list(body).index(heading_para._element)
    for line in reversed(content.split("\n")):
        line = line.strip()
        if not line:
            continue
        new_para = OxmlElement("w:p")
        new_run = OxmlElement("w:r")
        new_text = OxmlElement("w:t")
        new_text.text = line[:5000]
        new_text.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        new_run.append(new_text)
        new_para.append(new_run)
        body.insert(idx + 1, new_para)


def _build_from_scratch(doc: Document, chapters: list):
    for chapter in chapters:
        doc.add_heading(chapter.title, level=1)
        doc.add_paragraph(_build_chapter_text(chapter))
