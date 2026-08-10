<template>
  <aside class="editor-ai-panel">
    <div class="ai-panel-header">
      <div class="ai-panel-title-row">
        <div>
          <h4>{{ activeTab === 'ai' ? '内容协作助手' : panelTitle }}</h4>
          <p class="ai-panel-desc">
            {{ activeTab === 'ai' ? '选中文字、当前章节和来源资料都可以直接交给 AI 处理。' : panelDescription }}
          </p>
        </div>
        <span v-if="activeTab === 'ai'" class="ai-online-badge"><i></i>在线</span>
      </div>
    </div>

    <div class="editor-function-tabs" role="tablist" aria-label="文档协作功能">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="editor-function-tab"
        :class="{ active: activeTab === tab.key }"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="openTab(tab.key)"
      >
        <span>{{ tab.icon }}</span>
        {{ tab.label }}
        <span v-if="tab.key === 'annotations' && pendingAnnotationCount" class="function-tab-count">
          {{ pendingAnnotationCount }}
        </span>
      </button>
    </div>

    <template v-if="activeTab === 'ai'">
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
        <div v-for="(a, index) in annotations" :key="a.id" class="ai-suggestion-card">
          <div class="ai-suggestion-meta">
            <span>批注{{ index + 1 }}</span>
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
    </template>

    <template v-else-if="activeTab === 'annotations'">
      <div class="panel-tab-scroll">
        <div class="annotation-create-box">
          <div class="panel-section-heading">创建批注</div>
          <div v-if="selectionText" class="annotation-selection-preview">
            <span>已选原文</span>
            <strong>{{ truncatedSelection }}</strong>
          </div>
          <div v-else class="annotation-empty-selection">请先在正文中选中文字，再创建批注。</div>
          <textarea
            v-model="annotationDraft"
            class="annotation-textarea"
            rows="3"
            placeholder="输入批示或修改建议..."
          ></textarea>
          <div v-if="annotationError" class="panel-inline-error">{{ annotationError }}</div>
          <button
            class="panel-primary-button"
            type="button"
            :disabled="!selectionText.trim() || !annotationDraft.trim() || annotationSaving"
            @click="submitAnnotation"
          >
            {{ annotationSaving ? '保存中...' : '保存批注' }}
          </button>
        </div>

        <div class="panel-section-heading annotation-list-heading">
          本章批注
          <span class="ai-count-badge">{{ annotations.length }}</span>
        </div>
        <div v-if="annotations.length === 0" class="panel-empty-state">当前章节还没有批注。</div>
        <article
          v-for="(annotation, index) in annotations"
          :key="annotation.id"
          class="annotation-review-card"
          :class="{ active: activeAnnotationId === annotation.id }"
          @click="$emit('annotationFocus', annotation.id)"
        >
          <div class="annotation-review-header">
            <span class="annotation-number">批注{{ index + 1 }}</span>
            <span class="annotation-status">{{ annotationStatus(annotation.status) }}</span>
          </div>
          <div class="annotation-original-text">{{ annotation.target_text || '未记录原文' }}</div>
          <div class="annotation-review-content">{{ annotation.content }}</div>
          <div class="annotation-review-actions" @click.stop>
            <button class="ai-bubble-btn apply-btn" type="button" @click="$emit('annotationFocus', annotation.id)">定位原文</button>
            <button class="ai-bubble-btn comment-btn" type="button" @click="$emit('commentAiAction', annotation)">AI 修改</button>
            <button
              v-if="annotation.status === 'pending'"
              class="ai-bubble-btn apply-btn"
              type="button"
              @click="$emit('updateAnnotation', annotation.id, 'applied')"
            >
              标记已处理
            </button>
            <button
              v-if="annotation.status === 'pending'"
              class="ai-bubble-btn comment-btn"
              type="button"
              @click="$emit('updateAnnotation', annotation.id, 'dismissed')"
            >
              忽略
            </button>
          </div>
        </article>
      </div>
    </template>

    <template v-else-if="activeTab === 'sources'">
      <div class="panel-tab-scroll">
        <div class="panel-section-heading">
          {{ sourcePanelHeading }}
          <span v-if="citationCards.length" class="ai-count-badge">{{ citationCards.length }}</span>
        </div>
        <div
          v-if="sourceStateMessage"
          class="source-state-message"
          :class="`source-state-${citationState}`"
          role="status"
        >
          {{ sourceStateMessage }}
        </div>
        <article
          v-for="citation in citationCards"
          :key="citation.key"
          class="source-card"
          :class="{ active: activeCitationKey === citation.key, context: citation.citation_type === 'context' }"
          @click="$emit('citationFocus', citation.key)"
        >
          <div class="source-card-header">
            <span class="source-file-icon">文</span>
            <strong :title="citation.fileName">{{ citation.fileName }}</strong>
          </div>
          <div class="source-card-locator">定位：{{ citation.locator || '未提供定位' }}</div>
          <div class="source-card-excerpt-label">
            {{ citation.citation_type === 'context' ? 'AI 参考上下文（未返回明确引用）' : '参考原文' }}
          </div>
          <div class="source-card-excerpt" :class="{ expanded: expandedSources[citation.key] }">
            {{ citation.source_excerpt || '未提供参考原文' }}
          </div>
          <div class="source-card-footer">
            <button class="source-expand-button" type="button" @click.stop="toggleSource(citation.key)">
              {{ expandedSources[citation.key] ? '收起详情' : '展开详情' }}
            </button>
            <button class="source-locate-button" type="button" @click.stop="$emit('citationFocus', citation.key)">
              定位正文
            </button>
          </div>
        </article>
      </div>
    </template>

    <template v-else>
      <div class="lineage-placeholder">
        <div class="lineage-placeholder-icon">⌁</div>
        <strong>数据链追踪</strong>
        <span>功能预留，暂未实现</span>
        <p>后续将在这里展示数据来源、计算过程和一致性校验结果。</p>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

type PanelTab = 'ai' | 'annotations' | 'sources' | 'lineage'

type Annotation = {
  id: string
  label?: string
  target_text?: string | null
  content: string
  status?: string
  created_by?: string
}

type Citation = {
  key?: string
  source_document_id: string
  locator?: string | null
  source_excerpt?: string | null
  citation_type?: string | null
}

type CitationState = 'generating' | 'explicit' | 'context' | 'missing'

const props = defineProps<{
  annotations: Annotation[]
  citations: Citation[]
  sourceDetails: Record<string, any>
  chapterStatus: string
  citationState: CitationState
  chapterId: string
  docId: string
  selectionText: string
  activeAnnotationId?: string
  activeCitationKey?: string
}>()
const emit = defineEmits<{
  updateAnnotation: [annotationId: string, status: string]
  replaceSelection: [content: string]
  insertAtCursor: [content: string]
  aiAction: [action: string, selection: string, instruction: string]
  createAnnotation: [body: { type: string; label: string; target_text: string; content: string }]
  annotationFocus: [id: string]
  citationFocus: [key: string]
  commentAiAction: [annotation: Annotation]
}>()

const instruction = ref('')
const busy = ref(false)
const messages = ref<any[]>([])
const chatScrollRef = ref<HTMLElement | null>(null)
const loadingHint = ref('AI 正在分析当前内容...')
const activeTab = ref<PanelTab>('ai')
const annotationDraft = ref('')
const annotationError = ref('')
const annotationSaving = ref(false)
const expandedSources = ref<Record<string, boolean>>({})
let msgId = 0
let loadingTimer: ReturnType<typeof setInterval> | null = null

const tabs: Array<{ key: PanelTab; label: string; icon: string }> = [
  { key: 'ai', label: 'AI 助手', icon: '✦' },
  { key: 'annotations', label: '批注', icon: '▱' },
  { key: 'sources', label: '数据来源', icon: '▤' },
  { key: 'lineage', label: '数据链追踪', icon: '⌁' },
]

const panelTitle = computed(() => tabs.find((tab) => tab.key === activeTab.value)?.label || '')
const panelDescription = computed(() => {
  if (activeTab.value === 'annotations') return '集中查看批示内容，并联动正文原文。'
  if (activeTab.value === 'sources') {
    if (props.citationState === 'generating') return '本章生成中的参考资料将在引用完成后自动加载。'
    if (props.citationState === 'context') return '展示 AI 实际使用的参考上下文，待补充明确引用。'
    if (props.citationState === 'missing') return '没有可核验来源时会明确标记为待补充。'
    return '只展示本章最终引用的文件和参考原文。'
  }
  return '预留数据一致性追踪能力。'
})
const sourcePanelHeading = computed(() => {
  if (props.citationState === 'context') return 'AI 生成参考资料（待明确引用）'
  if (props.citationState === 'generating') return '本章来源生成中'
  if (props.citationState === 'missing') return '本章来源待补充'
  return '本章最终来源'
})
const sourceStateMessage = computed(() => {
  if (props.citationState === 'generating') return '本章正在生成，引用完成后会自动加载。'
  if (props.citationState === 'missing') return '本章未匹配到可用来源或未返回有效引用。'
  return ''
})
const truncatedSelection = computed(() =>
  props.selectionText.length > 120 ? props.selectionText.slice(0, 120) + '…' : props.selectionText,
)
const pendingAnnotationCount = computed(() => props.annotations.filter((annotation) => annotation.status === 'pending').length)
const citationCards = computed(() =>
  props.citations.map((citation, index) => {
    const key = citation.key || `${citation.source_document_id}:${index}`
    const source = props.sourceDetails[citation.source_document_id] || {}
    return {
      ...citation,
      key,
      fileName: source.original_name || `来源资料 ${citation.source_document_id}`,
    }
  }),
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

function openTab(tab: PanelTab) {
  activeTab.value = tab
}

function annotationStatus(status?: string) {
  if (status === 'applied') return '已处理'
  if (status === 'dismissed') return '已忽略'
  return '待处理'
}

function toggleSource(key: string) {
  expandedSources.value[key] = !expandedSources.value[key]
}

function submitAnnotation() {
  const content = annotationDraft.value.trim()
  const targetText = props.selectionText.trim()
  if (!targetText) {
    annotationError.value = '请先在正文中选中文字'
    return
  }
  if (!content) {
    annotationError.value = '请输入批示内容'
    return
  }
  annotationError.value = ''
  annotationSaving.value = true
  emit('createAnnotation', {
    type: 'review_comment',
    label: '批注',
    target_text: targetText,
    content,
  })
}

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
  openTab,
  annotationCreated() {
    annotationDraft.value = ''
    annotationError.value = ''
    annotationSaving.value = false
    activeTab.value = 'annotations'
  },
  annotationCreateFailed(message: string) {
    annotationError.value = message
    annotationSaving.value = false
  },
})

onBeforeUnmount(stopLoadingTimer)
</script>
