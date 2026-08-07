<template>
  <div style="padding:24px;max-width:1200px">
    <div style="display:flex;align-items:center;gap:24px;margin-bottom:24px">
      <RouterLink to="/" style="color:#1a5ccc;text-decoration:none;font-size:13px">← 返回</RouterLink>
      <h2 style="margin:0;font-size:18px;color:#1a2a4a">新建文档</h2>
    </div>

    <div style="display:flex;gap:0;margin-bottom:32px">
      <div
        v-for="(s, i) in steps"
        :key="i"
        :style="`padding:10px 24px;font-size:13px;border-bottom:3px solid ${i === step ? '#1a5ccc' : '#e5e7eb'};color:${i === step ? '#1a5ccc' : '#999'};cursor:pointer`"
        @click="i < step && (step = i)"
      >
        {{ i + 1 }}. {{ s }}
      </div>
    </div>

    <!-- Step 0: Select project -->
    <div v-if="step === 0" style="display:grid;grid-template-columns:1fr 360px;gap:20px">
      <div>
        <div style="font-weight:600;margin-bottom:12px;font-size:14px">选择项目</div>
        <div
          v-for="p in projects"
          :key="p.id"
          @click="selectedProject = p"
          :style="`padding:14px;border:2px solid ${selectedProject?.id === p.id ? '#1a5ccc' : '#e5e7eb'};border-radius:6px;margin-bottom:8px;cursor:pointer;background:${selectedProject?.id === p.id ? '#eff6ff' : '#fff'}`"
        >
          <div style="font-weight:500;font-size:13px">{{ p.name }}</div>
          <div style="font-size:11px;color:#667;margin-top:4px">
            {{ p.code }} · {{ p.model }} · {{ p.phase }}
          </div>
        </div>
        <div v-if="!loadingProjects && projects.length === 0" style="font-size:12px;color:#999;padding:12px 0">
          暂无项目
        </div>
      </div>
      <div style="background:#f9fafb;border-radius:6px;padding:16px">
        <div style="font-weight:600;margin-bottom:8px;font-size:13px">已选项目</div>
        <template v-if="selectedProject">
          <div style="font-size:13px">{{ selectedProject.name }}</div>
          <div style="font-size:11px;color:#667;margin-top:4px">{{ selectedProject.phase }}</div>
        </template>
        <div v-else style="font-size:12px;color:#999">请从左侧选择项目</div>
        <button
          @click="step = 1"
          :disabled="!selectedProject"
          :style="`margin-top:16px;width:100%;padding:8px;background:#1a5ccc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;${!selectedProject ? 'opacity:0.4;cursor:not-allowed' : ''}`"
        >
          下一步：选择模板
        </button>
      </div>
    </div>

    <!-- Step 1: Select template -->
    <div v-if="step === 1" style="display:grid;grid-template-columns:1fr 360px;gap:20px">
      <div>
        <div style="font-weight:600;margin-bottom:12px;font-size:14px">选择模板</div>
        <div
          v-for="t in templates"
          :key="t.id"
          @click="selectedTemplate = t"
          :style="`padding:14px;border:2px solid ${selectedTemplate?.id === t.id ? '#1a5ccc' : '#e5e7eb'};border-radius:6px;margin-bottom:8px;cursor:pointer;background:${selectedTemplate?.id === t.id ? '#eff6ff' : '#fff'}`"
        >
          <div style="font-weight:500;font-size:13px">{{ t.name }}</div>
          <div style="font-size:11px;color:#667;margin-top:4px">
            {{ t.category }} · {{ t.phase }} · {{ t.chapter_count }} 章节
          </div>
        </div>
        <div v-if="!loadingTemplates && templates.length === 0" style="font-size:12px;color:#999;padding:12px 0">
          暂无可用模板
        </div>
      </div>
      <div style="background:#f9fafb;border-radius:6px;padding:16px">
        <template v-if="selectedTemplate">
          <div style="font-weight:600;margin-bottom:8px;font-size:13px">{{ selectedTemplate.name }}</div>
          <div style="font-size:11px;color:#667">
            {{ selectedTemplate.chapter_count }} 个章节 · {{ selectedTemplate.phase }}
          </div>
        </template>
        <div v-else style="font-size:12px;color:#999">请从左侧选择模板</div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button
            @click="step = 0"
            style="flex:1;padding:8px;background:#fff;color:#555;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:13px"
          >
            上一步
          </button>
          <button
            @click="step = 2"
            :disabled="!selectedTemplate"
            :style="`flex:2;padding:8px;background:#1a5ccc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;${!selectedTemplate ? 'opacity:0.4;cursor:not-allowed' : ''}`"
          >
            下一步：关联资料
          </button>
        </div>
      </div>
    </div>

    <!-- Step 2: Select/upload sources + confirm -->
    <div v-if="step === 2" style="display:grid;grid-template-columns:1fr 360px;gap:20px">
      <div>
        <div style="font-weight:600;margin-bottom:12px;font-size:14px">来源资料</div>
        <div
          v-for="s in sources"
          :key="s.id"
          style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:4px;margin-bottom:6px;background:#fff"
        >
          <input
            type="checkbox"
            :checked="selectedSourceIds.includes(s.id)"
            @change="toggleSource(s.id)"
          />
          <span style="font-size:12px;flex:1">{{ s.original_name }}</span>
          <span
            :style="`font-size:10px;padding:2px 6px;border-radius:8px;background:${s.parse_status === 'parsed' ? '#dcfce7' : s.parse_status === 'parse_failed' ? '#fee2e2' : '#fef3c7'};color:${s.parse_status === 'parsed' ? '#16a34a' : s.parse_status === 'parse_failed' ? '#dc2626' : '#d97706'}`"
          >
            {{ s.parse_status }}
          </span>
        </div>
        <div v-if="!loadingSources && sources.length === 0" style="font-size:12px;color:#999;padding:12px 0">
          该项目暂无已关联资料，请上传
        </div>
        <div style="margin-top:12px">
          <label
            style="display:block;padding:10px;border:2px dashed #d1d5db;border-radius:4px;text-align:center;cursor:pointer;font-size:12px;color:#667"
          >
            {{ uploading ? '上传中...' : '点击上传资料（.docx / .xlsx）' }}
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
      <div style="background:#f9fafb;border-radius:6px;padding:16px">
        <div style="font-weight:600;margin-bottom:12px;font-size:13px">生成确认</div>
        <div style="font-size:12px;margin-bottom:6px">项目：{{ selectedProject?.name }}</div>
        <div style="font-size:12px;margin-bottom:6px">模板：{{ selectedTemplate?.name }}</div>
        <div style="font-size:12px;margin-bottom:12px">已选资料：{{ selectedSourceIds.length }} 份</div>
        <div
          v-if="selectedSourceIds.length === 0"
          style="font-size:11px;color:#d97706;padding:8px;background:#fffbeb;border-radius:4px;margin-bottom:12px"
        >
          请至少选择一份资料
        </div>
        <div style="display:flex;gap:8px">
          <button
            @click="step = 1"
            style="flex:1;padding:10px;background:#fff;color:#555;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:13px"
          >
            上一步
          </button>
          <button
            @click="generate"
            :disabled="selectedSourceIds.length === 0 || generating"
            :style="`flex:2;padding:10px;background:#1a5ccc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;${selectedSourceIds.length === 0 || generating ? 'opacity:0.4;cursor:not-allowed' : ''}`"
          >
            {{ generating ? generatingLabel : '生成文档' }}
          </button>
        </div>
        <div v-if="errorMsg" style="margin-top:8px;font-size:11px;color:#dc2626">{{ errorMsg }}</div>
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
