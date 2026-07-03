import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Film } from 'lucide-react'
import type { VodItem } from '@/core/models'
import { proxyImageUrl } from '@/utils/proxy'
import { getSourceDisplayName } from '@/utils/source-names'

interface VodCardProps {
  item: VodItem
  aspect?: 'poster' | 'landscape'
}

export function VodCard({ item, aspect = 'poster' }: VodCardProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <Link
      to={`/detail/${encodeURIComponent(item.sourceKey)}/${encodeURIComponent(item.vodId)}`}
      state={{ item }}
      className="group cursor-pointer hover:-translate-y-0.5 transition-transform duration-200 ease-out block"
    >
      <div className="glass-card p-0 flex flex-col" style={{ backfaceVisibility: 'hidden' }}>
        {/* Poster */}
        <div className={`relative bg-hair rounded-card overflow-hidden ${aspect === 'poster' ? 'aspect-[2/3]' : 'aspect-[16/9]'}`}>
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

          {/* Badges — top left */}
          <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              {item.sourceKey && (
                <span className="pill max-w-[50%] truncate !bg-accent !text-white !border-accent">
                  {getSourceDisplayName(item.sourceKey)}
                </span>
              )}
              {item.typeName && (
                <span className="pill max-w-[40%] truncate text-[10px]">
                  {item.typeName}
                </span>
              )}
            </div>
          </div>

          {/* Rating badge — top right */}
          {item.vodRemarks && /^[\d.]+$/.test(item.vodRemarks.trim()) && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-pill bg-black/60 text-[10px] font-bold text-white">
              <Star size={10} fill="#f4d28a" strokeWidth={0} />
              {item.vodRemarks}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
            <div className="text-white/90 text-xs">
              {item.vodYear && <span>{item.vodYear}</span>}
              {item.vodActor && <span className="block text-white/60 truncate">{item.vodActor}</span>}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 flex-1 flex flex-col">
          <h4 className="font-semibold text-[13px] text-ink line-clamp-2 min-h-[2.5rem] mb-1">
            {item.vodName}
          </h4>
          {item.vodLang && (
            <p className="text-[11px] text-muted mt-auto">{item.vodLang}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

export function VodCardSkeleton() {
  return (
    <div className="glass-card p-0 overflow-hidden">
      <div className="aspect-[2/3] skeleton rounded-card" />
      <div className="p-3 space-y-2">
        <div className="h-4 skeleton w-3/4" />
        <div className="h-3 skeleton w-1/2" />
      </div>
    </div>
  )
}
