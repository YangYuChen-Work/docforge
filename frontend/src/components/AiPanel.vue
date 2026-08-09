<template>
  <aside class="editor-ai-panel">
    <div class="ai-panel-header">
      <div class="ai-panel-title-row">
        <div>
          <h4>内容协作助手</h4>
          <p class="ai-panel-desc">选中文字、当前章节和来源资料都可以直接交给 AI 处理。</p>
        </div>
        <span class="ai-online-badge"><i></i>在线</span>
      </div>
    </div>

    <div class="ai-context-summary">
      <span class="ai-context-icon">✦</span>
      <div>
        <strong>{{ selectionText ? '已锁定当前选区' : '当前章节上下文' }}</strong>
        <span>{{ selectionText ? `${selectionText.length} 字，将优先处理选中文字` : '快捷操作将作用于当前章节正文' }}</span>
      </div>
    </div>

    <div v-if="selectionText" class="selection-banner">
      <div class="selection-banner-label">当前选区</div>
      <div class="selection-banner-text">{{ truncatedSelection }}</div>
    </div>

    <div v-if="annotations.length" class="ai-suggestions-section">
      <div class="ai-section-title">
        智能建议
        <span class="ai-count-badge">{{ annotations.length }}</span>
      </div>
      <div v-for="a in annotations" :key="a.id" class="ai-suggestion-card">
        <div class="ai-suggestion-meta">
          <span>{{ a.label || 'AI 建议' }}</span>
          <span>{{ a.created_by || '系统' }}</span>
        </div>
        <p>{{ a.content }}</p>
        <div v-if="a.status === 'pending'" class="ai-suggestion-actions">
          <button class="ai-bubble-btn apply-btn" @click="$emit('updateAnnotation', a.id, 'applied')">标记已处理</button>
          <button class="ai-bubble-btn comment-btn" @click="$emit('updateAnnotation', a.id, 'dismissed')">忽略</button>
        </div>
        <div v-else class="anno-action">{{ a.status === 'applied' ? '已处理' : '已忽略' }}</div>
      </div>
    </div>

    <div class="ai-section-title ai-actions-title">快捷操作</div>
    <div class="ai-quick-actions">
      <button
        v-for="action in quickActions"
        :key="action.key"
        class="ai-quick-action"
        :disabled="busy"
        :title="action.hint"
        @click="doAction(action.key)"
      >
        <span class="ai-quick-action-icon">{{ action.icon }}</span>
        <span>{{ action.label }}</span>
      </button>
    </div>

    <div ref="chatScrollRef" class="ai-chat-scroll" aria-live="polite">
      <div v-if="messages.length === 0" class="ai-empty-state">
        <div class="ai-empty-icon">✦</div>
        <strong>从一个动作开始</strong>
        <span>选中文字后可替换，也可以把结果插入到光标处。</span>
      </div>
      <div
        v-for="m in messages"
        :key="m.id"
        class="chat-bubble"
        :class="m.role === 'user' ? 'user' : 'ai'"
      >
        <div class="chat-bubble-header">
          <span>{{ m.role === 'user' ? '你的指令' : 'AI 助手' }}</span>
          <span v-if="m.hadSelection && m.role === 'ai'" class="chat-scope">基于选区</span>
        </div>
        <div v-if="m.loading" class="ai-loading-line">
          <span class="ai-spinner"></span>{{ loadingHint }}
        </div>
        <div v-else class="chat-bubble-content">{{ m.content }}</div>
        <div v-if="m.role === 'ai' && !m.loading" class="ai-bubble-actions">
          <button
            v-if="m.hadSelection"
            class="ai-bubble-btn apply-btn"
            title="替换调用 AI 时保存的选区"
            @click="$emit('replaceSelection', m.content)"
          >
            ⇄ 替换选区
          </button>
          <button class="ai-bubble-btn apply-btn" title="把结果插入当前光标位置" @click="$emit('insertAtCursor', m.content)">
            ✓ 插入光标处
          </button>
        </div>
      </div>
    </div>

    <div class="ai-chat-input">
      <input
        v-model="instruction"
        type="text"
        placeholder="继续追问或输入修改要求..."
        class="chat-input-field"
        :disabled="busy"
        @keydown.enter="sendInstruction"
      />
      <button class="chat-send-btn" :disabled="busy || !instruction.trim()" @click="sendInstruction">➤</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  annotations: any[]
  chapterId: string
  docId: string
  selectionText: string
}>()
const emit = defineEmits<{
  updateAnnotation: [annotationId: string, status: string]
  replaceSelection: [content: string]
  insertAtCursor: [content: string]
  aiAction: [action: string, selection: string, instruction: string]
}>()

const instruction = ref('')
const busy = ref(false)
const messages = ref<any[]>([])
const chatScrollRef = ref<HTMLElement | null>(null)
const loadingHint = ref('AI 正在分析当前内容...')
let msgId = 0
let loadingTimer: ReturnType<typeof setInterval> | null = null

const truncatedSelection = computed(() =>
  props.selectionText.length > 120 ? props.selectionText.slice(0, 120) + '…' : props.selectionText
)

const quickActions = [
  { key: 'polish', label: '润色', icon: '✎', hint: '改善表达，保持原意' },
  { key: 'expand', label: '扩写', icon: '↗', hint: '补充细节和论据' },
  { key: 'summarize', label: '摘要', icon: '≡', hint: '提炼本段核心信息' },
  { key: 'shorten', label: '精简', icon: '−', hint: '去除冗余，压缩表达' },
  { key: 'extract_points', label: '提取要点', icon: '☷', hint: '整理成条理化要点' },
  { key: 'review', label: '内容审核', icon: '✓', hint: '检查事实、引用和表达问题' },
  { key: 'generate_diagram', label: '生成图示', icon: '⌘', hint: '根据当前内容生成架构图' },
]

function scrollToBottom() {
  nextTick(() => {
    if (chatScrollRef.value) chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
  })
}

function doAction(action: string) {
  const selected = props.selectionText.trim()
  const label = quickActions.find((a) => a.key === action)?.label || action
  messages.value.push({
    id: msgId++,
    role: 'user',
    content: selected ? `${label}（已选 ${selected.length} 字）` : `${label}当前章节`,
  })
  scrollToBottom()
  emit('aiAction', action, props.selectionText, instruction.value)
}

function sendInstruction() {
  const value = instruction.value.trim()
  if (!value || busy.value) return
  messages.value.push({ id: msgId++, role: 'user', content: value })
  instruction.value = ''
  scrollToBottom()
  emit('aiAction', 'address_comments', props.selectionText, value)
}

watch(
  () => [messages.value.length, busy.value, loadingHint.value],
  () => scrollToBottom(),
)

function stopLoadingTimer() {
  if (loadingTimer) clearInterval(loadingTimer)
  loadingTimer = null
}

defineExpose({
  addAiMessage(content: string, hadSelection = false) {
    messages.value.push({ id: msgId++, role: 'ai', content, hadSelection })
    scrollToBottom()
  },
  setBusy(value: boolean) {
    busy.value = value
    if (value) {
      messages.value = messages.value.filter((message) => !message.loading)
      messages.value.push({ id: msgId++, role: 'ai', content: '', loading: true })
      loadingHint.value = 'AI 正在分析当前内容...'
      stopLoadingTimer()
      const hints = ['AI 正在分析当前内容...', 'AI 正在整理可执行建议...', 'AI 正在检查表达和结构...']
      let index = 0
      loadingTimer = setInterval(() => {
        index = (index + 1) % hints.length
        loadingHint.value = hints[index]
      }, 900)
    } else {
      messages.value = messages.value.filter((message) => !message.loading)
      stopLoadingTimer()
    }
    scrollToBottom()
  },
})

onBeforeUnmount(stopLoadingTimer)
</script>
