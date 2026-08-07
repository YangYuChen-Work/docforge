<template>
  <aside
    style="width:220px;background:#1a2a4a;color:#fff;display:flex;flex-direction:column;flex-shrink:0"
  >
    <div style="padding:18px 20px;font-size:14px;font-weight:600;border-bottom:1px solid #2a3a5a;letter-spacing:0.5px">
      项目文档工作台
    </div>
    <nav style="flex:1;padding-top:8px">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        style="display:block;padding:11px 20px;color:#aab;text-decoration:none;font-size:13px;transition:background 0.15s"
        :style="isActive(item.path) ? { background: '#2a4a7a', color: '#fff' } : {}"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
    <div style="padding:12px 20px;font-size:11px;color:#556;border-top:1px solid #2a3a5a">
      AI: {{ aiProvider }}
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const aiProvider = ref('...')

const navItems = [
  { path: '/', label: '📄 文档列表' },
  { path: '/doc/new', label: '+ 新建文档' },
  { path: '/config', label: '⚙ 模板配置' },
  { path: '/audit', label: '📋 操作日志' },
]

const isActive = (path: string) =>
  path === '/' ? route.path === '/' : route.path.startsWith(path)

onMounted(async () => {
  try {
    const r = await axios.get('/health')
    aiProvider.value = r.data.ai_provider
  } catch {
    aiProvider.value = '离线'
  }
})
</script>
