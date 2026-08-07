<template>
  <div style="padding:24px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h2 style="margin:0;font-size:18px;color:#1a2a4a">项目文档</h2>
      <RouterLink
        to="/doc/new"
        style="background:#1a5ccc;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;font-size:13px"
      >
        + 新建文档
      </RouterLink>
    </div>

    <!-- Stat cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      <div
        v-for="s in stats"
        :key="s.label"
        style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px"
      >
        <div style="font-size:24px;font-weight:700;color:#1a2a4a">{{ s.value }}</div>
        <div style="font-size:12px;color:#667;margin-top:4px">{{ s.label }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <input
        v-model="search"
        placeholder="搜索文档..."
        @input="loadDocs"
        style="border:1px solid #ddd;border-radius:4px;padding:6px 12px;font-size:13px;width:240px"
      />
      <select
        v-model="filterStatus"
        @change="loadDocs"
        style="border:1px solid #ddd;border-radius:4px;padding:6px 10px;font-size:13px"
      >
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="editing">编辑中</option>
        <option value="reviewing">审核中</option>
        <option value="archived">已归档</option>
      </select>
    </div>

    <!-- Document table -->
    <table
      style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden"
    >
      <thead style="background:#f9fafb">
        <tr>
          <th
            v-for="h in ['文档标题', '项目', '模板', '状态', '更新时间']"
            :key="h"
            style="text-align:left;padding:10px 16px;font-size:12px;color:#667;font-weight:600"
          >
            {{ h }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!loading && docs.length === 0">
          <td colspan="5" style="text-align:center;padding:40px;color:#999;font-size:13px">
            暂无文档
          </td>
        </tr>
        <tr
          v-for="doc in docs"
          :key="doc.id"
          @click="$router.push(`/doc/${doc.id}`)"
          style="border-top:1px solid #f0f0f0;cursor:pointer"
        >
          <td style="padding:12px 16px;font-size:13px;color:#1a2a4a;font-weight:500">
            {{ doc.title }}
          </td>
          <td style="padding:12px 16px;font-size:12px;color:#555">{{ doc.project_id }}</td>
          <td style="padding:12px 16px;font-size:12px;color:#555">{{ doc.template_name }}</td>
          <td style="padding:12px 16px">
            <span :style="statusStyle(doc.status)">{{ statusLabel(doc.status) }}</span>
          </td>
          <td style="padding:12px 16px;font-size:12px;color:#999">
            {{ doc.updated_at?.slice(0, 10) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { listDocuments } from '../api/documents'

const docs = ref<any[]>([])
const search = ref('')
const filterStatus = ref('')
const loading = ref(false)

const stats = computed(() => [
  { label: '总文档', value: docs.value.length },
  { label: '编辑中', value: docs.value.filter((d) => d.status === 'editing').length },
  { label: '草稿', value: docs.value.filter((d) => d.status === 'draft').length },
  { label: '已归档', value: docs.value.filter((d) => d.status === 'archived').length },
])

async function loadDocs() {
  loading.value = true
  try {
    docs.value = await listDocuments({
      search: search.value || undefined,
      status: filterStatus.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    editing: '编辑中',
    reviewing: '审核中',
    archived: '已归档',
    generating: '生成中',
    failed: '失败',
  }
  return map[s] || s
}

function statusStyle(s: string) {
  const colors: Record<string, string> = {
    draft: '#667',
    editing: '#1a5ccc',
    reviewing: '#7c3aed',
    archived: '#16a34a',
    generating: '#d97706',
    failed: '#dc2626',
  }
  const c = colors[s] || '#667'
  return `font-size:11px;padding:2px 8px;border-radius:10px;background:${c}22;color:${c}`
}

onMounted(loadDocs)
</script>
