import type { LocalVodSource } from '@/core/models'
import { localVodSourceFromStorage, localVodSourceToJson } from '@/core/models'
export type { LocalVodSource } from '@/core/models'

const STORAGE_KEY = 'sv_sources_v1'

// CORS proxies to try (in order) when fetching from browser
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

// Default sources — auto-imported on first visit
const DEFAULT_SOURCES: LocalVodSource[] = [
  // ── 主力资源 ──
  { key: 'ikunzy', name: 'ikun资源', apiUrl: 'https://ikunzyapi.com/api.php/provide/vod', detailUrl: 'https://ikunzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'iqiyizy', name: '爱奇艺资源', apiUrl: 'https://iqiyizyapi.com/api.php/provide/vod', detailUrl: 'https://iqiyizyapi.com/api.php/provide/vod', enabled: true },
  { key: 'ffzy', name: '非凡资源', apiUrl: 'https://cj.ffzyapi.com/api.php/provide/vod', detailUrl: 'https://cj.ffzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'hongniu', name: '红牛资源', apiUrl: 'https://www.hongniuzy2.com/api.php/provide/vod', detailUrl: 'https://www.hongniuzy2.com/api.php/provide/vod', enabled: true },
  { key: 'lzcaiji', name: '量子采集', apiUrl: 'https://cj.lzcaiji.com/api.php/provide/vod', detailUrl: 'https://cj.lzcaiji.com/api.php/provide/vod', enabled: true },
  { key: 'sdzy', name: '闪电资源', apiUrl: 'https://sdzyapi.com/api.php/provide/vod', detailUrl: 'https://sdzyapi.com/api.php/provide/vod', enabled: true },
  { key: '360zy', name: '360资源', apiUrl: 'https://360zy.com/api.php/provide/vod', detailUrl: 'https://360zy.com/api.php/provide/vod', enabled: true },
  { key: 'wujin', name: '无尽资源', apiUrl: 'https://api.wujinapi.me/api.php/provide/vod', detailUrl: 'https://api.wujinapi.me/api.php/provide/vod', enabled: true },
  { key: 'maoyan', name: '猫眼资源', apiUrl: 'https://api.maoyanapi.top/api.php/provide/vod', detailUrl: 'https://api.maoyanapi.top/api.php/provide/vod', enabled: true },
  // ── 补充资源 ──
  { key: 'heimuer', name: '黑木耳资源', apiUrl: 'https://json.heimuer.xyz/api.php/provide/vod', detailUrl: 'https://json.heimuer.xyz/api.php/provide/vod', enabled: true },
  { key: 'hwzy', name: '红牛VIP', apiUrl: 'https://www.hongniuzy2.com/api.php/provide/vod', detailUrl: 'https://www.hongniuzy2.com/api.php/provide/vod', enabled: true },
  { key: 'dbzy', name: '豆瓣资源', apiUrl: 'https://dbzyapi.com/api.php/provide/vod', detailUrl: 'https://dbzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'bfzy', name: '暴风资源', apiUrl: 'https://bfzyapi.com/api.php/provide/vod', detailUrl: 'https://bfzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'tpzy', name: '淘片资源', apiUrl: 'https://taopianapi.com/home/cjapi/vod/mc/we/page', detailUrl: 'https://taopianapi.com/home/cjapi/vod/mc/we/page', enabled: true },
  { key: 'gszy', name: '光速资源', apiUrl: 'https://api.guangsuapi.com/api.php/provide/vod', detailUrl: 'https://api.guangsuapi.com/api.php/provide/vod', enabled: true },
  { key: 'tkzy', name: '天空资源', apiUrl: 'https://api.tiankongapi.com/api.php/provide/vod', detailUrl: 'https://api.tiankongapi.com/api.php/provide/vod', enabled: true },
  { key: 'jszy', name: '极速资源', apiUrl: 'https://jszyapi.com/api.php/provide/vod', detailUrl: 'https://jszyapi.com/api.php/provide/vod', enabled: true },
  { key: 'lydzy', name: '量子资源', apiUrl: 'https://cj.lziapi.com/api.php/provide/vod', detailUrl: 'https://cj.lziapi.com/api.php/provide/vod', enabled: true },
  { key: 'wzzy', name: '无尽ME', apiUrl: 'https://www.wujinapi.me/api.php/provide/vod', detailUrl: 'https://www.wujinapi.me/api.php/provide/vod', enabled: true },
  { key: 'bfzy2', name: '暴风极速', apiUrl: 'https://bfzyapi.com/api.php/provide/vod', detailUrl: 'https://bfzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'moduzy', name: '魔都资源', apiUrl: 'https://moduzyapi.com/api.php/provide/vod', detailUrl: 'https://moduzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'kkzy', name: '快快资源', apiUrl: 'https://api.kkzyapi.com/api.php/provide/vod', detailUrl: 'https://api.kkzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'hnzy', name: '红牛极速', apiUrl: 'https://hnzyapi.com/api.php/provide/vod', detailUrl: 'https://hnzyapi.com/api.php/provide/vod', enabled: true },
]

export async function loadAllSources(): Promise<LocalVodSource[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // First visit — save and return defaults
      saveSources(DEFAULT_SOURCES)
      return DEFAULT_SOURCES
    }
    const list = JSON.parse(raw) as unknown[]
    return list.map(localVodSourceFromStorage)
  } catch {
    return DEFAULT_SOURCES
  }
}

function saveSources(sources: LocalVodSource[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sources.map(localVodSourceToJson)))
}

export async function getSource(key: string): Promise<LocalVodSource | undefined> {
  const sources = await loadAllSources()
  return sources.find((s) => s.key === key)
}

export async function toggleSource(key: string, enabled: boolean): Promise<void> {
  const sources = await loadAllSources()
  const updated = sources.map((s) => (s.key === key ? { ...s, enabled } : s))
  saveSources(updated)
}

export async function addSource(source: LocalVodSource): Promise<void> {
  const sources = await loadAllSources()
  if (sources.some((s) => s.key === source.key)) {
    throw new Error(`片源已存在: ${source.key}`)
  }
  sources.push(source)
  saveSources(sources)
}

export async function deleteSource(key: string): Promise<void> {
  const sources = await loadAllSources()
  const filtered = sources.filter((s) => s.key !== key)
  if (filtered.length === sources.length) throw new Error(`片源不存在: ${key}`)
  saveSources(filtered)
}

async function fetchWithProxy(url: string): Promise<string> {
  // Try direct access first
  try {
    const res = await fetch(url)
    if (res.ok) return await res.text()
  } catch {
    // Direct failed, try proxies
  }

  // Try each CORS proxy
  const errors: string[] = []
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy(url)
      const res = await fetch(proxyUrl)
      if (res.ok) return await res.text()
      errors.push(`proxy returned ${res.status}`)
    } catch (e) {
      errors.push(`proxy failed: ${(e as Error).message}`)
    }
  }

  throw new Error(
    `无法获取片源数据。直接请求和 CORS 代理均失败。\n` +
    `请尝试：\n1. 检查网络连接\n2. 将 JSON 内容粘贴到下方文本框导入`,
  )
}

export async function importRemoteSources(
  url: string,
): Promise<{ added: string[]; skipped: string[]; errors: string[] }> {
  const raw = await fetchWithProxy(url)
  return importSourcesFromJson(raw)
}

/** Import from JSON string (paste) — bypasses network issues */
export async function importSourcesFromJson(
  raw: string,
): Promise<{ added: string[]; skipped: string[]; errors: string[] }> {
  const data = JSON.parse(raw)

  let remoteList: { key: string; name: string; api: string; detail?: string; group?: string; r18?: boolean }[] = []

  if (Array.isArray(data)) {
    remoteList = data.map((item: Record<string, unknown>) => ({
      key: String(item['key'] ?? ''),
      name: String(item['name'] ?? ''),
      api: String(item['api'] ?? ''),
      detail: String(item['detail'] ?? item['api'] ?? ''),
      group: item['group'] as string | undefined,
      r18: item['r18'] as boolean | undefined,
    }))
  } else if (data['sources'] && Array.isArray(data['sources'])) {
    remoteList = (data['sources'] as Record<string, unknown>[]).map((item) => ({
      key: String(item['key'] ?? ''),
      name: String(item['name'] ?? ''),
      api: String(item['api'] ?? ''),
      detail: String(item['detail'] ?? item['api'] ?? ''),
      group: item['group'] as string | undefined,
      r18: item['r18'] as boolean | undefined,
    }))
  } else if (data['api_site']) {
    const apiSite = data['api_site'] as Record<string, Record<string, unknown>>
    remoteList = Object.entries(apiSite).map(([key, value]) => ({
      key,
      name: String(value['name'] ?? key),
      api: String(value['api'] ?? ''),
      detail: String(value['detail'] ?? value['api'] ?? ''),
      group: value['group'] as string | undefined,
      r18: value['r18'] as boolean | undefined,
    }))
  }

  const sources = await loadAllSources()
  const existingKeys = new Set(sources.map((s) => s.key))
  const added: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  for (const remote of remoteList) {
    if (!remote.key || !remote.api) {
      errors.push(`${remote.name || '(unknown)'}: 缺少必要字段`)
      continue
    }
    if (existingKeys.has(remote.key)) {
      skipped.push(remote.key)
      continue
    }
    existingKeys.add(remote.key)
    sources.push({
      key: remote.key,
      name: remote.name,
      apiUrl: remote.api,
      detailUrl: remote.detail || remote.api,
      enabled: true,
      r18: remote.r18,
      group: remote.group,
    })
    added.push(remote.key)
  }

  saveSources(sources)
  return { added, skipped, errors }
}
