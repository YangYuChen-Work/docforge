import client from './client'
export const createTask = (body: {
  project_id: string
  template_id: string
  source_ids: string[]
}) => client.post('/generation-tasks', body).then((r) => r.data)
export const startTask = (taskId: string) =>
  client.post(`/generation-tasks/${taskId}/start`).then((r) => r.data)
export const getTask = (taskId: string) =>
  client.get(`/generation-tasks/${taskId}`).then((r) => r.data)
