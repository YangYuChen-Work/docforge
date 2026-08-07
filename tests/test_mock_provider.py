from app.ai.base import ChapterGenerationRequest
from app.ai.mock_provider import MockAIProvider


def _req(excerpts=None):
    return ChapterGenerationRequest(
        chapter_id="T100-CH02",
        chapter_title="市场需求分析",
        gen_instruction="填写市场销量表",
        project_info={"id": "P001", "name": "测试项目", "model": "XCT80"},
        matched_excerpts=excerpts or [],
        structured_tables=[],
    )


def test_mock_with_source_has_citation():
    provider = MockAIProvider()
    result = provider.generate_chapter(
        _req(excerpts=[{"source_id": "s1", "source_name": "市场调研报告.docx", "excerpt": "市场增长20%"}])
    )
    assert result.chapter_id == "T100-CH02"
    assert len(result.citations) == 1
    assert result.citations[0].source_document_id == "s1"


def test_mock_no_source_has_missing():
    provider = MockAIProvider()
    result = provider.generate_chapter(_req(excerpts=[]))
    assert len(result.missing_information) > 0


def test_mock_action_diagram():
    provider = MockAIProvider()
    result = provider.ai_action("generate_diagram", "", "", "")
    assert "graph" in result


def test_mock_action_polish():
    provider = MockAIProvider()
    result = provider.ai_action("polish", "原始文本内容", "", "")
    assert "润色" in result
