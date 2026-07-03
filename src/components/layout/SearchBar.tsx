import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Clock } from 'lucide-react'
import { useSearchStore } from '@/stores/searchStore'
import { useDebounce } from '@/hooks/useDebounce'

export function SearchBar({ compact }: { compact?: boolean }) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { history, addHistory, removeHistory, clearHistory } = useSearchStore()
  const debounced = useDebounce(value, 300)

  // Preload: silently navigate to search with debounced value
  useEffect(() => {
    const q = debounced.trim()
    if (q && q.length >= 1) {
      // Replace URL silently to preload search results
      navigate(`/search?q=${encodeURIComponent(q)}`, { replace: true })
    }
  }, [debounced])

  const submit = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (!trimmed) return
      addHistory(trimmed)
      setFocused(false)
      navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    },
    [navigate, addHistory],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(value)
  }

  const filteredHistory = value
    ? history.filter((h) => h.toLowerCase().includes(value.toLowerCase()))
    : history

  return (
    <form onSubmit={handleSubmit} className="relative w-full" onBlur={() => setTimeout(() => setFocused(false), 200)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="搜索影视..."
        className={`w-full bg-white/[0.04] border border-hair rounded-search text-[13px] text-ink
          placeholder:text-muted/60 outline-none transition-all duration-200 ease-out-expo
          focus:border-accent/40 focus:bg-white/[0.06]
          ${compact ? 'h-9 pl-9 pr-3' : 'h-9 pl-9 pr-8'}`}
      />
      <Search
        size={compact ? 14 : 14}
        strokeWidth={1.5}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/60 pointer-events-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      )}

      {/* History dropdown */}
      {focused && filteredHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 glass-card p-1.5 z-50 shadow-xl">
          <div className="flex items-center justify-between px-3 py-1.5 mb-1">
            <span className="text-[11px] text-muted">搜索历史</span>
            <button
              type="button"
              onClick={clearHistory}
              className="text-[10px] text-muted hover:text-ink transition-colors"
            >
              清空
            </button>
          </div>
          {filteredHistory.map((h) => (
            <button
              key={h}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setValue(h)
                submit(h)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-btn text-[13px] text-ink-2
                hover:bg-white/[0.06] hover:text-ink transition-all duration-120 text-left"
            >
              <Clock size={12} className="text-muted/50 flex-shrink-0" />
              <span className="truncate">{h}</span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  removeHistory(h)
                }}
                className="ml-auto flex-shrink-0 text-muted/40 hover:text-red-400 transition-colors"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
