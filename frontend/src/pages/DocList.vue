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
            @click="selectCategory(tab)"
          >
            {{ tab }}
          </button>
        </div>
        <div v-if="deleteError" class="doc-action-error" role="alert">{{ deleteError }}</div>
        <div class="doc-bulk-toolbar">
          <label class="doc-select-all">
            <input
              ref="selectAllRef"
              type="checkbox"
              :checked="allVisibleSelected"
              :indeterminate="someVisibleSelected && !allVisibleSelected"
              :disabled="filteredDocs.length === 0 || bulkDeleting"
              aria-label="全选当前列表文档"
              @change="toggleSelectAll"
            />
            <span>全选</span>
          </label>
          <span v-if="selectedIds.length" class="doc-selected-count">已选 {{ selectedIds.length }} 项</span>
          <button
            class="doc-bulk-delete-btn"
            type="button"
            :disabled="selectedIds.length === 0 || bulkDeleting"
            @click="removeSelectedDocuments"
          >
            {{ bulkDeleting ? '批量删除中…' : '批量删除' }}
          </button>
        </div>
        <table class="doc-table">
          <thead>
            <tr>
              <th class="doc-select-header">选择</th>
              <th>项目文档</th>
              <th>项目</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filteredDocs.length === 0">
              <td colspan="6" style="text-align: center; color: #999; padding: 40px">暂无匹配文档</td>
            </tr>
            <tr v-for="doc in filteredDocs" :key="doc.id" @click="$router.push(`/doc/${doc.id}`)">
              <td class="doc-select-cell">
                <input
                  type="checkbox"
                  class="doc-row-checkbox"
                  :checked="isSelected(doc.id)"
                  :disabled="bulkDeleting || deletingId === doc.id"
                  :aria-label="`选择 ${doc.title}`"
                  @click.stop
                  @change="toggleDocumentSelection(doc.id)"
                />
              </td>
              <td>
                <div class="doc-name">{{ doc.title }}</div>
                <div class="doc-meta">{{ doc.template_name }}</div>
              </td>
              <td><span class="doc-project">{{ doc.project_id }}</span></td>
              <td><span class="status-tag" :class="doc.status">{{ statusLabel(doc.status) }}</span></td>
              <td class="doc-updated-at">{{ formatUpdatedAt(doc.updated_at) }}</td>
              <td class="doc-actions-cell">
                <button
                  class="doc-delete-btn"
                  :disabled="deletingId === doc.id || bulkDeleting"
                  title="删除项目文档"
                  @click.stop="removeDocument(doc)"
                >
                  {{ deletingId === doc.id ? '删除中…' : '删除' }}
                </button>
              </td>
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
import { ref, onMounted, computed, watch } from 'vue'
import { batchDeleteDocuments, deleteDocument, listDocuments } from '../api/documents'
import { listProjects } from '../api/projects'
import { listTemplates } from '../api/templates'

const docs = ref<any[]>([])
const search = ref('')
const loading = ref(false)
const deletingId = ref('')
const bulkDeleting = ref(false)
const selectedIds = ref<string[]>([])
const selectAllRef = ref<HTMLInputElement | null>(null)
const deleteError = ref('')

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

const allVisibleSelected = computed(() =>
  filteredDocs.value.length > 0 && filteredDocs.value.every((doc) => selectedIds.value.includes(doc.id)),
)
const someVisibleSelected = computed(() =>
  filteredDocs.value.some((doc) => selectedIds.value.includes(doc.id)),
)

watch(
  [allVisibleSelected, someVisibleSelected],
  () => {
    if (selectAllRef.value) {
      selectAllRef.value.indeterminate = someVisibleSelected.value && !allVisibleSelected.value
    }
  },
  { flush: 'post' },
)

function selectCategory(tab: string) {
  currentTab.value = tab
  selectedIds.value = []
}

async function loadDocs() {
  loading.value = true
  try {
    const nextDocs = await listDocuments({ search: search.value || undefined })
    docs.value = nextDocs
    const availableIds = new Set(nextDocs.map((doc: any) => doc.id))
    selectedIds.value = selectedIds.value.filter((id) => availableIds.has(id))
  } finally {
    loading.value = false
  }
}

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function toggleDocumentSelection(id: string) {
  selectedIds.value = isSelected(id)
    ? selectedIds.value.filter((selectedId) => selectedId !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  const visibleIds = filteredDocs.value.map((doc) => doc.id)
  if (allVisibleSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !visibleIds.includes(id))
  } else {
    selectedIds.value = [...new Set([...selectedIds.value, ...visibleIds])]
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

function formatUpdatedAt(value?: string) {
  if (!value) return '—'
  const [date, time = ''] = value.split('T')
  const seconds = time.slice(0, 8)
  return seconds ? `${date} ${seconds}` : date
}

async function removeDocument(doc: any) {
  if (!window.confirm(`确定删除项目文档“${doc.title}”吗？\n文档章节、版本和导出记录都会一并删除。`)) return

  deletingId.value = doc.id
  deleteError.value = ''
  try {
    await deleteDocument(doc.id)
    docs.value = docs.value.filter((item) => item.id !== doc.id)
    selectedIds.value = selectedIds.value.filter((id) => id !== doc.id)
  } catch (err: any) {
    if (err.status === 404) {
      // The list can be stale if this document was already removed elsewhere.
      // Treat that state as success so the user is not blocked by a ghost row.
      docs.value = docs.value.filter((item) => item.id !== doc.id)
      return
    }
    deleteError.value = `删除失败：${err.message || '未知错误'}`
  } finally {
    deletingId.value = ''
  }
}

async function removeSelectedDocuments() {
  const ids = [...selectedIds.value]
  if (ids.length === 0) return
  if (!window.confirm(`确定批量删除选中的 ${ids.length} 个项目文档吗？\n文档章节、版本和导出记录都会一并删除。`)) return

  bulkDeleting.value = true
  deleteError.value = ''
  try {
    await batchDeleteDocuments(ids)
    const selectedSet = new Set(ids)
    docs.value = docs.value.filter((item) => !selectedSet.has(item.id))
    selectedIds.value = selectedIds.value.filter((id) => !selectedSet.has(id))
  } catch (err: any) {
    deleteError.value = `批量删除失败：${err.message || '未知错误'}`
  } finally {
    bulkDeleting.value = false
  }
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

<style scoped>
.doc-bulk-toolbar { display: flex; align-items: center; gap: 12px; min-height: 34px; margin: -2px 0 8px; }
.doc-select-all { display: inline-flex; align-items: center; gap: 6px; color: #475467; font-size: 12px; cursor: pointer; }
.doc-select-all input, .doc-row-checkbox { width: 15px; height: 15px; accent-color: #1677ff; cursor: pointer; }
.doc-select-all input:disabled, .doc-row-checkbox:disabled { cursor: wait; }
.doc-selected-count { color: #1677ff; font-size: 12px; }
.doc-bulk-delete-btn { padding: 5px 10px; border: 1px solid #ffccc7; border-radius: 5px; background: #fff; color: #cf1322; cursor: pointer; font-size: 12px; }
.doc-bulk-delete-btn:hover:not(:disabled) { border-color: #ff4d4f; background: #fff1f0; }
.doc-bulk-delete-btn:disabled { cursor: not-allowed; opacity: .45; }
.doc-select-header, .doc-select-cell { width: 44px; text-align: center !important; }
</style>
