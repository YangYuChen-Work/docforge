import axios from 'axios'

const client = axios.create({ baseURL: '/api', timeout: 120000 })

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.detail?.message ||
      err.response?.data?.detail ||
      err.message ||
      '请求失败'
    return Promise.reject({ status: err.response?.status, message: msg, raw: err })
  }
)

export default client
