import { useQuery, useQueryClient } from '@tanstack/react-query'
import { loadHistory, removeHistory, clearHistory } from './storage'

export function useHistory() {
  const queryClient = useQueryClient()

  const { data: history = [] } = useQuery({
    queryKey: ['history'],
    queryFn: loadHistory,
    staleTime: Infinity,
  })

  const remove = (sourceKey: string, vodId: string) => {
    removeHistory(sourceKey, vodId)
    queryClient.invalidateQueries({ queryKey: ['history'] })
  }

  const clear = () => {
    clearHistory()
    queryClient.invalidateQueries({ queryKey: ['history'] })
  }

  return { history, remove, clear }
}
