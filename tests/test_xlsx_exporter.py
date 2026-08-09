import json
from datetime import date
from types import SimpleNamespace

from openpyxl import load_workbook

from app.config import settings
from app.services.xlsx_exporter import export_tables_to_xlsx


def _chapter(title, content_json):
    return SimpleNamespace(
        id=f"ch-{title}",
        title=title,
        content_json=content_json,
        missing_information_json="[]",
        conflict_json="[]",
    )


def _table(title, headers, rows):
    return {
        "title": title,
        "headers": headers,
        "rows": rows,
    }


def _load(path):
    return load_workbook(path)


def test_exporter_builds_overview_directory_and_table_sheets(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "storage_root", str(tmp_path))

    chapters = [
        _chapter(
            "重复名称",
            json.dumps(
                {"tables": [_table("表A", ["序号", "名称"], [[1, "Alpha"]])]},
                ensure_ascii=False,
            ),
        ),
        _chapter(
            "重复名称",
            json.dumps(
                {"tables": [_table("表B", ["数值", "布尔", "日期", "空值", "嵌套"], [[3.5, True, "2026-08-09", None, {"x": 1}]])]},
                ensure_ascii=False,
            ),
        ),
        _chapter(
            "非法/名称:*?[]超长超长超长超长",
            json.dumps(
                {"tables": [_table("表C", ["序号"], [[2]])]},
                ensure_ascii=False,
            ),
        ),
        _chapter("坏JSON", "{not json"),
        _chapter("无表章", json.dumps({"paragraphs": []}, ensure_ascii=False)),
    ]

    out = export_tables_to_xlsx(
        "doc-1",
        chapters,
        document_meta={
            "title": "演示文档",
            "project_id": "P001",
            "template_name": "模板A",
            "status": "completed",
            "missing_items": ["待补充A", "待补充B"],
            "conflicts": ["冲突A"],
        },
    )

    wb = _load(out)
    assert wb.sheetnames[:2] == ["项目概览", "文档目录"]
    assert wb.sheetnames[2:] == ["重复名称", "重复名称-2", "非法名称超长超长超长超长",]

    overview = wb["项目概览"]
    assert overview["A1"].value == "导出概览"
    assert overview["A3"].value == "文档标题"
    assert overview["B3"].value == "演示文档"
    assert overview["A4"].value == "项目编号"
    assert overview["B4"].value == "P001"
    assert overview["A6"].value == "状态"
    assert overview["B6"].value == "completed"
    assert overview["A7"].value == "待补充项"
    assert "待补充A" in overview["B7"].value
    assert overview["A8"].value == "冲突项"
    assert "冲突A" in overview["B8"].value

    directory = wb["文档目录"]
    assert directory["A1"].value == "章节"
    assert directory["B1"].value == "表格数量"
    assert directory["C1"].value == "Sheet 名称"
    assert directory["D1"].value == "打开"

    rows = list(directory.iter_rows(min_row=2, max_row=4, values_only=True))
    assert rows[0][:3] == ("重复名称", 1, "重复名称")
    assert rows[0][3].startswith("=HYPERLINK(")
    assert rows[1][:3] == ("重复名称", 1, "重复名称-2")
    assert rows[1][3].startswith("=HYPERLINK(")
    assert rows[2][:3] == ("非法/名称:*?[]超长超长超长超长", 1, "非法名称超长超长超长超长")
    assert rows[2][3].startswith("=HYPERLINK(")

    sheet = wb["重复名称"]
    assert sheet.freeze_panes == "A4"
    assert sheet.auto_filter.ref == "A3:B4"
    assert sheet["A1"].value == "表A"
    assert sheet["A2"].value == "来源章节：重复名称"
    assert sheet["A3"].value == "序号"
    assert sheet["B3"].value == "名称"
    assert sheet["A4"].value == 1
    assert sheet["B4"].value == "Alpha"
    assert sheet["A3"].fill.fgColor.rgb in ("FFD9EAF7", "00D9EAF7")
    assert sheet["A4"].alignment.wrap_text is True
    assert sheet.page_setup.orientation == "landscape"
    assert sheet.page_setup.fitToWidth == 1

    second = wb["重复名称-2"]
    assert second["A4"].value == 3.5
    assert second["B4"].value is True
    assert second["C4"].is_date
    normalized = second["C4"].value
    if hasattr(normalized, "date"):
        normalized = normalized.date()
    assert normalized == date(2026, 8, 9)
    assert second["D4"].value is None
    assert second["E4"].value == '{"x": 1}'

    long_name = wb["非法名称超长超长超长超长"]
    assert len(long_name.title) <= 31
    assert "/" not in long_name.title
    assert ":" not in long_name.title
    assert "*" not in long_name.title
    assert "?" not in long_name.title
    assert "[" not in long_name.title
    assert "]" not in long_name.title


def test_exporter_falls_back_when_no_valid_tables_exist(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "storage_root", str(tmp_path))

    chapters = [
        _chapter("坏JSON", "{not json"),
        _chapter("空章节", json.dumps({"content": []}, ensure_ascii=False)),
    ]

    out = export_tables_to_xlsx("doc-2", chapters, document_meta=None)
    wb = _load(out)

    assert wb.sheetnames == ["项目概览", "文档目录", "无表格数据"]
    fallback = wb["无表格数据"]
    assert fallback["A1"].value == "本文档暂无可导出的表格数据"
    assert fallback["A2"].value == "请检查章节内容是否包含 tables 节点，或等待章节重新生成。"
