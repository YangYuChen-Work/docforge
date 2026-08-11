# Table Citation Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every reliably traceable chapter table display its source filename and keep table markers, source cards, and正文定位双向联动。

**Architecture:** Keep provenance out of persisted chapter content. Extend the existing Tiptap/ProseMirror decoration extension with a shared citation resolver that matches structured JSON table citations against table-cell values, places a widget beside the table caption or table node, and returns the same table range to source-card navigation. Reuse the existing citation key, active state, source-card focus, and flash behavior.

**Tech Stack:** Vue 3, TypeScript, Tiptap, ProseMirror decorations, Node built-in test runner, Vite.

## Global Constraints

- Do not modify chapter `content_json` to persist source markers.
- Do not change the Citation database schema or source parser format.
- Do not fabricate a source marker when there is no source document or no reliable table match.
- Preserve unrelated user edits already present in the working tree.
- Use UTF-8 for Chinese paths and content.

---

### Task 1: Add failing regression checks for structured table citations

**Files:**
- Modify: `frontend/tests/source-linkage.test.mjs:14-36`
- Test: `frontend/tests/source-linkage.test.mjs`

**Interfaces:**
- Consumes: the current source decoration, content-panel, and page-style source strings.
- Produces: explicit static checks for the shared table citation resolver, table marker/node decoration, and table styling.

- [ ] **Step 1: Add assertions that describe the missing behavior**

Extend the existing test file with checks like:

```js
test('maps structured table citations to table-level source markers', () => {
  assert.match(decorations, /locator\?: string \| null/)
  assert.match(decorations, /function findCitationRange\(/)
  assert.match(decorations, /JSON\.parse\(excerpt\)/)
  assert.match(decorations, /source-table-marker/)
  assert.match(decorations, /source-table-highlight/)
  assert.match(contentPanel, /findCitationRange\(editor\.value, citation\)/)
})

test('keeps long table source labels readable and active', () => {
  assert.match(contentPanel, /\.word-body :deep\(\.source-table-marker\)/)
  assert.match(contentPanel, /\.word-body :deep\(\.source-table-highlight\.active\)/)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test frontend/tests/source-linkage.test.mjs`

Expected: FAIL because the current decoration extension has no structured-table resolver or table-level classes.

### Task 2: Implement a shared structured-table citation resolver

**Files:**
- Modify: `frontend/src/editor/ReferenceDecorations.ts:11-179`

**Interfaces:**
- Consumes: `CitationRef` values containing `source_excerpt`, `source_document_id`, `locator`, and `fileName`; the current ProseMirror document.
- Produces: `findCitationRange(editor, citation): TextRange | null`, which returns a full table node range for a reliable structured-table match and otherwise falls back to the existing text range.

- [ ] **Step 1: Extend the citation and table location types**

Add `locator?: string | null` to `CitationRef` and internal types for table values, node range, marker position, and caption range. Keep `findReferenceRange` unchanged for annotations and generic text callers.

- [ ] **Step 2: Collect table nodes and their cell values**

Traverse `state.doc` with `doc.descendants`. For each `table` node, record `from`, `to`, every `tableCell`/`tableHeader` `textContent`, and a marker position. If the previous sibling is a paragraph whose text starts with `表`/`表格`/`table`, record its end position as the marker position; otherwise use `table.to`.

- [ ] **Step 3: Parse and normalize structured citation values**

Parse `source_excerpt` with `JSON.parse` when possible and recursively collect scalar strings from `caption`, `headers`, and `rows` (and nested arrays/objects). Normalize both source values and table-cell values by trimming, lowercasing, removing whitespace, and ignoring common punctuation. Ignore empty and one-character values unless they are part of a longer meaningful token.

- [ ] **Step 4: Score candidates conservatively**

For each citation, count unique normalized source values contained in each table’s normalized cell values. Accept a table only when at least two meaningful values match, or one non-numeric value of at least eight normalized characters matches. If the best score is tied, return no table match so the existing plain-text fallback can run instead of guessing.

- [ ] **Step 5: Export the shared citation range function**

Implement:

```ts
export function findCitationRange(editor: any, citation: CitationRef): TextRange | null
```

It must return the matching table’s `{ from, to }` first, then `findTextRange(state.doc, citation.source_excerpt || '')`. The function must return `null` when the editor or document is unavailable.

### Task 3: Render table-level source markers and active table state

**Files:**
- Modify: `frontend/src/editor/ReferenceDecorations.ts:104-179`
- Modify: `frontend/src/components/ContentPanel.vue:136-178,397-439,724-764`

**Interfaces:**
- Consumes: `findCitationRange` and the internal table match returned by the decoration resolver.
- Produces: one clickable filename marker per unique source document on each matched table; active node decoration and scroll behavior for table citations.

- [ ] **Step 1: Add a table marker decoration path**

In `buildDecorations`, collect tables once. For each citation, resolve a table match. When found, skip the normal inline citation marker for that citation and add:

```ts
Decoration.node(table.from, table.to, {
  class: active ? 'source-table-highlight active' : 'source-table-highlight',
})
markerDecoration(
  table.markerPosition,
  active ? 'source-marker source-table-marker active' : 'source-marker source-table-marker',
  `来源：${fileName}`,
  () => options.onCitationClick(citation.key),
)
```

Deduplicate by `table identity + source_document_id`, preserving the first citation key for the right-panel card target. Continue using the existing inline path for citations that do not resolve to a table.

- [ ] **Step 2: Use the shared resolver for source-card-to正文 navigation**

Change `ContentPanel.vue` to import `findCitationRange` and replace the source-card lookup:

```ts
const range = findCitationRange(editor.value, citation)
```

Keep the current chapter-body fallback message when the resolver returns `null`.

- [ ] **Step 3: Add table marker and active-table styles**

Add styles that make table markers display as a readable block adjacent to the caption/table, allow long filenames to wrap, and give active matched tables a visible blue outline without changing table cell content. Preserve existing `.source-marker` and `.source-highlight` styles.

### Task 4: Verify the full feature and guard the dirty worktree

**Files:**
- Modify: `frontend/tests/source-linkage.test.mjs` only if a verification gap is found.

**Interfaces:**
- Consumes: all changes from Tasks 1–3.
- Produces: passing focused tests, frontend build, and Python regression suite with unrelated working-tree files untouched.

- [ ] **Step 1: Run focused frontend tests**

Run: `node --test frontend/tests/source-linkage.test.mjs frontend/tests/*.test.mjs`

Expected: all frontend static regression tests pass.

- [ ] **Step 2: Build the frontend**

Run: `npm run build` from `/Users/lucianyoung/dev/nancaldev/document-generation/frontend`

Expected: Vite build succeeds; an existing large-chunk warning is acceptable if no new error appears.

- [ ] **Step 3: Run Python regressions with the project virtualenv**

Run: `.venv/bin/python -m pytest -q`

Expected: the existing Python suite passes with no failures attributable to the frontend-only change.

- [ ] **Step 4: Inspect the final diff and worktree**

Run: `git diff -- frontend/src/editor/ReferenceDecorations.ts frontend/src/components/ContentPanel.vue frontend/tests/source-linkage.test.mjs`

Confirm only the requested table citation behavior was added, user-owned export and other uncommitted edits remain intact, and no generated artifacts or secrets were introduced.
