import { useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Star, Heart, Clock, AlertTriangle, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { useDetail } from './hooks'
import { parsePlayUrl } from './api'
import { useFavorites } from '@/features/favorites/hooks'
import { getFavoriteSourceKeys } from '@/features/sources/favorites'
import { Loading, ErrorState } from '@/components/ui/Status'
import { proxyImageUrl } from '@/utils/proxy'
import { getSourceDisplayName } from '@/utils/source-names'
import type { VodItem } from '@/core/models'

const INITIAL_SOURCES_SHOW = 4

export function DetailPage() {
  const { sourceKey, vodId } = useParams<{ sourceKey: string; vodId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [showAllSources, setShowAllSources] = useState(false)
  const [selectedSourceKey, setSelectedSourceKey] = useState<string | null>(null)

  // Try to get data from navigation state first (from search results)
  const state = location.state as { item?: VodItem; allItems?: VodItem[] } | null
  const stateItem = state?.item
  const allItems = state?.allItems ?? []

  const decodedSourceKey = decodeURIComponent(sourceKey ?? '')
  const decodedVodId = decodeURIComponent(vodId ?? '')

  // Only skip API fetch if state item has complete data (including playUrl for episodes)
  const skipFetch = !!(
    stateItem &&
    stateItem.sourceKey === decodedSourceKey &&
    stateItem.vodId === decodedVodId &&
    stateItem.vodPlayUrl // Must have episode data to skip API call
  )

  const { data: fetchedData, isLoading, isError, error, refetch } = useDetail(
    decodedSourceKey,
    decodedVodId,
    skipFetch,
  )

  const data = skipFetch ? stateItem! : fetchedData
  const { isFavorited, toggleFavorite } = useFavorites()

  // Deduplicate sources by sourceKey, sort favorites first
  const allSources = useMemo(() => {
    const sources = allItems.length > 1 ? allItems : (data ? [data] : [])
    if (sources.length <= 1) return sources

    const favoriteKeys = getFavoriteSourceKeys()
    const currentKey = selectedSourceKey || data?.sourceKey

    // Deduplicate by sourceKey
    const seen = new Set<string>()
    const deduped: VodItem[] = []
    for (const src of sources) {
      if (!seen.has(src.sourceKey)) {
        seen.add(src.sourceKey)
        deduped.push(src)
      }
    }

    // Sort: selected source first, then favorites, then others
    return deduped.sort((a, b) => {
      if (a.sourceKey === currentKey) return -1
      if (b.sourceKey === currentKey) return 1

      const aFav = favoriteKeys.includes(a.sourceKey) ? 0 : 1
      const bFav = favoriteKeys.includes(b.sourceKey) ? 0 : 1
      return aFav - bFav
    })
  }, [allItems, data, selectedSourceKey])

  if (isLoading) return <Loading />
  if (isError) return (
    <ErrorState message={(error as Error)?.message ?? '加载详情失败'} onRetry={() => refetch()} />
  )
  if (!data) {
    return (
      <div className="max-w-[1000px] mx-auto">
        <button onClick={() => navigate(-1)} className="icon-btn mb-6 w-10 h-10">
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <ErrorState message="未找到影视信息。请先导入片源，然后从搜索结果进入详情页。" />
      </div>
    )
  }

  // Get the currently selected source data
  const currentSourceData = selectedSourceKey
    ? allSources.find(s => s.sourceKey === selectedSourceKey) || data
    : data

  const sources = parsePlayUrl(currentSourceData.vodPlayUrl)
  const favorited = isFavorited(currentSourceData.sourceKey, currentSourceData.vodId)

  return (
    <div className="max-w-3xl mx-auto animate-fade-up">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="icon-btn mb-6 w-10 h-10"
      >
        <ArrowLeft size={18} strokeWidth={1.5} />
      </button>

      {/* Data freshness warning (when using cached state data) */}
      {skipFetch && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-btn bg-amber-400/5 border border-amber-400/15
          text-[12px] text-amber-400/80">
          <AlertTriangle size={14} />
          显示的是搜索结果缓存的数据，剧集列表可能不完整。
          <button onClick={() => refetch()} className="underline hover:text-amber-400 ml-auto">
            刷新获取完整详情
          </button>
        </div>
      )}

      {/* Hero section */}
      <div className="glass-card p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8">
        {/* Poster - mobile: smaller, tablet+: full size */}
        <div className="w-[120px] sm:w-[180px] md:w-[220px] lg:w-[280px] flex-shrink-0 mx-auto sm:mx-0">
          {data.vodPic ? (
            <img
              src={proxyImageUrl(data.vodPic)}
              alt={data.vodName}
              className="w-full aspect-[2/3] object-cover rounded-lg sm:rounded-cover"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-hair rounded-lg sm:rounded-cover flex items-center justify-center text-muted text-xs sm:text-sm">
              暂无封面
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[18px] sm:text-[22px] md:text-[28px] lg:text-[36px] font-display font-extrabold text-ink tracking-tight leading-tight">
            {data.vodName}
          </h1>

          {/* Meta tags */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
            {data.typeName && <span className="pill text-[10px] sm:text-[11px]">{data.typeName}</span>}
            {data.vodYear && <span className="pill text-[10px] sm:text-[11px]">{data.vodYear}</span>}
            {data.vodArea && <span className="pill text-[10px] sm:text-[11px]">{data.vodArea}</span>}
            {data.vodClass && <span className="pill text-[10px] sm:text-[11px] hidden sm:inline-flex">{data.vodClass}</span>}
            {data.vodLang && <span className="pill text-[10px] sm:text-[11px]">{data.vodLang}</span>}
            {data.vodDuration && (
              <span className="pill text-[10px] sm:text-[11px] flex items-center gap-1">
                <Clock size={10} /> {data.vodDuration}
              </span>
            )}
          </div>

          {/* Rating */}
          {data.vodRemarks && (
            <div className="flex items-center gap-1.5 mt-3 sm:mt-4 text-champagne">
              <Star size={14} sm:size={18} fill="#f4d28a" strokeWidth={0} />
              <span className="text-[14px] sm:text-[16px] font-bold">{data.vodRemarks}</span>
            </div>
          )}

          {/* Description */}
          {data.vodContent && (
            <p className="mt-3 sm:mt-4 text-[12px] sm:text-[13.5px] text-ink-2 leading-relaxed line-clamp-3 sm:line-clamp-5">
              {data.vodContent}
            </p>
          )}

          {/* Director / Actor */}
          <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-1.5">
            {data.vodDirector && (
              <div className="text-[12px] sm:text-[13px]">
                <span className="text-muted">导演：</span>
                <span className="text-ink-2">{data.vodDirector}</span>
              </div>
            )}
            {data.vodActor && (
              <div className="text-[12px] sm:text-[13px]">
                <span className="text-muted">演员：</span>
                <span className="text-ink-2 line-clamp-1">{data.vodActor}</span>
              </div>
            )}
          </div>

          {/* Favorite button */}
          <button
            onClick={() =>
              toggleFavorite({
                vodId: data.vodId,
                sourceKey: data.sourceKey,
                vodName: data.vodName,
                createdTime: Date.now(),
                vodPic: data.vodPic,
                vodRemarks: data.vodRemarks,
                vodActor: data.vodActor,
                vodDirector: data.vodDirector,
                vodContent: data.vodContent,
              })
            }
            className={`mt-4 sm:mt-5 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-btn text-[12px] sm:text-[13px] font-semibold
              transition-all duration-180 border
              ${favorited
                ? 'bg-champagne/10 border-champagne/40 text-champagne'
                : 'border-white/10 bg-white/[0.04] text-ink-2 hover:border-accent/30 hover:text-accent'
              }`}
          >
            <Heart size={13} sm:size={15} fill={favorited ? '#f4d28a' : 'none'} />
            {favorited ? '已收藏' : '收藏'}
          </button>
        </div>
      </div>

      {/* Multi-source info */}
      {allSources.length > 1 && (
        <div className="mt-6 glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={16} className="text-accent" />
            <h3 className="text-[14px] font-semibold text-ink">可用片源 ({allSources.length}个)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Show initial sources or all */}
            {(showAllSources ? allSources : allSources.slice(0, INITIAL_SOURCES_SHOW)).map((src, idx) => {
              const favoriteKeys = getFavoriteSourceKeys()
              const isFavorite = favoriteKeys.includes(src.sourceKey)
              const isActive = src.sourceKey === currentSourceData.sourceKey
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedSourceKey(src.sourceKey)}
                  className={`px-3 py-1.5 rounded-btn text-[11px] font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : isFavorite
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:border-amber-500/40'
                        : 'bg-white/[0.04] border border-white/[0.06] text-muted hover:text-ink hover:border-accent/20'
                    }`}
                >
                  {isFavorite && '⭐ '}
                  {getSourceDisplayName(src.sourceKey)}
                </button>
              )
            })}
          </div>
          {/* Show expand/collapse button if more sources */}
          {allSources.length > INITIAL_SOURCES_SHOW && (
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="flex items-center gap-1 mt-3 text-[12px] text-muted hover:text-accent transition-colors"
            >
              {showAllSources ? (
                <><ChevronUp size={14} /> 收起片源</>
              ) : (
                <><ChevronDown size={14} /> 展开更多片源 ({allSources.length - INITIAL_SOURCES_SHOW}个)</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Episodes */}
      {sources.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-[19px] font-bold text-ink mb-4">选集</h2>
          {sources.map((source, si) => (
            <div key={si} className="mb-6">
              {sources.length > 1 && (
                <h3 className="text-[13px] text-muted font-medium mb-3">{source.name}</h3>
              )}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {source.episodes.map((ep, ei) => (
                  <button
                    key={ei}
                    onClick={() => {
                      const sk = encodeURIComponent(data.sourceKey)
                      const vid = encodeURIComponent(data.vodId)
                      navigate(`/play/${sk}/${vid}?src=${si}&ep=${ei}`, {
                        state: { allItems: allSources }
                      })
                    }}
                    className="px-3 py-2 rounded-btn text-[12px] font-medium text-ink-2
                      bg-white/[0.04] border border-white/[0.06]
                      hover:border-accent/30 hover:text-accent hover:bg-accent/[0.06]
                      transition-all duration-180 truncate"
                    title={ep.name}
                  >
                    {ep.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : skipFetch ? (
        <div className="mt-8 text-center py-12">
          <p className="text-[13px] text-muted">
            搜索结果未包含剧集列表。
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 rounded-btn border border-accent/30 text-[13px] text-accent
              hover:bg-accent/10 transition-all duration-180"
          >
            从片源获取完整详情
          </button>
        </div>
      ) : (
        <div className="mt-8 text-center py-12">
          <p className="text-[13px] text-muted">暂无剧集信息</p>
        </div>
      )}
    </div>
  )
}
