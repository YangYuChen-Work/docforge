# Dynamic Sources and Sidebar Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist the exact source context supplied to AI when explicit citations are absent, dynamically show per-chapter source state and cards during generation, and add a persistent collapsible system sidebar.

**Architecture:** Keep `Citation` as the single provenance record. Store AI-returned citations as `explicit` and fallback input excerpts as `context`; the chapter API exposes citation type/state, while `DocEditor` refreshes the active chapter and source metadata during its existing generation poll. Make `AppSidebar` self-contained with a local-storage-backed collapsed state so the main layout automatically expands through its existing flex behavior.

**Tech Stack:** FastAPI, SQLAlchemy, Python pytest, Vue 3 `<script setup>`, TypeScript, Vite, existing Tiptap editor, browser-client manual verification.

## Global Constraints

- Preserve the project rule that unsupported content must be marked “待补充” and never presented as a verified fact.
- Do not overwrite user-provided source files; only write runtime artifacts below `data/`.
- Keep AI credentials in `.env`/environment variables and never print them.
- Preserve legacy `Citation.citation_type` values while adding explicit/context semantics.
- Keep the task scoped to source traceability, generation-state presentation, and sidebar layout; do not add SSE/WebSocket infrastructure.

## File Map

- Modify `app/services/material_matcher.py` to retain source-content locators in matched excerpts.
- Modify `app/services/chapter_generator.py` to validate AI citations, persist fallback context citations, and mark missing citations as material gaps.
- Modify `app/api/documents.py` to return citation type and derived citation state.
- Create `tests/test_chapter_generator.py` for the pure citation-recording seam.
- Modify `frontend/src/pages/DocEditor.vue` to pass chapter/citation state and refresh it safely during generation polling.
- Modify `frontend/src/components/AiPanel.vue` to render generating/explicit/context/missing source states and card labels.
- Modify `frontend/src/components/AppSidebar.vue` to add persistent collapse/expand controls and icon-only collapsed markup.
- Modify `frontend/src/styles/style.css` to style the two sidebar widths, transition, controls, and collapsed nav.
- Modify `frontend/src/styles/page-doc.css` only if the source-state presentation needs editor-panel-specific styles.

### Task 1: Preserve exact generation-context excerpts

**Files:**
- Modify: `app/services/material_matcher.py`
- Modify: `app/services/chapter_generator.py`
- Create: `tests/test_chapter_generator.py`

**Interfaces:**
- `extract_relevant_excerpts()` continues returning `source_id`, `source_name`, `excerpt`, and `relevance`; it additionally returns the parsed-content `locator` when available.
- Add a pure helper in `app/services/chapter_generator.py`:

```python
def _build_citation_records(
    result: ChapterGenerationResult,
    matched_excerpts: list[dict],
    valid_source_ids: set[str],
) -> tuple[list[dict], list[str]]:
    """Return citation rows and the complete missing-information list."""
```

- The helper returns `citation_type="explicit"` for valid AI citations. If there are no valid AI citations, it deduplicates the supplied excerpts into `citation_type="context"` rows and appends a missing-information message. If both are empty, it appends a no-source message and returns no rows.

- [ ] **Step 1: Write failing tests for explicit, fallback, and no-source results.**

```python
from app.ai.base import ChapterGenerationResult, CitationItem
from app.services.chapter_generator import _build_citation_records


def _result(citations):
    return ChapterGenerationResult(
        chapter_id="c1",
        content="正文",
        citations=citations,
        missing_information=[],
        conflicts=[],
        confidence="medium",
    )


def test_build_citation_records_prefers_valid_explicit_citations():
    result = _result(citations=[CitationItem("s1", "第2页", "明确引用")])
    rows, missing = _build_citation_records(result, [{"source_id": "s1", "excerpt": "上下文"}], {"s1"})
    assert rows == [{"source_document_id": "s1", "locator": "第2页", "source_excerpt": "明确引用", "citation_type": "explicit"}]
    assert missing == []


def test_build_citation_records_persists_context_when_ai_returns_no_citation():
    result = _result(citations=[])
    rows, missing = _build_citation_records(
        result,
        [{"source_id": "s1", "source_name": "市场报告.docx", "locator": "第3页", "excerpt": "市场上下文"}],
        {"s1"},
    )
    assert rows[0]["citation_type"] == "context"
    assert rows[0]["source_excerpt"] == "市场上下文"
    assert "未返回有效引用" in missing[0]


def test_build_citation_records_does_not_fabricate_source_without_context():
    rows, missing = _build_citation_records(_result(citations=[]), [], set())
    assert rows == []
    assert "未匹配到可用来源" in missing[0]
```

- [ ] **Step 2: Run the focused test and verify the expected import/behavior failure.**

Run: `.venv/bin/python -m pytest tests/test_chapter_generator.py -q`

Expected: FAIL because `_build_citation_records` and the new locator-aware fallback behavior do not exist yet.

- [ ] **Step 3: Add locator-aware excerpt data and the minimal citation helper.**

In `_load_source_data`, retain each parsed content item's `content_text` and `locator` as `content_items`; update `extract_relevant_excerpts` to iterate those items while preserving the existing `content_texts` compatibility path. In `_build_citation_records`, filter AI citations to `valid_source_ids`, return explicit rows when at least one remains, otherwise deduplicate matched excerpts by `(source_id, locator, excerpt)` and return context rows plus a Chinese missing-information message.

- [ ] **Step 4: Replace direct citation writes in `generate_chapter`.**

Delete the chapter's old citation rows before generating, call `_build_citation_records`, insert returned rows, serialize its missing-information list, and set `chapter.status` to `needs_material` whenever that list is non-empty. Keep `regenerate_chapter` version snapshots intact.

- [ ] **Step 5: Run the focused test and the matcher tests.**

Run: `.venv/bin/python -m pytest tests/test_chapter_generator.py tests/test_material_matcher.py -q`

Expected: all focused tests pass.

- [ ] **Step 6: Commit the backend provenance seam.**

```bash
git add app/services/material_matcher.py app/services/chapter_generator.py tests/test_chapter_generator.py
git commit -m "feat: persist generation context sources"
```

### Task 2: Expose citation state through the chapter API

**Files:**
- Modify: `app/api/documents.py`
- Create: `tests/test_documents_api.py`

**Interfaces:**
- Add `citation_type` to every citation object returned by `GET /api/documents/{doc_id}/chapters/{chapter_id}`.
- Add `citation_state` with one of `generating`, `explicit`, `context`, or `missing`:
  - `generating` when chapter status is `pending` or `generating`;
  - `explicit` when at least one citation is explicit or a legacy citation has a non-context type;
  - `context` when only context citations exist;
  - `missing` otherwise.

- Add a pure helper in `app/api/documents.py`:

```python
def _citation_state(chapter_status: str, citations: list[Citation]) -> str:
    """Derive the source-panel state without making database changes."""
```

- [ ] **Step 1: Write the failing citation-state tests.**

```python
from types import SimpleNamespace
from app.api.documents import _citation_state


def test_citation_state_is_generating_for_pending_or_generating_chapters():
    assert _citation_state("pending", []) == "generating"
    assert _citation_state("generating", []) == "generating"


def test_citation_state_distinguishes_explicit_context_and_missing_sources():
    assert _citation_state("needs_material", [SimpleNamespace(citation_type="explicit")]) == "explicit"
    assert _citation_state("needs_material", [SimpleNamespace(citation_type="context")]) == "context"
    assert _citation_state("needs_material", []) == "missing"

- [ ] **Step 2: Run the focused API test and verify it fails against the old response.**

Run: `.venv/bin/python -m pytest tests/test_documents_api.py -q`

Expected: FAIL because `_citation_state` does not exist yet.

- [ ] **Step 3: Implement the derived response fields without changing database schema.**

Implement `_citation_state`, return `id` as well as the existing citation fields, preserve legacy types, and compute the state from chapter status and citation rows.

- [ ] **Step 4: Run the focused API test and the full backend suite.**

Run: `.venv/bin/python -m pytest tests/test_documents_api.py -q` and then `.venv/bin/python -m pytest -q`.

Expected: the focused test and all existing backend tests pass.

- [ ] **Step 5: Commit the API contract.**

```bash
git add app/api/documents.py tests/test_documents_api.py
git commit -m "feat: expose chapter citation state"
```

### Task 3: Dynamically render current-chapter source state

**Files:**
- Modify: `frontend/src/pages/DocEditor.vue`
- Modify: `frontend/src/components/AiPanel.vue`
- Modify: `frontend/src/styles/page-doc.css`

**Interfaces:**
- `DocEditor` passes `chapterStatus`, `citationState`, and the current chapter's citation array to `AiPanel`.
- `AiPanel` accepts `citationState: 'generating' | 'explicit' | 'context' | 'missing'` and labels cards based on `citation_type`.
- `loadSourceDetails(citations, chapterId)` remains chapter-token guarded and must not clear displayed data when a source-detail request fails.

- [ ] **Step 1: Add a browser-level verification checklist before changing markup.**

The current source tab must be checked in four states: pending/generating, explicit citations, context fallback citations, and no-source. Record the visible heading/message and card label expected for each state; use the existing local document and a regenerated chapter for the first two states.

- [ ] **Step 2: Update `DocEditor` state propagation and polling.**

Read `citation_state` from `getChapter`; fall back to a local derivation for legacy responses. During the existing 3-second generation poll, update the active chapter and call `loadSourceDetails` whenever its citation state or citations change, while preserving unsaved editor content. Keep the request chapter ID guard.

- [ ] **Step 3: Update `AiPanel` source-state markup.**

Replace the generic “本章最终来源 0 / 没有记录” empty state with:

```text
generating: 本章正在生成，引用完成后会自动加载。
explicit: 本章最终来源
context: AI 生成参考资料（待明确引用）
missing: 本章未匹配到可用来源或未返回有效引用。
```

Keep source cards for both explicit and context rows. Context cards show a warning label and never claim to be final citations. Keep expand and “定位正文” actions.

- [ ] **Step 4: Add source-state and warning styles.**

Use the existing panel palette: blue for generating/explicit, amber for context, muted red/gray for missing; preserve fixed collapsed card sizing and expanded detail behavior.

- [ ] **Step 5: Run the frontend typecheck/build.**

Run: `npm run build` from `frontend/`

Expected: exit 0 with no TypeScript errors.

- [ ] **Step 6: Commit dynamic source presentation.**

```bash
git add frontend/src/pages/DocEditor.vue frontend/src/components/AiPanel.vue frontend/src/styles/page-doc.css
git commit -m "feat: show dynamic chapter source state"
```

### Task 4: Add persistent collapsible system menu

**Files:**
- Modify: `frontend/src/components/AppSidebar.vue`
- Modify: `frontend/src/styles/style.css`

**Interfaces:**
- `AppSidebar` owns `collapsed: Ref<boolean>` and uses local-storage key `doc-workbench.sidebar-collapsed`.
- Toggle button exposes `aria-expanded`, `aria-label`, and `title`; all nav routes and placeholder actions remain unchanged.

- [ ] **Step 1: Add markup for labeled navigation content and toggle controls.**

Wrap each visible text label in a `nav-text` span, add an expanded header toggle, and keep a collapsed edge toggle in the same component so the main layout needs no new state prop.

- [ ] **Step 2: Implement load/toggle persistence.**

Initialize from `localStorage` in `onMounted`, update storage on each toggle, and use `collapsed` in the root class. If storage access throws, keep the in-memory state and continue rendering.

- [ ] **Step 3: Add collapsed/expanded CSS.**

Keep the current 240px width when expanded; transition to 64px when collapsed. Center icons, hide `.nav-text`, `.nav-label`, and provider text, retain active borders, and position the collapsed restore button slightly outside the rail with a high-contrast circular style.

- [ ] **Step 4: Run the frontend build.**

Run: `npm run build` from `frontend/`

Expected: exit 0.

- [ ] **Step 5: Commit the sidebar feature.**

```bash
git add frontend/src/components/AppSidebar.vue frontend/src/styles/style.css
git commit -m "feat: add collapsible persistent sidebar"
```

### Task 5: End-to-end verification and handoff

**Files:**
- No new production files; inspect all changed files and the design/plan documents.

- [ ] **Step 1: Run the complete backend suite.**

Run: `.venv/bin/python -m pytest -q`

Expected: zero failures; existing warnings may remain documented.

- [ ] **Step 2: Run the complete frontend build.**

Run: `npm run build` from `frontend/`

Expected: exit 0; chunk-size warnings are non-blocking if no new compiler/type errors appear.

- [ ] **Step 3: Verify the live document flow in the local browser.**

Open a current generated document, select each chapter while generation is active, and verify the source tab transitions from generating to explicit/context/missing. Verify file names and excerpts load, source cards can expand, clicking a card focuses正文, and a rapid chapter switch never leaves the previous chapter's cards. Collapse the system menu, verify the main content expands and the restore button is visible, refresh, and verify the collapsed state persists.

- [ ] **Step 4: Check for unresolved markers and debug instrumentation.**

Run: `rg -n "^<<<<<<<|^=======|^>>>>>>>|\[DEBUG-[^]]+\]" frontend/src app tests || true` and `git diff --check`.

Expected: no merge markers or temporary debug logs; no whitespace errors.

- [ ] **Step 5: Commit any final verification-only fixes and report exact evidence.**

Use `git status --short --branch` and `git log --oneline -8` to report the branch and commits without staging unrelated existing untracked files.
