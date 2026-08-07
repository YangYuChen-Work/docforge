from app.services.material_matcher import compute_match_status, extract_relevant_excerpts


def test_match_by_filename():
    chapter = {"material_types": "市场调研报告", "title": "市场需求分析"}
    sources = [{"id": "s1", "original_name": "市场调研报告.docx", "content_texts": ["市场规模增长"]}]
    assert compute_match_status(chapter, sources) == "matched"


def test_unmatched_no_sources():
    chapter = {"material_types": "服务可行性分析报告", "title": "服务可行性"}
    assert compute_match_status(chapter, []) == "unmatched"


def test_partial_match():
    chapter = {"material_types": "市场调研报告,技术可行性分析报告", "title": "产品卖点"}
    sources = [{"id": "s1", "original_name": "市场调研报告.docx", "content_texts": ["市场分析"]}]
    assert compute_match_status(chapter, sources) == "partial"


def test_no_material_types_is_matched():
    chapter = {"material_types": "", "title": "运输方案"}
    sources = [{"id": "s1", "original_name": "任意文件.docx", "content_texts": []}]
    assert compute_match_status(chapter, sources) == "matched"


def test_extract_excerpts():
    sources = [{"id": "s1", "original_name": "test.docx", "content_texts": ["市场需求分析内容", "其他内容", "市场竞争分析"]}]
    results = extract_relevant_excerpts("市场需求分析", sources)
    assert len(results) > 0
    assert all("source_id" in r for r in results)
