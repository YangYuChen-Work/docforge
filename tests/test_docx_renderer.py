import json
from unittest.mock import MagicMock
from docx import Document
from app.services.docx_renderer import render_to_docx


def _ch(chapter_id, title, content_json, missing=None, conflicts=None):
    ch = MagicMock()
    ch.id = chapter_id
    ch.title = title
    ch.plain_text = "(unused fallback)"
    ch.content_json = json.dumps(content_json, ensure_ascii=False)
    ch.missing_information_json = json.dumps(missing or [], ensure_ascii=False)
    ch.conflict_json = json.dumps(conflicts or [], ensure_ascii=False)
    return ch


def _make_template(tmp_path, headings):
    """Build a minimal .docx with one Heading-1 paragraph per chapter title,
    mirroring the real target template's structure (heading, then body)."""
    doc = Document()
    for h in headings:
        doc.add_heading(h, level=1)
    path = tmp_path / "template.docx"
    doc.save(str(path))
    return str(path)


def test_heading_node_becomes_docx_heading_style(tmp_path):
    content = {"type": "doc", "content": [
        {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "市场需求分析"}]},
    ]}
    template = _make_template(tmp_path, ["产品概述"])
    out = render_to_docx("doc1", [_ch("c1", "产品概述", content)], template)
    doc = Document(out)
    headings = [p for p in doc.paragraphs if p.style.name == "Heading 2"]
    assert any(p.text == "市场需求分析" for p in headings)


def test_bold_mark_becomes_bold_run(tmp_path):
    content = {"type": "doc", "content": [
        {"type": "paragraph", "content": [
            {"type": "text", "marks": [{"type": "bold"}], "text": "表6 产品卖点和优势分析表"},
        ]},
    ]}
    template = _make_template(tmp_path, ["产品概述"])
    out = render_to_docx("doc1", [_ch("c1", "产品概述", content)], template)
    doc = Document(out)
    bold_runs = [r for p in doc.paragraphs for r in p.runs if r.bold]
    assert any(r.text == "表6 产品卖点和优势分析表" for r in bold_runs)


def test_table_node_becomes_real_docx_table(tmp_path):
    content = {"type": "doc", "content": [
        {"type": "table", "content": [
            {"type": "tableRow", "content": [
                {"type": "tableHeader", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "序号"}]}]},
                {"type": "tableHeader", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "类别"}]}]},
            ]},
            {"type": "tableRow", "content": [
                {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "1"}]}]},
                {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "臂架系统"}]}]},
            ]},
        ]},
    ]}
    template = _make_template(tmp_path, ["产品概述"])
    out = render_to_docx("doc1", [_ch("c1", "产品概述", content)], template)
    doc = Document(out)
    assert len(doc.tables) == 1
    table = doc.tables[0]
    assert table.rows[0].cells[0].text == "序号"
    assert table.rows[1].cells[1].text == "臂架系统"


def test_bullet_list_becomes_list_bullet_paragraphs(tmp_path):
    content = {"type": "doc", "content": [
        {"type": "bulletList", "content": [
            {"type": "listItem", "content": [{"type": "paragraph", "content": [
                {"type": "text", "marks": [{"type": "bold"}], "text": "卖点"},
                {"type": "text", "text": "：主臂采用五节U型截面"},
            ]}]},
        ]},
    ]}
    template = _make_template(tmp_path, ["产品概述"])
    out = render_to_docx("doc1", [_ch("c1", "产品概述", content)], template)
    doc = Document(out)
    bullet_paras = [p for p in doc.paragraphs if "卖点" in p.text]
    assert len(bullet_paras) == 1
    assert "主臂采用五节U型截面" in bullet_paras[0].text


def test_missing_information_appended_as_highlighted_paragraph(tmp_path):
    content = {"type": "doc", "content": [
        {"type": "paragraph", "content": [{"type": "text", "text": "正文内容"}]},
    ]}
    template = _make_template(tmp_path, ["产品概述"])
    out = render_to_docx(
        "doc1", [_ch("c1", "产品概述", content, missing=["下一年度销量预测"])], template
    )
    doc = Document(out)
    assert any("待补充" in p.text and "下一年度销量预测" in p.text for p in doc.paragraphs)


def test_empty_content_falls_back_to_placeholder_text(tmp_path):
    content = {"type": "doc", "content": []}
    template = _make_template(tmp_path, ["产品概述"])
    chapter = _ch("c1", "产品概述", content)
    chapter.plain_text = ""  # no fallback text either -> must hit the placeholder
    out = render_to_docx("doc1", [chapter], template)
    doc = Document(out)
    assert any("内容待生成" in p.text for p in doc.paragraphs)


def test_no_template_builds_from_scratch_with_same_structure(tmp_path):
    content = {"type": "doc", "content": [
        {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "子标题"}]},
        {"type": "paragraph", "content": [{"type": "text", "text": "正文"}]},
    ]}
    out = render_to_docx("doc1", [_ch("c1", "产品概述", content)], None)
    doc = Document(out)
    assert any(p.text == "产品概述" and p.style.name == "Heading 1" for p in doc.paragraphs)
    assert any(p.text == "子标题" and p.style.name == "Heading 2" for p in doc.paragraphs)
    assert any(p.text == "正文" for p in doc.paragraphs)
