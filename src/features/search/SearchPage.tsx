import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSearch } from './hooks'
import { VodGrid } from '@/components/vod/VodGrid'
import { EmptyState, ErrorState } from '@/components/ui/Status'
import type { VodItem } from '@/core/models'
import { getSourceDisplayName } from '@/utils/source-names'

type Category = { key: string; label: string }

const CATEGORIES: Category[] = [
  { key: 'all', label: '全部' },
  { key: 'movie', label: '电影' },
  { key: 'tv', label: '电视剧' },
  { key: 'variety', label: '综艺' },
  { key: 'anime', label: '动漫' },
]

/** Filter items by category based on typeName field */
function filterByCategory(items: VodItem[], cat: string): VodItem[] {
  if (cat === 'all') return items
  return items.filter((item) => {
    const t = (item.typeName ?? '').toLowerCase()
    switch (cat) {
      case 'movie':
        return t.includes('电影') || t.includes('movie')
      case 'tv':
        return t.includes('电视') || t.includes('剧') || t.includes('tv')
      case 'variety':
        return t.includes('综艺') || t.includes('variety')
      case 'anime':
        return t.includes('动漫') || t.includes('动画') || t.includes('anime')
      default:
        return true
    }
  })
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const queryParam = params.get('q') ?? ''
  const currentCat = params.get('cat') ?? 'all'
  const [keyword, setKeyword] = useState(queryParam)
  const [activeCat, setActiveCat] = useState(currentCat)

  useEffect(() => {
    if (queryParam) setKeyword(queryParam)
  }, [queryParam])

  useEffect(() => {
    setActiveCat(currentCat)
  }, [currentCat])

  const { data, isLoading, isError, error, refetch } = useSearch(keyword)

  // Filter results by selected category
  const categoryItems = useMemo(() => {
    if (!data) return []
    return filterByCategory(data.items, activeCat)
  }, [data, activeCat])

  // Filter by source and type
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const finalItems = useMemo(() => {
    let items = categoryItems
    if (sourceFilter) items = items.filter((i) => i.sourceKey === sourceFilter)
    if (typeFilter) items = items.filter((i) => (i.typeName ?? '').includes(typeFilter))
    return items
  }, [categoryItems, sourceFilter, typeFilter])

  // Source badges
  const sourceBadges = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { key: string; count: number }>()
    for (const item of data.items) {
      if (!map.has(item.sourceKey)) map.set(item.sourceKey, { key: item.sourceKey, count: 0 })
      map.get(item.sourceKey)!.count++
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [data])

  // Type badges
  const typeBadges = useMemo(() => {
    if (!data) return []
    const map = new Map<string, number>()
    for (const item of data.items) {
      const t = item.typeName?.trim()
      if (!t) continue
      map.set(t, (map.get(t) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [data])

  // Count items per category
  const catCounts = useMemo(() => {
    if (!data) return {}
    const counts: Record<string, number> = {}
    for (const cat of CATEGORIES) {
      counts[cat.key] = filterByCategory(data.items, cat.key).length
    }
    return counts
  }, [data])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = keyword.trim()
    if (q) {
      setParams({ q, cat: activeCat === 'all' ? undefined : activeCat } as Record<string, string>)
    }
  }

  const setCategory = (cat: string) => {
    setActiveCat(cat)
    const q = keyword.trim() || queryParam
    if (q) setParams({ q, cat: cat === 'all' ? undefined : cat } as Record<string, string>)
  }

  return (
    <div className="max-w-7xl mx-auto">

      {/* Search form (visible when no query in URL) */}
      {!queryParam && (
        <form onSubmit={handleSearch} className="glass-input flex items-center mb-8">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入关键词搜索..."
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-ink
              placeholder:text-muted px-6 py-4"
            autoFocus
          />
        </form>
      )}

      {/* Category tabs */}
      {queryParam && (
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count = catCounts[cat.key] ?? 0
            const isActive = activeCat === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-pill text-[12.5px] font-semibold
                  whitespace-nowrap transition-all duration-180
                  ${isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-muted border border-transparent hover:text-ink-2 hover:bg-white/[0.04]'
                  }`}
              >
                {cat.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-accent/20' : 'bg-white/[0.06]'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Source + Type filter badges */}
      {queryParam && data && data.items.length > 0 && (
        <div className="space-y-2 mb-4">
          {sourceBadges.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted/60 mr-1">片源:</span>
              {sourceBadges.map((s) => {
                const isActive = sourceFilter === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => setSourceFilter(isActive ? null : s.key)}
                    className={`pill text-[11px] cursor-pointer transition-all duration-150
                      ${isActive ? '!bg-accent/15 !border-accent/30 !text-accent' : 'hover:border-white/20'}`}
                  >
                    {getSourceDisplayName(s.key)}
                    <span className="ml-1 opacity-60">{s.count}</span>
                  </button>
                )
              })}
              {sourceFilter && (
                <button onClick={() => setSourceFilter(null)} className="text-[10px] text-muted hover:text-ink-2 ml-1">清除</button>
              )}
            </div>
          )}
          {typeBadges.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted/60 mr-1">类型:</span>
              {typeBadges.map(([t, count]) => {
                const isActive = typeFilter === t
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(isActive ? null : t)}
                    className={`pill text-[11px] cursor-pointer transition-all duration-150
                      ${isActive ? '!bg-accent/15 !border-accent/30 !text-accent' : 'hover:border-white/20'}`}
                  >
                    {t}
                    <span className="ml-1 opacity-60">{count}</span>
                  </button>
                )
              })}
              {typeFilter && (
                <button onClick={() => setTypeFilter(null)} className="text-[10px] text-muted hover:text-ink-2 ml-1">清除</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {!queryParam ? (
        <EmptyState message="输入关键词开始搜索" />
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message ?? '搜索失败'}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <VodGrid items={[]} loading />
      ) : (
        <VodGrid items={finalItems} />
      )}

      {/* Source stats */}
      {data && (
        <p className="mt-6 text-[12px] text-muted/70">
          共 {finalItems.length} 条结果（{data.items.length} 条未筛选）· {data.sourceCount} 个片源
          {data.errorCount > 0 && ` · ${data.errorCount} 个片源失败`}
        </p>
      )}
    </div>
  )
}
