import type { FavoriteItem } from '@/core/models'

const STORAGE_KEY = 'sv_favorites_v1'

export function loadFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FavoriteItem[]) : []
  } catch {
    return []
  }
}

export function saveFavorites(items: FavoriteItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function isFavorited(sourceKey: string, vodId: string): boolean {
  return loadFavorites().some((f) => f.sourceKey === sourceKey && f.vodId === vodId)
}

export function addFavorite(item: FavoriteItem): void {
  const favorites = loadFavorites()
  if (favorites.some((f) => f.sourceKey === item.sourceKey && f.vodId === item.vodId)) return
  favorites.unshift(item)
  saveFavorites(favorites)
}

export function removeFavorite(sourceKey: string, vodId: string): void {
  saveFavorites(loadFavorites().filter((f) => !(f.sourceKey === sourceKey && f.vodId === vodId)))
}
