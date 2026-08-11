import client from './client'
export const createExport = (docId: string, format: string, includeComments = false) =>
  client.post(`/documents/${docId}/export`, {
    format,
    include_comments: includeComments,
  }).then((r) => r.data)
export const getExport = (exportId: string) =>
  client.get(`/exports/${exportId}`).then((r) => r.data)
export const downloadExport = (exportId: string) =>
  window.open(`/api/exports/${exportId}/download`, '_blank')
