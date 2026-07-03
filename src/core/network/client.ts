import axios from 'axios'

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'

// In dev mode, route external API calls through Vite proxy to avoid:
// - CORS errors (browser can't set Referer/Origin)
// - ERR_CONNECTION_CLOSED (servers detect cross-origin browser requests)
function apiProxyInterceptor(config: any) {
  if (!isDev) return config
  const url = config.url ?? ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) return config
  if (url.includes('localhost') || url.includes('127.0.0.1')) return config

  // Build full URL with params
  let fullUrl = url
  if (config.params && Object.keys(config.params).length > 0) {
    const sep = url.includes('?') ? '&' : '?'
    fullUrl = url + sep + new URLSearchParams(config.params).toString()
  }

  config.url = `/api/fetch?url=${encodeURIComponent(fullUrl)}`
  config.baseURL = ''
  config.params = {}
  return config
}

export const vodClient = axios.create({
  timeout: 15000,
  headers: { 'Accept': 'application/json, text/plain, */*' },
})
vodClient.interceptors.request.use(apiProxyInterceptor)
vodClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.code === 'ECONNABORTED') return Promise.reject(new Error('请求超时'))
    return Promise.reject(error)
  },
)

export const doubanClient = axios.create({
  timeout: 10000,
  headers: { 'Accept': 'application/json' },
})
doubanClient.interceptors.request.use(apiProxyInterceptor)
