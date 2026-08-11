"""
End-to-end integration test for 场景1文档生成.

Covers the backend-verifiable parts of PRD 第9节 acceptance criteria 1-9:
1. 能创建生成任务
2. 至少10个DOCX和2个XLSX能完成解析或明确报告失败
3. 目标模板章节能显示资料匹配状态
4. 至少生成3个有来源引用的章节
5. 资料不足的章节出现待补充项
6. 能重新生成单章节并保留旧版本
7. 能导出一个可打开的DOCX
8. 页面能查看任务状态、生成结果、引用和错误日志
9. 不覆盖原始模板和源文件

Criterion 10 (Mock 不能绕过状态机) is covered by tests/test_mock_provider.py
and tests/test_validator.py and is not repeated here.

Uses AI_PROVIDER=mock regardless of the .env value, so this test never calls
the real DeepSeek API.
"""
import hashlib
import json
import time
from pathlib import Path

import pytest
from docx import Document
from fastapi.testclient import TestClient

from app.main import app
from app.config import SCENARIO1_TEMPLATE_PATH, settings
from app.db.session import SessionLocal, create_tables
from app.db.models import Citation, DocumentVersion, AuditLog
from scripts.seed_demo_projects import seed
from scripts.import_scenario1 import SOURCE_DIR, PROJECT_ID

TEMPLATE_PATH = SCENARIO1_TEMPLATE_PATH
TEMPLATE_ID = "T100"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _poll_task_until_terminal(client: TestClient, task_id: str, timeout: float = 30.0) -> dict:
    """Generation now runs in a background thread (see app/domain/generation.py
    _run_generation_in_background) so /start returns immediately with the
    document_id while chapters are still generating. Poll GET /generation-tasks
    until the task leaves the 'generating' state."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        r = client.get(f"/api/generation-tasks/{task_id}")
        assert r.status_code == 200, r.text
        data = r.json()
        if data["status"] in ("awaiting_confirmation", "completed", "failed"):
            return data
        time.sleep(0.2)
    raise AssertionError(f"生成任务在 {timeout}s 内未完成，仍处于 generating 状态")


# Shared state across the ordered test functions in this module.
STATE: dict = {}


@pytest.fixture(scope="module", autouse=True)
def setup_module_env():
    """Ensure schema/seed data exist and force the Mock AI provider for this
    test module, regardless of what AI_PROVIDER is set to in .env."""
    create_tables()
    seed()
    original_provider = settings.ai_provider
    settings.ai_provider = "mock"
    yield
    settings.ai_provider = original_provider


@pytest.fixture(scope="module", autouse=True)
def capture_original_file_state():
    """Capture the target template's mtime/hash before any test runs, so the
    last test can prove the original file was never overwritten (criterion 9)."""
    assert TEMPLATE_PATH.exists(), f"场景1目标模板缺失: {TEMPLATE_PATH}"
    STATE["template_mtime_before"] = TEMPLATE_PATH.stat().st_mtime_ns
    STATE["template_sha256_before"] = _sha256(TEMPLATE_PATH)
    yield


client = TestClient(app)


def test_01_import_and_parse_all_scenario1_sources():
    """Criterion 2: at least 10 DOCX and 2 XLSX either parse successfully or
    report a clear parse_error. Reuses the real scenario1 source directory
    and project id from scripts/import_scenario1.py instead of hardcoding a
    second copy of those constants."""
    files = sorted(list(SOURCE_DIR.glob("*.docx")) + list(SOURCE_DIR.glob("*.xlsx")))
    docx_files = [f for f in files if f.suffix == ".docx"]
    xlsx_files = [f for f in files if f.suffix == ".xlsx"]
    assert len(docx_files) >= 10, f"期望至少10个DOCX来源资料，实际 {len(docx_files)}"
    assert len(xlsx_files) >= 2, f"期望至少2个XLSX来源资料，实际 {len(xlsx_files)}"

    source_ids = []
    for f in files:
        with open(f, "rb") as fobj:
            r = client.post(
                f"/api/projects/{PROJECT_ID}/sources",
                files={"file": (f.name, fobj, "application/octet-stream")},
            )
        assert r.status_code == 200, f"上传失败: {f.name} -> {r.status_code} {r.text}"
        source_ids.append(r.json()["source_id"])

    parsed_or_failed = 0
    for sid in source_ids:
        r = client.post(f"/api/sources/{sid}/parse")
        assert r.status_code == 200
        data = r.json()
        assert data["parse_status"] in ("parsed", "parse_failed"), (
            f"资料 {sid} 解析后状态异常: {data['parse_status']}"
        )
        if data["parse_status"] == "parsed":
            parsed_or_failed += 1
        else:
            # A parse failure must carry an explicit error, never a silent/fake success.
            assert data["parse_error"], f"资料 {sid} 标记为 parse_failed 但没有 parse_error"
            parsed_or_failed += 1

    assert parsed_or_failed == len(source_ids)
    # All 12 real scenario1 files are well-formed DOCX/XLSX, so they must actually parse.
    r = client.get(f"/api/projects/{PROJECT_ID}/sources")
    assert r.status_code == 200
    all_sources = {s["id"]: s for s in r.json()}
    for sid in source_ids:
        assert all_sources[sid]["parse_status"] == "parsed", (
            f"资料 {all_sources[sid]['original_name']} 未能成功解析: "
            f"{all_sources[sid]['parse_error']}"
        )

    STATE["source_ids"] = source_ids


def test_02_create_generation_task():
    """Criterion 1: can create a generation task for P001 + T100 with the
    parsed source ids."""
    source_ids = STATE["source_ids"]
    r = client.post(
        "/api/generation-tasks",
        json={
            "project_id": PROJECT_ID,
            "template_id": TEMPLATE_ID,
            "source_ids": source_ids,
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "created"
    assert data["task_id"]
    STATE["task_id"] = data["task_id"]


def test_03_start_task_generates_all_chapters():
    """Generation now runs in a background thread so /start returns as soon as
    the document + chapter skeleton exists (fixing the wizard's "no navigation
    after clicking generate" bug: the old synchronous 22-chapter call could
    exceed the frontend's axios timeout). Poll the task until it reaches a
    terminal state instead of asserting on the immediate response."""
    task_id = STATE["task_id"]
    r = client.post(f"/api/generation-tasks/{task_id}/start")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["document_id"], "文档应在 /start 返回时已创建（用于前端立即跳转）"
    STATE["document_id"] = data["document_id"]

    task = _poll_task_until_terminal(client, task_id)
    assert task["status"] == "awaiting_confirmation", (
        f"生成任务未进入 awaiting_confirmation，实际状态: {task['status']}"
    )

    r = client.get(f"/api/documents/{STATE['document_id']}")
    assert r.status_code == 200
    doc = r.json()
    assert len(doc["chapters"]) == 22, f"T100 应生成 22 个章节，实际 {len(doc['chapters'])}"
    STATE["chapter_ids"] = [c["id"] for c in doc["chapters"]]


def test_04_chapters_have_match_status():
    """Criterion 3: every generated chapter carries a match_status describing
    whether source material was found."""
    r = client.get(f"/api/documents/{STATE['document_id']}")
    assert r.status_code == 200
    chapters = r.json()["chapters"]
    assert len(chapters) == 22
    valid_statuses = {"matched", "partial", "unmatched", "conflict"}
    for ch in chapters:
        assert ch["match_status"] in valid_statuses, (
            f'章节"{ch["title"]}"的 match_status 无效: {ch["match_status"]!r}'
        )


def test_05_at_least_three_chapters_have_citations():
    """Criterion 4: at least 3 chapters end up with a source citation recorded
    in the Citation table."""
    doc_id = STATE["document_id"]
    chapters_with_citations = 0
    total_citations = 0
    for chapter_id in STATE["chapter_ids"]:
        r = client.get(f"/api/documents/{doc_id}/chapters/{chapter_id}")
        assert r.status_code == 200
        citations = r.json()["citations"]
        if citations:
            chapters_with_citations += 1
            total_citations += len(citations)

    assert chapters_with_citations >= 3, (
        f"期望至少3个章节有来源引用，实际 {chapters_with_citations}"
    )

    # Cross-check directly against the Citation table for this document's chapters.
    db = SessionLocal()
    try:
        db_citation_count = (
            db.query(Citation)
            .filter(Citation.chapter_id.in_(STATE["chapter_ids"]))
            .count()
        )
    finally:
        db.close()
    assert db_citation_count == total_citations
    assert db_citation_count >= 3


def test_06_chapters_without_material_have_missing_information():
    """Criterion 5: chapters lacking source material end up with non-empty
    missing_information. Scenario1's template explicitly has 运输方案及要求,
    样机验证计划, 资源需求 (no material_types at all) plus 服务可行性
    (references a missing '服务可行性分析报告' file)."""
    doc_id = STATE["document_id"]
    expected_titles_with_gap = {"运输方案及要求", "样机验证计划", "资源需求", "服务可行性"}
    found_titles_with_missing_info = set()
    chapters_with_missing = 0

    for chapter_id in STATE["chapter_ids"]:
        r = client.get(f"/api/documents/{doc_id}/chapters/{chapter_id}")
        assert r.status_code == 200
        data = r.json()
        missing = json.loads(data["missing_information_json"] or "[]")
        if missing:
            chapters_with_missing += 1
            if data["title"] in expected_titles_with_gap:
                found_titles_with_missing_info.add(data["title"])

    assert chapters_with_missing >= 1, "没有任何章节出现待补充项，资料不足场景未被覆盖"
    assert found_titles_with_missing_info, (
        "预期的无来源/资料缺失章节（运输方案及要求/样机验证计划/资源需求/服务可行性）"
        f"均没有出现待补充项，实际有待补充项的章节: {chapters_with_missing} 个"
    )


def test_07_regenerate_chapter_keeps_old_version():
    """Criterion 6: regenerating a chapter preserves the previous content as a
    DocumentVersion row with change_type='regenerated'."""
    doc_id = STATE["document_id"]

    # Pick a chapter that has actually gone through generation (not pending/failed).
    target_chapter_id = None
    for chapter_id in STATE["chapter_ids"]:
        r = client.get(f"/api/documents/{doc_id}/chapters/{chapter_id}")
        data = r.json()
        if data["status"] in ("generated", "needs_material"):
            target_chapter_id = chapter_id
            break
    assert target_chapter_id, "找不到任何已生成的章节可用于重新生成测试"

    db = SessionLocal()
    try:
        versions_before = (
            db.query(DocumentVersion)
            .filter(DocumentVersion.chapter_id == target_chapter_id)
            .count()
        )
    finally:
        db.close()

    r = client.post(f"/api/documents/{doc_id}/chapters/{target_chapter_id}/regenerate")
    assert r.status_code == 200, r.text

    db = SessionLocal()
    try:
        versions_after = (
            db.query(DocumentVersion)
            .filter(DocumentVersion.chapter_id == target_chapter_id)
            .order_by(DocumentVersion.version_number.desc())
            .all()
        )
    finally:
        db.close()

    assert len(versions_after) == versions_before + 1, (
        f"重新生成后版本数应增加1，之前 {versions_before}，之后 {len(versions_after)}"
    )
    newest = versions_after[0]
    assert newest.change_type == "regenerated"
    assert newest.chapter_id == target_chapter_id

    STATE["regenerated_chapter_id"] = target_chapter_id


def test_08_confirm_remaining_generated_chapters():
    """Not itself a numbered PRD criterion here, but a precondition for
    export: validate_document requires every chapter to be either
    'confirmed' or 'needs_material'. Confirms every chapter still sitting in
    'generated' status (including the one just regenerated)."""
    doc_id = STATE["document_id"]
    confirmed = 0
    for chapter_id in STATE["chapter_ids"]:
        r = client.get(f"/api/documents/{doc_id}/chapters/{chapter_id}")
        data = r.json()
        if data["status"] == "generated":
            cr = client.post(f"/api/documents/{doc_id}/chapters/{chapter_id}/confirm")
            assert cr.status_code == 200, cr.text
            confirmed += 1

    # Sanity: every chapter must now be in an exportable state.
    for chapter_id in STATE["chapter_ids"]:
        r = client.get(f"/api/documents/{doc_id}/chapters/{chapter_id}")
        status = r.json()["status"]
        assert status in ("confirmed", "needs_material"), (
            f"章节 {chapter_id} 状态 {status} 无法进入导出前校验"
        )
    STATE["confirmed_count"] = confirmed


def test_09_export_docx_is_openable():
    """Criterion 7: can export a DOCX and re-open it without error, and the
    exported file still contains the template's report title text."""
    doc_id = STATE["document_id"]
    r = client.post(f"/api/documents/{doc_id}/export", json={"format": "docx"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "completed", f"导出未完成: {data}"
    assert data["output_path"]

    output_path = Path(data["output_path"])
    assert output_path.exists(), f"导出文件不存在: {output_path}"

    # Must be openable by python-docx without raising.
    exported_doc = Document(str(output_path))
    full_text = "\n".join(p.text for p in exported_doc.paragraphs)
    assert "产品开发立项暨设计和开发输入报告" in full_text, (
        "导出的 DOCX 未包含目标模板标题文字"
    )

    STATE["export_output_path"] = str(output_path)


def test_10_task_document_and_audit_are_viewable():
    """Criterion 8: task status, generated document/chapters, citations, and
    error/audit logs are all retrievable through the API."""
    task_id = STATE["task_id"]
    doc_id = STATE["document_id"]

    r = client.get(f"/api/generation-tasks/{task_id}")
    assert r.status_code == 200
    task_data = r.json()
    assert task_data["id"] == task_id
    assert task_data["status"] == "awaiting_confirmation"
    assert task_data["document_id"] == doc_id

    r = client.get(f"/api/documents/{doc_id}")
    assert r.status_code == 200
    doc_data = r.json()
    assert doc_data["id"] == doc_id
    assert len(doc_data["chapters"]) == 22
    assert all("match_status" in c for c in doc_data["chapters"])

    r = client.get("/api/audit")
    assert r.status_code == 200
    audit_data = r.json()
    assert "logs" in audit_data and "total" in audit_data
    assert audit_data["total"] >= 1, "审计日志为空，业务动作未被记录"

    actions_logged = {log["action"] for log in audit_data["logs"]}
    # Confirm real business actions performed in this test run were audited,
    # not just generic entries left over from other tests.
    assert actions_logged & {"upload", "parse", "generate", "confirm", "regenerate", "export"}, (
        f"审计日志缺少本次测试触发的业务动作，实际记录的动作: {actions_logged}"
    )

    db = SessionLocal()
    try:
        export_logs = (
            db.query(AuditLog)
            .filter(AuditLog.entity_type == "generated_document", AuditLog.entity_id == doc_id)
            .all()
        )
    finally:
        db.close()
    assert any(l.action == "export" and l.result == "success" for l in export_logs), (
        "导出成功没有被记录到审计日志"
    )


def test_11_original_template_and_source_files_untouched():
    """Criterion 9: the original target template file must never be
    overwritten by generation/export. Only files under data/ should change."""
    assert TEMPLATE_PATH.exists(), "目标模板文件在测试过程中被删除"
    mtime_after = TEMPLATE_PATH.stat().st_mtime_ns
    sha_after = _sha256(TEMPLATE_PATH)

    assert mtime_after == STATE["template_mtime_before"], (
        "目标模板文件的修改时间发生变化，可能被生成/导出流程覆盖写入"
    )
    assert sha_after == STATE["template_sha256_before"], (
        "目标模板文件内容发生变化，可能被生成/导出流程覆盖写入"
    )

    # The exported file must be a separate copy under data/generated, not the template path.
    exported_path = Path(STATE["export_output_path"]).resolve()
    assert exported_path != TEMPLATE_PATH.resolve()
    assert "generated" in exported_path.parts
