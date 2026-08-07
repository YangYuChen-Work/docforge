import json
from pathlib import Path
from openpyxl import Workbook
from app.config import get_storage_path


def export_tables_to_xlsx(doc_id: str, chapters: list) -> str:
    out_dir = get_storage_path("generated") / doc_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "tables.xlsx"

    wb = Workbook()
    wb.remove(wb.active)
    has_table = False

    for ch in chapters:
        if not ch.content_json:
            continue
        try:
            data = json.loads(ch.content_json)
        except (json.JSONDecodeError, TypeError):
            continue
        tables = data.get("tables", [])
        for t_idx, table in enumerate(tables):
            sheet_name = f"{ch.title[:20]}-表{t_idx + 1}" if len(tables) > 1 else ch.title[:28]
            sheet_name = sheet_name[:31]
            ws = wb.create_sheet(title=sheet_name)
            headers = table.get("headers", [])
            rows = table.get("rows", [])
            if headers:
                ws.append(headers)
            for row in rows:
                ws.append(row)
            has_table = True

    if not has_table:
        ws = wb.create_sheet(title="无表格数据")
        ws.append(["本文档暂无结构化表格数据"])

    wb.save(str(out_path))
    return str(out_path)
