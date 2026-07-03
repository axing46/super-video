import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { loadMovieData, getGenres, getMoviesByGenre, type MovieItem } from './movieData'
import { Loading, ErrorState } from '@/components/ui/Status'

const INITIAL_SHOW = 12

function MovieCard({ movie, onClick }: { movie: MovieItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass-card p-3 text-left w-full cursor-pointer hover:-translate-y-0.5 transition-transform duration-200 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-ink truncate group-hover:text-accent transition-colors">
            {movie.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="pill text-[10px]">{movie.type}</span>
            {movie.region && (
              <span className="text-[11px] text-muted">{movie.region}</span>
            )}
          </div>
          {movie.cast.length > 0 && (
            <p className="text-[11px] text-muted/70 mt-1.5 truncate">
              {movie.cast.join(' / ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 text-champagne flex-shrink-0">
          <Star size={13} fill="#f4d28a" strokeWidth={0} />
          <span className="text-[13px] font-bold">{movie.rating}</span>
        </div>
      </div>
    </button>
  )
}

function GenreSection({
  genre,
  movies,
}: {
  genre: string
  movies: MovieItem[]
}) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const hasMore = movies.length > INITIAL_SHOW
  const visible = expanded ? movies : movies.slice(0, INITIAL_SHOW)

  const handleClick = (title: string) => {
    navigate(`/search?q=${encodeURIComponent(title)}`)
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold text-ink">{genre}</h2>
        <span className="text-[11px] text-muted">{movies.length} 部</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {visible.map((m, i) => (
          <MovieCard key={`${m.title}-${i}`} movie={m} onClick={() => handleClick(m.title)} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mx-auto mt-4 px-5 py-2 rounded-btn border border-white/10
            text-[12px] text-muted hover:text-ink hover:border-white/20 transition-all duration-200"
        >
          {expanded ? (
            <><ChevronUp size={14} /> 收起</>
          ) : (
            <><ChevronDown size={14} /> 展开更多 ({movies.length - INITIAL_SHOW} 部)</>
          )}
        </button>
      )}
    </section>
  )
}

export function HomePage() {
  const [movies, setMovies] = useState<MovieItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadMovieData()
      .then(setMovies)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (!movies) return <Loading message="加载豆瓣电影数据..." />

  const genres = getGenres(movies)
  const filtered = activeGenre ? getMoviesByGenre(movies, activeGenre) : movies

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-ink">豆瓣高分电影</h2>
        <p className="text-[12px] text-muted mt-1">评分 ≥ 7.5 · {movies.length} 部 · 点击搜索片源</p>
      </div>

      {/* Genre tabs */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setActiveGenre(null)}
          className={`pill text-[11px] cursor-pointer whitespace-nowrap transition-all duration-150
            ${!activeGenre ? '!bg-accent/15 !border-accent/30 !text-accent' : 'hover:border-white/20'}`}
        >
          全部 ({movies.length})
        </button>
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGenre(g === activeGenre ? null : g)}
            className={`pill text-[11px] cursor-pointer whitespace-nowrap transition-all duration-150
              ${g === activeGenre ? '!bg-accent/15 !border-accent/30 !text-accent' : 'hover:border-white/20'}`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Movie list */}
      {activeGenre ? (
        <GenreSection genre={activeGenre} movies={filtered as MovieItem[]} />
      ) : (
        genres.map((genre) => (
          <GenreSection key={genre} genre={genre} movies={getMoviesByGenre(movies, genre, 50)} />
        ))
      )}
    </div>
  )
}
