import client from './client'
export const listDocuments = (params?: any) =>
  client.get('/documents', { params }).then((r) => r.data)
export const getDocument = (id: string) =>
  client.get(`/documents/${id}`).then((r) => r.data)
export const getChapter = (docId: string, chapId: string) =>
  client.get(`/documents/${docId}/chapters/${chapId}`).then((r) => r.data)
export const createChapter = (docId: string, title: string) =>
  client.post(`/documents/${docId}/chapters`, { title }).then((r) => r.data)
export const editChapter = (docId: string, chapId: string, body: any) =>
  client.post(`/documents/${docId}/chapters/${chapId}/edit`, body).then((r) => r.data)
export const confirmChapter = (docId: string, chapId: string) =>
  client.post(`/documents/${docId}/chapters/${chapId}/confirm`).then((r) => r.data)
export const regenerateChapter = (docId: string, chapId: string, instruction?: string) =>
  client
    .post(`/documents/${docId}/chapters/${chapId}/regenerate`, { instruction })
    .then((r) => r.data)
export const aiAction = (docId: string, chapId: string, body: any) =>
  client
    .post(`/documents/${docId}/chapters/${chapId}/ai-action`, body)
    .then((r) => r.data)
export const validateDocument = (docId: string) =>
  client.post(`/documents/${docId}/validate`).then((r) => r.data)
export const getVersions = (docId: string) =>
  client.get(`/documents/${docId}/versions`).then((r) => r.data)
export const listAnnotations = (docId: string, chapId: string) =>
  client.get(`/documents/${docId}/chapters/${chapId}/annotations`).then((r) => r.data)
export const createAnnotation = (docId: string, chapId: string, body: any) =>
  client.post(`/documents/${docId}/chapters/${chapId}/annotations`, body).then((r) => r.data)
export const updateAnnotation = (docId: string, chapId: string, aid: string, body: any) =>
  client
    .patch(`/documents/${docId}/chapters/${chapId}/annotations/${aid}`, body)
    .then((r) => r.data)
