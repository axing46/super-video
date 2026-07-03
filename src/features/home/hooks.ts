import { useQuery } from '@tanstack/react-query'
import { fetchDiscoverySections } from './api'

export function useDiscovery() {
  return useQuery({
    queryKey: ['discovery', 'sections'],
    queryFn: fetchDiscoverySections,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
