# 侧栏品牌图标融合实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将透明工业几何图标与楷书“徐工重型”组合嵌入侧栏左上角，并在折叠态保留图标识别。

**Architecture:** `AppSidebar.vue` 通过 Vite 静态导入透明 PNG 资源，并保持品牌文案为 DOM 文本；`visual-system.css` 负责横向锁定、主题融合和折叠态隐藏文字。用现有 Node 静态契约测试验证结构、资源和折叠规则，再用构建与浏览器实测确认最终显示。

**Tech Stack:** Vue 3、TypeScript、Vite 静态资源导入、CSS、Node.js `node:test`、Playwright CLI。

## Global Constraints

- 图标资源必须是透明 PNG，仅包含原创几何图标，不含中文或英文文字。
- 品牌文案必须保持为 DOM 文本“徐工重型”，字体栈必须包含 `STKaiti`, `KaiTi`, `BiauKai`, `serif`。
- 展开态显示图标与文字，收起态隐藏文字但保留图标和现有收起/展开按钮。
- 不修改导航、主题切换、路由、业务数据或页面标题。
- 不纳入绿幕中间源图、用户已有后端修改或其他未跟踪产物。

---

### Task 1: 建立品牌图标回归契约

**Files:**
- Modify: `frontend/tests/sidebar-brand-cleanup.test.mjs`
- Verify: `frontend/src/assets/xcmg-emblem.png`

**Interfaces:**
- Consumes: 当前侧栏组件、视觉系统样式和已生成的透明 PNG。
- Produces: 能在接入前失败、接入后通过的结构与资源检查。

- [ ] **Step 1: Write the failing test**

追加以下断言：

```js
import { stat, readFile } from 'node:fs/promises'

const emblemPath = new URL('../src/assets/xcmg-emblem.png', import.meta.url)

test('侧栏品牌包含透明工业图标资源并保留 DOM 中文字', async () => {
  const source = await readFile(componentPath, 'utf8')
  const emblem = await readFile(emblemPath)
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  assert.match(source, /class="brand-emblem"/)
  assert.match(source, /brandEmblemUrl/)
  assert.match(source, /xcmg-emblem\.png/)
  assert.match(source, />徐工重型</)
  assert.deepEqual(emblem.subarray(0, 8), pngSignature)
  await stat(emblemPath)
})

test('品牌图标与文案在侧栏收起时保持可识别', async () => {
  const source = await readFile(stylePath, 'utf8')

  assert.match(source, /\.brand-emblem\s*\{[\s\S]*?width:/)
  assert.match(source, /\.sidebar\.collapsed \.brand-name\s*\{[\s\S]*?display:\s*none/)
  assert.match(source, /\.sidebar\.collapsed \.brand-emblem/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sidebar-brand-cleanup.test.mjs`

Expected: the existing tests pass, while the two new tests fail because the component has no `brand-emblem`/`brandEmblemUrl` markup and the stylesheet has no collapsed brand rules.

### Task 2: Embed the generated emblem and tune the lockup

**Files:**
- Modify: `frontend/src/components/AppSidebar.vue:15-35,123-150`
- Modify: `frontend/src/styles/visual-system.css:191-215`
- Add: `frontend/src/assets/xcmg-emblem.png`

**Interfaces:**
- Consumes: Task 1's failing contract and the generated transparent emblem.
- Produces: `brandEmblemUrl` static asset URL, `.brand-emblem` image, `.brand-name` DOM text, and collapsed-state CSS.

- [ ] **Step 1: Import and render the emblem**

Add the Vite asset import:

```ts
import brandEmblemUrl from '../assets/xcmg-emblem.png'
```

Render the expanded lockup as:

```vue
<h1 class="nav-text brand-lockup" aria-label="徐工重型">
  <img class="brand-emblem" :src="brandEmblemUrl" alt="" aria-hidden="true" />
  <span class="brand-name">徐工重型</span>
</h1>
```

Keep the existing collapse toggle next to this heading unchanged.

- [ ] **Step 2: Add theme-aware, transparent lockup styling**

Extend the brand rules with:

```css
.brand-lockup { gap: 10px; }
.brand-emblem {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  object-fit: contain;
  filter: drop-shadow(0 3px 8px rgba(20, 91, 132, 0.22));
}
.sidebar.collapsed .brand-lockup { justify-content: center; }
.sidebar.collapsed .brand-name { display: none; }
.sidebar.collapsed .brand-emblem { width: 28px; height: 28px; flex-basis: 28px; }
```

Keep the existing楷书 font declaration on `.brand-name`; use the existing sidebar colors for text and controls so the transparent asset sits directly on the system background.

- [ ] **Step 3: Run focused tests to verify the implementation passes**

Run: `node --test tests/sidebar-brand-cleanup.test.mjs`

Expected: all existing and new sidebar tests pass.

### Task 3: Verify responsive behavior and build

**Files:**
- Verify: `frontend/src/components/AppSidebar.vue`
- Verify: `frontend/src/styles/visual-system.css`
- Verify: `frontend/src/assets/xcmg-emblem.png`
- Verify: `frontend/tests/sidebar-brand-cleanup.test.mjs`

**Interfaces:**
- Consumes: Task 2's completed brand lockup.
- Produces: test, build, transparency, browser and console evidence.

- [ ] **Step 1: Run the frontend checks**

Run from `frontend/`:

```powershell
node --test tests/editor-interaction.test.mjs tests/sidebar-brand-cleanup.test.mjs
npm run build
```

Expected: all Node tests pass and Vite build succeeds. The existing Vite chunk-size warning is acceptable.

- [ ] **Step 2: Validate the image alpha channel**

Run:

```powershell
@'
from PIL import Image
im = Image.open('src/assets/xcmg-emblem.png').convert('RGBA')
assert im.getpixel((0, 0))[3] == 0
assert any(a > 240 for a in im.getchannel('A').getdata())
print('transparent-corners-and-opaque-subject: ok')
'@ | python -
```

Expected: transparent corners and an opaque subject are reported.

- [ ] **Step 3: Inspect expanded and collapsed home-page states**

At `http://localhost:5173/#/` with a 1280×792 viewport, verify:

```js
({
  brand: document.querySelector('.brand-name').textContent.trim(),
  emblem: document.querySelector('.brand-emblem').getAttribute('src'),
  collapsed: getComputedStyle(document.querySelector('.brand-name')).display,
  background: getComputedStyle(document.querySelector('.sidebar-header')).backgroundColor,
})
```

Expected: brand is `徐工重型`, the emblem source is a bundled asset URL, the expanded name is visible, and the header background is a system surface color rather than white. Click the existing collapse button and verify the emblem remains visible while the text is hidden.

- [ ] **Step 4: Capture and commit**

Capture `output/playwright/sidebar-brand-emblem.png`, verify console errors and warnings are zero, then commit only:

```powershell
git add -- frontend/src/components/AppSidebar.vue frontend/src/styles/visual-system.css frontend/src/assets/xcmg-emblem.png frontend/tests/sidebar-brand-cleanup.test.mjs
git commit -m "feat: integrate sidebar brand emblem"
```
