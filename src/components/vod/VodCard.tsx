import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Film, Play } from 'lucide-react'
import type { VodItem } from '@/core/models'
import { proxyImageUrl } from '@/utils/proxy'
import { getSourceDisplayName } from '@/utils/source-names'

interface VodCardProps {
  item: VodItem
  /** 'poster' = vertical card, 'landscape' = YouTube-style horizontal card */
  layout?: 'poster' | 'landscape'
}

export function VodCard({ item, layout = 'landscape' }: VodCardProps) {
  const [imgError, setImgError] = useState(false)

  if (layout === 'landscape') {
    // YouTube-style horizontal card
    return (
      <Link
        to={`/detail/${encodeURIComponent(item.sourceKey)}/${encodeURIComponent(item.vodId)}`}
        state={{ item }}
        onClick={() => sessionStorage.setItem('sv_search_scroll', String(window.scrollY))}
        className="group cursor-pointer hover:-translate-y-0.5 transition-transform duration-200 ease-out block"
      >
        <div className="flex flex-col gap-2">
          {/* Thumbnail */}
          <div className="relative bg-hair rounded-xl overflow-hidden aspect-video">
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
                <Film size={32} strokeWidth={1} />
                <span className="text-[10px] truncate max-w-[90%]">{item.vodName}</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-1 left-1 right-1 z-10 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                {item.sourceKey && (
                  <span className="pill max-w-[50%] truncate !bg-accent !text-white !border-accent text-[8px] px-1.5 py-0.5">
                    {getSourceDisplayName(item.sourceKey)}
                  </span>
                )}
              </div>
              {item.vodRemarks && /^[\d.]+$/.test(item.vodRemarks.trim()) && (
                <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white">
                  <Star size={8} fill="#f4d28a" strokeWidth={0} />
                  {item.vodRemarks}
                </span>
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Play size={28} className="text-white/90" />
            </div>
          </div>

          {/* Info */}
          <div className="px-0.5">
            <h4 className="font-medium text-[12px] text-ink line-clamp-2 mb-0.5 group-hover:text-accent transition-colors">
              {item.vodName}
            </h4>
            <div className="flex items-center gap-1.5 text-[10px] text-muted">
              {item.vodYear && <span>{item.vodYear}</span>}
              {item.typeName && <span>· {item.typeName}</span>}
              {item.vodLang && <span>· {item.vodLang}</span>}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Poster layout (vertical card)
  return (
    <Link
      to={`/detail/${encodeURIComponent(item.sourceKey)}/${encodeURIComponent(item.vodId)}`}
      state={{ item }}
      onClick={() => sessionStorage.setItem('sv_search_scroll', String(window.scrollY))}
      className="group cursor-pointer hover:-translate-y-0.5 transition-transform duration-200 ease-out block"
    >
      <div className="glass-card p-0 flex flex-col" style={{ backfaceVisibility: 'hidden' }}>
        {/* Poster */}
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

          {/* Badges */}
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

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
            <div className="text-white/90 text-[10px]">
              {item.vodYear && <span>{item.vodYear}</span>}
              {item.vodActor && <span className="block text-white/60 truncate">{item.vodActor}</span>}
            </div>
          </div>
        </div>

        {/* Info */}
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
    <div className="glass-card p-0 overflow-hidden">
      <div className="aspect-video skeleton rounded-card" />
      <div className="p-2 space-y-1.5">
        <div className="h-3.5 skeleton w-3/4" />
        <div className="h-2.5 skeleton w-1/2" />
      </div>
    </div>
  )
}
