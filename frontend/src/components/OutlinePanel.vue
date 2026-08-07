<template>
  <div class="editor-outline">
    <div class="outline-header">
      <div class="outline-title">{{ docTitle }}</div>
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
        <span class="outline-status" :style="tagStyle(ch.status)">
          {{ statusTag(ch.status) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ docTitle: string; chapters: any[]; activeId: string }>()
defineEmits(['select'])

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

function tagStyle(s: string) {
  const c: Record<string, string> = {
    confirmed: '#16a34a',
    failed: '#dc2626',
    needs_material: '#d97706',
    generated: '#1a5ccc',
    generating: '#1a5ccc',
    pending: '#9ca3af',
  }
  const color = c[s] || '#9ca3af'
  return `background:${color}22;color:${color}`
}
</script>
