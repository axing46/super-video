import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { searchAllSources, SearchCache, type SearchAllResult } from './api'
import { useDebounce } from '@/hooks/useDebounce'

const searchCache = new SearchCache()
const SESSION_KEY_PREFIX = 'sv_search_'

/** Read cached results from sessionStorage */
function getSessionCache(query: string, favoritesOnly: boolean): SearchAllResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + query + (favoritesOnly ? '_fav' : ''))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Write results to sessionStorage */
function setSessionCache(query: string, result: SearchAllResult, favoritesOnly: boolean) {
  try {
    sessionStorage.setItem(SESSION_KEY_PREFIX + query + (favoritesOnly ? '_fav' : ''), JSON.stringify(result))
  } catch { /* quota exceeded */ }
}

export function useSearch(keyword: string, favoritesOnly = false) {
  const debounced = useDebounce(keyword, 200)
  const queryClient = useQueryClient()
  const [streamingItems, setStreamingItems] = useState<SearchAllResult | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)

  // Streaming search
  useEffect(() => {
    if (!debounced.trim()) {
      setStreamingItems(null)
      return
    }

    let cancelled = false
    setIsStreaming(true)
    setStreamingItems(null)

    const streamSearch = async () => {
      await searchAllSources(
        debounced,
        searchCache,
        (batch) => {
          if (cancelled) return
          setStreamingItems(prev => ({
            items: [...(prev?.items ?? []), ...batch],
            sourceCount: prev?.sourceCount ?? 0,
            errorCount: prev?.errorCount ?? 0,
          }))
        },
        true, // fastOnly mode for initial results
        favoritesOnly,
      )
      if (!cancelled) setIsStreaming(false)
    }

    streamSearch()
    return () => { cancelled = true }
  }, [debounced, favoritesOnly])

  // Full search in background
  const query = useQuery({
    queryKey: ['search', debounced, favoritesOnly],
    queryFn: async () => {
      const result = await searchAllSources(debounced, searchCache, undefined, false, favoritesOnly)
      setSessionCache(debounced, result, favoritesOnly)
      return result
    },
    enabled: debounced.trim().length > 0,
    staleTime: 2 * 60 * 1000,
    placeholderData: () => {
      if (!debounced.trim()) return undefined
      const cached = getSessionCache(debounced, favoritesOnly)
      if (cached) return cached
      return queryClient.getQueryData<SearchAllResult>(['search', debounced, favoritesOnly])
    },
  })

  // Return streaming results first, then full results
  const data = query.data ?? streamingItems

  return {
    ...query,
    data,
    isStreaming,
  }
}
