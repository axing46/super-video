import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FavoriteItem } from '@/core/models'
import {
  loadFavorites,
  addFavorite,
  removeFavorite,
  isFavorited as checkFavorited,
} from './storage'

export function useFavorites() {
  const queryClient = useQueryClient()

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: loadFavorites,
    staleTime: Infinity,
  })

  const isFavorited = (sourceKey: string, vodId: string) =>
    favorites.some((f) => f.sourceKey === sourceKey && f.vodId === vodId)

  const toggleFavorite = (item: FavoriteItem) => {
    if (checkFavorited(item.sourceKey, item.vodId)) {
      removeFavorite(item.sourceKey, item.vodId)
    } else {
      addFavorite(item)
    }
    queryClient.invalidateQueries({ queryKey: ['favorites'] })
  }

  return { favorites, isFavorited, toggleFavorite }
}
