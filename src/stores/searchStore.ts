import { create } from 'zustand'

const HISTORY_KEY = 'sv_search_history'
const MAX_HISTORY = 20

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHistory(items: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
}

interface SearchState {
  pendingQuery: string
  setPendingQuery: (q: string) => void
  history: string[]
  addHistory: (q: string) => void
  removeHistory: (q: string) => void
  clearHistory: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  pendingQuery: '',
  setPendingQuery: (q) => set({ pendingQuery: q }),
  history: loadHistory(),
  addHistory: (q) =>
    set((state) => {
      const filtered = state.history.filter(
        (h) => h.toLowerCase() !== q.toLowerCase(),
      )
      const next = [q, ...filtered].slice(0, MAX_HISTORY)
      saveHistory(next)
      return { history: next }
    }),
  removeHistory: (q) =>
    set((state) => {
      const next = state.history.filter((h) => h !== q)
      saveHistory(next)
      return { history: next }
    }),
  clearHistory: () => {
    saveHistory([])
    return { history: [] }
  },
}))
