import type { LocalVodSource } from '@/core/models'
import { localVodSourceFromStorage, localVodSourceToJson } from '@/core/models'
export type { LocalVodSource } from '@/core/models'

const STORAGE_KEY = 'sv_sources_v1'
const SOURCES_VERSION_KEY = 'sv_sources_version'
const CURRENT_SOURCES_VERSION = 3 // 更新版本号来触发同步

// CORS proxies to try (in order) when fetching from browser
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

// 38个默认片源配置（来自kvideo-settings）
const DEFAULT_SOURCES: LocalVodSource[] = [
  { key: 'feifan', name: '非凡资源', apiUrl: 'http://ffzy5.tv/api.php/provide/vod', detailUrl: 'http://ffzy5.tv/api.php/provide/vod', enabled: true },
  { key: 'wolong', name: '卧龙资源', apiUrl: 'https://wolongzyw.com/api.php/provide/vod', detailUrl: 'https://wolongzyw.com/api.php/provide/vod', enabled: true },
  { key: 'zuida', name: '最大资源', apiUrl: 'https://api.zuidapi.com/api.php/provide/vod', detailUrl: 'https://api.zuidapi.com/api.php/provide/vod', enabled: true },
  { key: 'baiduyun', name: '百度云资源', apiUrl: 'https://api.apibdzy.com/api.php/provide/vod', detailUrl: 'https://api.apibdzy.com/api.php/provide/vod', enabled: true },
  { key: 'baofeng', name: '暴风资源', apiUrl: 'https://bfzyapi.com/api.php/provide/vod', detailUrl: 'https://bfzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'jisu', name: '极速资源', apiUrl: 'https://jszyapi.com/api.php/provide/vod', detailUrl: 'https://jszyapi.com/api.php/provide/vod', enabled: true },
  { key: 'tianya', name: '天涯资源', apiUrl: 'https://tyyszy.com/api.php/provide/vod', detailUrl: 'https://tyyszy.com/api.php/provide/vod', enabled: true },
  { key: 'wujin', name: '无尽资源', apiUrl: 'https://api.wujinapi.com/api.php/provide/vod', detailUrl: 'https://api.wujinapi.com/api.php/provide/vod', enabled: true },
  { key: 'modu', name: '魔都资源', apiUrl: 'https://www.mdzyapi.com/api.php/provide/vod', detailUrl: 'https://www.mdzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'sanliuling', name: '360资源', apiUrl: 'https://360zy.com/api.php/provide/vod', detailUrl: 'https://360zy.com/api.php/provide/vod', enabled: true },
  { key: 'dytt', name: '电影天堂', apiUrl: 'http://caiji.dyttzyapi.com/api.php/provide/vod', detailUrl: 'http://caiji.dyttzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'ruyi', name: '如意资源', apiUrl: 'https://cj.rycjapi.com/api.php/provide/vod', detailUrl: 'https://cj.rycjapi.com/api.php/provide/vod', enabled: true },
  { key: 'wangwang', name: '旺旺资源', apiUrl: 'https://wwzy.tv/api.php/provide/vod', detailUrl: 'https://wwzy.tv/api.php/provide/vod', enabled: true },
  { key: 'hongniu', name: '红牛资源', apiUrl: 'https://www.hongniuzy2.com/api.php/provide/vod', detailUrl: 'https://www.hongniuzy2.com/api.php/provide/vod', enabled: true },
  { key: 'guangsu', name: '光速资源', apiUrl: 'https://api.guangsuapi.com/api.php/provide/vod', detailUrl: 'https://api.guangsuapi.com/api.php/provide/vod', enabled: true },
  { key: 'ikun', name: 'iKun资源', apiUrl: 'https://ikunzyapi.com/api.php/provide/vod', detailUrl: 'https://ikunzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'youku', name: '优酷资源', apiUrl: 'https://api.ukuapi.com/api.php/provide/vod', detailUrl: 'https://api.ukuapi.com/api.php/provide/vod', enabled: true },
  { key: 'huya', name: '虎牙资源', apiUrl: 'https://www.huyaapi.com/api.php/provide/vod', detailUrl: 'https://www.huyaapi.com/api.php/provide/vod', enabled: true },
  { key: 'xinlang', name: '新浪资源', apiUrl: 'http://api.xinlangapi.com/xinlangapi.php/provide/vod', detailUrl: 'http://api.xinlangapi.com/xinlangapi.php/provide/vod', enabled: true },
  { key: 'lezi', name: '乐子资源', apiUrl: 'https://cj.lziapi.com/api.php/provide/vod', detailUrl: 'https://cj.lziapi.com/api.php/provide/vod', enabled: true },
  { key: 'haihua', name: '海豚资源', apiUrl: 'https://hhzyapi.com/api.php/provide/vod', detailUrl: 'https://hhzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'jiangyu', name: '鲸鱼资源', apiUrl: 'https://jyzyapi.com/provide/vod', detailUrl: 'https://jyzyapi.com/provide/vod', enabled: true },
  { key: 'yilingba', name: '1080资源', apiUrl: 'https://api.1080zyku.com/inc/api_mac10.php', detailUrl: 'https://api.1080zyku.com/inc/api_mac10.php', enabled: true },
  { key: 'aidan', name: '爱蛋资源', apiUrl: 'https://lovedan.net/api.php/provide/vod', detailUrl: 'https://lovedan.net/api.php/provide/vod', enabled: true },
  { key: 'leba', name: '乐播资源', apiUrl: 'https://lbapi9.com/api.php/provide/vod', detailUrl: 'https://lbapi9.com/api.php/provide/vod', enabled: true },
  { key: 'moduzy', name: '魔都影视', apiUrl: 'https://www.moduzy.com/api.php/provide/vod', detailUrl: 'https://www.moduzy.com/api.php/provide/vod', enabled: true },
  { key: 'feifanapi', name: '非凡API', apiUrl: 'https://api.ffzyapi.com/api.php/provide/vod', detailUrl: 'https://api.ffzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'feifancj', name: '非凡采集', apiUrl: 'http://cj.ffzyapi.com/api.php/provide/vod', detailUrl: 'http://cj.ffzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'feifancj2', name: '非凡采集HTTPS', apiUrl: 'https://cj.ffzyapi.com/api.php/provide/vod', detailUrl: 'https://cj.ffzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'feifan1', name: '非凡线路1', apiUrl: 'http://ffzy1.tv/api.php/provide/vod', detailUrl: 'http://ffzy1.tv/api.php/provide/vod', enabled: true },
  { key: 'wolong2', name: '卧龙采集', apiUrl: 'https://collect.wolongzyw.com/api.php/provide/vod', detailUrl: 'https://collect.wolongzyw.com/api.php/provide/vod', enabled: true },
  { key: 'baofeng2', name: '暴风APP', apiUrl: 'https://app.bfzyapi.com/api.php/provide/vod', detailUrl: 'https://app.bfzyapi.com/api.php/provide/vod', enabled: true },
  { key: 'wujin2', name: '无尽ME', apiUrl: 'https://api.wujinapi.me/api.php/provide/vod', detailUrl: 'https://api.wujinapi.me/api.php/provide/vod', enabled: true },
  { key: 'tianyazy', name: '天涯海角', apiUrl: 'https://tyyszyapi.com/api.php/provide/vod', detailUrl: 'https://tyyszyapi.com/api.php/provide/vod', enabled: true },
  { key: 'guangsu2', name: '光速HTTP', apiUrl: 'http://api.guangsuapi.com/api.php/provide/vod', detailUrl: 'http://api.guangsuapi.com/api.php/provide/vod', enabled: true },
  { key: 'xinlang2', name: '新浪HTTPS', apiUrl: 'https://api.xinlangapi.com/xinlangapi.php/provide/vod', detailUrl: 'https://api.xinlangapi.com/xinlangapi.php/provide/vod', enabled: true },
  { key: 'yilingba2', name: '1080JSON', apiUrl: 'https://api.1080zyku.com/inc/apijson.php', detailUrl: 'https://api.1080zyku.com/inc/apijson.php', enabled: true },
  { key: 'lezi2', name: '乐子HTTP', apiUrl: 'http://cj.lziapi.com/api.php/provide/vod', detailUrl: 'http://cj.lziapi.com/api.php/provide/vod', enabled: true },
]

export async function loadAllSources(): Promise<LocalVodSource[]> {
  try {
    // Check if sources version needs update
    const savedVersion = localStorage.getItem(SOURCES_VERSION_KEY)
    if (savedVersion !== String(CURRENT_SOURCES_VERSION)) {
      // Version mismatch — update sources while preserving user's enabled/disabled state
      const raw = localStorage.getItem(STORAGE_KEY)
      let existingSources: LocalVodSource[] = []

      if (raw) {
        try {
          existingSources = (JSON.parse(raw) as unknown[]).map(localVodSourceFromStorage)
        } catch {
          existingSources = []
        }
      }

      // Create a map of existing sources' enabled state
      const existingState = new Map(existingSources.map(s => [s.key, s.enabled]))

      // Merge: use default sources, preserve user's enabled/disabled choices
      const mergedSources = DEFAULT_SOURCES.map(s => ({
        ...s,
        enabled: existingState.has(s.key) ? existingState.get(s.key)! : s.enabled,
      }))

      // Add any user-added sources not in defaults
      for (const existing of existingSources) {
        if (!mergedSources.some(s => s.key === existing.key)) {
          mergedSources.push(existing)
        }
      }

      saveSources(mergedSources)
      localStorage.setItem(SOURCES_VERSION_KEY, String(CURRENT_SOURCES_VERSION))
      return mergedSources
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // First visit — save defaults
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

export async function clearAllSources(): Promise<void> {
  saveSources([])
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
