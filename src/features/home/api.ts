import { loadAllSources } from '@/features/sources/storage'
import { searchSource } from '@/features/search/api'
import type { VodItem } from '@/core/models'

const DISCOVERY_QUERIES = [
  { label: '🔥 热门推荐', keyword: '' },
  { label: '🎬 最新电影', keyword: '电影' },
  { label: '📺 最新剧集', keyword: '电视剧' },
  { label: '🎤 综艺', keyword: '综艺' },
  { label: '🎞 动漫', keyword: '动漫' },
]

const TARGET_SOURCE = 'iqiyizy'

export interface DiscoverySection {
  label: string
  items: VodItem[]
}

export async function fetchDiscoverySections(): Promise<DiscoverySection[]> {
  const sources = (await loadAllSources()).filter((s) => s.enabled)
  if (sources.length === 0) return []

  // Find the iqiyizy source
  const target = sources.find((s) => s.key === TARGET_SOURCE)
  if (!target) {
    // Fallback: use all sources like before
    return fetchAllSources(sources)
  }

  const sections = await Promise.all(
    DISCOVERY_QUERIES.map(async ({ label, keyword }) => {
      try {
        // Fetch 2 pages for more content
        const [page1, page2] = await Promise.all([
          searchSource(target, keyword, 1),
          searchSource(target, keyword, 2),
        ])
        const allItems = [...page1, ...page2]
        // Deduplicate by name
        const seen = new Set<string>()
        const items = allItems.filter((item) => {
          if (!item.vodPic) return false
          const key = item.vodName
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        return { label, items }
      } catch {
        return { label, items: [] }
      }
    }),
  )

  return sections.filter((s) => s.items.length > 0)
}

/** Fallback: search all sources (original behavior) */
async function fetchAllSources(sources: any[]): Promise<DiscoverySection[]> {
  const activeSources = sources.slice(0, 3)
  const sections = await Promise.all(
    DISCOVERY_QUERIES.map(async ({ label, keyword }) => {
      try {
        const results = await Promise.allSettled(
          activeSources.map((s) => searchSource(s, keyword, 1)),
        )
        const items: VodItem[] = []
        const seen = new Set<string>()
        for (const r of results) {
          if (r.status === 'fulfilled') {
            for (const item of r.value) {
              if (!seen.has(item.vodName) && item.vodPic) {
                seen.add(item.vodName)
                items.push(item)
              }
            }
          }
        }
        return { label, items: items.slice(0, 20) }
      } catch {
        return { label, items: [] }
      }
    }),
  )
  return sections.filter((s) => s.items.length > 0)
}

// Re-export for hooks
export { DISCOVERY_QUERIES }
