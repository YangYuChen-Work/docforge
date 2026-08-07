<template>
  <header class="page-header">
    <div class="header-left">
      <h2>AI 文档助手</h2>
      <p class="subtitle">基于项目、模板和资料库生成项目文档</p>
    </div>
    <div class="header-right">
      <span class="badge badge-blue">编辑中 {{ editingCount }}</span>
      <span class="badge badge-green">已归档 {{ archivedCount }}</span>
    </div>
  </header>

  <div class="doc-stats">
    <div class="doc-stat-card">
      <div class="doc-stat-number">{{ docs.length }}</div>
      <div class="doc-stat-label">项目文档</div>
      <div class="doc-stat-dot blue"></div>
    </div>
    <div class="doc-stat-card">
      <div class="doc-stat-number">{{ draftCount }}</div>
      <div class="doc-stat-label">待生成</div>
      <div class="doc-stat-dot orange"></div>
    </div>
    <div class="doc-stat-card">
      <div class="doc-stat-number">{{ editingCount }}</div>
      <div class="doc-stat-label">编辑中</div>
      <div class="doc-stat-dot blue"></div>
    </div>
    <div class="doc-stat-card">
      <div class="doc-stat-number">{{ archivedCount }}</div>
      <div class="doc-stat-label">已归档</div>
      <div class="doc-stat-dot green"></div>
    </div>
  </div>

  <div class="doc-main-layout">
    <div class="doc-list-panel">
      <div class="card">
        <div class="doc-list-header">
          <h3>项目文档</h3>
          <p>按项目维度管理设计任务书、总体方案、验证方案和评审材料</p>
          <input
            v-model="search"
            type="text"
            class="doc-search"
            placeholder="🔍 搜索项目/型号/文档"
            @input="loadDocs"
          />
        </div>
        <div class="doc-category-tabs">
          <button
            v-for="tab in categoryTabs"
            :key="tab"
            class="cat-tab"
            :class="{ active: currentTab === tab }"
            @click="currentTab = tab"
          >
            {{ tab }}
          </button>
        </div>
        <table class="doc-table">
          <thead>
            <tr>
              <th>项目文档</th>
              <th>项目</th>
              <th>状态</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filteredDocs.length === 0">
              <td colspan="4" style="text-align: center; color: #999; padding: 40px">暂无匹配文档</td>
            </tr>
            <tr v-for="doc in filteredDocs" :key="doc.id" @click="$router.push(`/doc/${doc.id}`)">
              <td>
                <div class="doc-name">{{ doc.title }}</div>
                <div class="doc-meta">{{ doc.template_name }}</div>
              </td>
              <td><span class="doc-project">{{ doc.project_id }}</span></td>
              <td><span class="status-tag" :class="doc.status">{{ statusLabel(doc.status) }}</span></td>
              <td>{{ doc.updated_at?.slice(0, 10) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="doc-side-panel">
      <div class="card">
        <h3 class="side-title">新建项目文档</h3>
        <p class="side-desc">先选择项目，再从模板库选择文档类型，AI 自动匹配来源资料。</p>
        <RouterLink to="/doc/new" class="btn btn-primary" style="width: 100%; text-align: center; display: block">
          新建文档
        </RouterLink>
      </div>
      <div class="card" style="margin-top: 16px">
        <h4 class="side-subtitle">项目搜索</h4>
        <input
          type="text"
          class="doc-search"
          placeholder="项目编号、名称、产品型号"
          style="margin-bottom: 12px"
        />
        <div v-if="recommendedProject" class="recommend-card">
          <div class="recommend-label">推荐项目</div>
          <div class="recommend-title">{{ recommendedProject.name }}</div>
          <div class="recommend-meta">{{ recommendedProject.code }} · {{ recommendedProject.phase }}</div>
        </div>
      </div>
      <div class="card" style="margin-top: 16px">
        <h4 class="side-subtitle">常用模板</h4>
        <div class="template-list">
          <div
            v-for="tpl in commonTemplates"
            :key="tpl.id"
            class="tpl-item"
            @click="$router.push('/doc/new')"
          >
            {{ tpl.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { listDocuments } from '../api/documents'
import { listProjects } from '../api/projects'
import { listTemplates } from '../api/templates'

const docs = ref<any[]>([])
const search = ref('')
const loading = ref(false)

const categoryTabs = ['全部', '设计类', '分析类', '评审类']
const currentTab = ref('全部')

const recommendedProject = ref<any | null>(null)
const commonTemplates = ref<any[]>([])

const draftCount = computed(() => docs.value.filter((d) => d.status === 'draft').length)
const editingCount = computed(() => docs.value.filter((d) => d.status === 'editing').length)
const archivedCount = computed(() => docs.value.filter((d) => d.status === 'archived').length)

const categoryKeyword: Record<string, string> = {
  设计类: '设计',
  分析类: '分析',
  评审类: '评审',
}

const filteredDocs = computed(() => {
  if (currentTab.value === '全部') return docs.value
  const keyword = categoryKeyword[currentTab.value]
  return docs.value.filter((d) => (d.template_name || '').includes(keyword))
})

async function loadDocs() {
  loading.value = true
  try {
    docs.value = await listDocuments({ search: search.value || undefined })
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

onMounted(async () => {
  await loadDocs()
  try {
    const projects = await listProjects()
    recommendedProject.value = projects[0] || null
  } catch {
    recommendedProject.value = null
  }
  try {
    const templates = await listTemplates()
    commonTemplates.value = templates.slice(0, 3)
  } catch {
    commonTemplates.value = []
  }
})
</script>
