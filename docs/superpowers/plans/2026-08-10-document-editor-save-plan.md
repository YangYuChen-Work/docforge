# 文档编辑器保存功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** 为生成后的文档增加手动保存按钮和 Ctrl/Cmd+S 快捷键，同时保留自动保存并在无新修改时禁用保存按钮。

**Architecture:** \`DocEditor.vue\` 持有当前章节的已保存快照、待保存 payload 和保存请求状态，手动保存、自动保存和快捷键都调用同一个 \`saveCurrentChapter\`。\`ContentPanel.vue\` 只渲染按钮并发出事件，\`OutlinePanel.vue\` 只展示保存状态；后端继续使用现有章节编辑接口。

**Tech Stack:** Vue 3 \`<script setup>\`, TypeScript, Tiptap, Vite/vue-tsc, FastAPI/pytest。

## Global Constraints

- 生成完成后的章节继续保持可编辑，不因章节已确认而锁定。
- 保留现有约 1 秒防抖自动保存作为兜底。
- 手动保存、自动保存和 Ctrl/Cmd+S 使用同一套保存逻辑。
- 保存成功后按钮禁用；当前章节再次发生编辑后按钮恢复可用。
- 保存失败时保留未保存状态，按钮恢复可用并显示错误状态。
- 切换章节前先处理当前章节尚未落盘的修改，避免快速切换造成错存。
- 沿用现有章节编辑接口，不增加数据库字段或新 API。

---

### Task 1: 增加章节栏保存按钮和禁用样式

**Files:**
- Modify: \`frontend/src/components/ContentPanel.vue:1-45\`
- Modify: \`frontend/src/pages/DocEditor.vue:70-90\`
- Modify: \`frontend/src/styles/page-doc.css:85-95\`

**Interfaces:**
- Consumes: \`DocEditor\` 的 \`hasUnsavedChanges\` 和 \`isSaving\` props。
- Produces: \`ContentPanel\` 的 \`save\` 事件；按钮在 \`!hasUnsavedChanges || isSaving\` 时禁用。

- [ ] **Step 1: 扩展 \`ContentPanel\` props 和 emits**

保留现有事件签名，在 \`defineProps\` 中加入两个布尔值，在 \`defineEmits\` 中加入 \`save: []\`：

```ts
const props = defineProps<{
  chapter: any
  hasUnsavedChanges: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: []
  // confirm、regenerate、export、edit、selectionChange、editorStateChange 保持现有签名
}>()
```

- [ ] **Step 2: 添加保存按钮**

在章节操作栏的“确认章节”按钮之前添加。按钮文案使用“保存中...”或“保存”，点击时只发出 \`save\` 事件：

```vue
<button
  v-if="chapter"
  class="btn btn-primary"
  style="margin-top:0;padding:6px 14px"
  :disabled="!hasUnsavedChanges || isSaving"
  :title="hasUnsavedChanges ? '保存当前章节' : '当前章节已是最新版本'"
  @click="emit('save')"
>
  {{ isSaving ? '保存中...' : '保存' }}
</button>
```

- [ ] **Step 3: 增加禁用态样式**

在 \`frontend/src/styles/page-doc.css\` 的按钮样式附近加入：

```css
.btn:disabled,
.btn:disabled:hover {
  cursor: not-allowed;
  opacity: .55;
  background: #f5f5f5;
  border-color: #d9d9d9;
  color: #999;
}
```

- [ ] **Step 4: 运行构建并提交按钮改动**

运行 \`cd frontend && npm run build\`。Task 2 完成前若因缺少父组件 props 产生错误，记录该预期错误；完成 Task 2 后必须再次运行并通过。提交：

```bash
git add frontend/src/components/ContentPanel.vue frontend/src/styles/page-doc.css
git commit -m "feat: add document chapter save button"
```

### Task 2: 实现统一保存状态、自动保存和快捷键

**Files:**
- Modify: \`frontend/src/pages/DocEditor.vue:70-310\`

**Interfaces:**
- Consumes: \`ContentPanel\` 的 \`save\` 和 \`edit\` 事件。
- Produces: \`hasUnsavedChanges\`, \`isSaving\`, \`saveCurrentChapter\`，并传给 \`ContentPanel\` 和 \`OutlinePanel\`。

- [ ] **Step 1: 增加保存快照和请求状态**

在现有保存 refs 附近加入：

```ts
type ChapterSavePayload = { plain_text: string; content_json: string }
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const saveError = ref('')
let savedSnapshot: ChapterSavePayload | null = null
let pendingSave: { chapterId: string; payload: ChapterSavePayload } | null = null
let saveRequest: Promise<void> | null = null
```

加入 \`payloadFromChapter(chapter)\` 和 \`samePayload(left, right)\`，将 \`null\` 内容统一为空字符串，并按 \`plain_text\` 与 \`content_json\` 的值比较，而不是比较对象引用。

- [ ] **Step 2: 实现统一保存函数**

把现有 \`onEdit\` 定时器中的 API 调用提取到 \`async function saveCurrentChapter()\`：

```ts
async function saveCurrentChapter() {
  if (!pendingSave || isSaving.value || samePayload(savedSnapshot, pendingSave.payload)) return
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }

  const request = pendingSave
  isSaving.value = true
  saveStatus.value = '保存中...'
  saveError.value = ''

  const requestPromise = editChapter(docId, request.chapterId, request.payload)
    .then(() => {
      if (pendingSave?.chapterId === request.chapterId &&
          samePayload(pendingSave.payload, request.payload)) {
        savedSnapshot = request.payload
        pendingSave = null
        hasUnsavedChanges.value = false
        currentChapter.value = { ...currentChapter.value, ...request.payload }
        savedAt.value = new Date().toTimeString().slice(0, 5)
        saveStatus.value = '已保存'
      }
    })
    .catch((err: any) => {
      saveError.value = err.message || '保存失败'
      saveStatus.value = '保存失败'
      hasUnsavedChanges.value = true
      throw err
    })
    .finally(() => { isSaving.value = false; saveRequest = null })

  saveRequest = requestPromise
  return requestPromise
}
```

只有成功才更新快照；请求期间的新编辑必须保留为新的 \`pendingSave\`，不能被旧请求的成功回调清除。

- [ ] **Step 3: 改造 \`onEdit\` 为快照驱动的自动保存**

\`onEdit(text, contentJson)\` 要记录事件发生时的章节 ID和 payload，更新未保存状态，重置 1 秒计时器，并由计时器调用 \`saveCurrentChapter()\`。当 payload 与快照相同，状态恢复“已保存”且不启动计时器。

```ts
function onEdit(text: string, contentJson: string) {
  if (!currentChapter.value) return
  const payload = { plain_text: text, content_json: contentJson }
  pendingSave = { chapterId: currentChapterId.value, payload }
  hasUnsavedChanges.value = !samePayload(savedSnapshot, payload)
  saveError.value = ''
  saveStatus.value = hasUnsavedChanges.value ? '有未保存修改' : '已保存'
  if (!hasUnsavedChanges.value) return

  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void saveCurrentChapter()
  }, 1000)
}
```

- [ ] **Step 4: 初始化章节快照并安全切换章节**

章节首次加载和每次 \`selectChapter\` 完成后设置 \`savedSnapshot = payloadFromChapter(currentChapter.value)\`，清空 pending 内容并重置状态。切换前先等待当前章节的 pending 保存和已有 \`saveRequest\`；保存失败时直接 return，停留在原章节并保留可重试状态。

```ts
async function selectChapter(ch: any) {
  if (currentChapterId.value && pendingSave) {
    try { await saveCurrentChapter() } catch { return }
  }
  if (saveRequest) {
    try { await saveRequest } catch { return }
  }

  selectionText.value = ''
  currentChapterId.value = ch.id
  currentChapter.value = await getChapter(docId, ch.id)
  savedSnapshot = payloadFromChapter(currentChapter.value)
  pendingSave = null
  hasUnsavedChanges.value = false
  saveError.value = ''
  saveStatus.value = '已保存'
  annotations.value = await listAnnotations(docId, ch.id)
}
```

- [ ] **Step 5: 注册 Ctrl/Cmd+S 并清理资源**

输入框、textarea 和 select 中不拦截快捷键；其他编辑场景阻止浏览器默认保存并调用 \`saveCurrentChapter\`。将监听器和清理逻辑合并到已有 \`onMounted\`/\`onUnmounted\`，保留生成轮询的清理。

```ts
function handleSaveShortcut(event: KeyboardEvent) {
  const tag = (event.target as HTMLElement | null)?.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveCurrentChapter()
  }
}
```

- [ ] **Step 6: 连接 \`ContentPanel\` 并构建**

增加 \`:hasUnsavedChanges="hasUnsavedChanges"\`, \`:isSaving="isSaving"\` 和 \`@save="saveCurrentChapter"\`，保留其余 props/事件。运行 \`cd frontend && npm run build\`，预期 \`vue-tsc -b\` 和 Vite 构建成功。提交：

```bash
git add frontend/src/pages/DocEditor.vue
git commit -m "feat: support explicit document chapter saves"
```

### Task 3: 完善保存状态展示并回归验证

**Files:**
- Modify: \`frontend/src/components/OutlinePanel.vue:1-20\`
- Modify: \`frontend/src/styles/page-doc.css:189-195\`（仅在需要时）
- Test: \`tests/\` 现有 Python 测试套件

**Interfaces:**
- Consumes: \`saveStatus\` 值 \`已保存\`、\`有未保存修改\`、\`保存中...\`、\`保存失败\`。
- Produces: 左侧状态准确反映保存状态，后端编辑和版本行为无回归。

- [ ] **Step 1: 显式映射左侧状态文案**

在 \`OutlinePanel.vue\` 增加 \`saveStatusLabel(status)\`，将“有未保存修改”映射为“未保存”、将“保存中...”映射为“保存中”、将“保存失败”映射为“保存失败”，其他状态映射为“已保存”。模板使用该函数；只有“已保存”时显示“自动保存 HH:MM”。

- [ ] **Step 2: 增加未保存/失败状态色**

给徽标增加状态 class，已保存继续使用绿色，未保存/保存失败分别使用橙色/红色：

```css
.saved-badge.unsaved { background: #fff7e6; color: #fa8c16; }
.saved-badge.error { background: #fff1f0; color: #ff4d4f; }
```

- [ ] **Step 3: 运行完整验证**

依次运行：

```bash
cd frontend && npm run build
cd .. && pytest -q
git diff --check
```

预期前端构建和全部 Python 测试通过，且 diff 无空白错误。

- [ ] **Step 4: 浏览器交互验证**

在 \`http://localhost:5173/#/doc/49737f5c552a4bf38f3e5b2e582aea81\` 验证：初始按钮禁用；修改后按钮可用；立即点击保存和等待自动保存都能落盘并重新禁用；Ctrl+S/Cmd+S 不弹出浏览器保存对话框；保存后再次编辑按钮恢复；切换章节后返回时内容仍保留。

- [ ] **Step 5: 检查最终状态并提交**

运行 \`git status --short\`、\`git diff --stat HEAD~2..HEAD\`，确认只有本功能相关文件变更；若 Task 3 有代码改动，提交：

```bash
git add frontend/src/components/OutlinePanel.vue frontend/src/styles/page-doc.css
git commit -m "feat: show document save status"
```
