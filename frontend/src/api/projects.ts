import client from './client'
export const listProjects = () => client.get('/projects').then((r) => r.data)
export const getProject = (id: string) => client.get(`/projects/${id}`).then((r) => r.data)
