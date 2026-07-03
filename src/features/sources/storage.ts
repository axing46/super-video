import type { LocalVodSource } from '@/core/models'
import { localVodSourceFromStorage, localVodSourceToJson } from '@/core/models'
export type { LocalVodSource } from '@/core/models'

const STORAGE_KEY = 'sv_sources_v1'

// CORS proxies to try (in order) when fetching from browser
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

export async function loadAllSources(): Promise<LocalVodSource[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as unknown[]
    return list.map(localVodSourceFromStorage)
  } catch {
    return []
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
