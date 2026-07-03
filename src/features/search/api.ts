import { vodClient } from '@/core/network/client'
import { vodItemFromJson, type VodItem } from '@/core/models'
import { loadAllSources, type LocalVodSource } from '@/features/sources/storage'

// ─── Source crawler ──────────────────────────────────────────

function buildApiUrl(baseUrl: string, params: Record<string, string>): string {
  const url = new URL(baseUrl)
  const proxiedTarget = url.searchParams.get('url')
  if (proxiedTarget && proxiedTarget.trim()) {
    const upstream = new URL(proxiedTarget)
    for (const [k, v] of Object.entries(params)) {
      upstream.searchParams.set(k, v)
    }
    url.searchParams.set('url', upstream.toString())
    return url.toString()
  }
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

function readString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  return text.length > 0 ? text : undefined
}

export async function searchSource(
  source: LocalVodSource,
  keyword: string,
  page = 1,
): Promise<VodItem[]> {
  const url = buildApiUrl(source.apiUrl, {
    ac: 'videolist',
    pg: String(page),
    wd: keyword,
  })

  const res = await vodClient.get(url, { timeout: 8000 })
  const data = res.data as Record<string, unknown>

  const code = Number(data['code'] ?? 1)
  if (![0, 1, 200].includes(code)) {
    const msg = readString(data['msg']) ?? '片源接口返回错误'
    throw new Error(msg)
  }

  const list = data['list'] as unknown[] | undefined
  if (!Array.isArray(list)) return []

  return list.map((item) => {
    const map = item as Record<string, unknown>

    // Check for M3U8 in content if not in play_url
    let vodPlayUrl = readString(map['vod_play_url']) ?? ''
    const vodContent = readString(map['vod_content']) ?? readString(map['vod_blurb']) ?? ''

    const hasM3u8 = vodPlayUrl.toLowerCase().includes('.m3u8')
    if (!hasM3u8 && vodContent) {
      const m3u8Matches = vodContent.match(/https?:\/\/[^\s]+?\.m3u8[^\s]*/g)
      if (m3u8Matches && m3u8Matches.length > 0) {
        vodPlayUrl = m3u8Matches.map((url, i) => `${i + 1}$${url}`).join('#')
      }
    }

    return {
      sourceKey: source.key,
      vodId: readString(map['vod_id']) ?? '',
      vodName: readString(map['vod_name']) ?? '',
      vodPlayUrl,
      vodPic: readString(map['vod_pic']),
      vodRemarks: readString(map['vod_remarks']),
      vodActor: readString(map['vod_actor']),
      vodDirector: readString(map['vod_director']),
      vodContent: vodContent,
      vodYear: readString(map['vod_year']),
      vodArea: readString(map['vod_area']),
      vodClass: readString(map['vod_class']),
      vodTag: readString(map['vod_tag']),
      vodDuration: readString(map['vod_duration']),
      vodLang: readString(map['vod_lang']),
      typeName: readString(map['type_name']),
    }
  })
}

// ─── Multi-source parallel search ────────────────────────────

const PER_SOURCE_TIMEOUT = 5000
const MAX_PAGES = 1  // Page 1 is enough for search; speed > completeness

export interface SearchAllResult {
  items: VodItem[]
  sourceCount: number
  errorCount: number
}

export async function searchAllSources(
  keyword: string,
  cache: SearchCache,
  onBatch?: (items: VodItem[]) => void,
): Promise<SearchAllResult> {
  const query = keyword.trim()
  if (!query) return { items: [], sourceCount: 0, errorCount: 0 }

  const sources = (await loadAllSources()).filter((s) => s.enabled)
  if (sources.length === 0) return { items: [], sourceCount: 0, errorCount: 0 }

  const allItems: VodItem[] = []
  let errorCount = 0

  // Fire all sources in parallel, return as each completes
  const promises = sources.map(async (source) => {
    try {
      const cached = cache.get(source.key, query, 1)
      if (cached) return cached

      const items = await withTimeout(
        searchSource(source, query, 1),
        PER_SOURCE_TIMEOUT,
      )
      cache.set(source.key, query, 1, items)
      return items
    } catch {
      errorCount++
      return []
    }
  })

  // Stream results: update UI as each source responds
  for (const promise of promises) {
    const items = await promise
    if (items.length > 0) {
      allItems.push(...items)
      onBatch?.(items)
    }
  }

  return { items: allItems, sourceCount: sources.length, errorCount }
}

// ─── Get detail ──────────────────────────────────────────────

export async function fetchDetail(sourceKey: string, vodId: string): Promise<VodItem> {
  const sources = await loadAllSources()
  const source = sources.find((s) => s.key === sourceKey)
  if (!source) throw new Error(`片源不存在: ${sourceKey}`)

  const url = buildApiUrl(source.apiUrl, { ac: 'videolist', ids: vodId })
  const res = await vodClient.get(url, { timeout: 10000 })
  const data = res.data as Record<string, unknown>

  const list = data['list'] as unknown[] | undefined
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('未找到影视详情')
  }

  const item = list[0] as Record<string, unknown>

  // Parse M3U8 from content
  let vodPlayUrl = readString(item['vod_play_url']) ?? ''
  const vodContent = readString(item['vod_content']) ?? readString(item['vod_blurb']) ?? ''
  if (!vodPlayUrl.toLowerCase().includes('.m3u8') && vodContent) {
    const m3u8Matches = vodContent.match(/https?:\/\/[^\s]+?\.m3u8[^\s]*/g)
    if (m3u8Matches && m3u8Matches.length > 0) {
      vodPlayUrl = m3u8Matches.map((url, i) => `${i + 1}$${url}`).join('#')
    }
  }

  return {
    sourceKey: source.key,
    vodId: readString(item['vod_id']) ?? '',
    vodName: readString(item['vod_name']) ?? '',
    vodPlayUrl,
    vodPic: readString(item['vod_pic']),
    vodRemarks: readString(item['vod_remarks']),
    vodActor: readString(item['vod_actor']),
    vodDirector: readString(item['vod_director']),
    vodContent: vodContent,
    vodYear: readString(item['vod_year']),
    vodArea: readString(item['vod_area']),
    vodClass: readString(item['vod_class']),
    vodTag: readString(item['vod_tag']),
    vodDuration: readString(item['vod_duration']),
    vodLang: readString(item['vod_lang']),
    typeName: readString(item['type_name']),
  }
}

// ─── Timeout helper ──────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时')), ms),
    ),
  ])
}

// ─── LRU Search cache ────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const MAX_ENTRIES = 1000

export class SearchCache {
  private cache = new Map<string, { expiresAt: number; data: VodItem[] }>()

  private key(sourceKey: string, query: string, page: number): string {
    return `${sourceKey}::${query.trim()}::${page}`
  }

  get(sourceKey: string, query: string, page: number): VodItem[] | undefined {
    const key = this.key(sourceKey, query, page)
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    return entry.data
  }

  set(sourceKey: string, query: string, page: number, data: VodItem[]): void {
    this.evictIfNeeded()
    const key = this.key(sourceKey, query, page)
    this.cache.set(key, {
      expiresAt: Date.now() + CACHE_TTL,
      data,
    })
  }

  private evictIfNeeded(): void {
    if (this.cache.size < MAX_ENTRIES) return

    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) this.cache.delete(key)
    }

    if (this.cache.size >= MAX_ENTRIES) {
      const sorted = [...this.cache.entries()].sort(
        (a, b) => a[1].expiresAt - b[1].expiresAt,
      )
      const toRemove = this.cache.size - MAX_ENTRIES + 50
      for (let i = 0; i < toRemove && i < sorted.length; i++) {
        this.cache.delete(sorted[i][0])
      }
    }
  }
}
