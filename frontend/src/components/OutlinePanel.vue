<template>
  <div style="width:240px;border-right:1px solid #e5e7eb;overflow-y:auto;background:#fafafa;flex-shrink:0">
    <div style="padding:12px 16px;font-size:12px;font-weight:600;color:#1a2a4a;border-bottom:1px solid #e5e7eb">
      {{ docTitle }}
    </div>
    <div
      v-for="ch in chapters"
      :key="ch.id"
      @click="$emit('select', ch)"
      :style="`padding:9px 16px;font-size:12px;cursor:pointer;border-left:3px solid ${ch.id === activeId ? '#1a5ccc' : 'transparent'};background:${ch.id === activeId ? '#eff6ff' : 'transparent'};color:#333`"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          {{ ch.order_index }}. {{ ch.title }}
        </span>
        <span :style="tagStyle(ch.status)" style="font-size:10px;padding:1px 5px;border-radius:8px;flex-shrink:0">
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
