import { useQuery } from '@tanstack/react-query'
import { fetchDetail } from './api'

export function useDetail(sourceKey: string, vodId: string, skip = false) {
  return useQuery({
    queryKey: ['detail', sourceKey, vodId],
    queryFn: () => fetchDetail(sourceKey, vodId),
    staleTime: 10 * 60 * 1000,
    enabled: !skip && sourceKey.length > 0 && vodId.length > 0,
  })
}
