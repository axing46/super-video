import type { VodItem } from '@/core/models'
import { VodCard, VodCardSkeleton } from './VodCard'

interface VodGridProps {
  items: VodItem[]
  loading?: boolean
  /** Card layout: 'landscape' for YouTube-style, 'poster' for vertical */
  layout?: 'poster' | 'landscape'
}

export function VodGrid({ items, loading, layout = 'landscape' }: VodGridProps) {
  // YouTube-style: more columns, landscape cards
  // Poster style: fewer columns, vertical cards
  const gridClass = layout === 'landscape'
    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4'
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3'

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 12 }).map((_, i) => (
          <VodCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClass}>
      {items.map((item) => (
        <div key={`${item.sourceKey}-${item.vodId}`} className="animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <VodCard item={item} layout={layout} />
        </div>
      ))}
    </div>
  )
}
