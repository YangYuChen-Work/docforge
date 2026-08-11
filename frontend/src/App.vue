<template>
  <div class="app" :data-theme="theme">
    <AppSidebar :theme="theme" @toggle-theme="toggleTheme" />
    <a class="skip-link" href="#main-content">跳转到主要内容</a>
    <main id="main-content" class="main-content" tabindex="-1">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppSidebar from './components/AppSidebar.vue'

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'doc-workbench.theme'

function resolveInitialTheme(): Theme {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme
  } catch {
    // Restricted storage should not disable theme switching.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const theme = ref<Theme>(resolveInitialTheme())

function applyTheme(value: Theme) {
  document.documentElement.style.colorScheme = value
  document.documentElement.dataset.theme = value
}

applyTheme(theme.value)

watch(theme, (value) => {
  applyTheme(value)
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Restricted storage should not disable theme switching.
  }
})

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
</script>
