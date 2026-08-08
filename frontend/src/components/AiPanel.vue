<template>
  <div class="editor-ai-panel">
    <div class="ai-panel-header">
      <h4>协作侧栏</h4>
      <p class="ai-panel-desc">围绕当前选区、引用批注和历史资料与 AI 对话。</p>
    </div>
    <div class="ai-panel-tabs">
      <button
        v-for="t in ['批注', 'AI助手']"
        :key="t"
        class="ai-tab"
        :class="{ active: activeTab === t }"
        @click="activeTab = t"
      >
        {{ t === '批注' ? `批注 ${annotations.length}` : t }}
      </button>
    </div>

    <!-- Annotation tab -->
    <div v-if="activeTab === '批注'" class="ai-tab-content" style="flex:1;overflow-y:auto">
      <div class="ai-section-title">当前段落批注</div>
      <div v-if="annotations.length === 0" style="padding:20px;text-align:center;color:#999;font-size:13px">
        本章节暂无批注
      </div>
      <div v-for="a in annotations" :key="a.id" class="annotation-card">
        <div class="anno-header">
          <span class="anno-id">{{ a.label }}</span>
          <span class="anno-label">{{ a.created_by }}</span>
        </div>
        <p class="anno-text">{{ a.content }}</p>
        <div v-if="a.locator" class="anno-action">来源：{{ a.locator }}</div>
        <div v-if="a.status === 'pending'" style="display:flex;gap:6px;margin-top:8px">
          <button
            class="ai-bubble-btn apply-btn"
            @click="$emit('updateAnnotation', a.id, 'applied')"
          >
            应用
          </button>
          <button
            class="ai-bubble-btn comment-btn"
            @click="$emit('updateAnnotation', a.id, 'dismissed')"
          >
            驳回
          </button>
        </div>
        <div v-else class="anno-action">
          {{ a.status === 'applied' ? '已应用' : '已驳回' }}
        </div>
      </div>
    </div>

    <!-- AI assistant tab -->
    <div v-if="activeTab === 'AI助手'" class="ai-tab-content" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
      <div v-if="selectionText" class="selection-banner">
        <div class="selection-banner-label">当前选区（{{ selectionText.length }} 字）</div>
        <div class="selection-banner-text">{{ truncatedSelection }}</div>
      </div>
      <div v-else class="selection-banner selection-banner-empty">
        未选中文字 — 快捷操作将作用于整段正文
      </div>

      <div class="ai-section-title">快捷操作</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
        <button
          v-for="action in quickActions"
          :key="action.key"
          class="btn btn-outline"
          style="margin-top:0;padding:5px 10px;font-size:12px"
          :disabled="busy"
          @click="doAction(action.key)"
        >
          {{ action.label }}
        </button>
      </div>
      <div style="flex:1;overflow-y:auto">
        <div
          v-for="m in messages"
          :key="m.id"
          class="chat-bubble"
          :class="m.role === 'user' ? 'user' : 'ai'"
        >
          <div style="font-weight:500;margin-bottom:3px;opacity:.7;font-size:11px">
            {{ m.role === 'user' ? '指令' : 'AI' }}
          </div>
          <div style="line-height:1.6;white-space:pre-wrap">{{ m.content }}</div>
          <div v-if="m.role === 'ai'" class="ai-bubble-actions">
            <button
              v-if="m.hadSelection"
              class="ai-bubble-btn apply-btn"
              @click="$emit('replaceSelection', m.content)"
            >
              <span class="ai-bubble-btn-icon">⇄</span>替换选中文字
            </button>
            <button class="ai-bubble-btn apply-btn" @click="$emit('insertAtCursor', m.content)">
              <span class="ai-bubble-btn-icon">✓</span>插入到光标处
            </button>
            <button class="ai-bubble-btn comment-btn" @click="$emit('insertAnnotation', m.content)">
              <span class="ai-bubble-btn-icon">💬</span>插入批注
            </button>
          </div>
        </div>
        <div v-if="busy" style="font-size:11px;color:#999;text-align:center">处理中...</div>
      </div>
    </div>

    <!-- Chat Input -->
    <div v-if="activeTab === 'AI助手'" class="ai-chat-input">
      <input
        v-model="instruction"
        type="text"
        placeholder="继续追问或输入修改要求..."
        class="chat-input-field"
        @keydown.enter="sendInstruction"
      />
      <button class="chat-send-btn" @click="sendInstruction">&#x27A4;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  annotations: any[]
  chapterId: string
  docId: string
  selectionText: string
}>()
const emit = defineEmits<{
  updateAnnotation: [annotationId: string, status: string]
  applyAiSuggestion: [content: string]
  insertAnnotation: [content: string]
  replaceSelection: [content: string]
  insertAtCursor: [content: string]
  aiAction: [action: string, selection: string, instruction: string]
}>()
const activeTab = ref('批注')
const instruction = ref('')
const busy = ref(false)
const messages = ref<any[]>([])
let msgId = 0

const truncatedSelection = computed(() =>
  props.selectionText.length > 80 ? props.selectionText.slice(0, 80) + '…' : props.selectionText
)

const quickActions = [
  { key: 'polish', label: '润色本段' },
  { key: 'expand', label: '扩写本节' },
  { key: 'review', label: '一键审核' },
  { key: 'generate_diagram', label: '生成架构图' },
]

// Quick actions and free-form instructions both operate on the current Tiptap
// selection when one exists (props.selectionText, kept in sync by
// ContentPanel's onSelectionUpdate via DocEditor). Falling back to '' selects
// the whole chapter body server-side (see ai-action endpoint's `context`).
function doAction(action: string) {
  const label = quickActions.find((a) => a.key === action)?.label || action
  messages.value.push({
    id: msgId++,
    role: 'user',
    content: props.selectionText ? `${label}（选中 ${props.selectionText.length} 字）` : label,
  })
  emit('aiAction', action, props.selectionText, instruction.value)
}

function sendInstruction() {
  if (!instruction.value.trim()) return
  messages.value.push({ id: msgId++, role: 'user', content: instruction.value })
  emit('aiAction', 'address_comments', props.selectionText, instruction.value)
  instruction.value = ''
}

defineExpose({
  addAiMessage(content: string, hadSelection = false) {
    messages.value.push({ id: msgId++, role: 'ai', content, hadSelection })
  },
  setBusy(v: boolean) {
    busy.value = v
  },
})
</script>
