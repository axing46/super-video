import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Film, Play, Layers } from 'lucide-react'
import type { VodItem } from '@/core/models'
import { proxyImageUrl } from '@/utils/proxy'
import { getSourceDisplayName } from '@/utils/source-names'

interface VodCardProps {
  item: VodItem
  /** 'poster' = vertical card, 'landscape' = YouTube-style horizontal card */
  layout?: 'poster' | 'landscape'
  /** Number of sources with same name */
  sourceCount?: number
}

export function VodCard({ item, layout = 'landscape', sourceCount }: VodCardProps) {
  const [imgError, setImgError] = useState(false)

  if (layout === 'landscape') {
    return (
      <Link
        to={`/detail/${encodeURIComponent(item.sourceKey)}/${encodeURIComponent(item.vodId)}`}
        state={{ item }}
        onClick={() => sessionStorage.setItem('sv_search_scroll', String(window.scrollY))}
        className="group cursor-pointer hover:-translate-y-0.5 transition-transform duration-200 ease-out block"
      >
        {/* Mobile: horizontal compact card | Tablet/Desktop: vertical card with landscape thumbnail */}
        <div className="flex gap-2.5 sm:flex-col sm:gap-2">
          {/* Thumbnail - mobile: small fixed size, tablet+: full width */}
          <div className="relative bg-hair rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0
            w-[130px] h-[75px] sm:w-full sm:h-auto sm:aspect-video">
            {item.vodPic && !imgError ? (
              <img
                src={proxyImageUrl(item.vodPic)}
                alt={item.vodName}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted/40">
                <Film size={24} strokeWidth={1} />
                <span className="text-[8px] sm:text-[10px] truncate max-w-[90%]">{item.vodName}</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-0.5 left-0.5 right-0.5 sm:top-1 sm:left-1 sm:right-1 z-10 flex items-center justify-between gap-0.5">
              <div className="flex items-center gap-0.5 min-w-0">
                {sourceCount && sourceCount > 1 ? (
                  <span className="flex items-center gap-0.5 pill max-w-[60%] truncate !bg-purple-500/80 !text-white !border-purple-400/50 text-[7px] sm:text-[8px] px-1 py-0.5 sm:px-1.5">
                    <Layers size={8} />
                    {sourceCount}个源
                  </span>
                ) : item.sourceKey && (
                  <span className="pill max-w-[50%] truncate !bg-accent !text-white !border-accent text-[7px] sm:text-[8px] px-1 py-0.5 sm:px-1.5">
                    {getSourceDisplayName(item.sourceKey)}
                  </span>
                )}
              </div>
              {item.vodRemarks && /^[\d.]+$/.test(item.vodRemarks.trim()) && (
                <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/60 text-[8px] sm:text-[9px] font-bold text-white">
                  <Star size={7} fill="#f4d28a" strokeWidth={0} />
                  {item.vodRemarks}
                </span>
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Play size={24} className="text-white/90" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 sm:px-0.5">
            <h4 className="font-medium text-[11px] sm:text-[12px] text-ink line-clamp-2 mb-0.5 group-hover:text-accent transition-colors">
              {item.vodName}
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 text-[9px] sm:text-[10px] text-muted">
              {/* Mobile: show source + year in compact row */}
              <span className="sm:hidden truncate">
                {getSourceDisplayName(item.sourceKey)}
                {item.vodYear && ` · ${item.vodYear}`}
              </span>
              {/* Tablet/Desktop: show full info */}
              <span className="hidden sm:inline">{item.vodYear}</span>
              {item.typeName && <span className="hidden sm:inline">· {item.typeName}</span>}
              {item.vodLang && <span className="hidden sm:inline">· {item.vodLang}</span>}
            </div>
            {item.vodActor && (
              <p className="hidden md:block text-[9px] text-muted/70 mt-0.5 truncate">{item.vodActor}</p>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // Poster layout (vertical card) - tablet/desktop only
  return (
    <Link
      to={`/detail/${encodeURIComponent(item.sourceKey)}/${encodeURIComponent(item.vodId)}`}
      state={{ item }}
      onClick={() => sessionStorage.setItem('sv_search_scroll', String(window.scrollY))}
      className="group cursor-pointer hover:-translate-y-0.5 transition-transform duration-200 ease-out block"
    >
      <div className="glass-card p-0 flex flex-col" style={{ backfaceVisibility: 'hidden' }}>
        <div className="relative bg-hair rounded-card overflow-hidden aspect-[2/3]">
          {item.vodPic && !imgError ? (
            <img
              src={proxyImageUrl(item.vodPic)}
              alt={item.vodName}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted/40">
              <Film size={48} strokeWidth={1} />
              <span className="text-xs">{item.vodName}</span>
            </div>
          )}

          <div className="absolute top-1.5 left-1.5 right-1.5 z-10 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              {item.sourceKey && (
                <span className="pill max-w-[50%] truncate !bg-accent !text-white !border-accent text-[8px] px-1.5 py-0.5">
                  {getSourceDisplayName(item.sourceKey)}
                </span>
              )}
              {item.typeName && (
                <span className="pill max-w-[40%] truncate text-[8px] px-1.5 py-0.5">
                  {item.typeName}
                </span>
              )}
            </div>
          </div>

          {item.vodRemarks && /^[\d.]+$/.test(item.vodRemarks.trim()) && (
            <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-pill bg-black/60 text-[9px] font-bold text-white">
              <Star size={9} fill="#f4d28a" strokeWidth={0} />
              {item.vodRemarks}
            </div>
          )}

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
            <div className="text-white/90 text-[10px]">
              {item.vodYear && <span>{item.vodYear}</span>}
              {item.vodActor && <span className="block text-white/60 truncate">{item.vodActor}</span>}
            </div>
          </div>
        </div>

        <div className="p-2 flex-1 flex flex-col">
          <h4 className="font-semibold text-[11px] text-ink line-clamp-2 min-h-[2rem] mb-0.5">
            {item.vodName}
          </h4>
          {item.vodLang && (
            <p className="text-[9px] text-muted mt-auto">{item.vodLang}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

export function VodCardSkeleton() {
  return (
    <div className="flex gap-2.5 sm:flex-col sm:gap-2">
      <div className="w-[130px] h-[75px] sm:w-full sm:aspect-video skeleton rounded-lg sm:rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-1.5 py-0.5 sm:px-0.5">
        <div className="h-3 skeleton w-3/4" />
        <div className="h-2.5 skeleton w-1/2 hidden sm:block" />
      </div>
    </div>
  )
}
