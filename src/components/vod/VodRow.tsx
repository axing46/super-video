import type { VodItem, DoubanItem } from '@/core/models'
import { VodCard, VodCardSkeleton } from './VodCard'

interface VodRowProps {
  title: string
  items: VodItem[]
  loading?: boolean
  emptyMessage?: string
}

export function VodRow({ title, items, loading, emptyMessage }: VodRowProps) {
  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[19px] font-bold text-ink tracking-tight">{title}</h2>
      </div>

      {/* Content */}
      {loading ? (
        <div className="scroll-row">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-[160px] flex-shrink-0">
              <VodCardSkeleton />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-muted py-6">{emptyMessage ?? '暂无数据'}</p>
      ) : (
        <div className="scroll-row">
          {items.map((item) => (
            <div key={`${item.sourceKey}-${item.vodId}`} className="w-[160px] flex-shrink-0">
              <VodCard item={item} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Douban variant — uses DoubanItem instead of VodItem ─────

interface DoubanRowProps {
  title: string
  items: DoubanItem[]
  loading?: boolean
}

export function DoubanRow({ title, items, loading }: DoubanRowProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[19px] font-bold text-ink tracking-tight">{title}</h2>
      </div>

      {loading ? (
        <div className="scroll-row">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-[160px] flex-shrink-0">
              <VodCardSkeleton />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-muted py-6">暂无数据</p>
      ) : (
        <div className="scroll-row">
          {items.map((item) => (
            <DoubanCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

function DoubanCard({ item }: { item: DoubanItem }) {
  return (
    <a
      href={`https://movie.douban.com/subject/${item.id}/`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-[160px] flex-shrink-0 rounded-tile overflow-hidden
        transition-all duration-220 ease-out-expo hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="aspect-[2/3] bg-hair rounded-tile overflow-hidden">
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-450 ease-out-expo
              group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-sm">
            暂无封面
          </div>
        )}
        {item.rate && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5
            rounded-pill bg-black/60 backdrop-blur-md text-[11px] font-semibold text-champagne">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#f4d28a"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            {item.rate}
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <h3 className="text-[13.5px] font-bold text-ink leading-snug line-clamp-1
          group-hover:text-white transition-colors duration-180">
          {item.title}
        </h3>
        {item.year && (
          <span className="text-[11px] text-muted font-medium">{item.year}</span>
        )}
      </div>
    </a>
  )
}
