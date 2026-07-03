import { useQuery, useQueryClient } from '@tanstack/react-query'
import { searchAllSources, SearchCache, type SearchAllResult } from './api'
import { useDebounce } from '@/hooks/useDebounce'

const searchCache = new SearchCache()
const SESSION_KEY_PREFIX = 'sv_search_'

/** Read cached results from sessionStorage */
function getSessionCache(query: string): SearchAllResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + query)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Write results to sessionStorage */
function setSessionCache(query: string, result: SearchAllResult) {
  try {
    sessionStorage.setItem(SESSION_KEY_PREFIX + query, JSON.stringify(result))
  } catch { /* quota exceeded */ }
}

export function useSearch(keyword: string) {
  const debounced = useDebounce(keyword, 250) // Faster: 250ms instead of 400ms
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['search', debounced],
    queryFn: async () => {
      // Preload: check cache, start writing session storage
      const result = await searchAllSources(debounced, searchCache)
      setSessionCache(debounced, result)
      return result
    },
    enabled: debounced.trim().length > 0,
    staleTime: 2 * 60 * 1000,
    // Show cached sessionStorage data instantly while fetching
    placeholderData: () => {
      if (!debounced.trim()) return undefined
      // Try session cache first (instant)
      const cached = getSessionCache(debounced)
      if (cached) return cached
      // Then try React Query cache
      return queryClient.getQueryData<SearchAllResult>(['search', debounced])
    },
  })
}
