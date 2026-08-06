import pytest
from pathlib import Path
from app.services.source_parser import parse_docx, parse_xlsx

DOCX_FILE = Path("场景1文档生成/要引用的文档来源/市场调研报告.docx")
XLSX_FILE = Path("场景1文档生成/要引用的文档来源/XVPM-WBS里程碑.xlsx")


@pytest.mark.skipif(not DOCX_FILE.exists(), reason="场景1 DOCX not available")
def test_parse_docx_returns_items():
    items, _ = parse_docx(str(DOCX_FILE))
    assert len(items) > 0


@pytest.mark.skipif(not DOCX_FILE.exists(), reason="场景1 DOCX not available")
def test_parse_docx_has_headings():
    items, _ = parse_docx(str(DOCX_FILE))
    headings = [i for i in items if i["content_type"] == "heading"]
    assert len(headings) > 0


@pytest.mark.skipif(not DOCX_FILE.exists(), reason="场景1 DOCX not available")
def test_parse_docx_has_paragraphs():
    items, _ = parse_docx(str(DOCX_FILE))
    paras = [i for i in items if i["content_type"] == "paragraph"]
    assert len(paras) > 0


@pytest.mark.skipif(not XLSX_FILE.exists(), reason="场景1 XLSX not available")
def test_parse_xlsx_returns_tables():
    items, _ = parse_xlsx(str(XLSX_FILE))
    assert len(items) > 0
    tables = [i for i in items if i["content_type"] == "table"]
    assert len(tables) > 0


def test_parse_docx_missing_file_raises():
    with pytest.raises(Exception):
        parse_docx("nonexistent_file.docx")
