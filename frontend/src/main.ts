import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/style.css'
import './styles/page-doc.css'

createApp(App).use(createPinia()).use(router).mount('#app')
