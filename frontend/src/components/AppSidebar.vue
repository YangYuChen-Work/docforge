<template>
  <div class="sidebar-shell" :class="{ 'is-collapsed': collapsed }">
    <button
      class="mobile-menu-toggle"
      type="button"
      aria-label="打开系统菜单"
      :aria-expanded="mobileOpen"
      @click="mobileOpen = !mobileOpen"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
    <div v-if="mobileOpen" class="mobile-nav-backdrop" aria-hidden="true" @click="mobileOpen = false" />

    <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
      <div class="sidebar-header">
        <h1 class="nav-text brand-lockup" aria-label="徐工重型">
          <img class="brand-emblem" :src="brandEmblemUrl" alt="" aria-hidden="true" />
          <span class="brand-name">徐工重型</span>
        </h1>
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
      <nav class="sidebar-nav" aria-label="主导航">
        <div class="nav-section">
          <div class="nav-label">工作区</div>
          <button class="nav-item nav-placeholder" type="button" title="测试用例（后续模块）" @click="showPlaceholder('测试用例')">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 4h8M10 4v5l-4 7a3 3 0 0 0 2.6 4.5h6.8A3 3 0 0 0 18 16l-4-7V4M8 14h8" /></svg>
            </span>
            <span class="nav-text">测试用例</span>
          </button>
          <RouterLink to="/" class="nav-item nav-module-item" title="项目文档工作台" aria-label="项目文档工作台">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 3.5h8l4 4V20.5H6zM14 3.5v4h4M9 12h6M9 16h6" /></svg>
            </span>
            <span class="nav-text">项目文档</span>
          </RouterLink>
          <RouterLink to="/" class="nav-item sub" title="文档列表" aria-label="文档列表" :class="{ active: route.path === '/' }" :aria-current="route.path === '/' ? 'page' : undefined">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="2.2" /></svg></span>
            <span class="nav-text">文档列表</span>
          </RouterLink>
          <RouterLink to="/doc/new" class="nav-item sub" title="新建文档" aria-label="新建文档" :class="{ active: route.path.startsWith('/doc/new') }" :aria-current="route.path.startsWith('/doc/new') ? 'page' : undefined">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="2.2" /></svg></span>
            <span class="nav-text">新建文档</span>
          </RouterLink>
          <button class="nav-item nav-placeholder" type="button" title="模块选配（后续模块）" @click="showPlaceholder('模块选配')">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16M7 7l10 10M17 7 7 17" /></svg>
            </span>
            <span class="nav-text">模块选配</span>
          </button>
        </div>
        <div class="nav-section">
          <div class="nav-label">配置与记录</div>
          <button class="nav-item sub nav-placeholder" type="button" title="转换规则（后续模块）" @click="showPlaceholder('转换规则')">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="2.2" /></svg></span>
            <span class="nav-text">转换规则</span>
          </button>
          <RouterLink to="/audit" class="nav-item sub" title="日志审计" aria-label="日志审计" :class="{ active: route.path.startsWith('/audit') }" :aria-current="route.path.startsWith('/audit') ? 'page' : undefined">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="2.2" /></svg></span>
            <span class="nav-text">日志审计</span>
          </RouterLink>
          <RouterLink to="/config" class="nav-item sub" title="文档助手配置" aria-label="文档助手配置" :class="{ active: route.path.startsWith('/config') }" :aria-current="route.path.startsWith('/config') ? 'page' : undefined">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="2.2" /></svg></span>
            <span class="nav-text">文档助手配置</span>
          </RouterLink>
          <button class="nav-item sub nav-placeholder" type="button" title="规则库（后续模块）" @click="showPlaceholder('规则库')">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="2.2" /></svg></span>
            <span class="nav-text">模块配置规则库</span>
          </button>
        </div>
      </nav>
      <button
        class="theme-toggle"
        type="button"
        :aria-label="props.theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
        :title="props.theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
        :aria-pressed="props.theme === 'dark'"
        @click="emit('toggle-theme')"
      >
        <span class="theme-toggle-icon" aria-hidden="true">
          <svg v-if="props.theme === 'dark'" viewBox="0 0 24 24">
            <path d="M20 15.2A8.2 8.2 0 0 1 8.8 4 8.2 8.2 0 1 0 20 15.2Z" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </span>
        <span class="theme-toggle-copy">
          <strong>{{ props.theme === 'dark' ? '深色模式' : '浅色模式' }}</strong>
          <small>{{ props.theme === 'dark' ? '低亮度工作环境' : '日间工作环境' }}</small>
        </span>
        <span class="theme-toggle-short" aria-hidden="true">{{ props.theme === 'dark' ? '浅' : '深' }}</span>
      </button>
    </aside>
    <div v-if="placeholderMessage" class="sidebar-toast" role="status" aria-live="polite">
      <span>{{ placeholderMessage }}</span>
      <button type="button" aria-label="关闭提示" @click="placeholderMessage = ''">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import brandEmblemUrl from '../assets/xcmg-emblem.png'

type Theme = 'light' | 'dark'

const props = defineProps<{ theme: Theme }>()
const emit = defineEmits<{ (event: 'toggle-theme'): void }>()

const route = useRoute()
const collapsed = ref(false)
const mobileOpen = ref(false)
const placeholderMessage = ref('')
const SIDEBAR_STORAGE_KEY = 'doc-workbench.sidebar-collapsed'
let placeholderTimer: number | undefined

function showPlaceholder(label: string) {
  placeholderMessage.value = `${label}暂未接入当前 POC`
  if (placeholderTimer) window.clearTimeout(placeholderTimer)
  placeholderTimer = window.setTimeout(() => {
    placeholderMessage.value = ''
  }, 3600)
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed.value))
  } catch {
    // Private browsing or restricted storage should not disable the control.
  }
}

watch(() => route.path, () => {
  mobileOpen.value = false
})

onMounted(() => {
  try {
    collapsed.value = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    collapsed.value = false
  }
})

onBeforeUnmount(() => {
  if (placeholderTimer) window.clearTimeout(placeholderTimer)
})
</script>
