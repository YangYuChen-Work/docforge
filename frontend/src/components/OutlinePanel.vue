<template>
  <div class="editor-outline">
    <div class="outline-header">
      <div class="outline-title">{{ docTitle }}</div>
      <div class="outline-saved">
        <span
          class="saved-badge"
          :class="saveStatusClass(saveStatus)"
          :title="saveError || undefined"
        >
          {{ saveStatusLabel(saveStatus) }}
        </span>
        <span v-if="saveStatus === '已保存' && savedAt"> · 自动保存 {{ savedAt }}</span>
      </div>
    </div>
    <div class="outline-section-title">文档目录</div>
    <div class="outline-tree">
      <div
        v-for="ch in chapters"
        :key="ch.id"
        class="outline-item"
        :class="{ active: ch.id === activeId }"
        @click="$emit('select', ch)"
      >
        <span class="outline-item-text" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          {{ ch.order_index }}. {{ ch.title }}
        </span>
        <span class="outline-status" :class="statusClass(ch.status)">
          {{ statusTag(ch.status) }}
        </span>
      </div>
    </div>
    <div class="outline-add" @click="addChapter">+ 新增章节</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  docTitle: string
  chapters: any[]
  activeId: string
  saveStatus?: string
  savedAt?: string
  saveError?: string
}>()
const emit = defineEmits<{ select: [chapter: any]; addChapter: [title: string] }>()

function saveStatusLabel(status?: string) {
  const map: Record<string, string> = {
    '有未保存修改': '未保存',
    '保存中...': '保存中',
    '保存失败': '保存失败',
    '已保存': '已保存',
  }
  return map[status || '已保存'] || '已保存'
}

function saveStatusClass(status?: string) {
  if (status === '保存失败') return 'error'
  if (status === '有未保存修改' || status === '保存中...') return 'unsaved'
  return ''
}

function statusTag(s: string) {
  const map: Record<string, string> = {
    pending: '待生成',
    generating: '生成中',
    generated: '已生成',
    confirmed: '已确认',
    failed: '失败',
    needs_material: '待补充',
  }
  return map[s] || s
}

function statusClass(s: string) {
  const map: Record<string, string> = {
    confirmed: 'done',
    generating: 'current',
    generated: 'current',
    pending: 'pending',
    needs_material: 'pending',
    failed: 'failed',
  }
  return map[s] || 'pending'
}

function addChapter() {
  const title = window.prompt('新章节标题：')
  if (title && title.trim()) emit('addChapter', title.trim())
}
</script>
