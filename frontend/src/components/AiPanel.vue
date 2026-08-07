<template>
  <div style="width:280px;border-left:1px solid #e5e7eb;display:flex;flex-direction:column;background:#fafafa;flex-shrink:0">
    <div style="display:flex;border-bottom:1px solid #e5e7eb">
      <div
        v-for="t in ['批注', 'AI助手']"
        :key="t"
        @click="activeTab = t"
        :style="`flex:1;padding:10px;text-align:center;font-size:12px;cursor:pointer;border-bottom:2px solid ${activeTab === t ? '#1a5ccc' : 'transparent'};color:${activeTab === t ? '#1a5ccc' : '#667'}`"
      >
        {{ t }}
      </div>
    </div>

    <!-- Annotation tab -->
    <div v-if="activeTab === '批注'" style="flex:1;overflow-y:auto;padding:12px">
      <div v-if="annotations.length === 0" style="font-size:12px;color:#999;text-align:center;padding-top:40px">
        本章节暂无批注
      </div>
      <div
        v-for="a in annotations"
        :key="a.id"
        style="background:#fff;border:1px solid #e5e7eb;border-radius:4px;padding:10px;margin-bottom:8px"
      >
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:10px;padding:2px 6px;border-radius:8px;background:#eff6ff;color:#1a5ccc">
            {{ a.label }}
          </span>
          <span style="font-size:10px;color:#999">{{ a.created_by }}</span>
        </div>
        <div style="font-size:11px;color:#333;line-height:1.6">{{ a.content }}</div>
        <div v-if="a.locator" style="font-size:10px;color:#999;margin-top:4px">来源：{{ a.locator }}</div>
        <div v-if="a.status === 'pending'" style="display:flex;gap:6px;margin-top:6px">
          <button
            @click="$emit('updateAnnotation', a.id, 'applied')"
            style="font-size:10px;padding:3px 8px;background:#dcfce7;color:#16a34a;border:none;border-radius:3px;cursor:pointer"
          >
            应用
          </button>
          <button
            @click="$emit('updateAnnotation', a.id, 'dismissed')"
            style="font-size:10px;padding:3px 8px;background:#f3f4f6;color:#666;border:none;border-radius:3px;cursor:pointer"
          >
            驳回
          </button>
        </div>
        <div v-else style="font-size:10px;color:#999;margin-top:4px">
          {{ a.status === 'applied' ? '已应用' : '已驳回' }}
        </div>
      </div>
    </div>

    <!-- AI assistant tab -->
    <div v-if="activeTab === 'AI助手'" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:10px;border-bottom:1px solid #e5e7eb">
        <div style="font-size:11px;color:#667;margin-bottom:8px">快捷操作</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          <button
            v-for="action in quickActions"
            :key="action.key"
            @click="doAction(action.key)"
            :disabled="busy"
            style="font-size:11px;padding:4px 8px;background:#fff;border:1px solid #ddd;border-radius:4px;cursor:pointer"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:10px">
        <div
          v-for="m in messages"
          :key="m.id"
          :style="`margin-bottom:8px;padding:8px;border-radius:4px;font-size:11px;background:${m.role === 'user' ? '#eff6ff' : '#fff'};border:1px solid ${m.role === 'user' ? '#bfdbfe' : '#e5e7eb'}`"
        >
          <div style="font-weight:500;margin-bottom:3px;color:#667">
            {{ m.role === 'user' ? '指令' : 'AI' }}
          </div>
          <div style="line-height:1.6;white-space:pre-wrap">{{ m.content }}</div>
          <div v-if="m.role === 'ai'" style="display:flex;gap:4px;margin-top:6px">
            <button
              @click="$emit('applyAiSuggestion', m.content)"
              style="font-size:10px;padding:3px 8px;background:#dcfce7;color:#16a34a;border:none;border-radius:3px;cursor:pointer"
            >
              应用到正文
            </button>
            <button
              @click="$emit('insertAnnotation', m.content)"
              style="font-size:10px;padding:3px 8px;background:#f3f4f6;color:#555;border:none;border-radius:3px;cursor:pointer"
            >
              插入批注
            </button>
          </div>
        </div>
        <div v-if="busy" style="font-size:11px;color:#999;text-align:center">处理中...</div>
      </div>
      <div style="padding:10px;border-top:1px solid #e5e7eb;display:flex;gap:6px">
        <input
          v-model="instruction"
          placeholder="输入指令..."
          @keydown.enter="sendInstruction"
          style="flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px"
        />
        <button
          @click="sendInstruction"
          style="padding:6px 10px;background:#1a5ccc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ annotations: any[]; chapterId: string; docId: string }>()
const emit = defineEmits<{
  updateAnnotation: [annotationId: string, status: string]
  applyAiSuggestion: [content: string]
  insertAnnotation: [content: string]
  aiAction: [action: string, selection: string, instruction: string]
}>()
const activeTab = ref('批注')
const instruction = ref('')
const busy = ref(false)
const messages = ref<any[]>([])
let msgId = 0

const quickActions = [
  { key: 'polish', label: '润色本段' },
  { key: 'expand', label: '扩写本节' },
  { key: 'review', label: '一键审核' },
  { key: 'generate_diagram', label: '生成架构图' },
]

function doAction(action: string) {
  messages.value.push({ id: msgId++, role: 'user', content: `执行：${action}` })
  emit('aiAction', action, '', instruction.value)
}

function sendInstruction() {
  if (!instruction.value.trim()) return
  messages.value.push({ id: msgId++, role: 'user', content: instruction.value })
  emit('aiAction', 'address_comments', '', instruction.value)
  instruction.value = ''
}

defineExpose({
  addAiMessage(content: string) {
    messages.value.push({ id: msgId++, role: 'ai', content })
  },
  setBusy(v: boolean) {
    busy.value = v
  },
})
</script>
