import { useNavigate } from 'react-router-dom'
import { useFavorites } from './hooks'
import { EmptyState } from '@/components/ui/Status'
import { useToast } from '@/components/ui/Toast'
import type { VodItem, FavoriteItem } from '@/core/models'

function toVodItem(f: FavoriteItem): VodItem {
  return {
    sourceKey: f.sourceKey,
    vodId: f.vodId,
    vodName: f.vodName,
    vodPlayUrl: '',
    vodPic: f.vodPic,
    vodRemarks: f.vodRemarks,
    vodActor: f.vodActor,
    vodDirector: f.vodDirector,
    vodContent: f.vodContent,
  }
}

export function FavoritesPage() {
  const { favorites, toggleFavorite } = useFavorites()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleRemove = (e: React.MouseEvent, item: FavoriteItem) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(item)
    toast(`已取消收藏 · ${item.vodName}`, 'success')
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-ink">我的收藏</h2>
      </div>

      {favorites.length === 0 ? (
        <EmptyState message="还没有收藏任何内容" />
      ) : (
        <div className="space-y-3">
          {favorites.map((item) => (
            <div
              key={`${item.sourceKey}-${item.vodId}`}
              className="glass-card p-4 flex items-center gap-4 group cursor-pointer"
              onClick={() => navigate(`/detail/${encodeURIComponent(item.sourceKey)}/${encodeURIComponent(item.vodId)}`, { state: { item: toVodItem(item) } })}
            >
              {/* Thumb */}
              <div className="w-12 h-16 rounded-cover-sm bg-hair overflow-hidden flex-shrink-0">
                {item.vodPic && (
                  <img
                    src={item.vodPic}
                    alt={item.vodName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-ink truncate">{item.vodName}</h3>
                {item.vodRemarks && (
                  <span className="text-[11px] text-muted">{item.vodRemarks}</span>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => handleRemove(e, item)}
                className="text-[12px] text-muted hover:text-red-400 transition-colors duration-180 opacity-0 group-hover:opacity-100"
              >
                取消收藏
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
