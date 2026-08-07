import client from './client'
export const listLogs = (params?: any) =>
  client.get('/audit', { params }).then((r) => r.data)
export const getStats = () => client.get('/audit/stats').then((r) => r.data)
