import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/style.css'
import './styles/page-doc.css'
import './styles/page-audit.css'
import './styles/modern-shell.css'
import './styles/editor-refresh.css'
import './styles/visual-system.css'
import './styles/editor-interaction.css'

createApp(App).use(createPinia()).use(router).mount('#app')
