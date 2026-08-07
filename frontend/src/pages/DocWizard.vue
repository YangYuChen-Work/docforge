<template>
  <header class="page-header">
    <div class="header-left">
      <RouterLink to="/" style="color:#1a5ccc;text-decoration:none;font-size:12px;display:inline-block;margin-bottom:6px">← 返回</RouterLink>
      <h2>新建文档</h2>
      <p class="subtitle">项目搜索 / 模板选择 / 关联资料确认</p>
    </div>
    <div class="header-right">
      <span class="badge badge-blue">步骤 {{ step + 1 }}/3</span>
    </div>
  </header>

  <div class="step-indicator">
    <div
      v-for="(s, i) in steps"
      :key="i"
      class="step"
      :class="{ active: i <= step }"
      @click="i < step && (step = i)"
    >
      <span class="step-num">{{ i + 1 }}</span> {{ s }}
    </div>
  </div>

  <div class="doc-new-layout">
    <div class="doc-new-main">
      <!-- Step 0: Select project -->
      <div v-if="step === 0" class="card">
        <h3>选择项目</h3>
        <p class="card-desc">选择需要生成文档的项目，系统会根据项目资料匹配模板章节和引用依据。</p>
        <input type="text" class="doc-search" placeholder="输入项目编号、产品型号、项目名称" style="margin-bottom:16px" />
        <div class="project-list">
          <div
            v-for="p in projects"
            :key="p.id"
            class="project-item"
            :class="{ selected: selectedProject?.id === p.id }"
            @click="selectedProject = p"
          >
            <div class="project-item-name">{{ p.name }}</div>
            <div class="project-item-meta">{{ p.code }} · {{ p.model }} · {{ p.phase }}</div>
          </div>
        </div>
        <div v-if="!loadingProjects && projects.length === 0" style="font-size:12px;color:#999;padding:12px 0">
          暂无项目
        </div>
      </div>

      <!-- Step 1: Select template -->
      <div v-if="step === 1" class="card">
        <h3>选择模板</h3>
        <p class="card-desc">来自文档助手配置的现有模板库。</p>
        <div class="template-select-list">
          <div
            v-for="t in templates"
            :key="t.id"
            class="tpl-select-item"
            :class="{ selected: selectedTemplate?.id === t.id }"
            @click="selectedTemplate = t"
          >
            <div>
              <div class="tpl-select-name">{{ t.name }}</div>
              <div class="tpl-select-meta">{{ t.category }} · {{ t.phase }} · {{ t.chapter_count }} 章节</div>
            </div>
          </div>
        </div>
        <div v-if="!loadingTemplates && templates.length === 0" style="font-size:12px;color:#999;padding:12px 0">
          暂无可用模板
        </div>
      </div>

      <!-- Step 2: Select/upload sources -->
      <div v-if="step === 2" class="card">
        <h3>关联资料</h3>
        <p class="card-desc">勾选参与本次生成的来源资料，缺少的资料可在此上传。</p>
        <div
          v-for="s in sources"
          :key="s.id"
          style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #e8e8e8;border-radius:6px;margin-bottom:6px;background:#fff"
        >
          <input
            type="checkbox"
            :checked="selectedSourceIds.includes(s.id)"
            @change="toggleSource(s.id)"
          />
          <span style="font-size:13px;flex:1">{{ s.original_name }}</span>
          <span
            :style="`font-size:11px;padding:2px 8px;border-radius:10px;background:${s.parse_status === 'parsed' ? '#f6ffed' : s.parse_status === 'parse_failed' ? '#fff1f0' : '#fff7e6'};color:${s.parse_status === 'parsed' ? '#52c41a' : s.parse_status === 'parse_failed' ? '#e03030' : '#fa8c16'}`"
          >
            {{ s.parse_status }}
          </span>
        </div>
        <div v-if="!loadingSources && sources.length === 0" style="font-size:12px;color:#999;padding:12px 0">
          该项目暂无已关联资料，请上传
        </div>
        <div style="margin-top:12px">
          <label class="import-upload-area" style="padding:16px">
            <span class="import-upload-text">{{ uploading ? '上传中...' : '点击上传资料（.docx / .xlsx）' }}</span>
            <input
              type="file"
              accept=".docx,.xlsx"
              multiple
              style="display:none"
              @change="uploadFiles"
              :disabled="uploading"
            />
          </label>
        </div>
      </div>
    </div>

    <!-- Right: Confirmation Panel -->
    <div class="doc-new-side">
      <div class="card">
        <h3>生成前确认</h3>
        <p class="side-desc">确认项目、模板和资料匹配后生成初稿。</p>

        <template v-if="step === 0">
          <template v-if="selectedProject">
            <div class="confirm-card highlight">
              <div class="confirm-label">已选项目</div>
              <div class="confirm-title">{{ selectedProject.name }}</div>
              <div class="confirm-meta">{{ selectedProject.code }} · {{ selectedProject.phase }}</div>
            </div>
          </template>
          <div v-else style="font-size:12px;color:#999">请从左侧选择项目</div>
          <button
            class="btn btn-primary"
            style="width:100%;margin-top:20px"
            :disabled="!selectedProject"
            @click="step = 1"
          >
            下一步：选择模板
          </button>
        </template>

        <template v-else-if="step === 1">
          <template v-if="selectedTemplate">
            <div class="confirm-card highlight">
              <div class="confirm-label">已选模板</div>
              <div class="confirm-title">{{ selectedTemplate.name }}</div>
              <div class="confirm-meta">{{ selectedTemplate.chapter_count }} 个章节 · {{ selectedTemplate.phase }}</div>
            </div>
          </template>
          <div v-else style="font-size:12px;color:#999">请从左侧选择模板</div>
          <div style="display:flex;gap:8px;margin-top:20px">
            <button class="btn btn-outline" style="flex:1" @click="step = 0">上一步</button>
            <button
              class="btn btn-primary"
              style="flex:2"
              :disabled="!selectedTemplate"
              @click="step = 2"
            >
              下一步：关联资料
            </button>
          </div>
        </template>

        <template v-else>
          <div class="confirm-card highlight">
            <div class="confirm-label">将生成</div>
            <div class="confirm-title">{{ selectedProject?.name }} - {{ selectedTemplate?.name }}</div>
            <div class="confirm-meta">{{ selectedProject?.code }} · {{ selectedTemplate?.chapter_count }} 个章节</div>
          </div>

          <h4 class="side-subtitle" style="margin-top:20px">资料匹配</h4>
          <div class="match-item">已选资料 {{ selectedSourceIds.length }} 份</div>

          <div v-if="selectedSourceIds.length === 0" class="pending-card">
            <p>请至少选择一份资料后再生成文档。</p>
          </div>

          <button
            class="btn btn-primary"
            style="width:100%;margin-top:20px"
            :disabled="selectedSourceIds.length === 0 || generating"
            @click="generate"
          >
            {{ generating ? generatingLabel : '生成文档' }}
          </button>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn btn-outline" style="flex:1" @click="step = 1">上一步</button>
          </div>
          <div v-if="errorMsg" style="margin-top:8px;font-size:12px;color:#e03030">{{ errorMsg }}</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listProjects } from '../api/projects'
import { listTemplates } from '../api/templates'
import { listSources, uploadSource, parseSource } from '../api/sources'
import { getTask } from '../api/generation'
import { useGenerationStore } from '../stores/generationStore'

const router = useRouter()
const gen = useGenerationStore()

const step = ref(0)
const steps = ['选择项目', '选择模板', '关联资料']
const projects = ref<any[]>([])
const templates = ref<any[]>([])
const sources = ref<any[]>([])
const selectedProject = ref<any>(null)
const selectedTemplate = ref<any>(null)
const selectedSourceIds = ref<string[]>([])
const generating = ref(false)
const generatingLabel = ref('生成中...')
const uploading = ref(false)
const errorMsg = ref('')
const loadingProjects = ref(false)
const loadingTemplates = ref(false)
const loadingSources = ref(false)

onMounted(async () => {
  loadingProjects.value = true
  loadingTemplates.value = true
  try {
    const [ps, ts] = await Promise.all([listProjects(), listTemplates({ enabled: true })])
    projects.value = ps
    templates.value = ts
  } catch (err: any) {
    errorMsg.value = err.message || '加载失败'
  } finally {
    loadingProjects.value = false
    loadingTemplates.value = false
  }
})

watch(step, (s) => {
  if (s === 2) loadSources()
})

async function loadSources() {
  if (!selectedProject.value) return
  loadingSources.value = true
  try {
    sources.value = await listSources(selectedProject.value.id)
    selectedSourceIds.value = sources.value
      .filter((s: any) => s.parse_status === 'parsed')
      .map((s: any) => s.id)
  } catch (err: any) {
    errorMsg.value = err.message || '加载资料失败'
  } finally {
    loadingSources.value = false
  }
}

function toggleSource(id: string) {
  if (selectedSourceIds.value.includes(id)) {
    selectedSourceIds.value = selectedSourceIds.value.filter((i) => i !== id)
  } else {
    selectedSourceIds.value.push(id)
  }
}

async function uploadFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files || !selectedProject.value) return
  uploading.value = true
  errorMsg.value = ''
  try {
    for (const file of Array.from(files)) {
      const s = await uploadSource(selectedProject.value.id, file)
      await parseSource(s.source_id)
    }
    await loadSources()
  } catch (err: any) {
    errorMsg.value = err.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

async function generate() {
  generating.value = true
  errorMsg.value = ''
  try {
    const task = await gen.createAndStart(
      selectedProject.value.id,
      selectedTemplate.value.id,
      selectedSourceIds.value
    )
    generatingLabel.value = '生成中（这可能需要一些时间）...'
    // The backend runs generation synchronously inside the start call, so the task
    // should already be at awaiting_confirmation/completed with a document_id by the
    // time createAndStart resolves. Fetch it once, then fall back to polling if needed.
    const initial = await getTask(task.task_id)
    if (initial.document_id) {
      router.push(`/doc/${initial.document_id}`)
      return
    }
    if (initial.status === 'failed') {
      errorMsg.value = initial.error_message || '生成失败，请重试'
      generating.value = false
      return
    }
    gen.startPolling(task.task_id, (t: any) => {
      if (t.document_id) {
        router.push(`/doc/${t.document_id}`)
      } else {
        errorMsg.value = t.error_message || '生成失败，请重试'
        generating.value = false
      }
    })
  } catch (err: any) {
    errorMsg.value = err.message || '生成失败'
    generating.value = false
  }
}
</script>
