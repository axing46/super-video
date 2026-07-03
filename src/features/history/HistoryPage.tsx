import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useHistory } from './hooks'
import { EmptyState } from '@/components/ui/Status'
import { timeAgo } from '@/utils/format'
import type { VodItem, WatchHistoryItem } from '@/core/models'

function toVodItem(h: WatchHistoryItem): VodItem {
  return {
    sourceKey: h.sourceKey,
    vodId: h.vodId,
    vodName: h.vodName,
    vodPlayUrl: '',
    vodPic: h.vodPic,
  }
}

export function HistoryPage() {
  const { history, remove, clear } = useHistory()

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-ink">观看历史</h2>
        {history.length > 0 && (
          <button
            onClick={clear}
            className="text-[12px] text-muted hover:text-red-400 transition-colors duration-180"
          >
            清空全部
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <EmptyState message="暂无观看历史" />
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <Link
              key={`${item.sourceKey}-${item.vodId}-${item.lastPlayTime}`}
              to={`/detail/${encodeURIComponent(item.sourceKey)}/${encodeURIComponent(item.vodId)}`}
              state={{ item: toVodItem(item) }}
              className="glass-card p-4 flex items-center gap-4 group"
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
                <h3 className="text-[14px] font-bold text-ink truncate group-hover:text-white transition-colors duration-180">
                  {item.vodName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.episode && (
                    <span className="text-[11px] text-accent">{item.episode}</span>
                  )}
                  <span className="text-[11px] text-muted">{timeAgo(item.lastPlayTime)}</span>
                </div>
              </div>

              {/* Progress bar */}
              {item.progress > 0 && (
                <div className="w-24 h-1 bg-hair rounded-full overflow-hidden flex-shrink-0 hidden sm:block">
                  <div
                    className="h-full bg-accent/60 rounded-full"
                    style={{ width: `${Math.min(item.progress * 100, 100)}%` }}
                  />
                </div>
              )}

              {/* Remove */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  remove(item.sourceKey, item.vodId)
                }}
                className="text-muted hover:text-red-400 transition-colors duration-180 opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
