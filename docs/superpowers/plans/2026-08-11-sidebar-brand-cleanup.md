# 侧栏品牌与运行状态信息收敛实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将侧栏品牌改为楷书“徐工重型”，移除 DF/DOCFORGE 旧品牌结构和底部运行环境状态卡片。

**Architecture:** 保持 `AppSidebar.vue` 作为侧栏唯一渲染入口，只调整品牌节点和底部状态节点；删除仅服务于状态卡片的健康检查状态逻辑，避免不可见 UI 继续发起请求。用 Node 内置测试做静态契约检查，再用现有 Vue 类型检查、生产构建和浏览器截图验证布局。

**Tech Stack:** Vue 3、`<script setup lang="ts">`、CSS、Node.js `node:test`、Vite、PowerShell。

## Global Constraints

- 只修改侧栏品牌展示与运行状态展示，不改导航、主题切换、折叠和移动端行为。
- 品牌文案必须为“徐工重型”，字体栈必须包含 `STKaiti`, `KaiTi`, `BiauKai`, `serif`。
- 不再渲染 `.sidebar-provider`，也不再为它请求 `/health`。
- 不覆盖用户已有的后端修改、未跟踪文件或浏览器验证产物。

---

### Task 1: 建立侧栏内容回归契约

**Files:**
- Create: `frontend/tests/sidebar-brand-cleanup.test.mjs`
- Test: `frontend/tests/sidebar-brand-cleanup.test.mjs`

**Interfaces:**
- Consumes: `frontend/src/components/AppSidebar.vue` and the sidebar style files as UTF-8 text.
- Produces: Node `node:test` checks that fail against the current DF/provider implementation and pass after the cleanup.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/AppSidebar.vue', import.meta.url)
const stylePath = new URL('../src/styles/visual-system.css', import.meta.url)

test('侧栏品牌只显示徐工重型并移除旧品牌文案', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /aria-label="徐工重型"/)
  assert.match(source, />徐工重型</)
  assert.doesNotMatch(source, />DOCFORGE</)
  assert.doesNotMatch(source, />项目文档工作台</)
  assert.doesNotMatch(source, /brand-mark/)
})

test('侧栏不再渲染运行环境卡片或请求其状态', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.doesNotMatch(source, /sidebar-provider/)
  assert.doesNotMatch(source, /providerLabel|providerDetail|aiProvider/)
  assert.doesNotMatch(source, /axios\.get\(['"]\/health['"]\)/)
})

test('徐工重型使用楷书字体栈', async () => {
  const source = await readFile(stylePath, 'utf8')

  assert.match(source, /STKaiti[^;]*KaiTi[^;]*BiauKai[^;]*serif/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sidebar-brand-cleanup.test.mjs`

Expected: FAIL because the current component still contains `DOCFORGE`, `brand-mark`, `.sidebar-provider`, provider state, and the `/health` request; the style file does not yet contain the required font stack.

### Task 2: Implement the brand and state cleanup

**Files:**
- Modify: `frontend/src/components/AppSidebar.vue:15-170`
- Modify: `frontend/src/styles/visual-system.css` at the existing `.brand-*` rules

**Interfaces:**
- Consumes: Task 1's failing static contract.
- Produces: A sidebar whose visible brand is `徐工重型`, with no runtime status card or health request.

- [ ] **Step 1: Replace the brand markup**

Replace the existing brand lockup contents with:

```vue
<h1 class="nav-text brand-lockup" aria-label="徐工重型">
  <span class="brand-name">徐工重型</span>
</h1>
```

Keep the collapse toggle adjacent to the heading and keep its existing event handlers and accessibility attributes.

- [ ] **Step 2: Remove provider-only markup and logic**

Remove the `.sidebar-provider` node. Remove `axios` import, `aiProvider` ref, `providerLabel` and `providerDetail` computed values, and the `/health` request inside `onMounted`. Keep `onMounted` for localStorage restoration and keep `onBeforeUnmount` for the placeholder timer.

- [ ] **Step 3: Add the楷书 font stack to the brand name rule**

Use the existing sidebar visual system and add this declaration to the brand name selector:

```css
font-family: 'STKaiti', 'KaiTi', 'BiauKai', serif;
```

Keep the existing title contrast and adjust only the minimum size/line-height needed for the single-line Chinese brand to remain aligned in expanded, collapsed, and mobile states.

- [ ] **Step 4: Run focused tests to verify the implementation passes**

Run: `node --test tests/sidebar-brand-cleanup.test.mjs`

Expected: PASS for all three tests.

### Task 3: Verify build and browser layout

**Files:**
- Verify: `frontend/src/components/AppSidebar.vue`
- Verify: `frontend/src/styles/visual-system.css`
- Verify: `frontend/tests/sidebar-brand-cleanup.test.mjs`

**Interfaces:**
- Consumes: Task 2's cleaned sidebar.
- Produces: Build and browser evidence that the sidebar renders without the deleted card and remains usable.

- [ ] **Step 1: Run all available frontend checks**

Run from `frontend/`:

```powershell
node --test tests/editor-interaction.test.mjs tests/sidebar-brand-cleanup.test.mjs
npm run build
```

Expected: all Node tests pass and Vite build succeeds. An existing chunk-size warning is acceptable if no new error appears.

- [ ] **Step 2: Inspect the home page in a real browser**

Open `http://localhost:5173/#/` at 1280×792 and verify:

```js
({
  brand: document.querySelector('.brand-name')?.textContent?.trim(),
  providerCard: document.querySelector('.sidebar-provider'),
  providerText: document.querySelector('.sidebar')?.textContent?.includes('运行环境'),
  brandFont: getComputedStyle(document.querySelector('.brand-name')).fontFamily,
})
```

Expected: `brand` is `徐工重型`, `providerCard` is `null`, `providerText` is `false`, and `brandFont` starts with `STKaiti` or `KaiTi` (with the declared fallbacks visible when unavailable).

- [ ] **Step 3: Capture final screenshot and check console**

Capture `output/playwright/sidebar-brand-cleanup.png` and confirm the browser console has zero errors and zero warnings on the home page.

- [ ] **Step 4: Commit the implementation**

```powershell
git add -- frontend/src/components/AppSidebar.vue frontend/src/styles/visual-system.css frontend/tests/sidebar-brand-cleanup.test.mjs
git commit -m "feat: simplify sidebar branding"
```
