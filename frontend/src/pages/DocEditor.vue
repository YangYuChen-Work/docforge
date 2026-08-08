<template>
  <div class="editor-shell" style="display:flex;flex-direction:column;height:100vh;overflow:hidden">
    <!-- Editor Top Bar -->
    <div class="editor-topbar">
      <div class="editor-topbar-left">
        <h2 class="editor-doc-title">{{ doc?.title || '加载中...' }}</h2>
        <span class="editor-breadcrumb">AI 文档助手 / 在线编辑</span>
        <span v-if="generating" class="badge badge-blue" style="margin-left:12px">章节生成中...</span>
      </div>
    </div>

    <!-- Editor Toolbar (visual formatting bar, decorative like demo) -->
    <div class="editor-toolbar">
      <button class="tb-btn">↩</button>
      <button class="tb-btn">↪</button>
      <span class="tb-sep"></span>
      <select class="tb-select"><option>正文</option><option>标题1</option><option>标题2</option></select>
      <select class="tb-select" style="width:60px"><option>标题 1</option></select>
      <select class="tb-select" style="width:50px"><option>11</option><option>14</option><option>16</option></select>
      <span class="tb-sep"></span>
      <button class="tb-btn"><b>B</b></button>
      <button class="tb-btn"><i>I</i></button>
      <button class="tb-btn"><u>U</u></button>
      <span class="tb-sep"></span>
      <button class="tb-btn">≡</button>
      <button class="tb-btn">☰</button>
      <button class="tb-btn">🔗</button>
      <button class="tb-btn">⋯</button>
    </div>

    <!-- Editor Body: 3-column layout -->
    <div class="editor-body">
      <OutlinePanel
        :docTitle="doc?.title || ''"
        :chapters="doc?.chapters || []"
        :activeId="currentChapterId"
        :saveStatus="saveStatus"
        :savedAt="savedAt"
        @select="selectChapter"
        @addChapter="addChapter"
      />
      <ContentPanel
        ref="contentPanelRef"
        :chapter="currentChapter"
        @confirm="confirmChapter"
        @regenerate="showRegenModal = true"
        @export="doExport"
        @edit="onEdit"
        @selectionChange="selectionText = $event"
      />
      <AiPanel
        ref="aiPanelRef"
        :annotations="annotations"
        :chapterId="currentChapterId"
        :docId="docId"
        :selectionText="selectionText"
        @updateAnnotation="updateAnnotation"
        @applyAiSuggestion="applyAiSuggestion"
        @replaceSelection="replaceSelection"
        @insertAtCursor="insertAtCursor"
        @insertAnnotation="insertAnnotation"
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import OutlinePanel from '../components/OutlinePanel.vue'
import ContentPanel from '../components/ContentPanel.vue'
import AiPanel from '../components/AiPanel.vue'
import {
  getDocument,
  getChapter,
  confirmChapter as apiConfirm,
  editChapter,
  regenerateChapter,
  aiAction as apiAiAction,
  listAnnotations,
  createAnnotation,
  updateAnnotation as apiUpdateAnnotation,
  createChapter,
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
const showRegenModal = ref(false)
const regenInstruction = ref('')
const aiPanelRef = ref()
const contentPanelRef = ref()
const selectionText = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null
let genPollTimer: ReturnType<typeof setInterval> | null = null
const generating = ref(false)

onMounted(async () => {
  doc.value = await getDocument(docId)
  if (doc.value.chapters.length > 0) selectChapter(doc.value.chapters[0])
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
  if (genPollTimer) clearInterval(genPollTimer)
})

function isStillGenerating(d: any) {
  if (!d) return false
  return d.chapters.some((c: any) => c.status === 'pending' || c.status === 'generating')
}

async function selectChapter(ch: any) {
  currentChapterId.value = ch.id
  currentChapter.value = await getChapter(docId, ch.id)
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
  saveStatus.value = '保存中...'
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    await editChapter(docId, currentChapterId.value, { plain_text: text, content_json: contentJson })
    saveStatus.value = '已保存'
    savedAt.value = new Date().toTimeString().slice(0, 5)
  }, 1000)
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
  aiPanelRef.value?.setBusy(true)
  try {
    const result = await apiAiAction(docId, currentChapterId.value, { action, selection, instruction })
    const text = result.suggestion || (result.diagram_mermaid ? '架构图已生成，请查看正文下方' : '')
    aiPanelRef.value?.addAiMessage(text || '(无返回内容)')
    if (action === 'generate_diagram' && result.diagram_mermaid) {
      currentChapter.value = await getChapter(docId, currentChapterId.value)
    }
  } catch (err: any) {
    aiPanelRef.value?.addAiMessage(`操作失败：${err.message || '未知错误'}`)
  } finally {
    aiPanelRef.value?.setBusy(false)
  }
}

async function applyAiSuggestion(content: string) {
  // Kept for the annotation flow's own "apply" button (appends at the end).
  // Selection-based edits go through replaceSelection/insertAtCursor below,
  // which edit the live Tiptap document directly so content_json stays in
  // sync with what's on screen (this function used to null out content_json,
  // which made the editor silently drop the appended text since ContentPanel
  // only ever renders content_json, never plain_text, once it's set).
  insertAtCursor(content)
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

async function insertAnnotation(content: string) {
  await createAnnotation(docId, currentChapterId.value, {
    type: 'ai_suggestion',
    label: 'AI 建议',
    content,
    status: 'pending',
  })
  annotations.value = await listAnnotations(docId, currentChapterId.value)
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
