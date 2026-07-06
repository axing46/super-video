import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Trash2, Film, Tv, Laugh, Clapperboard, Loader2, Heart } from 'lucide-react'
import { useSearch } from './hooks'
import { useSearchStore } from '@/stores/searchStore'
import { searchSuggestions } from './api'
import { VodGrid } from '@/components/vod/VodGrid'
import { EmptyState, ErrorState } from '@/components/ui/Status'
import type { VodItem } from '@/core/models'

// 热搜词
const HOT_SEARCHES = ['漫威', '周星驰', '三体', '流浪地球', '庆余年', '漫长的季节', '繁花', '狂飙']

// 快捷分类
const QUICK_CATEGORIES = [
  { key: 'movie', label: '电影', icon: Film, color: 'from-blue-500/20 to-blue-600/10' },
  { key: 'tv', label: '电视剧', icon: Tv, color: 'from-green-500/20 to-green-600/10' },
  { key: 'variety', label: '综艺', icon: Laugh, color: 'from-pink-500/20 to-pink-600/10' },
  { key: 'anime', label: '动漫', icon: Clapperboard, color: 'from-purple-500/20 to-purple-600/10' },
]

// 搜索建议组件
function SearchSuggestions({ keyword, onSelect, visible }: {
  keyword: string
  onSelect: (q: string) => void
  visible: boolean
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!keyword || keyword.length < 1 || !visible) {
      setSuggestions([])
      return
    }

    setLoading(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const results = await searchSuggestions(keyword)
      setSuggestions(results)
      setLoading(false)
    }, 150)

    return () => clearTimeout(timerRef.current)
  }, [keyword, visible])

  if (!visible || (!loading && suggestions.length === 0)) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-2 glass-card p-2 z-50 shadow-xl">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-muted">
          <Loader2 size={14} className="animate-spin" />
          搜索建议中...
        </div>
      ) : (
        suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="w-full text-left px-3 py-2 rounded-btn text-[13px] text-ink
              hover:bg-white/[0.06] hover:text-accent transition-all duration-120"
          >
            {s}
          </button>
        ))
      )}
    </div>
  )
}

// 热搜词组件
function HotSearches({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="mb-5">
      <h3 className="text-[13px] font-semibold text-ink mb-3">热门搜索</h3>
      <div className="flex flex-wrap gap-2">
        {HOT_SEARCHES.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="px-3 py-1.5 rounded-pill bg-white/[0.04] border border-white/[0.08] text-[12px] text-muted
              hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all duration-200"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

// 搜索历史组件
function SearchHistory({ onSelect }: { onSelect: (q: string) => void }) {
  const { history, removeHistory, clearHistory } = useSearchStore()

  if (history.length === 0) return null

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-ink">搜索历史</h3>
        <button
          onClick={clearHistory}
          className="flex items-center gap-1 text-[11px] text-muted hover:text-ink transition-colors"
        >
          <Trash2 size={12} />
          清除
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((q) => (
          <div key={q} className="flex items-center gap-1 px-3 py-1.5 rounded-pill bg-white/[0.04] border border-white/[0.08]">
            <button
              onClick={() => onSelect(q)}
              className="text-[12px] text-muted hover:text-accent transition-colors"
            >
              {q}
            </button>
            <button
              onClick={() => removeHistory(q)}
              className="text-muted/50 hover:text-ink transition-colors ml-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// 快捷分类组件
function QuickCategories({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="mb-5">
      <h3 className="text-[13px] font-semibold text-ink mb-3">快捷分类</h3>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {QUICK_CATEGORIES.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => onSelect(label)}
            className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-gradient-to-b ${color}
              border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 group`}
          >
            <Icon size={24} className="text-muted group-hover:text-accent transition-colors" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-muted group-hover:text-ink transition-colors">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

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
    if (queryParam) {
      setKeyword(queryParam)
      sessionStorage.setItem('sv_search_query', queryParam)
    }
  }, [queryParam])

  // Restore scroll position when returning to this page
  useEffect(() => {
    if (queryParam) {
      const savedScroll = sessionStorage.getItem('sv_search_scroll')
      if (savedScroll) {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(savedScroll, 10)))
      }
    }
  }, [queryParam])

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (queryParam) sessionStorage.setItem('sv_search_scroll', String(window.scrollY))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [queryParam])

  useEffect(() => {
    setActiveCat(currentCat)
  }, [currentCat])

  // Favorites only toggle - default to false (show all sources)
  const [favoritesOnly, setFavoritesOnly] = useState(() => {
    const saved = localStorage.getItem('tvcc_search_favorites_only')
    return saved === null ? false : saved === 'true'
  })

  const toggleFavoritesOnly = () => {
    const newValue = !favoritesOnly
    setFavoritesOnly(newValue)
    localStorage.setItem('tvcc_search_favorites_only', String(newValue))
  }

  const { data, isLoading, isError, error, refetch, isStreaming, searchProgress } = useSearch(keyword, favoritesOnly)
  const { addHistory } = useSearchStore()

  // Filter results by selected category
  const categoryItems = useMemo(() => {
    if (!data) return []
    return filterByCategory(data.items, activeCat)
  }, [data, activeCat])

  // Filter by language and type
  const [langFilter, setLangFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const finalItems = useMemo(() => {
    let items = categoryItems
    if (langFilter) items = items.filter((i) => (i.vodLang ?? '').includes(langFilter))
    if (typeFilter) items = items.filter((i) => (i.typeName ?? '').includes(typeFilter))
    return items
  }, [categoryItems, langFilter, typeFilter])

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

  // Language badges (instead of source badges)
  const langBadges = useMemo(() => {
    if (!data) return []
    const map = new Map<string, number>()
    for (const item of data.items) {
      const lang = item.vodLang?.trim()
      if (!lang) continue
      map.set(lang, (map.get(lang) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
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
      addHistory(q)
      setParams({ q, cat: activeCat === 'all' ? undefined : activeCat } as Record<string, string>)
    }
  }

  const handleSelectSearch = (q: string) => {
    setKeyword(q)
    addHistory(q)
    setParams({ q, cat: activeCat === 'all' ? undefined : activeCat } as Record<string, string>)
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
        <>
          <div className="relative mb-5">
            <form onSubmit={handleSearch} className="glass-input flex items-center">
              <Search size={18} className="text-muted ml-4" strokeWidth={1.5} />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="输入关键词搜索..."
                className="flex-1 bg-transparent border-none outline-none text-[15px] text-ink
                  placeholder:text-muted px-4 py-4"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 mr-2 rounded-lg bg-accent/15 text-accent text-[13px] font-medium
                  hover:bg-accent/25 transition-all duration-200"
              >
                搜索
              </button>
            </form>
            <SearchSuggestions
              keyword={keyword}
              onSelect={handleSelectSearch}
              visible={keyword.length > 0}
            />
          </div>
          <HotSearches onSelect={handleSelectSearch} />
          <SearchHistory onSelect={handleSelectSearch} />
          <QuickCategories onSelect={handleSelectSearch} />
        </>
      )}

      {/* Category tabs + Favorites toggle */}
      {queryParam && (
        <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto scrollbar-none">
          <button
            onClick={toggleFavoritesOnly}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-pill text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all duration-180
              ${favoritesOnly
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-muted border border-white/10 hover:text-ink-2 hover:border-white/20'
              }`}
          >
            <Heart size={12} fill={favoritesOnly ? 'currentColor' : 'none'} />
            常用片源
          </button>
          <div className="w-px h-4 bg-white/10" />
          {CATEGORIES.map((cat) => {
            const count = catCounts[cat.key] ?? 0
            const isActive = activeCat === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-pill text-[11px] sm:text-[12.5px] font-semibold
                  whitespace-nowrap transition-all duration-180
                  ${isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-muted border border-transparent hover:text-ink-2 hover:bg-white/[0.04]'
                  }`}
              >
                {cat.label}
                {count > 0 && (
                  <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full ${isActive ? 'bg-accent/20' : 'bg-white/[0.06]'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Language + Type filter badges */}
      {queryParam && data && data.items.length > 0 && (
        <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
          {langBadges.length > 1 && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-[11px] text-muted/60 mr-0.5 sm:mr-1">语言:</span>
              {langBadges.map(([lang, count]) => {
                const isActive = langFilter === lang
                return (
                  <button
                    key={lang}
                    onClick={() => setLangFilter(isActive ? null : lang)}
                    className={`pill text-[10px] sm:text-[11px] cursor-pointer transition-all duration-150
                      ${isActive ? '!bg-accent/15 !border-accent/30 !text-accent' : 'hover:border-white/20'}`}
                  >
                    {lang}
                    <span className="ml-0.5 sm:ml-1 opacity-60">{count}</span>
                  </button>
                )
              })}
              {langFilter && (
                <button onClick={() => setLangFilter(null)} className="text-[9px] sm:text-[10px] text-muted hover:text-ink-2 ml-0.5 sm:ml-1">清除</button>
              )}
            </div>
          )}
          {typeBadges.length > 1 && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-[11px] text-muted/60 mr-0.5 sm:mr-1">类型:</span>
              {typeBadges.map(([t, count]) => {
                const isActive = typeFilter === t
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(isActive ? null : t)}
                    className={`pill text-[10px] sm:text-[11px] cursor-pointer transition-all duration-150
                      ${isActive ? '!bg-accent/15 !border-accent/30 !text-accent' : 'hover:border-white/20'}`}
                  >
                    {t}
                    <span className="ml-0.5 sm:ml-1 opacity-60">{count}</span>
                  </button>
                )
              })}
              {typeFilter && (
                <button onClick={() => setTypeFilter(null)} className="text-[9px] sm:text-[10px] text-muted hover:text-ink-2 ml-0.5 sm:ml-1">清除</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search progress indicator - show during loading */}
      {queryParam && searchProgress && searchProgress.total > 0 && (
        <div className="flex items-center justify-center gap-2 mb-4 py-2 px-4 rounded-lg bg-accent/5 border border-accent/10">
          <Loader2 size={14} className="animate-spin text-accent" />
          <span className="text-[12px] text-accent font-medium">
            正在搜索 {searchProgress.searched}/{searchProgress.total} 个片源
          </span>
          <div className="flex-1 max-w-[100px] h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${(searchProgress.searched / searchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {!queryParam ? (
        <EmptyState message="输入关键词开始搜索" />
      ) : isError && !data ? (
        <ErrorState
          message={(error as Error)?.message ?? '搜索失败'}
          onRetry={() => refetch()}
        />
      ) : isLoading && !data ? (
        <VodGrid items={[]} loading />
      ) : (
        <>
          <VodGrid items={finalItems} mergeDuplicates />
        </>
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
