<template>
  <div class="content-panel">
    <!-- Toolbar-adjacent chapter bar -->
    <div class="chapter-actionbar">
      <span class="chapter-actionbar-title">{{ chapter?.title || '请选择章节' }}</span>
      <div class="chapter-actions">
        <button
          v-if="chapter"
          class="btn btn-primary"
          :disabled="!hasUnsavedChanges || isSaving"
          :title="hasUnsavedChanges ? '保存当前章节' : '当前章节已是最新版本'"
          @click="emit('save')"
        >
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
        <button
          v-if="chapter && chapter.status !== 'confirmed'"
          @click="$emit('confirm')"
          class="btn btn-outline"
        >
          确认章节
        </button>
        <button
          v-if="chapter"
          @click="$emit('regenerate')"
          class="btn btn-outline"
        >
          重新生成
        </button>
        <div style="position:relative">
          <button
            @click="toggleExportMenu"
            class="btn btn-primary"
            :disabled="isExporting"
            :aria-busy="isExporting"
          >
            <span class="export-button-spinner" v-if="isExporting" aria-hidden="true" />
            {{ isExporting ? '导出中…' : '导出 ▾' }}
          </button>
          <div v-if="showExport" class="export-dropdown">
            <template v-if="!selectedExportFormat">
              <div class="export-drop-title">选择导出格式</div>
              <div
                v-for="fmt in ['docx', 'pdf', 'xlsx']"
                :key="fmt"
                class="export-drop-item"
                @click="selectedExportFormat = fmt"
              >
                <span class="export-fmt-icon" style="background:#2b5eb8">{{ fmt.charAt(0).toUpperCase() }}</span>
                <div>
                  <div class="export-fmt-name">{{ fmt.toUpperCase() }}</div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="export-comment-header">
                <button class="export-back-button" type="button" @click="selectedExportFormat = ''">‹</button>
                <span>导出 {{ selectedExportFormat.toUpperCase() }}</span>
              </div>
              <div class="export-drop-title">选择是否带批注</div>
              <button class="export-comment-option" type="button" @click="emitExport(false)">
                <span class="export-comment-option-title">不带批注</span>
                <span class="export-comment-option-desc">只导出正文和表格</span>
              </button>
              <button class="export-comment-option" type="button" @click="emitExport(true)">
                <span class="export-comment-option-title">带批注</span>
                <span class="export-comment-option-desc">保留当前章节的审阅批注</span>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Word-like page area -->
    <div
      class="editor-content"
      tabindex="0"
      role="region"
      aria-label="章节正文"
      :class="{ 'is-chapter-entering': chapterEntering }"
    >
      <div v-if="!chapter" class="editor-empty-state">
        从左侧目录选择章节
      </div>
      <template v-else>
        <div class="word-page">
          <div v-if="chapter.status === 'failed'" class="alert-error">
            生成失败：{{ chapter.error_message || '未知错误' }}
          </div>
          <div v-if="conflictItems.length > 0" class="alert-conflict">
            <div style="font-weight:600;margin-bottom:6px">内容冲突</div>
            <div v-for="c in conflictItems" :key="c.description">• {{ c.description }}</div>
          </div>

          <editor-content :editor="editor" class="word-body" />

          <div v-if="missingItems.length > 0" class="missing-information-panel">
            <div class="missing-information-title">待补充建议</div>
            <div v-for="m in missingItems" :key="m" class="missing-information-item">• {{ m }}</div>
          </div>

          <div
            v-if="chapter.diagram_mermaid && !chapter.diagram_mermaid.startsWith('ERROR:')"
            class="diagram-box"
          >
            <div style="font-size:11px;font-weight:600;color:#667;margin-bottom:8px">架构图</div>
            <div ref="mermaidContainer" class="mermaid-render"></div>
          </div>
          <div
            v-else-if="chapter.diagram_mermaid && chapter.diagram_mermaid.startsWith('ERROR:')"
            class="alert-error"
          >
            架构图生成失败
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import {
  createReferenceDecorations,
  findCitationRange,
  findReferenceRange,
  REFERENCE_DECORATIONS_REFRESH,
  type AnnotationRef,
  type CitationRef,
} from '../editor/ReferenceDecorations'

export type EditorToolbarState = {
  block: string
  bold: boolean
  italic: boolean
  underline: boolean
  highlight: boolean
  bulletList: boolean
  orderedList: boolean
  blockquote: boolean
  textAlign: string
}

const props = defineProps<{
  chapter: any
  hasUnsavedChanges: boolean
  isSaving: boolean
  isExporting?: boolean
  annotations?: AnnotationRef[]
  citations?: CitationRef[]
  activeAnnotationId?: string
  activeCitationKey?: string
}>()
const emit = defineEmits<{
  save: []
  confirm: []
  regenerate: []
  export: [format: string, includeComments: boolean]
  edit: [text: string, contentJson: string]
  selectionChange: [text: string]
  editorStateChange: [state: EditorToolbarState]
  annotationSelect: [id: string]
  citationSelect: [key: string]
  focusResult: [message: string]
}>()
const showExport = ref(false)
const selectedExportFormat = ref('')
const mermaidContainer = ref<HTMLElement>()
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

function emitExport(includeComments: boolean) {
  if (!selectedExportFormat.value || props.isExporting) return
  emit('export', selectedExportFormat.value, includeComments)
  selectedExportFormat.value = ''
  showExport.value = false
}

function toggleExportMenu() {
  if (props.isExporting) return
  showExport.value = !showExport.value
  if (!showExport.value) selectedExportFormat.value = ''
}

function normalizeFormalCopy(value: string) {
  return value
    .replace(/【Mock生成】/g, '')
    .replace(
      /（此为 Mock 模式生成内容，仅用于流程验证。切换至 AI_PROVIDER=deepseek 可获得真实内容。）/g,
      '（本内容来自本地验证结果，仅用于流程核对，请结合引用资料确认。没有来源依据的内容请标记为待补充。）',
    )
    .replace(/（Mock示例）/g, '')
    .replace(/示例列[12]/g, '待补充字段')
    .replace(/示例数据[A-D]/g, '待补充')
}

function normalizeContentNode(value: any): any {
  if (typeof value === 'string') return normalizeFormalCopy(value)
  if (Array.isArray(value)) return value.map(normalizeContentNode)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeContentNode(entry)]))
}

function parseContent(chapter: any) {
  if (!chapter?.content_json)
    return chapter?.plain_text
      ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: normalizeFormalCopy(chapter.plain_text) }] }] }
      : ''
  try {
    return normalizeContentNode(JSON.parse(chapter.content_json))
  } catch {
    return normalizeFormalCopy(chapter.plain_text || '')
  }
}

const editor = useEditor({
  content: parseContent(props.chapter),
  extensions: [
    StarterKit.configure({
      link: { openOnClick: false, autolink: true },
      underline: {},
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({
      allowBase64: true,
      resize: { enabled: true, minWidth: 120, minHeight: 80, alwaysPreserveAspectRatio: true },
    }),
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
    TextStyle,
    FontSize,
    createReferenceDecorations({
      getAnnotations: () => props.annotations || [],
      getCitations: () => props.citations || [],
      getActiveAnnotationId: () => props.activeAnnotationId || '',
      getActiveCitationKey: () => props.activeCitationKey || '',
      onAnnotationClick: (id) => emit('annotationSelect', id),
      onCitationClick: (key) => emit('citationSelect', key),
    }),
  ],
  // Confirmation is a workflow state, not a formatting lock. A confirmed
  // chapter can still receive deliberate manual edits.
  editable: true,
  onCreate({ editor }) {
    emit('editorStateChange', getToolbarState(editor))
  },
  onUpdate({ editor }) {
    emit('edit', editor.getText(), JSON.stringify(editor.getJSON()))
    emit('editorStateChange', getToolbarState(editor))
  },
  onSelectionUpdate({ editor }) {
    const { from, to } = editor.state.selection
    const text = from === to ? '' : editor.state.doc.textBetween(from, to, ' ')
    emit('selectionChange', text)
    emit('editorStateChange', getToolbarState(editor))
  },
})

function getToolbarState(instance: any): EditorToolbarState {
  return {
    block: instance.isActive('heading', { level: 1 })
      ? 'heading-1'
      : instance.isActive('heading', { level: 2 })
        ? 'heading-2'
        : instance.isActive('heading', { level: 3 })
          ? 'heading-3'
          : 'paragraph',
    bold: instance.isActive('bold'),
    italic: instance.isActive('italic'),
    underline: instance.isActive('underline'),
    highlight: instance.isActive('highlight'),
    bulletList: instance.isActive('bulletList'),
    orderedList: instance.isActive('orderedList'),
    blockquote: instance.isActive('blockquote'),
    textAlign: instance.isActive({ textAlign: 'center' })
      ? 'center'
      : instance.isActive({ textAlign: 'right' })
        ? 'right'
        : instance.isActive({ textAlign: 'justify' })
          ? 'justify'
          : 'left',
  }
}

/** Commands used by DocEditor's shared toolbar. Keeping them here means
 * toolbar actions operate on the live Tiptap document and use the same
 * edit/save path as keyboard input. */
function runCommand(command: string, value?: string) {
  const instance = editor.value
  if (!instance) return

  const chain = instance.chain().focus()
  switch (command) {
    case 'undo':
      chain.undo().run()
      break
    case 'redo':
      chain.redo().run()
      break
    case 'block':
      if (value === 'paragraph') chain.setParagraph().run()
      else {
        const level = Number(value?.replace('heading-', '') || 1) as 1 | 2 | 3
        chain.toggleHeading({ level }).run()
      }
      break
    case 'fontSize':
      chain.setFontSize(value || '14px').run()
      break
    case 'bold':
      chain.toggleBold().run()
      break
    case 'italic':
      chain.toggleItalic().run()
      break
    case 'underline':
      chain.toggleUnderline().run()
      break
    case 'highlight':
      chain.toggleHighlight({ color: '#fff1a8' }).run()
      break
    case 'align':
      chain.setTextAlign(value || 'left').run()
      break
    case 'bulletList':
      chain.toggleBulletList().run()
      break
    case 'orderedList':
      chain.toggleOrderedList().run()
      break
    case 'blockquote':
      chain.toggleBlockquote().run()
      break
    case 'insertTable': {
      const [rows, cols] = (value || '3x3').split('x').map((part) => Number(part))
      chain.insertTable({
        rows: Number.isFinite(rows) && rows > 0 ? rows : 3,
        cols: Number.isFinite(cols) && cols > 0 ? cols : 3,
        withHeaderRow: true,
      }).run()
      break
    }
    case 'addRowBefore':
    case 'addRowAfter':
    case 'deleteRow':
    case 'addColumnBefore':
    case 'addColumnAfter':
    case 'deleteColumn':
    case 'mergeCells':
    case 'splitCell':
    case 'deleteTable':
      (chain as any)[command]().run()
      break
    case 'codeBlock':
      chain.toggleCodeBlock().run()
      break
    case 'horizontalRule':
      chain.setHorizontalRule().run()
      break
    case 'clear':
      chain.clearNodes().unsetAllMarks().run()
      break
  }
}

function setLink() {
  const instance = editor.value
  if (!instance) return
  const current = instance.getAttributes('link').href || ''
  const url = window.prompt('输入链接地址', current || 'https://')
  if (url === null) return
  if (!url.trim()) {
    instance.chain().focus().unsetLink().run()
    return
  }
  instance.chain().focus().setLink({ href: url.trim() }).run()
}

function insertImage(src: string) {
  if (!editor.value || !src.startsWith('data:image/')) return
  editor.value.chain().focus().setImage({ src, alt: '插入的图片' }).run()
}

/** Replace the currently selected range with plain text (used when the user
 * picks "replace selection" for an AI suggestion). Falls back to inserting
 * at the cursor if the selection collapsed in the meantime (e.g. user clicked
 * elsewhere before the AI response came back). */
function replaceSelection(text: string) {
  if (!editor.value) return
  const { from, to } = editor.value.state.selection
  editor.value.chain().focus().insertContentAt({ from, to }, text).run()
  emit('edit', editor.value.getText(), JSON.stringify(editor.value.getJSON()))
}

/** Insert text at the current cursor position without removing anything
 * (used when the user picks "insert" instead of "replace"). */
function insertAtCursor(text: string) {
  if (!editor.value) return
  const pos = editor.value.state.selection.to
  editor.value.chain().focus().insertContentAt(pos, text).run()
  emit('edit', editor.value.getText(), JSON.stringify(editor.value.getJSON()))
}

function refreshReferenceDecorations() {
  const instance = editor.value
  if (!instance) return
  instance.view.dispatch(instance.state.tr.setMeta(REFERENCE_DECORATIONS_REFRESH, true))
}

function scrollToRange(range: { from: number; to: number }) {
  const instance = editor.value
  if (!instance) return
  const selectedNode = instance.state.doc.nodeAt(range.from)
  const isNodeRange =
    !!selectedNode && !selectedNode.isText && selectedNode.nodeSize === range.to - range.from

  if (isNodeRange) {
    instance.chain().focus().setNodeSelection(range.from).scrollIntoView().run()
  } else {
    instance.chain().focus().setTextSelection(range).scrollIntoView().run()
  }

  nextTick(() => {
    const node = instance.view.nodeDOM(range.from)
    const element = node instanceof HTMLElement ? node : node?.parentElement
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

function focusChapterBody() {
  const instance = editor.value
  if (!instance || instance.state.doc.content.size < 2) return
  scrollToRange({ from: 1, to: Math.max(1, instance.state.doc.content.size - 1) })
}

function focusAnnotation(annotationId: string) {
  const annotation = (props.annotations || []).find((item) => item.id === annotationId)
  if (!annotation) return
  emit('annotationSelect', annotationId)
  const range = findReferenceRange(editor.value, annotation.target_text || '')
  if (range) {
    scrollToRange(range)
  } else {
    focusChapterBody()
    emit('focusResult', '批注原文未在正文中找到精确片段，已定位到当前章节正文')
  }
}

function focusCitation(citationKey: string) {
  const citation = (props.citations || []).find((item) => item.key === citationKey)
  if (!citation) return
  const range = findCitationRange(editor.value, citation)
  if (range) {
    scrollToRange(range)
  } else {
    focusChapterBody()
    emit('focusResult', '来源原文未在正文中找到精确片段，已定位到当前章节正文')
  }
}

defineExpose({ replaceSelection, insertAtCursor, runCommand, setLink, insertImage, focusAnnotation, focusCitation })

watch(
  () => [props.chapter?.id, props.chapter?.content_json, props.chapter?.plain_text],
  () => {
    if (!editor.value) return
    editor.value.commands.setContent(parseContent(props.chapter), { emitUpdate: false })
    editor.value.setEditable(true)
    emit('editorStateChange', getToolbarState(editor.value))
    refreshReferenceDecorations()
  }
)

watch(
  () => props.chapter?.id,
  (chapterId, previousChapterId) => {
    if (chapterId && previousChapterId && chapterId !== previousChapterId) pulseChapterEntry()
  },
)

watch(
  () => [props.annotations, props.citations, props.activeAnnotationId, props.activeCitationKey],
  refreshReferenceDecorations,
  { deep: true },
)

watch(
  () => props.chapter?.status,
  () => {
    editor.value?.setEditable(true)
  }
)

const missingItems = computed(() => {
  try {
    return JSON.parse(props.chapter?.missing_information_json || '[]')
  } catch {
    return []
  }
})

const conflictItems = computed(() => {
  try {
    return JSON.parse(props.chapter?.conflict_json || '[]')
  } catch {
    return []
  }
})

watch(
  () => props.chapter?.diagram_mermaid,
  async (val) => {
    if (!val || val.startsWith('ERROR:')) return
    await nextTick()
    try {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({ startOnLoad: false })
      const { svg } = await mermaid.render('mermaid-diagram-' + Date.now(), val)
      if (mermaidContainer.value) mermaidContainer.value.innerHTML = svg
    } catch {
      if (mermaidContainer.value)
        mermaidContainer.value.innerHTML = '<div style="color:#dc2626;font-size:12px">架构图渲染失败</div>'
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (chapterTransitionTimer) clearTimeout(chapterTransitionTimer)
  editor.value?.destroy()
})
</script>

<style scoped>
.word-page {
  background: #fff;
  max-width: 800px;
  min-height: 600px;
  margin: 0 auto;
  padding: 60px 80px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  border-radius: 2px;
}

.word-body :deep(h1) {
  font-family: 'SimHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 20px 0 10px;
  color: #111;
}

.word-body :deep(h2) {
  font-family: 'SimHei', 'PingFang SC', sans-serif;
  font-size: 15px;
  font-weight: 600;
  margin: 16px 0 8px;
  color: #222;
}

.word-body :deep(h3) {
  font-family: 'SimSun', serif;
  font-size: 14px;
  font-weight: 700;
  margin: 12px 0 6px;
}

.word-body :deep(p) {
  font-family: 'SimSun', 'Songti SC', serif;
  font-size: 14px;
  line-height: 1.9;
  text-indent: 2em;
  margin: 8px 0;
  color: #1a1a1a;
}

.word-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
}

.word-body :deep(td),
.word-body :deep(th) {
  border: 0.5px solid #333;
  padding: 6px 10px;
  text-align: center;
  font-size: 12px;
  font-family: 'SimSun', serif;
}

.word-body :deep(th) {
  font-weight: 700;
  background: #f5f5f5;
}

.word-body :deep(mark) {
  background: #fef3c7;
  padding: 1px 3px;
  border-radius: 2px;
}

.word-body :deep(.ProseMirror) {
  outline: none;
  min-height: 480px;
  caret-color: #1677ff;
}

.word-body :deep(.ProseMirror:focus) {
  outline: none;
}

.word-body :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 12px auto;
}

.word-body :deep(.ProseMirror-selectednode) {
  outline: 2px solid #1677ff;
  border-radius: 2px;
}

.word-body :deep(ul),
.word-body :deep(ol) {
  padding-left: 2em;
  margin: 10px 0;
}

.word-body :deep(li p) {
  margin: 2px 0;
  text-indent: 0;
}

.word-body :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 14px;
  border-left: 3px solid #91caff;
  background: #f0f7ff;
  color: #555;
}

.word-body :deep(pre) {
  margin: 12px 0;
  padding: 12px 14px;
  overflow-x: auto;
  border-radius: 5px;
  background: #1f2937;
  color: #e5e7eb;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.word-body :deep(a) {
  color: #1677ff;
  text-decoration: underline;
}

.word-body :deep(hr) {
  margin: 18px 0;
  border: 0;
  border-top: 1px solid #d9d9d9;
}

.word-body :deep(.selectedCell) {
  background: #e6f4ff;
}

.alert-error {
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 12px;
  color: #dc2626;
}

.alert-warning {
  padding: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 11px;
  color: #92400e;
}

.missing-information-panel {
  margin-top: 28px;
  padding: 14px 16px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fafafa;
  color: #7a5a16;
  font-size: 12px;
}

.missing-information-title {
  margin-bottom: 7px;
  color: #8a6518;
  font-size: 12px;
  font-weight: 600;
}

.missing-information-item {
  line-height: 1.7;
}

.alert-conflict {
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 11px;
  color: #991b1b;
}

.diagram-box {
  margin-top: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 16px;
  background: #fafafa;
}

.mermaid-render {
  display: flex;
  justify-content: center;
}

.word-body :deep(.annotation-highlight) {
  background: #fff1b8;
  border-bottom: 2px solid #d48806;
  cursor: pointer;
}

.word-body :deep(.annotation-highlight.active) {
  background: #ffd666;
}

.word-body :deep(.source-highlight) {
  background: #dbeafe;
  border-bottom: 2px solid #1677ff;
  cursor: pointer;
}

.word-body :deep(.source-highlight.active) {
  background: #91caff;
}

.word-body :deep(.annotation-marker),
.word-body :deep(.source-marker) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin: 0 3px;
  padding: 0 4px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  cursor: pointer;
  font-size: 10px;
  line-height: 18px;
  vertical-align: middle;
}

.word-body :deep(.annotation-marker) {
  background: #d48806;
}

.word-body :deep(.annotation-marker.active) {
  background: #ad6800;
  box-shadow: 0 0 0 2px #ffe7ba;
}

.word-body :deep(.source-marker) {
  background: #1677ff;
  max-width: min(100%, 420px);
  padding: 2px 6px;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.35;
  text-align: left;
}

.word-body :deep(.source-marker.active) {
  background: #0958d9;
  box-shadow: 0 0 0 2px #dbeafe;
}

.word-body :deep(.source-table-marker) {
  display: block;
  min-width: 0;
  min-height: 28px;
  height: auto;
  margin: 8px 0 12px;
  padding: 6px 10px;
  border-radius: 10px;
  line-height: 1.45;
  text-align: left;
}

.word-body :deep(.source-table-highlight) {
  outline: 2px solid #bfdbfe;
  outline-offset: 4px;
  border-radius: 6px;
}

.word-body :deep(.source-table-highlight.active) {
  outline-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.16);
}
</style>
