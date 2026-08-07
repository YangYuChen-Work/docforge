<template>
  <div style="padding:24px">
    <h2 style="margin:0 0 20px;font-size:18px;color:#1a2a4a">操作日志</h2>

    <!-- Stat cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      <div
        v-for="s in statCards"
        :key="s.label"
        style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px"
      >
        <div style="font-size:24px;font-weight:700;color:#1a2a4a">{{ s.value }}</div>
        <div style="font-size:12px;color:#667;margin-top:4px">{{ s.label }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <select
        v-model="filterAction"
        @change="reload"
        style="border:1px solid #ddd;border-radius:4px;padding:6px 10px;font-size:13px"
      >
        <option value="">全部操作类型</option>
        <option v-for="a in actionOptions" :key="a" :value="a">{{ a }}</option>
      </select>
      <select
        v-model="filterResult"
        @change="reload"
        style="border:1px solid #ddd;border-radius:4px;padding:6px 10px;font-size:13px"
      >
        <option value="">全部结果</option>
        <option value="success">成功</option>
        <option value="failed">失败</option>
      </select>
      <input
        v-model="search"
        placeholder="搜索操作人 / 实体ID..."
        @input="onSearchInput"
        style="border:1px solid #ddd;border-radius:4px;padding:6px 12px;font-size:13px;width:240px"
      />
    </div>

    <!-- Table -->
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
      <thead style="background:#f9fafb">
        <tr>
          <th
            v-for="h in ['时间', '操作人', '操作', '实体类型', '实体ID', '结果']"
            :key="h"
            style="text-align:left;padding:10px 16px;font-size:12px;color:#667;font-weight:600"
          >
            {{ h }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!loading && logs.length === 0">
          <td colspan="6" style="text-align:center;padding:40px;color:#999;font-size:13px">
            暂无操作记录
          </td>
        </tr>
        <tr v-for="log in logs" :key="log.id" style="border-top:1px solid #f0f0f0">
          <td style="padding:12px 16px;font-size:12px;color:#999">{{ formatTime(log.created_at) }}</td>
          <td style="padding:12px 16px;font-size:12px;color:#555">{{ log.actor }}</td>
          <td style="padding:12px 16px;font-size:13px;color:#1a2a4a">{{ log.action }}</td>
          <td style="padding:12px 16px;font-size:12px;color:#555">{{ log.entity_type }}</td>
          <td style="padding:12px 16px;font-size:12px;color:#555">{{ log.entity_id }}</td>
          <td style="padding:12px 16px">
            <span :style="resultStyle(log.result)" :title="log.error_message || ''">
              {{ log.result === 'success' ? '成功' : '失败' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:12px">
      <span style="font-size:12px;color:#667">第 {{ page }} 页 · 共 {{ totalPages }} 页 · {{ total }} 条</span>
      <button
        @click="prevPage"
        :disabled="page <= 1"
        :style="`padding:6px 14px;border:1px solid #ddd;border-radius:4px;background:#fff;font-size:13px;cursor:pointer;${page <= 1 ? 'opacity:0.4;cursor:not-allowed' : ''}`"
      >
        上一页
      </button>
      <button
        @click="nextPage"
        :disabled="page >= totalPages"
        :style="`padding:6px 14px;border:1px solid #ddd;border-radius:4px;background:#fff;font-size:13px;cursor:pointer;${page >= totalPages ? 'opacity:0.4;cursor:not-allowed' : ''}`"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listLogs, getStats } from '../api/audit'

const logs = ref<any[]>([])
const stats = ref<any>(null)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

const search = ref('')
const filterAction = ref('')
const filterResult = ref('')
const actionOptions = ref<string[]>([])

let searchTimer: ReturnType<typeof setTimeout> | null = null

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const statCards = computed(() => [
  { label: '今日操作', value: stats.value?.today_ops ?? 0 },
  { label: '生成次数', value: stats.value?.generation_count ?? 0 },
  { label: '规则变更', value: stats.value?.rule_changes ?? 0 },
  { label: '异常次数', value: stats.value?.exceptions ?? 0 },
])

function formatTime(t: string) {
  return t?.replace('T', ' ').slice(0, 19) || ''
}

function resultStyle(result: string) {
  const c = result === 'success' ? '#16a34a' : '#dc2626'
  return `font-size:12px;color:${c};font-weight:500`
}

async function loadStats() {
  stats.value = await getStats()
}

async function loadLogs() {
  loading.value = true
  try {
    const res = await listLogs({
      action: filterAction.value || undefined,
      result: filterResult.value || undefined,
      page: page.value,
      page_size: pageSize.value,
    })
    let items = res.logs || []
    if (search.value) {
      const q = search.value.toLowerCase()
      items = items.filter(
        (l: any) =>
          l.actor?.toLowerCase().includes(q) || String(l.entity_id ?? '').toLowerCase().includes(q)
      )
    }
    logs.value = items
    total.value = res.total ?? 0
    // Build action filter options from what we've seen across pages
    for (const l of res.logs || []) {
      if (l.action && !actionOptions.value.includes(l.action)) actionOptions.value.push(l.action)
    }
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  loadLogs()
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadLogs()
  }, 300)
}

function prevPage() {
  if (page.value > 1) {
    page.value -= 1
    loadLogs()
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value += 1
    loadLogs()
  }
}

onMounted(() => {
  loadStats()
  loadLogs()
})
</script>
