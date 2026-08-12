# LZOS-Inspired Frontend Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Docforge frontend into a cohesive LZOS-inspired industrial workbench with matched light and dark themes and robust 1024px–1920px desktop layouts, without changing backend logic or API contracts.

**Architecture:** Keep the existing Vue 3 components, routes, API modules, and business state. Use `visual-system.css` as the authoritative semantic-token and application-shell layer, keep page-specific layout rules close to their existing stylesheets, and add only the minimal editor state needed to turn the evidence panel into a narrow-desktop drawer.

**Tech Stack:** Vue 3, TypeScript, Vue Router, Pinia, Tiptap, native CSS, Node.js built-in test runner, Vite, Playwright CLI.

## Global Constraints

- Modify only `frontend/`, frontend tests, and the approved design/plan documents.
- Do not modify `backend/`, database files, migrations, API paths, request parameters, or response shapes.
- Do not add a UI framework, icon library, network font, or runtime dependency.
- Preserve all existing routes and business actions.
- Preserve the “徐工重型” brand name, emblem asset, and local font stack.
- Support light and dark themes with the same semantic hierarchy.
- Treat 1024px, 1280px, 1440px, 1600px, and 1920px as the desktop verification matrix.
- Use test-first changes for component structure and CSS contracts.
- Keep unrelated untracked files out of every commit.

---

### Task 1: Semantic theme tokens and industrial application shell

**Files:**
- Create: `frontend/tests/workbench-theme.test.mjs`
- Modify: `frontend/src/styles/visual-system.css`
- Modify: `frontend/src/components/AppSidebar.vue`

**Interfaces:**
- Consumes: the existing `data-theme="light|dark"` attribute from `frontend/src/App.vue`.
- Produces: stable CSS custom properties `--ui-canvas`, `--ui-surface`, `--ui-surface-muted`, `--ui-nav`, `--ui-nav-strong`, `--ui-primary`, `--ui-primary-wash`, `--ui-line`, `--ui-line-strong`, `--ui-paper`, and `--ui-paper-ink` for later tasks.
- Produces: the existing `.sidebar-shell`, `.sidebar`, `.nav-item`, `.theme-toggle`, and collapsed-state contracts with new visual styling but unchanged navigation behavior.

- [ ] **Step 1: Write the failing theme contract test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const css = readFileSync(resolve(root, 'src/styles/visual-system.css'), 'utf8')
const sidebar = readFileSync(resolve(root, 'src/components/AppSidebar.vue'), 'utf8')

test('defines matched light and dark industrial workbench tokens', () => {
  assert.match(css, /:root\s*\{[\s\S]*--ui-canvas:\s*#eef3f6;/)
  assert.match(css, /:root\s*\{[\s\S]*--ui-nav:\s*#086783;/)
  assert.match(css, /:root\s*\{[\s\S]*--ui-paper:\s*#fffdf8;/)
  assert.match(css, /\[data-theme="dark"\]\s*\{[\s\S]*--ui-canvas:\s*#0d171d;/)
  assert.match(css, /\[data-theme="dark"\]\s*\{[\s\S]*--ui-nav:\s*#083f53;/)
  assert.match(css, /\[data-theme="dark"\]\s*\{[\s\S]*--ui-paper:/)
})

test('keeps the branded sidebar and exposes theme state accessibly', () => {
  assert.match(sidebar, /aria-label="徐工重型"/)
  assert.match(sidebar, /:aria-pressed="props\.theme === 'dark'"/)
  assert.match(css, /\.sidebar\s*\{[\s\S]*background:\s*var\(--ui-nav\)/)
  assert.match(css, /\.nav-item\.active\s*\{[\s\S]*background:/)
})

test('theme transitions do not animate layout dimensions', () => {
  const transitionBlock = css.match(/\.app,[\s\S]*?\{[\s\S]*?transition:[^}]+\}/)?.[0] ?? ''
  assert.doesNotMatch(transitionBlock, /\bwidth\b|\bheight\b|grid-template/)
})
```

- [ ] **Step 2: Run the theme test and verify RED**

Run: `Set-Location frontend; node --test tests/workbench-theme.test.mjs`

Expected: FAIL because the approved `#eef3f6`, `#086783`, `#0d171d`, `#083f53`, and paper tokens are not all defined.

- [ ] **Step 3: Implement the semantic token sets**

Replace the token declarations at the top of `visual-system.css` with the approved values and add paper tokens:

```css
:root {
  --ui-canvas: #eef3f6;
  --ui-surface: #ffffff;
  --ui-surface-muted: #f5f8fa;
  --ui-surface-accent: #e5f3f8;
  --ui-ink: #132a35;
  --ui-ink-soft: #58707c;
  --ui-ink-faint: #81939c;
  --ui-line: #cbd8de;
  --ui-line-strong: #afc1ca;
  --ui-nav: #086783;
  --ui-nav-strong: #07546b;
  --ui-primary: #2e8eae;
  --ui-primary-strong: #176d8a;
  --ui-primary-wash: #e5f3f8;
  --ui-paper: #fffdf8;
  --ui-paper-ink: #17252b;
}

[data-theme="dark"] {
  --ui-canvas: #0d171d;
  --ui-surface: #16242b;
  --ui-surface-muted: #1d3039;
  --ui-surface-accent: #1c3c48;
  --ui-ink: #e7f0f3;
  --ui-ink-soft: #a8bcc5;
  --ui-ink-faint: #718893;
  --ui-line: #2b424d;
  --ui-line-strong: #3b5864;
  --ui-nav: #083f53;
  --ui-nav-strong: #062f3e;
  --ui-primary: #61b6d2;
  --ui-primary-strong: #8bcce0;
  --ui-primary-wash: #1c3c48;
  --ui-paper: #e9e6de;
  --ui-paper-ink: #18262c;
}
```

Update sidebar selectors to use the navigation tokens, a light active row, restrained hover feedback, visible keyboard focus, and unchanged 208px/60px expanded/collapsed geometry. Keep the existing brand DOM and local emblem asset.

- [ ] **Step 4: Run theme and existing sidebar tests and verify GREEN**

Run: `Set-Location frontend; node --test tests/workbench-theme.test.mjs tests/sidebar-brand-cleanup.test.mjs`

Expected: 9 tests pass with 0 failures.

- [ ] **Step 5: Commit the shell and theme foundation**

```powershell
git add frontend/tests/workbench-theme.test.mjs frontend/src/styles/visual-system.css frontend/src/components/AppSidebar.vue
git commit -m "style(frontend): establish industrial workbench themes"
```

---

### Task 2: Document list work surface and shared control rhythm

**Files:**
- Create: `frontend/tests/workbench-list-layout.test.mjs`
- Modify: `frontend/src/pages/DocList.vue`
- Modify: `frontend/src/styles/visual-system.css`

**Interfaces:**
- Consumes: Task 1 semantic theme tokens.
- Produces: keyboard-accessible `.doc-table-scroll` region, contiguous `.doc-stats` metric strip, stable `.doc-main-layout`, and 34–36px shared control sizing.
- Preserves: document list loading, filtering, row navigation, selection, single delete, and batch delete behavior.

- [ ] **Step 1: Write the failing document-list layout test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const page = readFileSync(resolve(root, 'src/pages/DocList.vue'), 'utf8')
const css = readFileSync(resolve(root, 'src/styles/visual-system.css'), 'utf8')

test('document table owns horizontal scrolling and exposes a named region', () => {
  assert.match(page, /class="doc-table-scroll"[^>]*tabindex="0"/)
  assert.match(page, /class="doc-table-scroll"[^>]*role="region"/)
  assert.match(page, /aria-label="项目文档列表"/)
  assert.match(css, /\.doc-table-scroll\s*\{[\s\S]*overflow-x:\s*auto;/)
  assert.match(css, /\.doc-table\s*\{[\s\S]*min-width:\s*720px;/)
})

test('document metrics use one contiguous work surface', () => {
  assert.match(css, /\.doc-stats\s*\{[\s\S]*gap:\s*0;/)
  assert.match(css, /\.doc-stat-card\s*\{[\s\S]*border-radius:\s*0;/)
  assert.match(css, /\.doc-stat-card\s*\+[\s\S]*border-left:/)
})

test('shared controls use the compact desktop rhythm', () => {
  assert.match(css, /\.btn\s*\{[\s\S]*min-height:\s*36px;/)
  assert.match(css, /\.doc-search[\s\S]*min-height:\s*36px;/)
  assert.match(css, /\.doc-table tbody td\s*\{[\s\S]*height:\s*42px;/)
})
```

- [ ] **Step 2: Run the list layout test and verify RED**

Run: `Set-Location frontend; node --test tests/workbench-list-layout.test.mjs`

Expected: FAIL because the table scroll region lacks accessibility attributes and the metric/control geometry still uses the previous card layout.

- [ ] **Step 3: Add the accessible table region**

Change the populated table wrapper in `DocList.vue` to:

```vue
<div
  v-else
  class="doc-table-scroll"
  tabindex="0"
  role="region"
  aria-label="项目文档列表"
>
```

Do not alter the table rows, click handlers, selection handlers, or API calls.

- [ ] **Step 4: Implement the contiguous metrics and work-surface styling**

In `visual-system.css`:

- make `.doc-stats` a zero-gap bordered grid with one shared background;
- remove individual metric-card shadows and radii;
- use internal left borders between metrics;
- set `.doc-main-layout` to `minmax(0, 1fr) minmax(248px, 300px)`;
- set `.btn` and `.doc-search` to 36px minimum height;
- set data rows to 42px and `.doc-table` to a 720px minimum width;
- use `position: sticky; right: 0` for the action header/cells only inside the table container;
- add `scrollbar-gutter: stable` and a visible focus style to `.doc-table-scroll`.

- [ ] **Step 5: Run list and existing frontend tests and verify GREEN**

Run: `Set-Location frontend; node --test tests/workbench-list-layout.test.mjs tests/*.test.mjs`

Expected: all tests pass with 0 failures.

- [ ] **Step 6: Commit the document-list work surface**

```powershell
git add frontend/tests/workbench-list-layout.test.mjs frontend/src/pages/DocList.vue frontend/src/styles/visual-system.css
git commit -m "style(frontend): refine document work surface"
```

---

### Task 3: Wizard, configuration, and audit local alignment

**Files:**
- Create: `frontend/tests/workbench-secondary-pages.test.mjs`
- Modify: `frontend/src/pages/DocWizard.vue`
- Modify: `frontend/src/pages/DocConfig.vue`
- Modify: `frontend/src/pages/AuditLog.vue`
- Modify: `frontend/src/styles/visual-system.css`
- Modify: `frontend/src/styles/page-audit.css`

**Interfaces:**
- Consumes: Task 1 tokens and Task 2 control rhythm.
- Produces: reusable classes `.page-back-link`, `.workbench-empty-state`, `.wizard-confirm-panel`, `.config-detail-empty`, and `.audit-table-scroll`.
- Preserves: wizard selection/upload/generation, template selection/toggle, audit filtering/pagination, and all existing API calls.

- [ ] **Step 1: Write the failing secondary-page structure test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')

test('wizard uses semantic classes instead of layout inline styles', () => {
  const page = read('src/pages/DocWizard.vue')
  assert.match(page, /class="page-back-link"/)
  assert.match(page, /class="workbench-empty-state"/)
  assert.match(page, /class="wizard-confirm-panel"/)
  assert.doesNotMatch(page, /style="color:#1a5ccc/)
  assert.doesNotMatch(page, /style="font-size:12px;color:#999/)
})

test('configuration page exposes a structured detail empty state', () => {
  const page = read('src/pages/DocConfig.vue')
  assert.match(page, /class="config-detail-empty"/)
  assert.doesNotMatch(page, /style="text-align:\s*center;\s*padding:\s*40px/)
})

test('audit table owns scrolling and keeps pagination outside the scrollport', () => {
  const page = read('src/pages/AuditLog.vue')
  assert.match(page, /class="audit-table-scroll"[^>]*tabindex="0"/)
  assert.match(page, /aria-label="日志审计记录"/)
  assert.ok(page.indexOf('audit-table-scroll') < page.indexOf('audit-pagination'))
  assert.match(read('src/styles/page-audit.css'), /\.audit-table-scroll\s*\{[\s\S]*overflow:\s*auto;/)
})
```

- [ ] **Step 2: Run the secondary-page test and verify RED**

Run: `Set-Location frontend; node --test tests/workbench-secondary-pages.test.mjs`

Expected: FAIL because the semantic classes and audit scrollport do not exist.

- [ ] **Step 3: Replace wizard and configuration inline layout styles**

In `DocWizard.vue`:

- replace the inline back-link style with `class="page-back-link"`;
- replace every inline empty message with `class="workbench-empty-state"`;
- add `wizard-confirm-panel` to the right confirmation card;
- replace the inline “资料匹配” top margin with `class="side-subtitle wizard-match-title"`;
- replace inline hidden file input style with the existing `editor-image-input`-equivalent utility class `visually-hidden-input`.

In `DocConfig.vue`:

- replace search/tab/action inline margins with `.config-search`, `.config-category-tabs`, and `.config-actions`;
- replace list/detail empty inline styles with `.workbench-empty-state` and `.config-detail-empty`;
- replace chapter inline margins with `.config-chapter-row`.

- [ ] **Step 4: Add the audit table scrollport without changing data behavior**

Wrap only the `<table class="audit-table">` in:

```vue
<div class="audit-table-scroll" tabindex="0" role="region" aria-label="日志审计记录">
  <table class="audit-table">
    <!-- existing thead and tbody unchanged -->
  </table>
</div>
```

Keep `.audit-pagination` as the next sibling inside `.audit-table-wrapper`.

- [ ] **Step 5: Implement local layout and state styling**

In `visual-system.css` and `page-audit.css`:

- style the wizard step indicator as a compact numbered rail with a continuous divider;
- use `minmax(0, 1fr) minmax(260px, 300px)` for `.doc-new-layout` and make the confirmation panel sticky within the page, not the viewport;
- use `minmax(300px, 360px) minmax(0, 1fr)` for `.config-layout`;
- style structured empty states with a bordered muted surface and concise text;
- make `.audit-stats` a zero-gap metric strip;
- place audit filters in one bordered workbench toolbar;
- set `.audit-table-scroll` to `overflow: auto`, `scrollbar-gutter: stable`, and a visible focus state;
- set `.audit-table` to `min-width: 920px`, sticky header cells, 42px rows, tabular dates, and ellipsized entity IDs;
- keep `.audit-pagination` outside the scrollport with a top border and fixed control alignment.

- [ ] **Step 6: Run secondary-page and full frontend tests and verify GREEN**

Run: `Set-Location frontend; node --test tests/workbench-secondary-pages.test.mjs tests/*.test.mjs`

Expected: all tests pass with 0 failures.

- [ ] **Step 7: Commit the secondary-page alignment**

```powershell
git add frontend/tests/workbench-secondary-pages.test.mjs frontend/src/pages/DocWizard.vue frontend/src/pages/DocConfig.vue frontend/src/pages/AuditLog.vue frontend/src/styles/visual-system.css frontend/src/styles/page-audit.css
git commit -m "style(frontend): align workflow and audit pages"
```

---

### Task 4: Responsive editor evidence drawer and paper-plane theme

**Files:**
- Create: `frontend/tests/editor-responsive-panel.test.mjs`
- Modify: `frontend/src/pages/DocEditor.vue`
- Modify: `frontend/src/styles/editor-refresh.css`
- Modify: `frontend/src/styles/editor-interaction.css`
- Modify: `frontend/src/styles/visual-system.css`

**Interfaces:**
- Consumes: existing `AiPanel` props, events, and `aiPanelRef` methods without changing `AiPanel.vue` public behavior.
- Produces: local `evidencePanelOpen: Ref<boolean>`, `.editor-evidence-toggle`, `.editor-evidence-backdrop`, and `.editor-evidence-shell`.
- Preserves: chapter selection, editing, save, regenerate, confirmation, export, citations, annotations, and AI actions.

- [ ] **Step 1: Write the failing responsive-editor test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const page = readFileSync(resolve(root, 'src/pages/DocEditor.vue'), 'utf8')
const css = readFileSync(resolve(root, 'src/styles/editor-refresh.css'), 'utf8')

test('editor exposes an accessible narrow-desktop evidence drawer', () => {
  assert.match(page, /class="editor-evidence-toggle"/)
  assert.match(page, /:aria-expanded="evidencePanelOpen"/)
  assert.match(page, /class="editor-evidence-shell"/)
  assert.match(page, /:class="\{ 'is-open': evidencePanelOpen \}"/)
  assert.match(page, /class="editor-evidence-backdrop"/)
  assert.match(page, /const evidencePanelOpen = ref\(false\)/)
})

test('evidence panel becomes a drawer below 1180px without shrinking the paper', () => {
  assert.match(css, /@media \(max-width:\s*1179px\) and \(min-width:\s*768px\)/)
  assert.match(css, /\.editor-body\s*\{[\s\S]*grid-template-columns:\s*minmax\(184px,\s*214px\) minmax\(0,\s*1fr\);/)
  assert.match(css, /\.editor-evidence-shell\s*\{[\s\S]*position:\s*fixed;/)
  assert.match(css, /\.editor-evidence-shell\.is-open\s*\{[\s\S]*transform:\s*translateX\(0\);/)
})

test('editor paper uses semantic paper colors in both themes', () => {
  assert.match(css, /\.word-page\s*\{[\s\S]*background:\s*var\(--ui-paper\);/)
  assert.match(css, /\.word-page\s*\{[\s\S]*color:\s*var\(--ui-paper-ink\);/)
})
```

- [ ] **Step 2: Run the responsive-editor test and verify RED**

Run: `Set-Location frontend; node --test tests/editor-responsive-panel.test.mjs`

Expected: FAIL because the evidence drawer controls and 1179px breakpoint do not exist.

- [ ] **Step 3: Add editor-local evidence panel state and markup**

Add `const evidencePanelOpen = ref(false)` beside the existing local UI refs.

Add a top-bar button after the confirm button group:

```vue
<button
  class="editor-evidence-toggle"
  type="button"
  :aria-expanded="evidencePanelOpen"
  aria-controls="editor-evidence-panel"
  @click="evidencePanelOpen = !evidencePanelOpen"
>
  数据来源
</button>
```

Replace the direct `AiPanel` child with:

```vue
<button
  v-if="evidencePanelOpen"
  class="editor-evidence-backdrop"
  type="button"
  aria-label="关闭数据来源面板"
  @click="evidencePanelOpen = false"
/>
<div
  id="editor-evidence-panel"
  class="editor-evidence-shell"
  :class="{ 'is-open': evidencePanelOpen }"
>
  <button class="editor-evidence-close" type="button" @click="evidencePanelOpen = false">关闭</button>
  <AiPanel
    ref="aiPanelRef"
    :annotations="annotations"
    :citations="chapterCitations"
    :sourceDetails="sourceDetails"
    :citationState="citationState"
    :selectionText="selectionText"
    :activeAnnotationId="activeAnnotationId"
    :activeCitationKey="activeCitationKey"
    @updateAnnotation="updateAnnotation"
    @replaceSelection="replaceSelection"
    @insertAtCursor="insertAtCursor"
    @aiAction="doAiAction"
    @createAnnotation="handleCreateAnnotation"
    @annotationFocus="focusAnnotation"
    @citationFocus="focusCitation"
    @commentAiAction="handleCommentAiAction"
  />
</div>
```

- [ ] **Step 4: Implement wide and narrow desktop editor geometry**

In `editor-refresh.css`:

- use `minmax(214px, 248px) minmax(0, 1fr) minmax(280px, 320px)` at 1440px and above;
- make `.editor-evidence-shell` a normal grid child and hide toggle/close/backdrop controls at 1180px and above;
- at 768px–1179px, use `minmax(184px, 214px) minmax(0, 1fr)` for `.editor-body`;
- at that breakpoint, make `.editor-evidence-shell` a fixed right drawer with `width: min(340px, calc(100vw - 80px))`, full editor height, `translateX(105%)` closed state, and `translateX(0)` open state;
- make the backdrop cover only the content area and keep it below the drawer;
- set `.word-page` to the semantic paper background and ink tokens;
- preserve independent scrolling for outline, paper viewport, and evidence contents;
- keep the toolbar one line with horizontal scrolling and no layout-width animation.

- [ ] **Step 5: Run editor-specific and full frontend tests and verify GREEN**

Run: `Set-Location frontend; node --test tests/editor-responsive-panel.test.mjs tests/editor-interaction.test.mjs tests/ai-panel-layout.test.mjs tests/*.test.mjs`

Expected: all tests pass with 0 failures.

- [ ] **Step 6: Commit the responsive editor**

```powershell
git add frontend/tests/editor-responsive-panel.test.mjs frontend/src/pages/DocEditor.vue frontend/src/styles/editor-refresh.css frontend/src/styles/editor-interaction.css frontend/src/styles/visual-system.css
git commit -m "style(frontend): adapt editor evidence workspace"
```

---

### Task 5: Browser matrix polish, build verification, and backend-boundary audit

**Files:**
- Modify only if browser evidence requires an exact approved adjustment: `frontend/src/styles/visual-system.css`, `frontend/src/styles/page-audit.css`, `frontend/src/styles/editor-refresh.css`, `frontend/src/styles/editor-interaction.css`
- Test: all files under `frontend/tests/`
- Artifact output: `output/playwright/frontend-lzos-refactor/` (untracked)

**Interfaces:**
- Consumes: the completed Tasks 1–4 frontend.
- Produces: verified screenshots for five routes, five viewport widths, and both themes.
- Produces: a Git diff containing no `backend/` path.

- [ ] **Step 1: Run the full automated frontend verification**

Run:

```powershell
Set-Location frontend
npm run build
node --test tests\*.test.mjs
```

Expected: Vite build exits 0 and every Node test passes.

- [ ] **Step 2: Start the existing backend and branch frontend for visual verification**

Run the backend with `AI_PROVIDER=mock` and the frontend on a dedicated local port. Do not edit backend files or seed data.

```powershell
Set-Location D:\桌面\Nancal\docforge
$env:AI_PROVIDER = 'mock'
uv run uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In a second process:

```powershell
Set-Location D:\桌面\Nancal\docforge\frontend
npm run dev -- --host 127.0.0.1 --port 4174
```

- [ ] **Step 3: Capture the light-theme route matrix with Playwright CLI**

For each width `1024`, `1280`, `1440`, `1600`, and `1920`, use a height of `1000` and capture:

- `http://127.0.0.1:4174/#/`
- `http://127.0.0.1:4174/#/doc/new`
- `http://127.0.0.1:4174/#/config`
- `http://127.0.0.1:4174/#/audit`
- one existing `http://127.0.0.1:4174/#/doc/<document-id>` route returned by `GET /api/documents`

Expected visual checks at every width:

- no page-root horizontal overflow;
- aligned headings, inputs, buttons, table headers, and form labels;
- table overflow contained in its named scroll region;
- no clipped action columns or overlapped text;
- editor paper remains readable and the evidence drawer activates below 1180px.

- [ ] **Step 4: Capture the dark-theme route matrix**

Use the existing theme toggle on each route, re-snapshot after the state change, and capture the same viewport matrix.

Expected visual checks:

- theme switch does not change element dimensions;
- surfaces remain distinguishable without pure-black blocks;
- status labels, focus rings, inputs, and disabled controls remain readable;
- document paper remains visually separate from the dark editor chrome.

- [ ] **Step 5: Apply only evidence-backed CSS corrections**

If a matrix screenshot violates a listed check, first add a failing assertion to the relevant Task 1–4 test file for the exact missing contract, run it to confirm RED, then make the smallest selector change and rerun that test to GREEN. Do not change Vue business logic during this step.

- [ ] **Step 6: Re-run the final verification after visual corrections**

Run:

```powershell
Set-Location frontend
npm run build
node --test tests\*.test.mjs
Set-Location ..
git diff --check
git diff --name-only main...HEAD
```

Expected:

- build exits 0;
- all tests pass;
- `git diff --check` has no output;
- `git diff --name-only main...HEAD` contains no path beginning with `backend/`.

- [ ] **Step 7: Commit final responsive polish if files changed**

```powershell
git add frontend/src/styles frontend/tests
git commit -m "style(frontend): finish responsive workbench polish"
```

If no tracked file changed after the matrix review, skip this commit.
