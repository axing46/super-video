import type { WatchHistoryItem } from '@/core/models'

const STORAGE_KEY = 'sv_history_v1'
const MAX_ITEMS = 200

export function loadHistory(): WatchHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as WatchHistoryItem[]) : []
  } catch {
    return []
  }
}

export function saveHistory(items: WatchHistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function addHistory(item: WatchHistoryItem): void {
  const history = loadHistory()
  const idx = history.findIndex(
    (h) => h.sourceKey === item.sourceKey && h.vodId === item.vodId,
  )
  if (idx >= 0) {
    history.splice(idx, 1)
  }
  history.unshift(item)
  if (history.length > MAX_ITEMS) history.length = MAX_ITEMS
  saveHistory(history)
}

export function removeHistory(sourceKey: string, vodId: string): void {
  saveHistory(loadHistory().filter((h) => !(h.sourceKey === sourceKey && h.vodId === vodId)))
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}
