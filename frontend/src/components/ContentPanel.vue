<template>
  <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:#e9ecf1">
    <!-- Topbar -->
    <div
      style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid #e5e7eb;background:#fff;flex-shrink:0"
    >
      <span style="font-size:14px;font-weight:600;color:#1a2a4a">{{ chapter?.title || '请选择章节' }}</span>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="font-size:11px;color:#999">{{ saveStatus }}</span>
        <button
          v-if="chapter && chapter.status !== 'confirmed'"
          @click="$emit('confirm')"
          style="padding:6px 12px;background:#16a34a;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px"
        >
          确认章节
        </button>
        <button
          v-if="chapter"
          @click="$emit('regenerate')"
          style="padding:6px 12px;background:#f9fafb;color:#333;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:12px"
        >
          重新生成
        </button>
        <div style="position:relative">
          <button
            @click="showExport = !showExport"
            style="padding:6px 12px;background:#1a5ccc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px"
          >
            导出 ▾
          </button>
          <div
            v-if="showExport"
            style="position:absolute;right:0;top:32px;background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.08);z-index:10;min-width:100px"
          >
            <div
              v-for="fmt in ['docx', 'pdf', 'xlsx']"
              :key="fmt"
              @click="$emit('export', fmt); showExport = false"
              style="padding:8px 16px;font-size:12px;cursor:pointer;text-transform:uppercase"
            >
              {{ fmt.toUpperCase() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Word-like page area -->
    <div style="flex:1;overflow-y:auto;padding:32px 24px">
      <div v-if="!chapter" style="color:#999;font-size:13px;text-align:center;padding-top:60px">
        ← 从左侧选择章节
      </div>
      <template v-else>
        <div class="word-page">
          <div v-if="chapter.status === 'failed'" class="alert-error">
            ⚠ 生成失败：{{ chapter.error_message || '未知错误' }}
          </div>
          <div v-if="missingItems.length > 0" class="alert-warning">
            <div style="font-weight:600;margin-bottom:6px">待补充项</div>
            <div v-for="m in missingItems" :key="m">• {{ m }}</div>
          </div>
          <div v-if="conflictItems.length > 0" class="alert-conflict">
            <div style="font-weight:600;margin-bottom:6px">内容冲突</div>
            <div v-for="c in conflictItems" :key="c.description">• {{ c.description }}</div>
          </div>

          <editor-content :editor="editor" class="word-body" />

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
import { Highlight } from '@tiptap/extension-highlight'

const props = defineProps<{ chapter: any; saveStatus: string }>()
const emit = defineEmits<{
  confirm: []
  regenerate: []
  export: [format: string]
  edit: [text: string, contentJson: string]
}>()
const showExport = ref(false)
const mermaidContainer = ref<HTMLElement>()

function parseContent(chapter: any) {
  if (!chapter?.content_json)
    return chapter?.plain_text
      ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: chapter.plain_text }] }] }
      : ''
  try {
    return JSON.parse(chapter.content_json)
  } catch {
    return chapter.plain_text || ''
  }
}

const editor = useEditor({
  content: parseContent(props.chapter),
  extensions: [
    StarterKit,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Highlight.configure({ multicolor: true }),
  ],
  editable: props.chapter?.status !== 'confirmed',
  onUpdate({ editor }) {
    emit('edit', editor.getText(), JSON.stringify(editor.getJSON()))
  },
})

watch(
  () => props.chapter?.id,
  () => {
    if (!editor.value) return
    editor.value.commands.setContent(parseContent(props.chapter))
    editor.value.setEditable(props.chapter?.status !== 'confirmed')
  }
)

watch(
  () => props.chapter?.status,
  () => {
    editor.value?.setEditable(props.chapter?.status !== 'confirmed')
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
</style>
