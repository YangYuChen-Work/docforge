import axios from 'axios'

const client = axios.create({ baseURL: '/api', timeout: 120000 })

function extractErrorMessage(detail: unknown): string | undefined {
  if (typeof detail === 'string') return detail
  if (!detail || typeof detail !== 'object') return undefined

  const data = detail as Record<string, unknown>
  if (typeof data.message === 'string') return data.message
  if (typeof data.error_code === 'string') return data.error_code
  return undefined
}

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      extractErrorMessage(err.response?.data?.detail) ||
      err.message ||
      '请求失败'
    return Promise.reject({ status: err.response?.status, message: msg, raw: err })
  }
)

export default client
