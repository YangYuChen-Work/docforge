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
        <span v-if="generating" class="badge badge-blue" style="margin-left:12px" :title="generationProgress">
          {{ generationProgress }}
        </span>
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
        :annotations="annotations"
        :citations="chapterCitations"
        :activeAnnotationId="activeAnnotationId"
        :activeCitationKey="activeCitationKey"
        @confirm="confirmChapter"
        @regenerate="showRegenModal = true"
        @export="doExport"
        @edit="onEdit"
        @selectionChange="selectionText = $event"
        @editorStateChange="editorState = $event"
        @annotationSelect="onAnnotationSelect"
        @citationSelect="onCitationSelect"
        @focusResult="showFocusMessage"
      />
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

    <div v-if="focusMessage" class="editor-focus-message" role="status">{{ focusMessage }}</div>

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
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
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
  createAnnotation as apiCreateAnnotation,
  updateAnnotation as apiUpdateAnnotation,
  createChapter,
  renameDocument,
} from '../api/documents'
import { createExport } from '../api/exports'
import { getSource } from '../api/sources'

const route = useRoute()
const docId = route.params.docId as string
const doc = ref<any>(null)
const currentChapterId = ref('')
const currentChapter = ref<any>(null)
const annotations = ref<any[]>([])
const sourceDetails = ref<Record<string, any>>({})
const activeAnnotationId = ref('')
const activeCitationKey = ref('')
const focusMessage = ref('')
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
type RegenerationTransition = {
  chapterId: string
  preStatus: string
  prePlainText: string
  preContentJson: string
  preCitationSignature: string
  requestPending: boolean
}
let savedSnapshot: ChapterSavePayload | null = null
let pendingSave: { chapterId: string; payload: ChapterSavePayload } | null = null
let saveRequest: Promise<boolean> | null = null
const generating = ref(false)
let focusMessageTimer: ReturnType<typeof setTimeout> | null = null
const regenerationTransition = ref<RegenerationTransition | null>(null)
let latestGenerationRefreshId = 0

const chapterCitations = computed(() =>
  (currentChapter.value?.citations || []).map((citation: any, index: number) => ({
    ...citation,
    key: citation.key || `${citation.source_document_id}:${index}`,
  })),
)

const citationState = computed(() => {
  const chapter = currentChapter.value
  if (!chapter) return 'pending'
  if (chapter.status === 'pending') return 'pending'
  if (chapter.citation_state) return chapter.citation_state
  if (chapterCitations.value.some((citation: any) => (citation.citation_type || 'summary') !== 'context')) {
    return 'explicit'
  }
  if (chapterCitations.value.length > 0) return 'context'
  if (chapter.status === 'generating') return 'generating'
  if (chapter.status === 'failed') return 'failed'
  return 'missing'
})

const generationProgress = computed(() => {
  const chapters = doc.value?.chapters || []
  if (chapters.length === 0) return '章节生成中...'
  const active = chapters.find((chapter: any) => chapter.status === 'generating')
  const finished = chapters.filter((chapter: any) => !['pending', 'generating'].includes(chapter.status)).length
  if (active) {
    return `第 ${active.order_index || finished + 1}/${chapters.length} 章生成中：${active.title}`
  }
  return `等待生成：${finished}/${chapters.length}`
})

onMounted(async () => {
  window.addEventListener('keydown', handleSaveShortcut)
  doc.value = await getDocument(docId)
  titleDraft.value = doc.value.title || ''
  if (doc.value.chapters.length > 0) await selectChapter(doc.value.chapters[0])
  if (isStillGenerating(doc.value)) startGenerationPolling(true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleSaveShortcut)
  if (saveTimer) clearTimeout(saveTimer)
  stopGenerationPolling()
  if (focusMessageTimer) clearTimeout(focusMessageTimer)
})

function isStillGenerating(d: any) {
  if (!d) return false
  return d.chapters.some((c: any) => c.status === 'pending' || c.status === 'generating')
}

function buildCitationSignature(citations: any[] = []) {
  return JSON.stringify(
    citations.map((citation) => ({
      source_document_id: citation.source_document_id || '',
      locator: citation.locator || '',
      source_excerpt: citation.source_excerpt || '',
      citation_type: citation.citation_type || 'summary',
    })),
  )
}

function buildRegenerationTransition(chapter: any): RegenerationTransition | null {
  if (!chapter?.id) return null
  return {
    chapterId: chapter.id,
    preStatus: chapter.status || '',
    prePlainText: chapter.plain_text || '',
    preContentJson: chapter.content_json || '',
    preCitationSignature: buildCitationSignature(chapter.citations || []),
    requestPending: true,
  }
}

function shouldKeepLocalPending(polledChapter: any) {
  const transition = regenerationTransition.value
  if (!transition || !transition.requestPending || !polledChapter) return false
  if (polledChapter.id !== transition.chapterId) return false
  if (polledChapter.status === 'pending' || polledChapter.status === 'generating') return false
  return (
    (polledChapter.status || '') === transition.preStatus &&
    (polledChapter.plain_text || '') === transition.prePlainText &&
    (polledChapter.content_json || '') === transition.preContentJson &&
    buildCitationSignature(polledChapter.citations || []) === transition.preCitationSignature
  )
}

function stageLocalRegeneration(chapterId: string) {
  if (currentChapter.value?.id === chapterId) {
    currentChapter.value = {
      ...currentChapter.value,
      status: 'pending',
      citation_state: 'pending',
      citations: [],
    }
  }
  if (doc.value?.chapters) {
    doc.value = {
      ...doc.value,
      chapters: doc.value.chapters.map((chapter: any) =>
        chapter.id === chapterId ? { ...chapter, status: 'pending' } : chapter,
      ),
    }
  }
  sourceDetails.value = {}
  activeCitationKey.value = ''
  aiPanelRef.value?.openTab('sources')
}

function applyPendingStatusToDocument(nextDoc: any, chapterId: string) {
  if (!nextDoc?.chapters) return nextDoc
  return {
    ...nextDoc,
    chapters: nextDoc.chapters.map((chapter: any) =>
      chapter.id === chapterId ? { ...chapter, status: 'pending' } : chapter,
    ),
  }
}

function stopGenerationPolling() {
  if (genPollTimer) clearInterval(genPollTimer)
  genPollTimer = null
}

async function refreshGenerationState() {
  const refreshId = ++latestGenerationRefreshId
  const requestedChapterId = currentChapterId.value
  const nextDoc = await getDocument(docId)
  const polledChapter = requestedChapterId ? await getChapter(docId, requestedChapterId) : null

  if (refreshId !== latestGenerationRefreshId) return

  const keepLocalPending = shouldKeepLocalPending(polledChapter)
  doc.value =
    keepLocalPending && requestedChapterId
      ? applyPendingStatusToDocument(nextDoc, requestedChapterId)
      : nextDoc

  if (requestedChapterId && polledChapter) {
    if (polledChapter.id === currentChapterId.value && !hasUnsavedChanges.value && !isSaving.value) {
      if (keepLocalPending) {
        stageLocalRegeneration(requestedChapterId)
      } else {
        currentChapter.value = polledChapter
        await loadSourceDetails(polledChapter.citations || [], polledChapter.id, refreshId)
        const transition = regenerationTransition.value
        if (transition && transition.chapterId === polledChapter.id && !transition.requestPending) {
          regenerationTransition.value = null
        }
      }
    }
  }
  if (!isStillGenerating(doc.value)) {
    generating.value = false
    stopGenerationPolling()
  }
}

function startGenerationPolling(runImmediately = false) {
  generating.value = true
  if (!genPollTimer) {
    genPollTimer = setInterval(() => {
      void refreshGenerationState()
    }, 3000)
  }
  if (runImmediately) void refreshGenerationState()
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
  const chapterId = ch.id
  selectionText.value = ''
  activeAnnotationId.value = ''
  activeCitationKey.value = ''
  sourceDetails.value = {}
  currentChapterId.value = chapterId
  const [chapter, chapterAnnotations] = await Promise.all([
    getChapter(docId, chapterId),
    listAnnotations(docId, chapterId),
  ])
  if (currentChapterId.value !== chapterId) return
  currentChapter.value = chapter
  if (chapter.status === 'pending' || chapter.status === 'generating') {
    aiPanelRef.value?.openTab('sources')
  }
  savedSnapshot = payloadFromChapter(chapter)
  pendingSave = null
  hasUnsavedChanges.value = false
  saveError.value = ''
  saveStatus.value = '已保存'
  annotations.value = chapterAnnotations
  await loadSourceDetails(chapter.citations || [], chapterId)
}

async function loadSourceDetails(citations: any[], chapterId = currentChapterId.value, refreshId?: number) {
  const sourceIds = [...new Set(citations.map((citation) => citation.source_document_id).filter(Boolean))]
  if (sourceIds.length === 0) {
    if (refreshId !== undefined && refreshId !== latestGenerationRefreshId) return
    if (chapterId === currentChapterId.value) sourceDetails.value = {}
    return
  }

  // Load one source at a time so the right panel can reveal cards as the
  // current chapter's references become available instead of flashing all
  // source metadata in one Promise.all batch.
  for (const sourceId of sourceIds) {
    if (refreshId !== undefined && refreshId !== latestGenerationRefreshId) return
    if (chapterId !== currentChapterId.value) return
    if (Object.prototype.hasOwnProperty.call(sourceDetails.value, sourceId)) continue

    let source: any = null
    try {
      source = await getSource(sourceId)
    } catch {
      // Preserve a loaded-but-unavailable marker so the card can still show
      // the citation id and excerpt rather than waiting forever.
      source = null
    }

    if (refreshId !== undefined && refreshId !== latestGenerationRefreshId) return
    if (chapterId !== currentChapterId.value) return
    sourceDetails.value = { ...sourceDetails.value, [sourceId]: source }
  }
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
  const chapterId = currentChapterId.value
  if (!chapterId) return
  showRegenModal.value = false
  const instruction = regenInstruction.value || undefined
  regenInstruction.value = ''
  regenerationTransition.value = buildRegenerationTransition(currentChapter.value)
  stageLocalRegeneration(chapterId)
  const regenerateRequest = regenerateChapter(docId, chapterId, instruction)
  startGenerationPolling(true)
  try {
    await regenerateRequest
    const transition = regenerationTransition.value
    if (transition?.chapterId === chapterId) {
      regenerationTransition.value = {
        ...transition,
        requestPending: false,
      }
    }
    await refreshGenerationState()
  } catch (err) {
    regenerationTransition.value = null
    await refreshGenerationState()
    throw err
  }
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

async function handleCreateAnnotation(body: {
  type: string
  label: string
  target_text: string
  content: string
}) {
  try {
    const result = await apiCreateAnnotation(docId, currentChapterId.value, body)
    annotations.value = await listAnnotations(docId, currentChapterId.value)
    activeAnnotationId.value = result.annotation_id || ''
    activeCitationKey.value = ''
    aiPanelRef.value?.annotationCreated()
  } catch (err: any) {
    aiPanelRef.value?.annotationCreateFailed(err.message || '保存批注失败')
  }
}

function onAnnotationSelect(annotationId: string) {
  activeAnnotationId.value = annotationId
  activeCitationKey.value = ''
  aiPanelRef.value?.openTab('annotations')
}

function onCitationSelect(citationKey: string) {
  activeCitationKey.value = citationKey
  activeAnnotationId.value = ''
  aiPanelRef.value?.openTab('sources')
}

function focusAnnotation(annotationId: string) {
  onAnnotationSelect(annotationId)
  contentPanelRef.value?.focusAnnotation(annotationId)
}

function focusCitation(citationKey: string) {
  onCitationSelect(citationKey)
  contentPanelRef.value?.focusCitation(citationKey)
}

function showFocusMessage(message: string) {
  focusMessage.value = message
  if (focusMessageTimer) clearTimeout(focusMessageTimer)
  focusMessageTimer = setTimeout(() => {
    focusMessage.value = ''
    focusMessageTimer = null
  }, 3200)
}

async function handleCommentAiAction(annotation: any) {
  activeAnnotationId.value = annotation.id
  activeCitationKey.value = ''
  aiPanelRef.value?.openTab('ai')
  await doAiAction('address_comments', annotation.target_text || '', annotation.content || '')
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
