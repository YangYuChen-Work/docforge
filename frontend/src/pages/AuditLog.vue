<template>
  <header class="page-header">
    <div class="header-left">
      <h2>日志审计</h2>
      <p class="subtitle">查看系统操作记录、生成记录和规则变更历史</p>
    </div>
  </header>

  <!-- Stat cards -->
  <div class="audit-stats">
    <div v-for="s in statCards" :key="s.label" class="stat-card">
      <div class="stat-number">{{ s.value }}</div>
      <div class="stat-label">{{ s.label }}</div>
    </div>
  </div>

  <!-- Filter Bar -->
  <div class="audit-filter-bar">
    <div class="filter-group">
      <label>操作类型</label>
      <select v-model="filterAction" class="filter-select" @change="reload">
        <option value="">全部操作类型</option>
        <option v-for="a in actionOptions" :key="a" :value="a">{{ a }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label>结果</label>
      <select v-model="filterResult" class="filter-select" @change="reload">
        <option value="">全部结果</option>
        <option value="success">成功</option>
        <option value="failed">失败</option>
      </select>
    </div>
    <div class="filter-group">
      <input
        v-model="search"
        type="text"
        class="filter-input"
        placeholder="🔍 搜索操作人 / 实体ID..."
        @input="onSearchInput"
      />
    </div>
  </div>

  <!-- Log Table -->
  <div class="audit-table-wrapper">
    <table class="audit-table">
      <thead>
        <tr>
          <th style="width: 160px">时间</th>
          <th style="width: 100px">操作人</th>
          <th>操作</th>
          <th style="width: 140px">实体类型</th>
          <th style="width: 140px">实体ID</th>
          <th style="width: 80px">结果</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!loading && logs.length === 0">
          <td colspan="6" style="text-align: center; padding: 40px; color: #999; font-size: 13px">
            暂无操作记录
          </td>
        </tr>
        <tr v-for="log in logs" :key="log.id" class="log-row">
          <td class="log-time">{{ formatTime(log.created_at) }}</td>
          <td>{{ log.actor }}</td>
          <td><div class="log-action">{{ log.action }}</div></td>
          <td>{{ log.entity_type }}</td>
          <td><span class="log-task">{{ log.entity_id }}</span></td>
          <td>
            <span
              class="log-result"
              :class="log.result === 'success' ? 'green' : 'red'"
              :style="resultStyle(log.result)"
              :title="log.error_message || ''"
            >
              {{ log.result === 'success' ? '成功' : '失败' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="audit-pagination">
    <span class="page-info">第 {{ page }} 页 · 共 {{ totalPages }} 页 · {{ total }} 条</span>
    <div class="page-buttons">
      <button class="page-btn" :disabled="page <= 1" @click="prevPage">← 上一页</button>
      <button class="page-btn" :disabled="page >= totalPages" @click="nextPage">下一页 →</button>
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
