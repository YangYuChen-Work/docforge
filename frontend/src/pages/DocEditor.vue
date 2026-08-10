<template>
  <div class="editor-shell" style="display:flex;flex-direction:column;height:100vh;overflow:hidden">
    <!-- Editor Top Bar -->
    <div class="editor-topbar">
      <div class="editor-topbar-left">
        <div v-if="!renaming" class="editor-title-view">
          <h2 class="editor-doc-title">{{ doc?.title || '加载中...' }}</h2>
          <button class="title-edit-btn" title="重命名文档" @click="startRename">✎</button>
        </div>
        <form v-else class="editor-title-form" @submit.prevent="saveRename">
          <input
            ref="titleInputRef"
            v-model="titleDraft"
            class="editor-title-input"
            aria-label="文档名称"
            maxlength="300"
            @keydown.esc="cancelRename"
          />
          <button class="title-save-btn" type="submit" :disabled="renameSaving">保存</button>
          <button class="title-cancel-btn" type="button" @click="cancelRename">取消</button>
        </form>
        <span class="editor-breadcrumb">AI 文档助手 / 在线编辑</span>
        <span v-if="generating" class="badge badge-blue" style="margin-left:12px">章节生成中...</span>
        <span v-if="renameError" class="title-error">{{ renameError }}</span>
      </div>
    </div>

    <!-- Editor Toolbar -->
    <div class="editor-toolbar">
      <button class="tb-btn" title="撤销" @mousedown.prevent @click="runEditorCommand('undo')">↩</button>
      <button class="tb-btn" title="重做" @mousedown.prevent @click="runEditorCommand('redo')">↪</button>
      <span class="tb-sep"></span>
      <select class="tb-select" aria-label="段落样式" :value="editorState.block" @change="changeBlockStyle">
        <option value="paragraph">正文</option>
        <option value="heading-1">标题 1</option>
        <option value="heading-2">标题 2</option>
        <option value="heading-3">标题 3</option>
      </select>
      <select class="tb-select tb-size-select" aria-label="字号" @change="changeFontSize">
        <option value="12px">12</option>
        <option value="14px" selected>14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="22px">22</option>
      </select>
      <span class="tb-sep"></span>
      <button class="tb-btn" :class="{ active: editorState.bold }" title="加粗" @mousedown.prevent @click="runEditorCommand('bold')"><b>B</b></button>
      <button class="tb-btn" :class="{ active: editorState.italic }" title="斜体" @mousedown.prevent @click="runEditorCommand('italic')"><i>I</i></button>
      <button class="tb-btn" :class="{ active: editorState.underline }" title="下划线" @mousedown.prevent @click="runEditorCommand('underline')"><u>U</u></button>
      <button class="tb-btn" :class="{ active: editorState.highlight }" title="高亮" @mousedown.prevent @click="runEditorCommand('highlight')">▰</button>
      <span class="tb-sep"></span>
      <button class="tb-btn" :class="{ active: editorState.textAlign === 'left' }" title="左对齐" @mousedown.prevent @click="runEditorCommand('align', 'left')">≡</button>
      <button class="tb-btn" :class="{ active: editorState.textAlign === 'center' }" title="居中" @mousedown.prevent @click="runEditorCommand('align', 'center')">≡</button>
      <button class="tb-btn" :class="{ active: editorState.textAlign === 'right' }" title="右对齐" @mousedown.prevent @click="runEditorCommand('align', 'right')">≡</button>
      <button class="tb-btn" :class="{ active: editorState.bulletList }" title="项目符号" @mousedown.prevent @click="runEditorCommand('bulletList')">•≡</button>
      <button class="tb-btn" :class="{ active: editorState.orderedList }" title="编号列表" @mousedown.prevent @click="runEditorCommand('orderedList')">1≡</button>
      <span class="tb-sep"></span>
      <button class="tb-btn" :class="{ active: editorState.blockquote }" title="引用" @mousedown.prevent @click="runEditorCommand('blockquote')">❝</button>
      <button class="tb-btn" title="插入链接" @mousedown.prevent @click="contentPanelRef?.setLink()">🔗</button>
      <button class="tb-btn" title="清除格式" @mousedown.prevent @click="runEditorCommand('clear')">Tx</button>
      <button class="tb-btn" title="更多格式" @mousedown.prevent @click="showMoreTools = !showMoreTools">⋯</button>
      <div v-if="showMoreTools" class="toolbar-more-menu">
        <button @mousedown.prevent @click="runEditorCommand('codeBlock'); showMoreTools = false">代码块</button>
        <button @mousedown.prevent @click="runEditorCommand('horizontalRule'); showMoreTools = false">分隔线</button>
      </div>
    </div>

    <!-- Editor Body: 3-column layout -->
    <div class="editor-body">
      <OutlinePanel
        :docTitle="doc?.title || ''"
        :chapters="doc?.chapters || []"
        :activeId="currentChapterId"
        :saveStatus="saveStatus"
        :savedAt="savedAt"
        :saveError="saveError"
        @select="selectChapter"
        @addChapter="addChapter"
      />
      <ContentPanel
        ref="contentPanelRef"
        :chapter="currentChapter"
        :hasUnsavedChanges="hasUnsavedChanges"
        :isSaving="isSaving"
        @save="saveCurrentChapter"
        @confirm="confirmChapter"
        @regenerate="showRegenModal = true"
        @export="doExport"
        @edit="onEdit"
        @selectionChange="selectionText = $event"
        @editorStateChange="editorState = $event"
      />
      <AiPanel
        ref="aiPanelRef"
        :annotations="annotations"
        :chapterId="currentChapterId"
        :docId="docId"
        :selectionText="selectionText"
        @updateAnnotation="updateAnnotation"
        @replaceSelection="replaceSelection"
        @insertAtCursor="insertAtCursor"
        @aiAction="doAiAction"
      />
    </div>

    <div v-if="showRegenModal" class="modal-overlay">
      <div class="modal" style="width:420px">
        <div class="modal-header">
          <h3>重新生成章节</h3>
          <button class="modal-close" @click="showRegenModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>补充生成指令（可选）</label>
            <textarea
              v-model="regenInstruction"
              class="form-textarea"
              placeholder="可选：补充生成指令..."
              rows="3"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" style="margin-top:0" @click="showRegenModal = false">取消</button>
          <button class="btn btn-primary" style="margin-top:0" @click="doRegenerate">确认重新生成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import OutlinePanel from '../components/OutlinePanel.vue'
import ContentPanel from '../components/ContentPanel.vue'
import AiPanel from '../components/AiPanel.vue'
import type { EditorToolbarState } from '../components/ContentPanel.vue'
import {
  getDocument,
  getChapter,
  confirmChapter as apiConfirm,
  editChapter,
  regenerateChapter,
  aiAction as apiAiAction,
  listAnnotations,
  updateAnnotation as apiUpdateAnnotation,
  createChapter,
  renameDocument,
} from '../api/documents'
import { createExport } from '../api/exports'

const route = useRoute()
const docId = route.params.docId as string
const doc = ref<any>(null)
const currentChapterId = ref('')
const currentChapter = ref<any>(null)
const annotations = ref<any[]>([])
const saveStatus = ref('已保存')
const savedAt = ref('')
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const showRegenModal = ref(false)
const regenInstruction = ref('')
const aiPanelRef = ref()
const contentPanelRef = ref()
const selectionText = ref('')
const editorState = ref<EditorToolbarState>({
  block: 'paragraph',
  bold: false,
  italic: false,
  underline: false,
  highlight: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  textAlign: 'left',
})
const renaming = ref(false)
const renameSaving = ref(false)
const renameError = ref('')
const titleDraft = ref('')
const titleInputRef = ref<HTMLInputElement | null>(null)
const showMoreTools = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null
let genPollTimer: ReturnType<typeof setInterval> | null = null
type ChapterSavePayload = { plain_text: string; content_json: string }
let savedSnapshot: ChapterSavePayload | null = null
let pendingSave: { chapterId: string; payload: ChapterSavePayload } | null = null
let saveRequest: Promise<boolean> | null = null
const generating = ref(false)

onMounted(async () => {
  window.addEventListener('keydown', handleSaveShortcut)
  doc.value = await getDocument(docId)
  titleDraft.value = doc.value.title || ''
  if (doc.value.chapters.length > 0) await selectChapter(doc.value.chapters[0])
  // Generation now runs in a background thread on the backend (see
  // app/domain/generation.py _run_generation_in_background), so when the
  // wizard navigates here right after creating the task, chapters may
  // still be "pending"/"generating". Poll until every chapter reaches a
  // terminal state instead of showing a permanently stale outline.
  if (isStillGenerating(doc.value)) {
    generating.value = true
    genPollTimer = setInterval(async () => {
      doc.value = await getDocument(docId)
      if (currentChapterId.value) {
        currentChapter.value = await getChapter(docId, currentChapterId.value)
      }
      if (!isStillGenerating(doc.value)) {
        generating.value = false
        if (genPollTimer) clearInterval(genPollTimer)
        genPollTimer = null
      }
    }, 3000)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleSaveShortcut)
  if (saveTimer) clearTimeout(saveTimer)
  if (genPollTimer) clearInterval(genPollTimer)
})

function isStillGenerating(d: any) {
  if (!d) return false
  return d.chapters.some((c: any) => c.status === 'pending' || c.status === 'generating')
}

function startRename() {
  titleDraft.value = doc.value?.title || ''
  renameError.value = ''
  renaming.value = true
  nextTick(() => titleInputRef.value?.select())
}

function cancelRename() {
  renaming.value = false
  renameError.value = ''
  titleDraft.value = doc.value?.title || ''
}

async function saveRename() {
  const title = titleDraft.value.trim()
  if (!title) {
    renameError.value = '文档名称不能为空'
    return
  }
  renameSaving.value = true
  renameError.value = ''
  try {
    const updated = await renameDocument(docId, title)
    doc.value = { ...doc.value, title: updated.title }
    titleDraft.value = updated.title
    renaming.value = false
  } catch (err: any) {
    renameError.value = err.message || '保存文档名称失败'
  } finally {
    renameSaving.value = false
  }
}

function runEditorCommand(command: string, value?: string) {
  contentPanelRef.value?.runCommand(command, value)
}

function changeBlockStyle(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  runEditorCommand('block', value)
}

function changeFontSize(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  runEditorCommand('fontSize', value)
}

function payloadFromChapter(chapter: any): ChapterSavePayload {
  return {
    plain_text: chapter?.plain_text || '',
    content_json: chapter?.content_json || '',
  }
}

function samePayload(left: ChapterSavePayload | null, right: ChapterSavePayload) {
  return left !== null && left.plain_text === right.plain_text && left.content_json === right.content_json
}

async function saveCurrentChapter(): Promise<boolean> {
  if (isSaving.value) return saveRequest || Promise.resolve(true)

  const request = pendingSave
  if (!request || !hasUnsavedChanges.value || samePayload(savedSnapshot, request.payload)) {
    pendingSave = null
    hasUnsavedChanges.value = false
    if (saveStatus.value !== '保存失败') saveStatus.value = '已保存'
    return true
  }

  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }

  isSaving.value = true
  saveStatus.value = '保存中...'
  saveError.value = ''

  const requestPromise = editChapter(docId, request.chapterId, request.payload)
    .then(() => {
      if (pendingSave?.chapterId === request.chapterId && samePayload(pendingSave.payload, request.payload)) {
        savedSnapshot = request.payload
        pendingSave = null
        hasUnsavedChanges.value = false
        if (currentChapterId.value === request.chapterId) {
          currentChapter.value = { ...currentChapter.value, ...request.payload }
        }
        savedAt.value = new Date().toTimeString().slice(0, 5)
        saveStatus.value = '已保存'
      }
      return true
    })
    .catch((err: any) => {
      saveError.value = err.message || '保存失败'
      saveStatus.value = '保存失败'
      hasUnsavedChanges.value = true
      return false
    })
    .finally(() => {
      isSaving.value = false
      saveRequest = null
    })

  saveRequest = requestPromise
  return requestPromise
}

async function flushPendingSave() {
  while (saveRequest || (pendingSave && hasUnsavedChanges.value)) {
    const saved = saveRequest ? await saveRequest : await saveCurrentChapter()
    if (!saved) return false
  }
  return true
}

async function selectChapter(ch: any) {
  if (currentChapterId.value && !(await flushPendingSave())) return
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

async function addChapter(title: string) {
  await createChapter(docId, title)
  doc.value = await getDocument(docId)
  const added = doc.value.chapters[doc.value.chapters.length - 1]
  if (added) await selectChapter(added)
}

function onEdit(text: string, contentJson: string) {
  if (!currentChapter.value) return
  const payload = { plain_text: text, content_json: contentJson }
  pendingSave = { chapterId: currentChapterId.value, payload }
  hasUnsavedChanges.value = !samePayload(savedSnapshot, payload)
  saveError.value = ''
  saveStatus.value = hasUnsavedChanges.value ? '有未保存修改' : '已保存'
  if (!hasUnsavedChanges.value) {
    pendingSave = null
    return
  }

  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void saveCurrentChapter()
  }, 1000)
}

function handleSaveShortcut(event: KeyboardEvent) {
  const tag = (event.target as HTMLElement | null)?.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveCurrentChapter()
  }
}

async function confirmChapter() {
  await apiConfirm(docId, currentChapterId.value)
  currentChapter.value = await getChapter(docId, currentChapterId.value)
  doc.value = await getDocument(docId)
}

async function doRegenerate() {
  showRegenModal.value = false
  await regenerateChapter(docId, currentChapterId.value, regenInstruction.value || undefined)
  regenInstruction.value = ''
  currentChapter.value = await getChapter(docId, currentChapterId.value)
  doc.value = await getDocument(docId)
}

async function doAiAction(action: string, selection: string, instruction: string) {
  const hadSelection = Boolean(selection.trim())
  aiPanelRef.value?.setBusy(true)
  try {
    const result = await apiAiAction(docId, currentChapterId.value, { action, selection, instruction })
    const text = result.suggestion || (result.diagram_mermaid ? '架构图已生成，请查看正文下方' : '')
    aiPanelRef.value?.addAiMessage(text || '(无返回内容)', hadSelection)
    if (action === 'generate_diagram' && result.diagram_mermaid) {
      currentChapter.value = await getChapter(docId, currentChapterId.value)
    }
  } catch (err: any) {
    aiPanelRef.value?.addAiMessage(`操作失败：${err.message || '未知错误'}`)
  } finally {
    aiPanelRef.value?.setBusy(false)
  }
}

/** User picked "替换选中文字" on an AI suggestion: replace the selection that
 * was active when the AI call was made with the AI's result, directly in the
 * live Tiptap document (not just plain_text) so it's visible immediately and
 * exported correctly. */
function replaceSelection(content: string) {
  contentPanelRef.value?.replaceSelection(content)
  selectionText.value = ''
}

/** User picked "插入到光标处": insert without removing the current selection. */
function insertAtCursor(content: string) {
  contentPanelRef.value?.insertAtCursor(content)
}

async function updateAnnotation(annotationId: string, status: string) {
  await apiUpdateAnnotation(docId, currentChapterId.value, annotationId, { status })
  annotations.value = await listAnnotations(docId, currentChapterId.value)
}

async function doExport(format: string) {
  try {
    const result = await createExport(docId, format)
    if (result.error_message) {
      alert(`导出失败：${result.error_message}`)
      return
    }
    window.open(`/api/exports/${result.export_id}/download`, '_blank')
  } catch (err: any) {
    const validation = err.raw?.response?.data?.detail?.validation_report
    if (validation) {
      const msg = [...(validation.errors || []), ...(validation.warnings || [])].join('\n')
      alert(`导出前校验未通过：\n${msg}`)
    } else {
      alert(`导出失败：${err.message || '未知错误'}`)
    }
  }
}
</script>
