import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Star, Heart, Clock, AlertTriangle } from 'lucide-react'
import { useDetail } from './hooks'
import { parsePlayUrl } from './api'
import { useFavorites } from '@/features/favorites/hooks'
import { Loading, ErrorState } from '@/components/ui/Status'
import { proxyImageUrl } from '@/utils/proxy'
import type { VodItem } from '@/core/models'

export function DetailPage() {
  const { sourceKey, vodId } = useParams<{ sourceKey: string; vodId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Try to get data from navigation state first (from search results)
  const stateItem = (location.state as { item?: VodItem } | null)?.item

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

  const sources = parsePlayUrl(data.vodPlayUrl)
  const favorited = isFavorited(data.sourceKey, data.vodId)

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
      <div className="glass-card p-6 lg:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Poster */}
        <div className="w-full md:w-[280px] flex-shrink-0">
          {data.vodPic ? (
            <img
              src={proxyImageUrl(data.vodPic)}
              alt={data.vodName}
              className="w-full aspect-[2/3] object-cover rounded-cover"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-hair rounded-cover flex items-center justify-center text-muted text-sm">
              暂无封面
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[clamp(24px,3vw,36px)] font-display font-extrabold text-ink tracking-tight leading-tight">
            {data.vodName}
          </h1>

          {/* Meta tags */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {data.typeName && <span className="pill">{data.typeName}</span>}
            {data.vodYear && <span className="pill">{data.vodYear}</span>}
            {data.vodArea && <span className="pill">{data.vodArea}</span>}
            {data.vodClass && <span className="pill">{data.vodClass}</span>}
            {data.vodLang && <span className="pill">{data.vodLang}</span>}
            {data.vodDuration && (
              <span className="pill flex items-center gap-1">
                <Clock size={11} /> {data.vodDuration}
              </span>
            )}
          </div>

          {/* Rating */}
          {data.vodRemarks && (
            <div className="flex items-center gap-1.5 mt-4 text-champagne">
              <Star size={18} fill="#f4d28a" strokeWidth={0} />
              <span className="text-[16px] font-bold">{data.vodRemarks}</span>
            </div>
          )}

          {/* Description */}
          {data.vodContent && (
            <p className="mt-4 text-[13.5px] text-ink-2 leading-relaxed line-clamp-5">
              {data.vodContent}
            </p>
          )}

          {/* Director / Actor */}
          <div className="mt-4 space-y-1.5">
            {data.vodDirector && (
              <div className="text-[13px]">
                <span className="text-muted">导演：</span>
                <span className="text-ink-2">{data.vodDirector}</span>
              </div>
            )}
            {data.vodActor && (
              <div className="text-[13px]">
                <span className="text-muted">演员：</span>
                <span className="text-ink-2">{data.vodActor}</span>
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
            className={`mt-5 flex items-center gap-2 px-5 py-2.5 rounded-btn text-[13px] font-semibold
              transition-all duration-180 border
              ${favorited
                ? 'bg-champagne/10 border-champagne/40 text-champagne'
                : 'border-white/10 bg-white/[0.04] text-ink-2 hover:border-accent/30 hover:text-accent'
              }`}
          >
            <Heart size={15} fill={favorited ? '#f4d28a' : 'none'} />
            {favorited ? '已收藏' : '收藏'}
          </button>
        </div>
      </div>

      {/* Episodes */}
      {sources.length > 0 ? (
        <div className="mt-8">
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
                      navigate(`/play/${sk}/${vid}?src=${si}&ep=${ei}`)
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
