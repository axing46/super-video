import type { VodItem } from '@/core/models'
import { VodCard, VodCardSkeleton } from './VodCard'

interface VodGridProps {
  items: VodItem[]
  loading?: boolean
  /** Card layout: 'landscape' for YouTube-style, 'poster' for vertical */
  layout?: 'poster' | 'landscape'
}

export function VodGrid({ items, loading, layout = 'landscape' }: VodGridProps) {
  // Mobile (<640px): YouTube-style list (single column, horizontal cards)
  // Tablet (640-1024px): Grid with more columns
  // Desktop (>1024px): Keep original grid layout
  const gridClass = layout === 'landscape'
    ? 'flex flex-col gap-2 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-3 md:gap-4'
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
