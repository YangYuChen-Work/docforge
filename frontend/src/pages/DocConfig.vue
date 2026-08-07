<template>
  <div style="padding:24px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h2 style="margin:0;font-size:18px;color:#1a2a4a">模板管理</h2>
    </div>

    <div style="display:grid;grid-template-columns:1fr 400px;gap:20px">
      <!-- Left: template list -->
      <div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input
            v-model="search"
            placeholder="搜索模板名称..."
            style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 12px;font-size:13px"
          />
        </div>

        <div v-if="categories.length > 1" style="display:flex;gap:4px;margin-bottom:12px;border-bottom:1px solid #e5e7eb">
          <div
            v-for="c in categories"
            :key="c"
            @click="activeCategory = c"
            :style="`padding:8px 14px;font-size:12px;cursor:pointer;border-bottom:2px solid ${activeCategory === c ? '#1a5ccc' : 'transparent'};color:${activeCategory === c ? '#1a5ccc' : '#667'}`"
          >
            {{ c === '' ? '全部' : c }}
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
          <thead style="background:#f9fafb">
            <tr>
              <th
                v-for="h in ['模板名称', '阶段', '分类', '章节数', '状态']"
                :key="h"
                style="text-align:left;padding:10px 16px;font-size:12px;color:#667;font-weight:600"
              >
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filteredTemplates.length === 0">
              <td colspan="5" style="text-align:center;padding:40px;color:#999;font-size:13px">
                {{ templates.length === 0 ? '暂无模板数据，请先运行种子数据脚本' : '没有匹配的模板' }}
              </td>
            </tr>
            <tr
              v-for="t in filteredTemplates"
              :key="t.id"
              @click="selectTemplate(t)"
              :style="`border-top:1px solid #f0f0f0;cursor:pointer;${selectedTemplate?.id === t.id ? 'background:#eff6ff' : ''}`"
            >
              <td style="padding:12px 16px;font-size:13px;color:#1a2a4a;font-weight:500">{{ t.name }}</td>
              <td style="padding:12px 16px;font-size:12px;color:#555">{{ t.phase }}</td>
              <td style="padding:12px 16px;font-size:12px;color:#555">{{ t.category }}</td>
              <td style="padding:12px 16px;font-size:12px;color:#555">{{ t.chapter_count }}</td>
              <td style="padding:12px 16px">
                <span :style="enabledStyle(t.enabled)">{{ t.enabled ? '已启用' : '已停用' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Right: detail panel -->
      <div style="background:#f9fafb;border-radius:6px;padding:16px;align-self:start">
        <template v-if="selectedTemplate">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div style="font-weight:600;font-size:14px;color:#1a2a4a">{{ selectedTemplate.name }}</div>
            <span :style="enabledStyle(selectedTemplate.enabled)">
              {{ selectedTemplate.enabled ? '已启用' : '已停用' }}
            </span>
          </div>
          <div style="font-size:12px;color:#667;margin-bottom:4px">阶段：{{ selectedTemplate.phase }}</div>
          <div style="font-size:12px;color:#667;margin-bottom:4px">分类：{{ selectedTemplate.category }}</div>
          <div style="font-size:12px;color:#667;margin-bottom:12px">章节数：{{ selectedTemplate.chapter_count }}</div>

          <button
            @click="toggleEnabled"
            :disabled="toggling"
            :style="`width:100%;padding:8px;border-radius:4px;font-size:13px;cursor:pointer;border:1px solid ${selectedTemplate.enabled ? '#dc2626' : '#16a34a'};background:#fff;color:${selectedTemplate.enabled ? '#dc2626' : '#16a34a'};${toggling ? 'opacity:0.5;cursor:not-allowed' : ''}`"
          >
            {{ toggling ? '处理中...' : selectedTemplate.enabled ? '停用模板' : '启用模板' }}
          </button>

          <div style="margin-top:16px;font-weight:600;font-size:13px;margin-bottom:8px">章节列表</div>
          <div v-if="loadingChapters" style="font-size:12px;color:#999">加载中...</div>
          <div v-else-if="chapters.length === 0" style="font-size:12px;color:#999">暂无章节</div>
          <div
            v-for="c in chapters"
            :key="c.id"
            style="padding:8px 0;border-top:1px solid #e5e7eb;font-size:12px"
          >
            <div style="color:#1a2a4a">{{ c.order_index }}. {{ c.title }}</div>
            <div style="color:#999;margin-top:2px">
              {{ c.required ? '必填' : '选填' }}
              <span v-if="c.material_types?.length"> · 资料类型：{{ c.material_types.join('、') }}</span>
            </div>
          </div>
        </template>
        <div v-else style="font-size:13px;color:#999;text-align:center;padding:40px 0">请选择一个模板</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listTemplates, getTemplateChapters, toggleTemplate } from '../api/templates'

const templates = ref<any[]>([])
const chapters = ref<any[]>([])
const selectedTemplate = ref<any>(null)
const search = ref('')
const activeCategory = ref('')
const loading = ref(false)
const loadingChapters = ref(false)
const toggling = ref(false)

const categories = computed(() => {
  const set = new Set<string>()
  templates.value.forEach((t) => t.category && set.add(t.category))
  return set.size > 0 ? ['', ...Array.from(set)] : []
})

const filteredTemplates = computed(() => {
  return templates.value.filter((t) => {
    const matchesSearch = !search.value || t.name?.toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = !activeCategory.value || t.category === activeCategory.value
    return matchesSearch && matchesCategory
  })
})

function enabledStyle(enabled: boolean) {
  const c = enabled ? '#16a34a' : '#999'
  return `font-size:11px;padding:2px 8px;border-radius:10px;background:${c}22;color:${c}`
}

async function loadTemplates() {
  loading.value = true
  try {
    templates.value = await listTemplates()
  } finally {
    loading.value = false
  }
}

async function selectTemplate(t: any) {
  selectedTemplate.value = t
  loadingChapters.value = true
  chapters.value = []
  try {
    chapters.value = await getTemplateChapters(t.id)
  } finally {
    loadingChapters.value = false
  }
}

async function toggleEnabled() {
  if (!selectedTemplate.value) return
  toggling.value = true
  try {
    await toggleTemplate(selectedTemplate.value.id)
    await loadTemplates()
    const refreshed = templates.value.find((t) => t.id === selectedTemplate.value.id)
    if (refreshed) selectedTemplate.value = refreshed
  } finally {
    toggling.value = false
  }
}

onMounted(loadTemplates)
</script>
