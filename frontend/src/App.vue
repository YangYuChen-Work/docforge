<template>
  <div style="display: flex; height: 100vh; font-family: -apple-system, 'PingFang SC', sans-serif">
    <AppSidebar />
    <div style="flex: 1; overflow: auto; background: #f5f7fa">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './components/AppSidebar.vue'
</script>
