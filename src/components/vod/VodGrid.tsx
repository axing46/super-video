import type { VodItem } from '@/core/models'
import { VodCard, VodCardSkeleton } from './VodCard'

interface VodGridProps {
  items: VodItem[]
  loading?: boolean
}

export function VodGrid({ items, loading }: VodGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <VodCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {items.map((item) => (
        <div key={`${item.sourceKey}-${item.vodId}`} className="animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <VodCard item={item} />
        </div>
      ))}
    </div>
  )
}
