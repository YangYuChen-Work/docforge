# Editor Comments and Source Traceability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add non-exported inline annotation/source navigation to the document editor, provide the four right-side function tabs, and keep missing-information prompts below the editor without writing them into DOCX/PDF output.

**Architecture:** Keep `Annotation` and `Citation` as the existing backend contracts. Add a small Tiptap/ProseMirror decoration extension that derives visual ranges from `target_text` and `source_excerpt` without changing `content_json`; `DocEditor.vue` owns loading and event orchestration, while `ContentPanel.vue` and `AiPanel.vue` remain presentation/interaction boundaries. Remove missing-information notice nodes from the DOCX renderer while retaining missing data for validation and export metadata.

**Tech Stack:** Vue 3, TypeScript, Tiptap 3, ProseMirror decorations, FastAPI/SQLAlchemy, python-docx, pytest, Vite/vue-tsc.

## Global Constraints

- 待补充信息只能显示在编辑器富文本区域下方，不进入 DOCX/PDF 正文。
- 批注和来源标记必须是编辑器装饰层，不能写入 `content_json`，也不能进入导出文件。
- 数据来源栏只展示当前章节 `citations` 中的最终来源，不能把项目全部资料当成章节来源。
- 来源卡片统一尺寸，标题栏显示文件名称，内容显示定位和参考原文，过长内容支持展开。
- 找不到批注原文或来源摘要时不得伪造高亮；必须回退定位并给出明确提示。
- 数据链追踪仅预留功能栏，不调用接口、不显示虚构的一致性结果。
- 不覆盖用户提供的源文件；运行时文件写入 `data/`。

---

### Task 1: Make missing-information notices editor-only

**Files:**
- Modify: `app/services/docx_renderer.py:70-108`
- Test: `tests/test_docx_renderer.py:445-525`

**Interfaces:**
- Consumes: `DocumentChapter.missing_information_json` and `DocumentChapter.conflict_json`.
- Produces: `_chapter_nodes(chapter)` returns正文与冲突节点，但不再追加 `missing_information_json` 的 DOCX 段落。

- [ ] **Step 1: Update the failing export assertions**

Replace the existing tests that expect `待补充` in DOCX with a regression test that keeps正文 and excludes the missing-information text:

```python
def test_missing_information_stays_out_of_exported_docx(tmp_path):
    content = {"type": "doc", "content": [
        {"type": "paragraph", "content": [{"type": "text", "text": "正文内容"}]},
    ]}
    template = _make_template(tmp_path, ["产品概述"])

    out = render_to_docx(
        "doc1", [_ch("c1", "产品概述", content, missing=["下一年度销量预测"])], template
    )

    doc = Document(out)
    body_text = "\n".join(p.text for p in doc.paragraphs)
    assert "正文内容" in body_text
    assert "待补充" not in body_text
    assert "下一年度销量预测" not in body_text
```

Keep the conflict-notice test and change its fixture to contain only a conflict, proving conflict behavior is not accidentally removed.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pytest tests/test_docx_renderer.py::test_missing_information_stays_out_of_exported_docx -q`

Expected: FAIL because the current renderer appends a `待补充` paragraph.

- [ ] **Step 3: Remove only the missing-information append path**

In `_chapter_nodes`, delete the `missing = ...` block and leave the content JSON, plain-text fallback, and conflict handling unchanged. Keep `_safe_json_list` and validation code untouched because missing information still powers export validation and metadata.

- [ ] **Step 4: Run the focused renderer tests**

Run: `pytest tests/test_docx_renderer.py -q`

Expected: PASS, including the new exclusion test, the conflict notice test, malformed content tests, template tests, and table tests.

- [ ] **Step 5: Commit the export boundary**

```bash
git add app/services/docx_renderer.py tests/test_docx_renderer.py
git commit -m "fix: keep missing information out of document exports"
```

### Task 2: Add a non-persistent Tiptap reference-decoration extension

**Files:**
- Create: `frontend/src/editor/ReferenceDecorations.ts`
- Modify: `frontend/src/components/ContentPanel.vue:90-330`

**Interfaces:**
- Consumes: `getAnnotations(): AnnotationRef[]`, `getCitations(): CitationRef[]`, active IDs, and click callbacks.
- Produces: Tiptap extension `ReferenceDecorations` and a `findReferenceRange` helper used by `ContentPanel` focus methods.

Use these types and public signatures:

```ts
export type AnnotationRef = {
  id: string
  target_text?: string | null
  status?: string
}

export type CitationRef = {
  key: string
  source_excerpt?: string | null
}

export type ReferenceDecorationOptions = {
  getAnnotations: () => AnnotationRef[]
  getCitations: () => CitationRef[]
  getActiveAnnotationId: () => string
  getActiveCitationKey: () => string
  onAnnotationClick: (id: string) => void
  onCitationClick: (key: string) => void
}

export function findReferenceRange(editor: any, text: string): { from: number; to: number } | null
export function createReferenceDecorations(options: ReferenceDecorationOptions): any
```

- [ ] **Step 1: Write the helper-level failing test contract in the implementation notes**

The browser build is the available frontend test seam. Define the helper so it handles an exact text match inside a text node, whitespace-normalized matching for source excerpts, and `null` for empty/unmatched text. The implementation must not mutate the editor document.

- [ ] **Step 2: Implement range lookup**

Walk `editor.state.doc.descendants`, inspect text nodes, and return `pos + 1 + index` through `pos + 1 + index + search.length`. Try the exact string first, then collapse repeated whitespace for source excerpts and map the matched node range. Return `null` when no text node contains the search text.

- [ ] **Step 3: Implement decorations**

Create a ProseMirror plugin that recomputes decorations on each transaction and on a metadata refresh transaction. For each matched annotation, add an inline `annotation-highlight` decoration and a widget marker containing its ordinal number; for each matched citation, add a `source-highlight` decoration and a widget marker. Add active classes to the selected annotation/citation. Marker click handlers must prevent editor selection loss, call the relevant callback, and never dispatch content changes.

- [ ] **Step 4: Run the frontend type/build check**

Run: `npm run build` from `frontend/`.

Expected: the new extension compiles before the panels are fully wired; any unused import/type errors must be fixed in this task.

- [ ] **Step 5: Commit the decoration seam**

```bash
git add frontend/src/editor/ReferenceDecorations.ts frontend/src/components/ContentPanel.vue
git commit -m "feat: add non-persistent editor reference decorations"
```

### Task 3: Move the missing prompt below the rich-text editor and expose focus events

**Files:**
- Modify: `frontend/src/components/ContentPanel.vue:1-90,120-330`
- Modify: `frontend/src/styles/page-doc.css:220-340`

**Interfaces:**
- Consumes: `chapter`, annotations, citations, active reference IDs, and external focus requests.
- Produces: emits `annotationSelect(id)`, `citationSelect(key)`, `focusResult(message)`, plus exposed `focusAnnotation(id)` and `focusCitation(key)` methods.

- [ ] **Step 1: Move the missing-information block after `<editor-content>`**

Render the rich text first. Then render a separate `.missing-information-panel` below it with the existing list items. Keep failed-generation and conflict notices separate from this change.

- [ ] **Step 2: Wire the decoration extension into `useEditor`**

Pass getter functions so props remain reactive. Watch annotation/citation arrays and active IDs, then dispatch a metadata-only transaction to refresh decorations. Watch the chapter ID to replace editor content without emitting an edit event.

- [ ] **Step 3: Add focus methods**

`focusAnnotation(id)` finds the annotation target text, sets the Tiptap text selection, scrolls it into view, and emits a clear fallback message when no range exists. `focusCitation(key)` does the same for `source_excerpt`; if no exact range exists, select the chapter body range and emit `来源原文未在正文中找到精确片段，已定位到当前章节正文`.

- [ ] **Step 4: Style the separate prompt and inline markers**

Use a white/gray bordered prompt below the editable area so it is visibly outside the rich-text body. Use orange for annotation highlights/markers and blue for source highlights/markers. Keep marker styles non-printing UI only.

- [ ] **Step 5: Run the frontend build**

Run: `npm run build` from `frontend/`.

Expected: PASS with the prompt moved below the editor and no TypeScript errors.

### Task 4: Implement the right-side function tabs and fixed source cards

**Files:**
- Modify: `frontend/src/components/AiPanel.vue:1-230`
- Modify: `frontend/src/styles/page-doc.css:220-340`

**Interfaces:**
- Consumes: `annotations`, `citations`, `sourceDetails`, `selectionText`, active IDs, and existing AI busy/messages state.
- Produces: `createAnnotation(body)`, `annotationSelect(id)`, `annotationFocus(id)`, `citationFocus(key)`, and `commentAiAction(annotation)` events; exposes `openTab(tab)`.

- [ ] **Step 1: Add tab state and the four tab buttons**

Use a local `activeTab` union of `ai | annotations | sources | lineage`, defaulting to `ai`. Keep the existing AI quick actions and chat only in the AI tab. The lineage tab must show a static “功能预留，暂未实现” panel.

- [ ] **Step 2: Add selected-text annotation creation**

In the annotations tab, show a “为当前选区添加批注” button when `selectionText.trim()` is non-empty. The form displays the selected original text, accepts a required comment body, and emits:

```ts
createAnnotation: [body: {
  type: string
  label: string
  target_text: string
  content: string
}]
```

On submit, clear only after the parent reports success by refreshing the annotations prop. On failure, keep the typed comment visible and show an inline error.

- [ ] **Step 3: Render annotation cards and AI action**

Each card has a consistent header with批注编号/label/status, a highlighted original-text block, the批示内容, and actions for定位原文, AI 修改, 标记已处理, and忽略. Clicking a card emits `annotationFocus`; clicking AI 修改 emits `commentAiAction` with the annotation target and instruction.

- [ ] **Step 4: Render source cards with expand/collapse**

For every citation, render one fixed-size `.source-card` with a file-name header, locator line, excerpt preview, and expand button. Use a stable citation key `${source_document_id}:${index}`. All cards use the same min-height and internal flex layout; expansion changes only the body overflow, not the header geometry. Clicking the card or “定位正文” emits `citationFocus(key)`.

- [ ] **Step 5: Run the frontend build**

Run: `npm run build` from `frontend/`.

Expected: PASS with all tabs rendered and source/annotation event signatures type-safe.

### Task 5: Orchestrate chapter annotations, citation metadata, and AI comment editing

**Files:**
- Modify: `frontend/src/pages/DocEditor.vue:70-345`
- Modify: `frontend/src/api/sources.ts:1-30`

**Interfaces:**
- Consumes: panel events and existing `listAnnotations`, `createAnnotation`, `updateAnnotation`, `aiAction` APIs.
- Produces: `annotations`, `citations`, `sourceDetails`, active annotation/citation state, and parent handlers for both panels.

- [ ] **Step 1: Add source metadata loading**

Add `getSource` usage for the unique `chapter.citations[].source_document_id` values. Resolve with `Promise.all`, retain a fallback object containing the source ID when a request fails, and refresh source metadata whenever the chapter changes.

- [ ] **Step 2: Add annotation creation handler**

Call `createAnnotation(docId, currentChapterId, body)`, reload annotations, set the newly created annotation active when the API returns its ID, and open the annotations tab. On error, pass the error message back through the panel’s existing inline error event/state rather than creating a local fake item.

- [ ] **Step 3: Add active-reference navigation**

When `ContentPanel` emits `annotationSelect` or `citationSelect`, update the active ID/key and call `aiPanelRef.openTab('annotations'|'sources')`. When the right panel emits focus events, call `contentPanelRef.focusAnnotation/focusCitation` and update the active ID/key.

- [ ] **Step 4: Connect AI comment modification**

For `commentAiAction`, call `apiAiAction` with `action: 'address_comments'`, `selection: annotation.target_text`, and `instruction: annotation.content`. Add the result to the existing AI chat with `hadSelection=true`, open the AI tab, and leave replacement/insertion to the existing AI result buttons so no automatic content mutation occurs.

- [ ] **Step 5: Run the frontend build and API tests**

Run: `npm run build` from `frontend/` and `pytest tests/test_e2e_scenario1.py tests/test_docx_renderer.py -q` from the repository root.

Expected: both commands pass; chapter generation and citations remain functional while the new UI orchestration compiles.

### Task 6: Full verification and implementation review

**Files:**
- Verify: `frontend/src/components/AiPanel.vue`, `frontend/src/components/ContentPanel.vue`, `frontend/src/editor/ReferenceDecorations.ts`, `frontend/src/pages/DocEditor.vue`, `frontend/src/styles/page-doc.css`, `app/services/docx_renderer.py`, `tests/test_docx_renderer.py`

- [ ] **Step 1: Run the full Python test suite**

Run: `pytest -q`

Expected: exit code 0 with zero failed tests.

- [ ] **Step 2: Run the production frontend build**

Run: `npm run build` from `frontend/`.

Expected: exit code 0 and a generated `frontend/dist/` bundle.

- [ ] **Step 3: Verify the exported DOCX boundary directly**

Run:

```bash
python - <<'PY'
from docx import Document
from pathlib import Path

paths = sorted(Path("data/generated").glob("**/*.docx"))
if paths:
    doc = Document(paths[-1])
    text = "\n".join(p.text for p in doc.paragraphs)
    assert "待补充" not in text
PY
```

Expected: no assertion failure when a generated DOCX exists; the focused renderer test remains the authoritative check when no runtime export exists.

- [ ] **Step 4: Run code review checks**

Review the diff for: source-file immutability, no secrets, no fake lineage results, no persisted decoration markup, no missing-information text in DOCX/PDF, fixed-size source cards, and error-state handling.

- [ ] **Step 5: Commit the implementation**

```bash
git add app/services/docx_renderer.py tests/test_docx_renderer.py frontend/src/editor/ReferenceDecorations.ts frontend/src/components/ContentPanel.vue frontend/src/components/AiPanel.vue frontend/src/pages/DocEditor.vue frontend/src/api/sources.ts frontend/src/styles/page-doc.css
git commit -m "feat: add editor annotations and source traceability"
```
