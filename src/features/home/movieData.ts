export interface MovieItem {
  title: string
  type: string
  cast: string[]
  region: string
  director: string
  genre: string
  rating: number
}

let cached: MovieItem[] | null = null

export async function loadMovieData(): Promise<MovieItem[]> {
  if (cached) return cached

  const res = await fetch('/movies.json')
  if (!res.ok) throw new Error('Failed to load movie data')
  cached = await res.json()
  return cached!
}

export function getGenres(movies: MovieItem[]): string[] {
  const counts = new Map<string, number>()
  for (const m of movies) {
    counts.set(m.type, (counts.get(m.type) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t]) => t)
}

export function getMoviesByGenre(movies: MovieItem[], genre: string, limit = 50): MovieItem[] {
  return movies.filter((m) => m.type === genre).slice(0, limit)
}
