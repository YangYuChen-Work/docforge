# Editor Interaction Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复三栏文档编辑器富文本区域无法完整滚动的问题，并加入克制、稳重的页面切换、章节切换和操作状态反馈。

**Architecture:** 保留现有 Vue 3 + Tiptap 结构，新增一个最后加载的编辑器交互样式层，集中处理高度传递、溢出边界、过渡和减少动画偏好。`App.vue` 只负责路由级过渡，`ContentPanel.vue` 负责正文滚动语义与章节视图进入状态，`DocEditor.vue` 负责保存/生成/确认等业务状态的活动指示。

**Tech Stack:** Vue 3, TypeScript, Vite, Tiptap, 原生 CSS, Node.js built-in test runner, Playwright CLI。

## Global Constraints

- 不修改后端 API、数据库模型、Tiptap 文档格式和导出逻辑。
- 不引入新的动画库、滚动库或状态管理库。
- 继续使用当前深色工业工作台视觉语言和现有 `var(--ui-*)` 设计变量。
- 动效以 160–280ms 的反馈为主，不使用持续漂浮、强弹性或影响文字输入的动画。
- `prefers-reduced-motion: reduce` 下取消位移、循环动画和柔性滚动。
- 不覆盖用户提供的源文件；本次只修改前端交互层。
- 保留工作区已有的 `backend/app/db/session.py`、`backend/app/services/docx_renderer.py`、`.agents/` 和 `skills-lock.json` 改动。

---

### Task 1: 建立编辑器滚动与动效回归测试

**Files:**
- Create: `frontend/tests/editor-interaction.test.mjs`
- Read: `frontend/src/styles/editor-interaction.css`
- Read: `frontend/src/App.vue`
- Read: `frontend/src/components/ContentPanel.vue`

**Interfaces:**
- Produces a Node test file runnable with `node --test tests/editor-interaction.test.mjs` from `frontend/`.
- Tests assert the public DOM/CSS contract only: nested layout shrinkability, semantic scroll region, route transition, and reduced-motion fallback.

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/editor-interaction.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')

test('editor interaction stylesheet keeps the nested grid shrinkable', () => {
  const css = read('src/styles/editor-interaction.css')
  assert.match(css, /\.editor-body\s*\{[\s\S]*?height:\s*0;/)
  assert.match(css, /\.editor-body\s*\{[\s\S]*?min-height:\s*0;/)
  assert.match(css, /\.content-panel\s*\{[\s\S]*?display:\s*flex;/)
  assert.match(css, /\.editor-content\s*\{[\s\S]*?overflow:\s*auto;/)
  assert.match(css, /\.editor-content\s*\{[\s\S]*?scrollbar-gutter:\s*stable/)
})

test('content panel exposes a keyboard-accessible scroll region outside the action bar', () => {
  const template = read('src/components/ContentPanel.vue')
  assert.match(template, /class="chapter-actionbar"/)
  assert.match(template, /class="editor-content"[^>]*tabindex="0"/)
  assert.match(template, /role="region"/)
  assert.ok(template.indexOf('chapter-actionbar') < template.indexOf('editor-content'))
})

test('app wraps route views in a short out-in transition', () => {
  const template = read('src/App.vue')
  assert.match(template, /<Transition name="page" mode="out-in">/)
  assert.match(template, /<component :is="Component" :key="route\.path"/)
})

test('reduced motion disables editor interaction animation', () => {
  const css = read('src/styles/editor-interaction.css')
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/)
  assert.match(css, /scroll-behavior:\s*auto;/)
  assert.match(css, /animation:\s*none\s*!important;/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/editor-interaction.test.mjs`

Expected: FAIL because `src/styles/editor-interaction.css` and the new DOM contracts do not exist yet.

- [ ] **Step 3: Keep the test scope narrow**

Do not add a browser-specific mock or introduce a test framework. These tests intentionally guard the CSS and template contracts that caused the regression; actual layout and interaction behavior is verified in Task 4 with Playwright.

### Task 2: Fix the editor height chain and rich-text scrolling

**Files:**
- Create: `frontend/src/styles/editor-interaction.css`
- Modify: `frontend/src/main.ts`
- Modify: `frontend/src/components/ContentPanel.vue`

**Interfaces:**
- `editor-interaction.css` is imported after the existing visual-system styles so its editor-specific rules are authoritative.
- `.editor-content` becomes the main desktop scroll region and exposes `tabindex="0"`, `role="region"`, and `aria-label="章节正文"`.
- On mobile, the editor returns to natural page flow and the main document keeps its own scroll behavior.

- [ ] **Step 1: Add the semantic scroll-region markup**

In `ContentPanel.vue`, change the existing content wrapper to:

```vue
<div
  class="editor-content"
  tabindex="0"
  role="region"
  aria-label="章节正文"
  :class="{ 'is-chapter-entering': chapterEntering }"
>
```

Keep the chapter action bar before this wrapper so it does not move with正文滚动.

- [ ] **Step 2: Add the focused editor interaction stylesheet**

Create `frontend/src/styles/editor-interaction.css` with these rules:

```css
:root {
  --editor-motion-fast: 160ms var(--ui-ease);
  --editor-motion-medium: 240ms var(--ui-ease);
  --editor-focus-ring: 0 0 0 3px color-mix(in srgb, var(--ui-primary) 22%, transparent);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 180ms var(--ui-ease), transform 180ms var(--ui-ease);
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.editor-shell > .editor-body {
  flex: 1 1 auto;
  height: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.editor-body > .editor-outline,
.editor-body > .content-panel,
.editor-body > .editor-ai-panel {
  min-width: 0;
  min-height: 0;
}

.content-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.chapter-actionbar {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  align-items: center;
}

.chapter-actionbar-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-actions {
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.chapter-actions .btn,
.document-confirm-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  white-space: nowrap;
  transition: transform var(--editor-motion-fast), background-color var(--editor-motion-fast), border-color var(--editor-motion-fast), box-shadow var(--editor-motion-fast), opacity var(--editor-motion-fast);
}

.chapter-actions .btn:active:not(:disabled),
.document-confirm-button:active:not(:disabled),
.tb-btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.985);
}

.editor-content {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable both-edges;
  scroll-behavior: smooth;
  scroll-padding-block: 18px;
}

.editor-content:focus-visible {
  outline: none;
  box-shadow: inset var(--editor-focus-ring);
}

.word-page {
  box-sizing: border-box;
  width: min(100%, 760px);
  min-width: min-content;
}

.word-body {
  min-width: 0;
}

.word-body :deep(table) {
  max-width: none;
}

.editor-content.is-chapter-entering .word-page {
  animation: editor-chapter-enter 220ms var(--ui-ease) both;
}

@keyframes editor-chapter-enter {
  from { opacity: 0.4; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.editor-toolbar,
.chapter-actionbar,
.toolbar-popover,
.toolbar-more-menu,
.export-dropdown {
  transition: background-color var(--editor-motion-medium), border-color var(--editor-motion-medium), box-shadow var(--editor-motion-medium);
}

.editor-toolbar .tb-btn,
.editor-toolbar .tb-select,
.toolbar-popover button,
.toolbar-more-menu button,
.export-dropdown button,
.export-drop-item {
  transition: transform var(--editor-motion-fast), background-color var(--editor-motion-fast), border-color var(--editor-motion-fast), color var(--editor-motion-fast), opacity var(--editor-motion-fast);
}

.editor-toolbar .tb-btn:active:not(:disabled),
.toolbar-popover button:active:not(:disabled),
.toolbar-more-menu button:active:not(:disabled),
.export-dropdown button:active:not(:disabled) {
  transform: translateY(1px);
}

.editor-operation-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 3px;
  padding: 0 20px;
  color: var(--ui-primary-strong);
  background: var(--ui-primary-wash);
  font-size: 11px;
}

.editor-operation-pulse {
  width: 24px;
  height: 2px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--ui-line);
}

.editor-operation-pulse::after {
  display: block;
  width: 45%;
  height: 100%;
  border-radius: inherit;
  background: var(--ui-primary);
  content: "";
  animation: editor-operation-progress 1.2s var(--ui-ease) infinite;
}

@keyframes editor-operation-progress {
  from { transform: translateX(-120%); }
  to { transform: translateX(260%); }
}

@media (max-width: 767px) {
  .editor-shell > .editor-body {
    height: auto;
    overflow: visible;
  }

  .content-panel {
    height: auto;
    overflow: visible;
  }

  .editor-content {
    min-height: 560px;
    overflow: visible;
    scrollbar-gutter: auto;
  }

  .editor-operation-feedback {
    padding-right: 16px;
    padding-left: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }

  .page-enter-active,
  .page-leave-active,
  .editor-content.is-chapter-entering .word-page {
    animation: none !important;
    transition: none !important;
  }

  .editor-content {
    scroll-behavior: auto;
  }

  .editor-operation-pulse::after {
    animation: none !important;
  }
}
```

- [ ] **Step 3: Import the stylesheet last**

In `frontend/src/main.ts`, add:

```ts
import './styles/editor-interaction.css'
```

after `visual-system.css` so the new editor rules override the earlier legacy and visual-system rules without changing other pages.

- [ ] **Step 4: Run the focused regression tests that are ready**

Run: `node --test --test-name-pattern "editor interaction stylesheet|content panel|reduced motion" tests/editor-interaction.test.mjs`

Expected: the three selected tests pass and the route transition test is skipped until Task 3.

### Task 3: Add route and chapter transition feedback

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/components/ContentPanel.vue`

**Interfaces:**
- `App.vue` exposes the existing route component through a keyed Vue `<Transition name="page" mode="out-in">`.
- `ContentPanel.vue` owns a local `chapterEntering` ref and clears its timer during unmount; it does not recreate the Tiptap editor instance.

- [ ] **Step 1: Add the route transition wrapper**

Replace the direct `<RouterView />` with:

```vue
<RouterView v-slot="{ Component, route }">
  <Transition name="page" mode="out-in">
    <component :is="Component" :key="route.path" />
  </Transition>
</RouterView>
```

Keep the existing `main-content` wrapper and skip link unchanged.

- [ ] **Step 2: Add chapter-entry state without remounting Tiptap**

In `ContentPanel.vue`, add:

```ts
const chapterEntering = ref(false)
let chapterTransitionTimer: ReturnType<typeof setTimeout> | null = null

function pulseChapterEntry() {
  chapterEntering.value = true
  if (chapterTransitionTimer) clearTimeout(chapterTransitionTimer)
  chapterTransitionTimer = setTimeout(() => {
    chapterEntering.value = false
    chapterTransitionTimer = null
  }, 240)
}
```

Add a watcher that only pulses when the chapter identity changes:

```ts
watch(
  () => props.chapter?.id,
  (chapterId, previousChapterId) => {
    if (chapterId && previousChapterId && chapterId !== previousChapterId) pulseChapterEntry()
  },
)
```

Clear the timer in `onBeforeUnmount` before destroying the editor:

```ts
if (chapterTransitionTimer) clearTimeout(chapterTransitionTimer)
```

- [ ] **Step 3: Run template and CSS contract tests**

Run: `node --test tests/editor-interaction.test.mjs`

Expected: PASS, including route transition and semantic scroll assertions.

### Task 4: Add non-blocking operation feedback and verify the complete UI

**Files:**
- Modify: `frontend/src/pages/DocEditor.vue`
- Modify: `frontend/src/styles/editor-interaction.css` if visual tuning is required

**Interfaces:**
- The activity feedback derives only from existing reactive state: `isSaving`, `generating`, `confirmingAllChapters`, and `renameSaving`.
- No new API request, timer, store, or business status is introduced.

- [ ] **Step 1: Add the operation-feedback region**

Immediately after the editor toolbar in `DocEditor.vue`, add:

```vue
<div
  v-if="isSaving || generating || confirmingAllChapters || renameSaving"
  class="editor-operation-feedback"
  role="status"
  aria-live="polite"
>
  <span class="editor-operation-pulse" aria-hidden="true"></span>
  <span>
    {{ isSaving ? '正在保存章节' : generating ? '正在生成章节' : confirmingAllChapters ? '正在确认章节' : '正在保存文档名称' }}
  </span>
</div>
```

Do not use a fake percentage or claim success while an operation is still pending.

- [ ] **Step 2: Build the frontend**

Run: `npm run build` from `frontend/`

Expected: `vue-tsc -b` and Vite complete successfully with no TypeScript errors.

- [ ] **Step 3: Run the focused tests again**

Run: `node --test tests/editor-interaction.test.mjs` from `frontend/`

Expected: all tests pass.

- [ ] **Step 4: Start or reuse the local frontend and open the target document**

If port 5173 is not serving the current build, run `npm run dev -- --host 127.0.0.1` from `frontend/`. Use Playwright CLI to open:

```text
http://localhost:5173/#/doc/0fd81e7b05a349328d117c1ce5c38459
```

- [ ] **Step 5: Verify the scroll regression in the browser**

Use the latest Playwright snapshot or DOM evaluation to verify `.editor-content` has `scrollHeight > clientHeight` when the chapter is long, then scroll it to the bottom and confirm the bottom of `.word-page` is reachable without moving the whole page. Save a screenshot to `output/playwright/editor-scroll-fixed.png`.

- [ ] **Step 6: Verify interactions and reduced motion**

Check all of the following in the browser:

- Switching chapters fades the content in without losing the editor.
- Clicking the table/more toolbar menus opens and closes with a short transition.
- Saving or regenerating shows the operation feedback strip and keeps the action controls aligned.
- Clicking a citation/annotation scrolls the inner editor region smoothly and highlights the target.
- With reduced motion emulated, the content remains usable and no continuous animation runs.

- [ ] **Step 7: Inspect the final diff and preserve unrelated work**

Run:

```powershell
git diff --check
git status --short
git diff -- frontend/src/App.vue frontend/src/components/ContentPanel.vue frontend/src/main.ts frontend/src/pages/DocEditor.vue frontend/src/styles/editor-interaction.css frontend/tests/editor-interaction.test.mjs
```

Expected: only the planned frontend files and test file are changed in the feature diff; existing backend and local skill changes remain untouched.

## Verification Summary

The implementation is complete only when the focused Node tests pass, `npm run build` passes, the target document's inner rich-text region scrolls to its full content in the browser, and the page/章节/操作 feedback remains usable with reduced motion enabled.
