from unittest.mock import MagicMock
from app.services.validator import validate_document


def _ch(status, has_missing=False, has_conflict=False):
    ch = MagicMock()
    ch.title = "测试章节"
    ch.status = status
    ch.missing_information_json = '["缺失项"]' if has_missing else "[]"
    ch.conflict_json = '[{"description":"冲突"}]' if has_conflict else "[]"
    return ch


def test_all_confirmed_passes():
    result = validate_document([_ch("confirmed"), _ch("confirmed")], None)
    assert result["passed"] is True
    assert result["can_export"] is True
    assert result["errors"] == []


def test_unconfirmed_is_error():
    result = validate_document([_ch("confirmed"), _ch("generated")], None)
    assert len(result["errors"]) > 0
    assert result["can_export"] is False


def test_missing_is_warning():
    result = validate_document([_ch("confirmed", has_missing=True)], None)
    assert len(result["warnings"]) > 0
    assert result["can_export"] is True
    assert result["has_missing_info"] is True


def test_conflict_is_warning_and_does_not_block_export():
    result = validate_document([_ch("confirmed", has_conflict=True)], None)
    assert result["passed"] is True
    assert result["can_export"] is True
    assert result["errors"] == []
    assert result["warnings"] == ['章节"测试章节"存在未处理冲突']


def test_malformed_optional_issue_json_does_not_block_validation():
    chapter = _ch("confirmed")
    chapter.missing_information_json = "{bad json"
    chapter.conflict_json = "["

    result = validate_document([chapter], None)

    assert result["passed"] is True
    assert result["warnings"] == []
    assert result["errors"] == []
    assert result["has_missing_info"] is False


def test_conflict_warning_does_not_change_failed_chapter_error():
    result = validate_document([_ch("failed", has_conflict=True)], None)

    assert result["passed"] is False
    assert result["can_export"] is False
    assert '章节"测试章节"生成失败，请重试或手动编辑' in result["errors"]
    assert result["warnings"] == ['章节"测试章节"存在未处理冲突']
