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


def test_conflict_is_error():
    result = validate_document([_ch("confirmed", has_conflict=True)], None)
    assert len(result["errors"]) > 0
