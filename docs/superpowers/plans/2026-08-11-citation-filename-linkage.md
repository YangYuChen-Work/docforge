# Citation Filename Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the concrete source filename beside inline chapter citations and make inline citation markers and source cards navigate to each other with a visible flash state.

**Architecture:** Keep citation labels as non-persistent Tiptap/ProseMirror decorations. `DocEditor` enriches the current chapter's citation records with filenames from the already-loaded `sourceDetails`; `ReferenceDecorations` renders the filename label and tooltip; `AiPanel` owns source-card scrolling and flash feedback; `DocEditor` coordinates active citation state and tab changes.

**Tech Stack:** Vue 3, TypeScript, Tiptap 3, ProseMirror decorations, Vite, Node test runner, CSS animations.

## Global Constraints

- Do not change the database schema or backend citation API.
- Do not write source filenames or visual markers into `content_json`, DOCX, or PDF output.
- Keep exact source-excerpt matching and the existing fallback message when no precise body range exists.
- Reuse `sourceDetails[ source_document_id ].original_name`; on unavailable metadata show the source ID fallback instead of inventing a filename.
- Preserve unrelated user changes already present in the working tree.
- Keep source-file content read-only; frontend runtime changes remain in source files and do not modify `data/`.

---

### Task 1: Enrich inline citation decorations with source filenames

**Files:**
- Modify: `frontend/src/editor/ReferenceDecorations.ts`
- Modify: `frontend/src/pages/DocEditor.vue:277-282`
- Create: `frontend/tests/source-linkage.test.mjs`

**Interfaces:**
- `CitationRef` gains optional `fileName?: string | null` while retaining `key` and `source_excerpt`.
- `DocEditor.chapterCitations` continues returning citation objects with a stable `key`, and now returns `fileName` from `sourceDetails` or `来源资料 <source_document_id>` when metadata is unavailable.
- `ReferenceDecorations` renders a source widget whose visible text, `title`, and `aria-label` are the same full filename label prefixed with `来源：`.

- [ ] **Step 1: Add failing static tests for the filename contract**

Create `frontend/tests/source-linkage.test.mjs` with assertions that the source decoration type has `fileName`, the marker sets a title and aria label, and `DocEditor` reads `original_name`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const testDir = dirname(fileURLToPath(import.meta.url))
const decorations = readFileSync(join(testDir, '../src/editor/ReferenceDecorations.ts'), 'utf8')
const editor = readFileSync(join(testDir, '../src/pages/DocEditor.vue'), 'utf8')

test('renders the concrete source filename on inline citation markers', () => {
  assert.match(decorations, /fileName\?: string \| null/)
  assert.match(decorations, /marker\.title = label/)
  assert.match(decorations, /marker\.setAttribute\('aria-label', label\)/)
  assert.match(decorations, /const fileName = citation\.fileName/)
  assert.match(decorations, /const label = `来源：\$\{fileName\}`/)
  assert.match(editor, /sourceDetails\.value\[citation\.source_document_id\][\s\S]*original_name/)
})
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `node --test frontend/tests/source-linkage.test.mjs`

Expected: FAIL because the citation type does not expose `fileName` and the marker still says `来源 1`.

- [ ] **Step 3: Extend the citation decoration input and marker label**

In `ReferenceDecorations.ts`, add the optional file name and build a stable label before creating the widget:

```ts
export type CitationRef = {
  key: string
  source_excerpt?: string | null
  fileName?: string | null
  source_document_id?: string | null
}

const fileName = citation.fileName || `来源资料 ${citation.source_document_id || citation.key}`
const label = `来源：${fileName}`
```

Pass `label` to `markerDecoration` in place of `来源 ${citationNumber}`. Keep the existing click callback, active class, `title`, and `aria-label` behavior.

- [ ] **Step 4: Enrich chapter citations from source metadata**

Update `chapterCitations` in `DocEditor.vue` so each citation is copied without mutation and gets the actual source filename when available:

```ts
const chapterCitations = computed(() =>
  (currentChapter.value?.citations || []).map((citation: any, index: number) => ({
    ...citation,
    key: citation.key || `${citation.source_document_id}:${index}`,
    fileName:
      sourceDetails.value[citation.source_document_id]?.original_name ||
      `来源资料 ${citation.source_document_id}`,
  })),
)
```

- [ ] **Step 5: Run the focused test and build**

Run: `node --test frontend/tests/source-linkage.test.mjs`

Expected: PASS for the filename assertions.

Run: `npm run build` from `frontend/`.

Expected: TypeScript and Vite build exit with code 0.

- [ ] **Step 6: Commit the inline filename change**

```bash
git add frontend/src/editor/ReferenceDecorations.ts frontend/src/pages/DocEditor.vue frontend/tests/source-linkage.test.mjs
git commit -m "feat: show source filenames on citation markers"
```

### Task 2: Scroll and flash the matching source card

**Files:**
- Modify: `frontend/src/components/AiPanel.vue:216-241,500-560`
- Modify: `frontend/src/pages/DocEditor.vue:821-831`
- Modify: `frontend/tests/source-linkage.test.mjs`

**Interfaces:**
- `AiPanel` exposes `focusCitationCard(citationKey: string): void` in addition to its existing public methods.
- `focusCitationCard` switches to the sources tab, locates `.source-card[data-citation-key="..."]` by dataset value, scrolls it into view, and applies `.source-card-flash` for one animation cycle.
- `DocEditor.onCitationSelect` sets active citation state, opens the sources tab, and calls `aiPanelRef.value?.focusCitationCard(citationKey)`.

- [ ] **Step 1: Extend the failing static tests for card focus**

Append assertions to `frontend/tests/source-linkage.test.mjs`:

```js
test('focuses and flashes the matching source card from a citation selection', () => {
  assert.match(panel, /data-citation-key="citation\.key"/)
  assert.match(panel, /function focusCitationCard\(citationKey: string\)/)
  assert.match(panel, /scrollIntoView\(/)
  assert.match(panel, /classList\.add\('source-card-flash'\)/)
  assert.match(editor, /focusCitationCard\(citationKey\)/)
})
```

- [ ] **Step 2: Run the focused test and verify the new assertions fail**

Run: `node --test frontend/tests/source-linkage.test.mjs`

Expected: FAIL because the source card has no data attribute or focus method yet.

- [ ] **Step 3: Add a stable citation key to each source card**

Change the source-card article in `AiPanel.vue` to expose the computed citation key:

```vue
<article
  v-for="citation in citationCards"
  :key="citation.key"
  class="source-card"
  :data-citation-key="citation.key"
  :class="{ active: activeCitationKey === citation.key, context: citation.citation_type === 'context' }"
  @click="$emit('citationFocus', citation.key)"
>
```

- [ ] **Step 4: Implement card focus and one-shot flash**

Add a timer variable and method in `AiPanel.vue`. Locate by `dataset` rather than interpolating an untrusted key into a CSS selector:

```ts
let citationFlashTimer: ReturnType<typeof setTimeout> | null = null

function focusCitationCard(citationKey: string) {
  activeTab.value = 'sources'
  nextTick(() => {
    const card = Array.from(document.querySelectorAll<HTMLElement>('.source-card'))
      .find((item) => item.dataset.citationKey === citationKey)
    if (!card) return
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    card.classList.remove('source-card-flash')
    void card.offsetWidth
    card.classList.add('source-card-flash')
    if (citationFlashTimer) clearTimeout(citationFlashTimer)
    citationFlashTimer = setTimeout(() => {
      card.classList.remove('source-card-flash')
      citationFlashTimer = null
    }, 1000)
  })
}
```

Expose it with the existing `defineExpose` call and clear `citationFlashTimer` in `onBeforeUnmount`.

- [ ] **Step 5: Route inline citation selection through card focus**

Update `DocEditor.onCitationSelect` while preserving active-state behavior:

```ts
function onCitationSelect(citationKey: string) {
  activeCitationKey.value = citationKey
  activeAnnotationId.value = ''
  aiPanelRef.value?.openTab('sources')
  aiPanelRef.value?.focusCitationCard(citationKey)
}
```

The existing `focusCitation` path still calls `onCitationSelect` before focusing the正文 range, so both directions share the same card feedback.

- [ ] **Step 6: Run focused tests and build**

Run: `node --test frontend/tests/source-linkage.test.mjs`

Expected: PASS.

Run: `npm run build` from `frontend/`.

Expected: PASS with no Vue or TypeScript errors.

- [ ] **Step 7: Commit the source-card linkage change**

```bash
git add frontend/src/components/AiPanel.vue frontend/src/pages/DocEditor.vue frontend/tests/source-linkage.test.mjs
git commit -m "feat: link citation markers to source cards"
```

### Task 3: Add long-label layout and flash styling, then verify the full frontend

**Files:**
- Modify: `frontend/src/components/ContentPanel.vue:695-729`
- Modify: `frontend/src/styles/page-doc.css:394-409`
- Modify: `frontend/tests/source-linkage.test.mjs`

**Interfaces:**
- Source marker styles support the full filename without hiding the tooltip or preventing clicks.
- `.source-card-flash` is visual-only and does not replace `.source-card.active`.

- [ ] **Step 1: Add failing style assertions**

Append to `frontend/tests/source-linkage.test.mjs`:

```js
const contentPanel = readFileSync(join(testDir, '../src/components/ContentPanel.vue'), 'utf8')
const styles = readFileSync(join(testDir, '../src/styles/page-doc.css'), 'utf8')

test('styles full filename markers and the source-card flash state', () => {
  assert.match(contentPanel, /\.word-body :deep\(\.source-marker\)[\s\S]*white-space: normal/)
  assert.match(styles, /\.source-card-flash\s*\{[^}]*animation:/)
  assert.match(styles, /@keyframes sourceCardFlash/)
})
```

- [ ] **Step 2: Run the style test and verify it fails**

Run: `node --test frontend/tests/source-linkage.test.mjs`

Expected: FAIL because the existing source marker has no long-label rule and the stylesheet has no flash animation.

- [ ] **Step 3: Add marker and card styles**

Extend the scoped source marker rule in `ContentPanel.vue` with wrapping and readable alignment:

```css
.word-body :deep(.source-marker) {
  max-width: min(100%, 420px);
  padding: 2px 6px;
  white-space: normal;
  line-height: 1.35;
  text-align: left;
}
```

Add a one-shot card flash that preserves the existing active and context colors between keyframes:

```css
.source-card-flash { animation: sourceCardFlash 1s ease both; }
@keyframes sourceCardFlash {
  0%, 100% { box-shadow: none; }
  35%, 70% { box-shadow: 0 0 0 3px rgba(22, 119, 255, .22), 0 6px 18px rgba(22, 119, 255, .14); }
}
```

- [ ] **Step 4: Run all frontend tests and build**

Run: `node --test frontend/tests/*.test.mjs` from the repository root.

Expected: all frontend Node tests pass.

Run: `npm run build` from `frontend/`.

Expected: Vue type-check and Vite build pass with exit code 0.

- [ ] **Step 5: Review the final diff and verify no backend/export files changed**

Run: `git diff --stat 545f64d..HEAD -- frontend tests` and `git diff --name-only 545f64d..HEAD -- app frontend tests`.

Expected: the diff contains only the intended frontend files/tests; the second command prints no `app/` paths.

- [ ] **Step 6: Commit the final visual verification change**

```bash
git add frontend/src/components/ContentPanel.vue frontend/src/styles/page-doc.css frontend/tests/source-linkage.test.mjs
git commit -m "style: support citation filename linkage feedback"
```
