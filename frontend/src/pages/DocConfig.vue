<template>
  <header class="page-header">
    <div class="header-left">
      <h2>系统配置 / 文档助手配置</h2>
      <p class="subtitle">维护项目文档模板、章节结构与启用状态</p>
    </div>
    <div class="header-right">
      <span class="header-note">{{ templates.length }} 个模板 · {{ enabledCount }} 个已启用</span>
    </div>
  </header>

  <div class="config-layout">
    <!-- Left: Template List -->
    <div class="config-left">
      <div class="card">
        <h3>产品文档模板库</h3>
        <p class="card-desc">业务侧新建文档时只从这里选择模板。</p>
        <input
          v-model="search"
          type="text"
          class="doc-search"
          placeholder="搜索模板名称、适用阶段"
          style="margin-bottom: 12px"
        />
        <div v-if="categories.length > 1" class="doc-category-tabs" style="margin-bottom: 16px">
          <button
            v-for="c in categories"
            :key="c"
            class="cat-tab"
            :class="{ active: activeCategory === c }"
            @click="activeCategory = c"
          >
            {{ c === '' ? '全部' : c }}
          </button>
        </div>
        <div class="config-template-list">
          <div v-if="!loading && filteredTemplates.length === 0" class="card-desc" style="text-align: center; padding: 20px 0">
            {{ templates.length === 0 ? '暂无模板数据，请先运行种子数据脚本' : '没有匹配的模板' }}
          </div>
          <div
            v-for="t in filteredTemplates"
            :key="t.id"
            class="config-tpl-item"
            :class="{ selected: selectedTemplate?.id === t.id }"
            @click="selectTemplate(t)"
          >
            <div class="config-tpl-left">
              <div class="config-tpl-name">{{ t.name }}</div>
              <div class="config-tpl-meta">{{ t.enabled ? '启用' : '禁用' }} · {{ t.phase }} · {{ t.chapter_count }} 章</div>
            </div>
            <span class="tpl-tag" :class="categoryTagClass(t.category)">{{ t.category }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Template Detail -->
    <div class="config-right">
      <div class="card">
        <template v-if="selectedTemplate">
          <div class="config-detail-header">
            <h3>模板详情：{{ selectedTemplate.name }}</h3>
            <span class="config-enabled-badge">{{ selectedTemplate.enabled ? '已启用' : '已禁用' }}</span>
          </div>

          <div class="config-field">
            <label>适用阶段</label>
            <div class="config-value">{{ selectedTemplate.phase }}</div>
          </div>
          <div class="config-field">
            <label>分类</label>
            <div class="config-value">{{ selectedTemplate.category }}</div>
          </div>
          <div class="config-field">
            <label>章节数</label>
            <div class="config-value">{{ selectedTemplate.chapter_count }}</div>
          </div>
          <div class="config-field">
            <label>章节列表</label>
            <template v-if="loadingChapters">
              <div class="config-value">加载中...</div>
            </template>
            <template v-else-if="chapters.length === 0">
              <div class="config-value">暂无章节</div>
            </template>
            <template v-else>
              <div v-for="c in chapters" :key="c.id" class="config-value" style="margin-bottom: 8px">
                {{ c.order_index }}. {{ c.title }}（{{ c.required ? '必填' : '选填' }}）
                <span v-if="c.material_types"> · 资料类型：{{ c.material_types.split(',').join('、') }}</span>
              </div>
            </template>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 20px">
            <button class="btn btn-outline" :disabled="toggling" @click="toggleEnabled">
              {{ toggling ? '处理中...' : selectedTemplate.enabled ? '停用模板' : '启用模板' }}
            </button>
          </div>
        </template>
        <div v-else class="card-desc" style="text-align: center; padding: 40px 0">请选择一个模板</div>
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

const enabledCount = computed(() => templates.value.filter((t) => t.enabled).length)

const filteredTemplates = computed(() => {
  return templates.value.filter((t) => {
    const matchesSearch = !search.value || t.name?.toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = !activeCategory.value || t.category === activeCategory.value
    return matchesSearch && matchesCategory
  })
})

function categoryTagClass(category: string) {
  const map: Record<string, string> = {
    设计类: 'design',
    分析类: 'analysis',
    验证类: 'verify',
    评审类: 'review',
  }
  return map[category] || ''
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
