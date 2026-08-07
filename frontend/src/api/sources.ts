import client from './client'
export const listSources = (projectId: string) =>
  client.get(`/projects/${projectId}/sources`).then((r) => r.data)
export const uploadSource = (projectId: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return client.post(`/projects/${projectId}/sources`, fd).then((r) => r.data)
}
export const parseSource = (sourceId: string) =>
  client.post(`/sources/${sourceId}/parse`).then((r) => r.data)
export const getSource = (sourceId: string) =>
  client.get(`/sources/${sourceId}`).then((r) => r.data)
export const getSourceContent = (sourceId: string) =>
  client.get(`/sources/${sourceId}/content`).then((r) => r.data)
