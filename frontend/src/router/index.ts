import { createRouter, createWebHashHistory } from 'vue-router'

const DocList = () => import('../pages/DocList.vue')
const DocWizard = () => import('../pages/DocWizard.vue')
const DocEditor = () => import('../pages/DocEditor.vue')
const DocConfig = () => import('../pages/DocConfig.vue')
const AuditLog = () => import('../pages/AuditLog.vue')

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: DocList },
    { path: '/doc/new', component: DocWizard },
    { path: '/doc/:docId', component: DocEditor },
    { path: '/config', component: DocConfig },
    { path: '/audit', component: AuditLog },
  ],
})
