import json
from pathlib import Path


def validate_document(chapters: list, template_source_path: str | None) -> dict:
    """6-rule pre-export validation. Returns {passed, warnings, errors, can_export, has_missing_info}."""
    errors = []
    warnings = []
    has_missing_info = False

    for ch in chapters:
        if ch.status == "failed":
            errors.append(f'章节"{ch.title}"生成失败，请重试或手动编辑')
        elif ch.status not in ("confirmed", "needs_material"):
            errors.append(f'章节"{ch.title}"尚未确认（当前状态：{ch.status}）')

        missing = json.loads(ch.missing_information_json or "[]")
        if missing:
            has_missing_info = True
            warnings.append(f'章节"{ch.title}"有待补充项：{", ".join(missing[:2])}')

        conflicts = json.loads(ch.conflict_json or "[]")
        if conflicts:
            errors.append(f'章节"{ch.title}"存在未处理冲突')

    if template_source_path and not Path(template_source_path).exists():
        errors.append(f"模板文件不存在：{template_source_path}")

    passed = len(errors) == 0
    return {
        "passed": passed,
        "warnings": warnings,
        "errors": errors,
        "can_export": passed,
        "has_missing_info": has_missing_info,
    }
