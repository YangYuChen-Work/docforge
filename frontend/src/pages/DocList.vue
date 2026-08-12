<template>
  <header class="page-header">
    <div class="header-left">
      <h2>项目文档工作台</h2>
      <p class="subtitle">从项目资料到可确认文档的本地生产流程</p>
    </div>
    <div class="header-right">
      <span class="header-note">{{ editingCount }} 份文档正在编辑</span>
      <RouterLink to="/doc/new" class="header-action">新建文档</RouterLink>
    </div>
  </header>

  <section class="doc-stats" aria-label="文档摘要">
    <div class="doc-stat-card doc-stat-primary">
      <span class="summary-kicker">当前工作区</span>
      <strong>{{ docs.length }} 份项目文档</strong>
      <p>从来源资料到可确认章节的工作进度</p>
    </div>
    <div class="doc-stat-card doc-stat-metric">
      <strong>{{ draftCount }}</strong>
      <span>待生成</span>
    </div>
    <div class="doc-stat-card doc-stat-metric">
      <strong>{{ editingCount }}</strong>
      <span>编辑中</span>
    </div>
    <div class="doc-stat-card doc-stat-metric">
      <strong>{{ archivedCount }}</strong>
      <span>已归档</span>
    </div>
  </section>

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
            placeholder="搜索项目 / 型号 / 文档"
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
        <div v-if="loading" class="doc-loading-state" role="status" aria-live="polite">正在读取文档列表…</div>
        <div v-else-if="loadError" class="doc-empty-state" role="alert">
          <div class="doc-empty-mark">!</div>
          <strong>文档列表暂时不可用</strong>
          <p>{{ loadError }}</p>
          <button class="btn btn-outline" type="button" @click="loadDocs">重新读取</button>
        </div>
        <div v-else-if="filteredDocs.length === 0" class="doc-empty-state">
          <div class="doc-empty-mark">＋</div>
          <strong>{{ search || currentTab !== '全部' ? '没有匹配的文档' : '还没有项目文档' }}</strong>
          <p>{{ search || currentTab !== '全部' ? '试试更换搜索词或分类。' : '从一个项目和模板开始建立第一份文档。' }}</p>
          <RouterLink v-if="!search && currentTab === '全部'" class="btn btn-primary" to="/doc/new">新建文档</RouterLink>
        </div>
        <div
          v-else
          class="doc-table-scroll"
          tabindex="0"
          role="region"
          aria-label="项目文档列表"
        >
          <table class="doc-table">
            <thead>
              <tr>
                <th class="doc-select-header">选择</th>
                <th>项目文档</th>
                <th>项目</th>
                <th>状态</th>
                <th>更新时间</th>
                <th class="doc-actions-header">操作</th>
              </tr>
            </thead>
            <tbody>
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
    </div>

    <div class="doc-side-panel">
      <div class="card side-card">
        <h3 class="side-title">新建项目文档</h3>
        <p class="side-desc">选择项目、模板和来源资料，生成一份可追溯的章节初稿。</p>
        <RouterLink to="/doc/new" class="btn btn-primary btn-block">
          新建文档
        </RouterLink>
      </div>
      <div class="card side-card">
        <h4 class="side-subtitle">项目搜索</h4>
        <input
          v-model="projectSearch"
          type="text"
          class="doc-search"
          placeholder="项目编号、名称、产品型号"
        />
        <div v-if="filteredProjects.length" class="recommend-card">
          <div class="recommend-label">{{ projectSearch ? '匹配项目' : '推荐项目' }}</div>
          <div v-for="project in filteredProjects.slice(0, 2)" :key="project.id" class="recommend-project">
            <div class="recommend-title">{{ project.name }}</div>
            <div class="recommend-meta">{{ project.code }} · {{ project.phase }}</div>
          </div>
        </div>
        <div v-else class="side-empty-state">没有找到匹配项目</div>
      </div>
      <div class="card side-card">
        <h4 class="side-subtitle">常用模板</h4>
        <div v-if="commonTemplates.length" class="template-list">
          <div
            v-for="tpl in commonTemplates"
            :key="tpl.id"
            class="tpl-item"
            @click="$router.push('/doc/new')"
          >
            <span>{{ tpl.name }}</span>
            <span class="tpl-arrow" aria-hidden="true">↗</span>
          </div>
        </div>
        <div v-else class="side-empty-state">模板列表暂时不可用</div>
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
const loadError = ref('')
const projectSearch = ref('')

const categoryTabs = ['全部', '设计类', '分析类', '评审类']
const currentTab = ref('全部')

const recommendedProject = ref<any | null>(null)
const projects = ref<any[]>([])
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

const filteredProjects = computed(() => {
  const query = projectSearch.value.trim().toLowerCase()
  if (!query) return recommendedProject.value ? [recommendedProject.value] : []
  return projects.value.filter((project) =>
    [project.id, project.name, project.code, project.model].some((value) =>
      String(value || '').toLowerCase().includes(query),
    ),
  )
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
  loadError.value = ''
  try {
    const nextDocs = await listDocuments({ search: search.value || undefined })
    docs.value = nextDocs
    const availableIds = new Set(nextDocs.map((doc: any) => doc.id))
    selectedIds.value = selectedIds.value.filter((id) => availableIds.has(id))
  } catch (err: any) {
    docs.value = []
    loadError.value = err?.message || '请检查本地服务是否正常运行。'
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
    projects.value = await listProjects()
    recommendedProject.value = projects.value[0] || null
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
