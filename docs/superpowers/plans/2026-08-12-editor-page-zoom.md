# 富文本章节页面缩放 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为章节正文预览增加 50%–200% 的页面缩放控件，不改变章节内容、保存数据或导出结果。

**Architecture:** 在 `ContentPanel.vue` 内维护仅属于视图的缩放状态，并把缩放控件放在章节操作栏。无 DOM 依赖的边界计算和百分比格式化放入独立的 `.mjs` 工具模块，由 Node 内置测试直接覆盖；页面使用缩放后的页面框架高度保持正文滚动完整。

**Tech Stack:** Vue 3, TypeScript, Tiptap, 原生 CSS, Node.js built-in test runner, Vite, Playwright CLI。

## Global Constraints

- 缩放只影响章节正文页面预览，不修改 Tiptap 文档 JSON、正文实际字号、章节保存数据或 DOCX 导出内容。
- 缩放范围固定为 50%–200%，步进固定为 10%，默认值固定为 100%。
- 不修改后端 API、数据库模型、业务状态机、引用数据或导出逻辑。
- 缩放控件只在存在章节时显示；无章节时保持现有空状态布局。
- 不覆盖用户源文件；不接触现有未跟踪的 `.agents/`、`.playwright-cli/`、`output/`、资源文件或 `skills-lock.json`。
- 延续现有深色工程工作台样式，使用现有按钮和 `var(--ui-*)` 视觉变量，不引入新 UI 依赖。

---

### Task 1: 建立缩放规则的失败测试

**Files:**
- Create: `frontend/tests/content-zoom.test.mjs`
- Read: `frontend/src/editor/contentZoom.mjs`
- Read: `frontend/src/components/ContentPanel.vue`
- Read: `frontend/src/styles/editor-interaction.css`

**Interfaces:**
- Tests import `clampContentZoom`, `stepContentZoom`, and `formatContentZoom` from `src/editor/contentZoom.mjs`.
- Tests verify the helper behavior and the template/CSS contracts needed by the page controls.

- [ ] **Step 1: Write the failing helper and UI contract tests**

Create `frontend/tests/content-zoom.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  clampContentZoom,
  formatContentZoom,
  stepContentZoom,
} from '../src/editor/contentZoom.mjs'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8').replace(/\r\n/g, '\n')

test('clamps invalid and out-of-range zoom values to the supported preview range', () => {
  assert.equal(clampContentZoom(Number.NaN), 1)
  assert.equal(clampContentZoom(0.2), 0.5)
  assert.equal(clampContentZoom(2.4), 2)
  assert.equal(clampContentZoom(1.37), 1.37)
})

test('steps preview zoom by ten percentage points without crossing either limit', () => {
  assert.equal(stepContentZoom(1, -1), 0.9)
  assert.equal(stepContentZoom(1, 1), 1.1)
  assert.equal(stepContentZoom(0.5, -1), 0.5)
  assert.equal(stepContentZoom(2, 1), 2)
})

test('formats zoom as an accessible percentage label', () => {
  assert.equal(formatContentZoom(0.5), '50%')
  assert.equal(formatContentZoom(1), '100%')
  assert.equal(formatContentZoom(2), '200%')
})

test('content panel exposes zoom controls and scaled page layout hooks', () => {
  const template = read('src/components/ContentPanel.vue')
  const css = read('src/styles/editor-interaction.css')

  assert.match(template, /class="editor-zoom-controls"/)
  assert.match(template, /aria-label="缩小正文页面"/)
  assert.match(template, /aria-label="重置正文页面缩放"/)
  assert.match(template, /aria-label="放大正文页面"/)
  assert.match(template, /class="word-page-zoom-frame"/)
  assert.match(template, /transform: `scale\(\$\{contentZoom\}\)`/)
  assert.match(css, /\.word-page-zoom-frame\s*\{[\s\S]*?min-height:\s*0;/)
  assert.match(css, /transform-origin:\s*top center;/)
})
```

- [ ] **Step 2: Run the new test to verify it fails for the missing production seam**

Run from `frontend/`:

```powershell
node --test tests/content-zoom.test.mjs
```

Expected: FAIL because `src/editor/contentZoom.mjs` does not exist yet. Do not add production code before observing this failure.

### Task 2: Implement the pure zoom rules

**Files:**
- Create: `frontend/src/editor/contentZoom.mjs`
- Create: `frontend/src/editor/contentZoom.d.mts`

**Interfaces:**
- Produces `clampContentZoom(value)`, `stepContentZoom(value, direction)`, and `formatContentZoom(value)`.
- Uses numeric zoom ratios (`0.5`–`2`) so the Vue component can use the value directly in CSS transforms and inline layout calculations.

- [ ] **Step 1: Add the minimal helper implementation**

Create `frontend/src/editor/contentZoom.mjs`:

```js
export const MIN_CONTENT_ZOOM = 0.5
export const MAX_CONTENT_ZOOM = 2
export const DEFAULT_CONTENT_ZOOM = 1
export const CONTENT_ZOOM_STEP = 0.1

export function clampContentZoom(value) {
  if (!Number.isFinite(value)) return DEFAULT_CONTENT_ZOOM
  return Math.min(MAX_CONTENT_ZOOM, Math.max(MIN_CONTENT_ZOOM, Number(value.toFixed(2))))
}

export function stepContentZoom(value, direction) {
  const nextValue = clampContentZoom(value) + direction * CONTENT_ZOOM_STEP
  return clampContentZoom(nextValue)
}

export function formatContentZoom(value) {
  return `${Math.round(clampContentZoom(value) * 100)}%`
}
```

Create the matching declaration file `frontend/src/editor/contentZoom.d.mts` so the Vue TypeScript build can type-check the JavaScript module:

```ts
export declare const MIN_CONTENT_ZOOM: number
export declare const MAX_CONTENT_ZOOM: number
export declare const DEFAULT_CONTENT_ZOOM: number
export declare const CONTENT_ZOOM_STEP: number
export declare function clampContentZoom(value: number): number
export declare function stepContentZoom(value: number, direction: -1 | 1): number
export declare function formatContentZoom(value: number): string
```

- [ ] **Step 2: Run the helper tests to verify they pass**

Run from `frontend/`:

```powershell
node --test tests/content-zoom.test.mjs
```

Expected: the first three tests PASS and the UI contract test remains FAIL because the component and stylesheet have not been wired yet.

### Task 3: Add page zoom state and accessible controls to the chapter body

**Files:**
- Modify: `frontend/src/components/ContentPanel.vue`

**Interfaces:**
- `contentZoom` is local component state and never enters `emit('edit', ...)`.
- Controls are visible only inside the existing `v-else` chapter branch.
- The page frame reserves `wordPageHeight * contentZoom` pixels so the scaled page remains fully reachable in `.editor-content`.

- [ ] **Step 1: Add the zoom state and page measurement refs**

Import the zoom helper functions. Add these refs and helpers near the existing component state:

```ts
const contentZoom = ref(DEFAULT_CONTENT_ZOOM)
const wordPageRef = ref<HTMLElement | null>(null)
const wordPageHeight = ref(0)
let wordPageResizeObserver: ResizeObserver | null = null

const zoomLabel = computed(() => formatContentZoom(contentZoom.value))
const canZoomOut = computed(() => contentZoom.value > MIN_CONTENT_ZOOM)
const canZoomIn = computed(() => contentZoom.value < MAX_CONTENT_ZOOM)

function syncWordPageHeight() {
  wordPageHeight.value = wordPageRef.value?.scrollHeight || 0
}

function changeContentZoom(direction: -1 | 1) {
  contentZoom.value = stepContentZoom(contentZoom.value, direction)
}

function resetContentZoom() {
  contentZoom.value = DEFAULT_CONTENT_ZOOM
}
```


- [ ] **Step 2: Observe page content size when chapters mount or change**

Add this watcher after the existing chapter watcher so it also handles the normal case where the document loads before the first chapter arrives:

```ts
watch(
  () => props.chapter?.id,
  async () => {
    await nextTick()
    wordPageResizeObserver?.disconnect()
    wordPageResizeObserver = null
    syncWordPageHeight()
    if (typeof ResizeObserver !== 'undefined' && wordPageRef.value) {
      wordPageResizeObserver = new ResizeObserver(syncWordPageHeight)
      wordPageResizeObserver.observe(wordPageRef.value)
    }
  },
  { immediate: true },
)
```

At the beginning of the existing `onBeforeUnmount` callback, add:

```ts
wordPageResizeObserver?.disconnect()
wordPageResizeObserver = null
```

Keep the existing chapter-transition cleanup and `editor.value?.destroy()` behavior.

- [ ] **Step 3: Add the zoom controls to the chapter action bar**

Inside `.chapter-actions`, before the save button, add:

```vue
<div v-if="chapter" class="editor-zoom-controls" aria-label="正文页面缩放">
  <button
    class="editor-zoom-button"
    type="button"
    :disabled="!canZoomOut"
    aria-label="缩小正文页面"
    title="缩小正文页面"
    @click="changeContentZoom(-1)"
  >
    −
  </button>
  <button
    class="editor-zoom-value"
    type="button"
    aria-live="polite"
    aria-label="重置正文页面缩放"
    title="重置为 100%"
    @click="resetContentZoom"
  >
    {{ zoomLabel }}
  </button>
  <button
    class="editor-zoom-button"
    type="button"
    :disabled="!canZoomIn"
    aria-label="放大正文页面"
    title="放大正文页面"
    @click="changeContentZoom(1)"
  >
    +
  </button>
</div>
```

- [ ] **Step 4: Wrap the existing page without changing its document content**

In the `v-else` branch, wrap the existing `.word-page` with:

```vue
<div
  class="word-page-zoom-frame"
  :style="{ height: `${wordPageHeight * contentZoom}px` }"
>
  <div
    ref="wordPageRef"
    class="word-page"
    :style="{ transform: `scale(${contentZoom})` }"
  >
  </div>
</div>
```

Do not add zoom values to the Tiptap JSON or modify the `onUpdate` edit event.

- [ ] **Step 5: Run the focused tests**

Run from `frontend/`:

```powershell
node --test tests/content-zoom.test.mjs
```

Expected: all zoom tests PASS.

### Task 4: Style the controls and scaled page frame

**Files:**
- Modify: `frontend/src/styles/editor-interaction.css`

**Interfaces:**
- Uses the existing editor interaction layer and does not alter the global typography or Tiptap content styles.
- The page transform starts at the top center, while the frame controls the scrollable layout height.

- [ ] **Step 1: Add the page frame and control styles**

Append rules to `editor-interaction.css`:

```css
.word-page-zoom-frame {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 0;
  justify-content: center;
  align-items: flex-start;
}

.word-page-zoom-frame > .word-page {
  flex: 0 0 auto;
  transform-origin: top center;
}

.editor-zoom-controls {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  border: 1px solid var(--ui-line-strong);
  border-radius: 4px;
  background: var(--ui-surface);
}

.editor-zoom-button,
.editor-zoom-value {
  min-width: 30px;
  height: 30px;
  border: 0;
  color: var(--ui-ink-soft);
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.editor-zoom-value {
  min-width: 50px;
  border-right: 1px solid var(--ui-line);
  border-left: 1px solid var(--ui-line);
  color: var(--ui-ink);
  font-size: 11px;
}

.editor-zoom-button:hover:not(:disabled),
.editor-zoom-value:hover {
  color: var(--ui-primary-strong);
  background: var(--ui-primary-wash);
}

.editor-zoom-button:disabled {
  color: var(--ui-ink-muted);
  cursor: not-allowed;
  opacity: 0.55;
}

.editor-zoom-button:focus-visible,
.editor-zoom-value:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}

@media (max-width: 767px) {
  .word-page-zoom-frame {
    width: max-content;
    min-width: 100%;
  }

  .editor-zoom-controls {
    order: -1;
  }
}
```

- [ ] **Step 2: Run focused tests and build**

Run from `frontend/`:

```powershell
node --test tests/content-zoom.test.mjs
npm run build
```

Expected: all zoom tests pass and `vue-tsc -b && vite build` completes without errors.

### Task 5: Verify the existing editor behavior and browser result

**Files:**
- Read: `frontend/src/components/ContentPanel.vue`
- Read: `frontend/src/styles/editor-interaction.css`
- Read: `frontend/tests/content-zoom.test.mjs`

- [ ] **Step 1: Run the complete frontend test set**

Run from `frontend/`:

```powershell
node --test tests/*.test.mjs
```

Expected: all existing and new Node tests pass.

- [ ] **Step 2: Verify the target document in the browser**

Open `http://localhost:5173/#/doc/ce605ff489104cdd944bbc66cf42fa98` with the existing local frontend. In the chapter正文区域 verify:

- The control shows `100%` initially.
- `+` changes the label by 10 percentage points and visibly enlarges the page.
- `−` changes the label by 10 percentage points and visibly reduces the page.
- Clicking the percentage returns to `100%`.
- At 50% and 200%, the corresponding button is disabled.
- Scrolling reaches the full bottom of the scaled page.
- Editing text still marks the chapter as unsaved; zooming alone does not.

- [ ] **Step 3: Check the final diff and preserve unrelated work**

Run from the repository root:

```powershell
git diff --check
git status --short
git diff -- frontend/src/components/ContentPanel.vue frontend/src/editor/contentZoom.mjs frontend/src/styles/editor-interaction.css frontend/tests/content-zoom.test.mjs
```

Expected: only the planned zoom files are part of the feature diff; existing untracked local files remain untouched.

## Verification Summary

The implementation is complete only when the red test was observed before the helper was added, all zoom and existing frontend tests pass, `npm run build` passes, and the target document confirms accessible controls, bounded zoom, complete scrolling, and no false unsaved state from view-only zooming.
