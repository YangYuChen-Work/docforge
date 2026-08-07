import client from './client'
export const listTemplates = (params?: { category?: string; enabled?: boolean }) =>
  client.get('/templates', { params }).then((r) => r.data)
export const getTemplate = (id: string) => client.get(`/templates/${id}`).then((r) => r.data)
export const getTemplateChapters = (id: string) =>
  client.get(`/templates/${id}/chapters`).then((r) => r.data)
export const toggleTemplate = (id: string) =>
  client.patch(`/templates/${id}/toggle`).then((r) => r.data)
