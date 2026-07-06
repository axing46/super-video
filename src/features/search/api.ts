import { fetchSourceApi } from '@/core/network/client'
import type { VodItem } from '@/core/models'
import { loadAllSources, type LocalVodSource } from '@/features/sources/storage'
import { getFavoriteSourceKeys } from '@/features/sources/favorites'

// ─── Source performance tracking ─────────────────────────────

const SOURCE_PERF_KEY = 'tvcc_source_performance'

interface SourcePerformance {
  key: string
  avgResponseTime: number
  successRate: number
  lastUsed: number
}

function loadSourcePerformance(): Map<string, SourcePerformance> {
  try {
    const raw = localStorage.getItem(SOURCE_PERF_KEY)
    if (!raw) return new Map()
    const arr = JSON.parse(raw) as SourcePerformance[]
    return new Map(arr.map(p => [p.key, p]))
  } catch {
    return new Map()
  }
}

function saveSourcePerformance(perf: Map<string, SourcePerformance>) {
  localStorage.setItem(SOURCE_PERF_KEY, JSON.stringify([...perf.values()]))
}

function recordSourcePerformance(key: string, responseTime: number, success: boolean) {
  const perf = loadSourcePerformance()
  const existing = perf.get(key)

  if (existing) {
    existing.avgResponseTime = (existing.avgResponseTime * 0.7) + (responseTime * 0.3)
    existing.successRate = existing.successRate * 0.8 + (success ? 0.2 : 0)
    existing.lastUsed = Date.now()
  } else {
    perf.set(key, {
      key,
      avgResponseTime: responseTime,
      successRate: success ? 1 : 0,
      lastUsed: Date.now(),
    })
  }
  saveSourcePerformance(perf)
}

function sortSourcesByPerformance(sources: LocalVodSource[]): LocalVodSource[] {
  const perf = loadSourcePerformance()
  return [...sources].sort((a, b) => {
    const perfA = perf.get(a.key)
    const perfB = perf.get(b.key)
    if (!perfA && !perfB) return 0
    if (!perfA) return 1
    if (!perfB) return -1
    // Score: lower response time + higher success rate = better
    const scoreA = perfA.avgResponseTime * (1 - perfA.successRate * 0.5)
    const scoreB = perfB.avgResponseTime * (1 - perfB.successRate * 0.5)
    return scoreA - scoreB
  })
}

// ─── Source crawler ──────────────────────────────────────────

function buildApiUrl(baseUrl: string, params: Record<string, string>): string {
  const url = new URL(baseUrl)
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

  const data = (await fetchSourceApi(url)) as Record<string, unknown>

  const code = Number(data['code'] ?? 1)
  if (![0, 1, 200].includes(code)) {
    const msg = readString(data['msg']) ?? '片源接口返回错误'
    throw new Error(msg)
  }

  const list = data['list'] as unknown[] | undefined
  if (!Array.isArray(list)) return []

  return list.map((item) => {
    const map = item as Record<string, unknown>

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

// ─── Search suggestions ──────────────────────────────────────

export async function searchSuggestions(keyword: string): Promise<string[]> {
  if (!keyword || keyword.length < 1) return []

  // Get first enabled source for suggestions
  const sources = (await loadAllSources()).filter((s) => s.enabled)
  if (sources.length === 0) return []

  const source = sources[0]
  const url = buildApiUrl(source.apiUrl, {
    ac: 'videolist',
    pg: '1',
    wd: keyword,
  })

  try {
    const data = (await fetchSourceApi(url)) as Record<string, unknown>
    const list = data['list'] as unknown[] | undefined
    if (!Array.isArray(list)) return []

    return list.slice(0, 6).map((item) => {
      const map = item as Record<string, unknown>
      return readString(map['vod_name']) ?? ''
    }).filter(Boolean)
  } catch {
    return []
  }
}

// ─── Multi-source parallel search (streaming) ────────────────

const PER_SOURCE_TIMEOUT = 6000
const MAX_PAGES = 3
const FAST_SOURCE_COUNT = 8

export interface SearchAllResult {
  items: VodItem[]
  sourceCount: number
  errorCount: number
  searchedCount?: number
  totalSources?: number
}

// Calculate relevance score for search results
function calculateRelevance(item: VodItem, keyword: string): number {
  const name = (item.vodName || '').toLowerCase().trim()
  const keywordLower = keyword.toLowerCase()

  if (!name || !keywordLower) return 0

  // Exact match = highest score
  if (name === keywordLower) return 100

  // Starts with keyword
  if (name.startsWith(keywordLower)) return 80

  // Contains keyword
  if (name.includes(keywordLower)) return 60

  // Check word-by-word match
  const words = keywordLower.split(/\s+/)
  const matchedWords = words.filter(w => name.includes(w))
  if (matchedWords.length > 0) {
    return (matchedWords.length / words.length) * 50
  }

  // Check if name contains any part of keyword
  const nameWords = name.split(/[\s\-_,，。·：:]+/)
  const nameMatch = nameWords.some(nw => nw.includes(keywordLower) || keywordLower.includes(nw))
  if (nameMatch) return 30

  return 0
}

// Group similar items across sources and rank them
function groupAndRankItems(items: VodItem[], keyword: string): VodItem[] {
  // Add relevance scores
  const scoredItems = items.map(item => ({
    ...item,
    _relevance: calculateRelevance(item, keyword)
  })).filter(item => item._relevance > 0) // Only keep relevant results

  // Group by similar name
  const groups = new Map<string, typeof scoredItems>()

  for (const item of scoredItems) {
    const normalizedName = normalizeForGrouping(item.vodName || '')
    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, [])
    }
    groups.get(normalizedName)!.push(item)
  }

  // Convert to array with group boosting
  const result: (VodItem & { _groupScore: number })[] = []

  for (const [, group] of groups) {
    // Count unique sources in group
    const uniqueSources = new Set(group.map(g => g.sourceKey)).size

    // Sort group by relevance (highest first)
    group.sort((a, b) => (b._relevance || 0) - (a._relevance || 0))

    // Add group score boost for items found in multiple sources
    const groupBoost = uniqueSources > 1 ? 20 : 0

    for (const item of group) {
      result.push({
        ...item,
        _groupScore: (item._relevance || 0) + groupBoost
      })
    }
  }

  // Sort by group score (highest first)
  result.sort((a, b) => (b._groupScore || 0) - (a._groupScore || 0))

  // Remove helper fields
  return result.map(({ _relevance, _groupScore, ...rest }) => rest)
}

// Normalize name for grouping
function normalizeForGrouping(name: string): string {
  return name
    .replace(/\s+/g, '')
    .replace(/[第季集期部]/g, '')
    .replace(/\d+$/g, '')
    .replace(/[^a-zA-Z0-9一-鿿]/g, '')
    .toLowerCase()
}

export async function searchAllSources(
  keyword: string,
  cache: SearchCache,
  onBatch?: (items: VodItem[]) => void,
  onProgress?: (searched: number, total: number) => void,
  fastOnly = false,
  favoritesOnly = false,
): Promise<SearchAllResult> {
  const query = keyword.trim()
  if (!query) return { items: [], sourceCount: 0, errorCount: 0 }

  let sources = (await loadAllSources()).filter((s) => s.enabled)
  if (sources.length === 0) return { items: [], sourceCount: 0, errorCount: 0 }

  // Filter to favorites only if requested
  if (favoritesOnly) {
    const favoriteKeys = getFavoriteSourceKeys()
    sources = sources.filter(s => favoriteKeys.includes(s.key))
  }

  // Sort by performance (smart source sorting)
  sources = sortSourcesByPerformance(sources)

  // Fast mode: only search top N sources
  if (fastOnly) {
    sources = sources.slice(0, FAST_SOURCE_COUNT)
  }

  const totalSources = sources.length
  const allItems: VodItem[] = []
  let errorCount = 0
  let searchedCount = 0

  // Streaming: process sources as they complete
  const promises = sources.map(async (source) => {
    const startTime = Date.now()
    try {
      const cached = cache.get(source.key, query, 1)
      if (cached && cached.length > 0) {
        const batch = [...cached]
        for (let p = 2; p <= MAX_PAGES; p++) {
          const pageCached = cache.get(source.key, query, p)
          if (pageCached) batch.push(...pageCached)
        }
        recordSourcePerformance(source.key, 10, true)
        searchedCount++
        onProgress?.(searchedCount, totalSources)
        return batch
      }

      const page1 = await withTimeout(searchSource(source, query, 1), PER_SOURCE_TIMEOUT)
      const responseTime = Date.now() - startTime
      recordSourcePerformance(source.key, responseTime, true)
      cache.set(source.key, query, 1, page1)
      if (page1.length === 0) {
        searchedCount++
        onProgress?.(searchedCount, totalSources)
        return []
      }

      const results = [...page1]
      const extraPages = await Promise.allSettled(
        Array.from({ length: MAX_PAGES - 1 }, (_, i) => i + 2).map((page) =>
          withTimeout(searchSource(source, query, page), PER_SOURCE_TIMEOUT).then((items) => {
            cache.set(source.key, query, page, items)
            return items
          }),
        ),
      )
      for (const result of extraPages) {
        if (result.status === 'fulfilled') results.push(...result.value)
      }
      searchedCount++
      onProgress?.(searchedCount, totalSources)
      return results
    } catch {
      const responseTime = Date.now() - startTime
      recordSourcePerformance(source.key, responseTime, false)
      errorCount++
      searchedCount++
      onProgress?.(searchedCount, totalSources)
      return []
    }
  })

  // Stream results as they arrive
  for (const promise of promises) {
    const items = await promise
    if (items.length > 0) {
      allItems.push(...items)
      onBatch?.(items)
    }
  }

  // Group and rank results by relevance
  const rankedItems = groupAndRankItems(allItems, query)

  return { items: rankedItems, sourceCount: sources.length, errorCount }
}

// ─── Get detail ──────────────────────────────────────────────

export async function fetchDetail(sourceKey: string, vodId: string): Promise<VodItem> {
  const sources = await loadAllSources()
  const source = sources.find((s) => s.key === sourceKey)
  if (!source) throw new Error(`片源不存在: ${sourceKey}`)

  const url = buildApiUrl(source.apiUrl, { ac: 'videolist', ids: vodId })
  const data = (await fetchSourceApi(url)) as Record<string, unknown>

  const list = data['list'] as unknown[] | undefined
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('未找到影视详情')
  }

  const item = list[0] as Record<string, unknown>

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

// ─── Helpers ─────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('请求超时')), ms)),
  ])
}

// ─── LRU Search cache ────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000
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
    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL, data })
  }

  private evictIfNeeded(): void {
    if (this.cache.size < MAX_ENTRIES) return
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) this.cache.delete(key)
    }
    if (this.cache.size >= MAX_ENTRIES) {
      const sorted = [...this.cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
      const toRemove = this.cache.size - MAX_ENTRIES + 50
      for (let i = 0; i < toRemove && i < sorted.length; i++) {
        this.cache.delete(sorted[i][0])
      }
    }
  }
}
