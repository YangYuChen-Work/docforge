<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <h1 class="nav-text">项目文档工作台</h1>
      <button
        v-if="!collapsed"
        class="sidebar-collapse-toggle"
        type="button"
        aria-label="收起系统菜单"
        title="收起系统菜单"
        :aria-expanded="!collapsed"
        @click="toggleCollapsed"
      >
        ‹
      </button>
    </div>
    <button
      v-if="collapsed"
      class="sidebar-restore-toggle"
      type="button"
      aria-label="展开系统菜单"
      title="展开系统菜单"
      :aria-expanded="!collapsed"
      @click="toggleCollapsed"
    >
      ›
    </button>
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-label">功能导航</div>
        <a href="#" class="nav-item" title="AI 测试用例生成" aria-label="AI 测试用例生成" @click.prevent="showPlaceholder">
          <span class="nav-icon">🧪</span><span class="nav-text">AI 测试用例生成</span>
        </a>
        <RouterLink to="/" class="nav-item" title="AI 文档助手" aria-label="AI 文档助手" :class="{ active: isDocModuleActive }">
          <span class="nav-icon">📄</span><span class="nav-text">AI 文档助手</span>
        </RouterLink>
        <RouterLink to="/" class="nav-item sub" title="文档列表" aria-label="文档列表" :class="{ active: route.path === '/' }">
          <span class="nav-icon">•</span><span class="nav-text">文档列表</span>
        </RouterLink>
        <RouterLink to="/doc/new" class="nav-item sub" title="新建文档" aria-label="新建文档" :class="{ active: route.path.startsWith('/doc/new') }">
          <span class="nav-icon">•</span><span class="nav-text">新建文档</span>
        </RouterLink>
        <a href="#" class="nav-item" title="产品模块智能选配" aria-label="产品模块智能选配" @click.prevent="showPlaceholder">
          <span class="nav-icon">⚙️</span><span class="nav-text">产品模块智能选配</span>
        </a>
      </div>
      <div class="nav-section">
        <div class="nav-label">系统配置</div>
        <a href="#" class="nav-item sub" title="转换规则" aria-label="转换规则" @click.prevent="showPlaceholder">
          <span class="nav-icon">•</span><span class="nav-text">转换规则</span>
        </a>
        <RouterLink to="/audit" class="nav-item sub" title="日志审计" aria-label="日志审计" :class="{ active: route.path.startsWith('/audit') }">
          <span class="nav-icon">•</span><span class="nav-text">日志审计</span>
        </RouterLink>
        <RouterLink to="/config" class="nav-item sub" title="文档助手配置" aria-label="文档助手配置" :class="{ active: route.path.startsWith('/config') }">
          <span class="nav-icon">•</span><span class="nav-text">文档助手配置</span>
        </RouterLink>
        <a href="#" class="nav-item sub" title="模块配置规则库" aria-label="模块配置规则库" @click.prevent="showPlaceholder">
          <span class="nav-icon">•</span><span class="nav-text">模块配置规则库</span>
        </a>
      </div>
    </nav>
    <div class="sidebar-provider">
      <span class="nav-text">AI: {{ aiProvider }}</span>
      <span class="provider-short" aria-hidden="true">AI</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const aiProvider = ref('...')
const collapsed = ref(false)
const SIDEBAR_STORAGE_KEY = 'doc-workbench.sidebar-collapsed'

const isDocModuleActive = computed(
  () => route.path === '/' || route.path.startsWith('/doc')
)

function showPlaceholder() {
  alert('该模块为演示占位，暂未接入真实后端')
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed.value))
  } catch {
    // Private browsing or restricted storage should not disable the control.
  }
}

onMounted(async () => {
  try {
    collapsed.value = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    collapsed.value = false
  }
  try {
    const r = await axios.get('/health')
    aiProvider.value = r.data.ai_provider
  } catch {
    aiProvider.value = '离线'
  }
})
</script>
