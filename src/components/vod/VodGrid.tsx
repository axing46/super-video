import { useMemo } from 'react'
import type { VodItem } from '@/core/models'
import { VodCard, VodCardSkeleton } from './VodCard'

interface VodGridProps {
  items: VodItem[]
  loading?: boolean
  /** Card layout: 'landscape' for YouTube-style, 'poster' for vertical */
  layout?: 'poster' | 'landscape'
  /** Merge items with same name into one card */
  mergeDuplicates?: boolean
}

// Normalize name for grouping
function normalizeForGrouping(name: string): string {
  return (name || '')
    .replace(/\s+/g, '')
    .replace(/[第季集期部]/g, '')
    .replace(/\d+$/g, '')
    .replace(/[^a-zA-Z0-9一-鿿]/g, '')
    .toLowerCase()
}

// Merge items with same name, keep the one with best image
function mergeDuplicateItems(items: VodItem[]): { item: VodItem; sourceCount: number }[] {
  const groups = new Map<string, VodItem[]>()

  for (const item of items) {
    const key = normalizeForGrouping(item.vodName || '')
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  }

  return Array.from(groups.entries()).map(([, group]) => {
    // Pick the item with the best image (longest URL usually means higher quality)
    const bestItem = group.sort((a, b) => (b.vodPic?.length || 0) - (a.vodPic?.length || 0))[0]
    return {
      item: bestItem,
      sourceCount: group.length
    }
  })
}

export function VodGrid({ items, loading, layout = 'landscape', mergeDuplicates = false }: VodGridProps) {
  // Merge duplicates if requested
  const displayItems = useMemo(() => {
    if (!mergeDuplicates) {
      return items.map(item => ({ item, sourceCount: 1 }))
    }
    return mergeDuplicateItems(items)
  }, [items, mergeDuplicates])

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
      {displayItems.map(({ item, sourceCount }) => (
        <div key={`${item.sourceKey}-${item.vodId}`} className="animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <VodCard item={item} layout={layout} sourceCount={sourceCount} />
        </div>
      ))}
    </div>
  )
}
