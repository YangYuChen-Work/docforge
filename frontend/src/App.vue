<template>
  <div class="app">
    <AppSidebar />
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './components/AppSidebar.vue'
</script>
