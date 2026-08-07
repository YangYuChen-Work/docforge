import client from './client'
export const createExport = (docId: string, format: string) =>
  client.post(`/documents/${docId}/export`, { format }).then((r) => r.data)
export const getExport = (exportId: string) =>
  client.get(`/exports/${exportId}`).then((r) => r.data)
export const downloadExport = (exportId: string) =>
  window.open(`/api/exports/${exportId}/download`, '_blank')
