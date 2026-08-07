<template>
  <aside class="sidebar">
    <div class="sidebar-header"><h1>项目文档工作台</h1></div>
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-label">功能导航</div>
        <a href="#" class="nav-item" @click.prevent="showPlaceholder">
          <span class="nav-icon">🧪</span><span>AI 测试用例生成</span>
        </a>
        <RouterLink to="/" class="nav-item" :class="{ active: isDocModuleActive }">
          <span class="nav-icon">📄</span><span>AI 文档助手</span>
        </RouterLink>
        <RouterLink to="/" class="nav-item sub" :class="{ active: route.path === '/' }">
          <span class="nav-icon">•</span><span>文档列表</span>
        </RouterLink>
        <RouterLink to="/doc/new" class="nav-item sub" :class="{ active: route.path.startsWith('/doc/new') }">
          <span class="nav-icon">•</span><span>新建文档</span>
        </RouterLink>
        <a href="#" class="nav-item" @click.prevent="showPlaceholder">
          <span class="nav-icon">⚙️</span><span>产品模块智能选配</span>
        </a>
      </div>
      <div class="nav-section">
        <div class="nav-label">系统配置</div>
        <a href="#" class="nav-item sub" @click.prevent="showPlaceholder">
          <span class="nav-icon">•</span><span>转换规则</span>
        </a>
        <RouterLink to="/audit" class="nav-item sub" :class="{ active: route.path.startsWith('/audit') }">
          <span class="nav-icon">•</span><span>日志审计</span>
        </RouterLink>
        <RouterLink to="/config" class="nav-item sub" :class="{ active: route.path.startsWith('/config') }">
          <span class="nav-icon">•</span><span>文档助手配置</span>
        </RouterLink>
        <a href="#" class="nav-item sub" @click.prevent="showPlaceholder">
          <span class="nav-icon">•</span><span>模块配置规则库</span>
        </a>
      </div>
    </nav>
    <div style="padding:10px 16px;font-size:11px;color:rgba(255,255,255,0.4);border-top:1px solid rgba(255,255,255,0.1)">
      AI: {{ aiProvider }}
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const aiProvider = ref('...')

const isDocModuleActive = computed(
  () => route.path === '/' || route.path.startsWith('/doc')
)

function showPlaceholder() {
  alert('该模块为演示占位，暂未接入真实后端')
}

onMounted(async () => {
  try {
    const r = await axios.get('/health')
    aiProvider.value = r.data.ai_provider
  } catch {
    aiProvider.value = '离线'
  }
})
</script>
