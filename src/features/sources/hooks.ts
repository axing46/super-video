import { useQuery, useQueryClient } from '@tanstack/react-query'
import { loadAllSources, toggleSource, deleteSource, addSource as addSourceStorage, importRemoteSources, importSourcesFromJson } from './storage'
import type { LocalVodSource } from '@/core/models'

export function useSources() {
  const queryClient = useQueryClient()

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: loadAllSources,
    staleTime: Infinity,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sources'] })

  const toggle = async (key: string, enabled: boolean) => {
    await toggleSource(key, enabled)
    invalidate()
  }

  const remove = async (key: string) => {
    await deleteSource(key)
    invalidate()
  }

  const importSources = async (url: string) => {
    const result = await importRemoteSources(url)
    invalidate()
    return result
  }

  const addSource = async (source: LocalVodSource) => {
    await addSourceStorage(source)
    invalidate()
  }

  return { sources, isLoading, toggle, remove, importSources, importSourcesFromJson, addSource }
}
