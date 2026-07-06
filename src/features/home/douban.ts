// Douban movie API - fetches data from douban.com

export interface DoubanMovie {
  id: string
  title: string
  rate: string
  cover: string
  year?: string
  casts?: string[]
  directors?: string[]
  genres?: string[]
}

export interface DoubanSection {
  label: string
  movies: DoubanMovie[]
}

// Douban API endpoints
const DOUBAN_API = {
  hot: 'https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&page_limit=20&page_start=0',
  newMovies: 'https://movie.douban.com/j/search_subjects?type=movie&tag=%E6%9C%80%E6%96%B0&page_limit=20&page_start=0',
  topRated: 'https://movie.douban.com/j/search_subjects?type=movie&tag=%E8%B1%86%E7%93%A3%E9%AB%98%E5%88%86&page_limit=20&page_start=0',
  tvHot: 'https://movie.douban.com/j/search_subjects?type=tv&tag=%E7%83%AD%E9%97%A8&page_limit=20&page_start=0',
  tvNew: 'https://movie.douban.com/j/search_subjects?type=tv&tag=%E6%9C%80%E6%96%B0&page_limit=20&page_start=0',
  show: 'https://movie.douban.com/j/search_subjects?type=tv&tag=%E7%BB%BC%E8%89%BA&page_limit=20&page_start=0',
}

// Fetch with proxy fallback
async function fetchWithProxy(url: string): Promise<string> {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ]

  // Try direct first
  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://movie.douban.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    })
    if (res.ok) return await res.text()
  } catch {
    // Direct failed
  }

  // Try proxies
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy(url))
      if (res.ok) return await res.text()
    } catch {
      continue
    }
  }

  throw new Error('Failed to fetch douban data')
}

// Parse douban API response
function parseDoubanResponse(data: unknown): DoubanMovie[] {
  const record = data as Record<string, unknown>
  const subjects = record['subjects'] as Array<Record<string, unknown>> | undefined
  if (!subjects || !Array.isArray(subjects)) return []

  return subjects.map((item) => ({
    id: String(item['id'] ?? ''),
    title: String(item['title'] ?? ''),
    rate: String(item['rate'] ?? ''),
    cover: String(item['cover'] ?? ''),
  }))
}

// Fetch a single section
async function fetchSection(label: string, url: string): Promise<DoubanSection> {
  try {
    const text = await fetchWithProxy(url)
    const data = JSON.parse(text)
    return { label, movies: parseDoubanResponse(data) }
  } catch {
    return { label, movies: [] }
  }
}

// Fetch all discovery sections
export async function fetchDoubanSections(): Promise<DoubanSection[]> {
  const sections = await Promise.all([
    fetchSection('🔥 热门电影', DOUBAN_API.hot),
    fetchSection('🎬 最新电影', DOUBAN_API.newMovies),
    fetchSection('⭐ 豆瓣高分', DOUBAN_API.topRated),
    fetchSection('📺 热门剧集', DOUBAN_API.tvHot),
    fetchSection('📺 最新剧集', DOUBAN_API.tvNew),
    fetchSection('🎤 综艺节目', DOUBAN_API.show),
  ])

  return sections.filter((s) => s.movies.length > 0)
}

// Search douban movies
export async function searchDouban(keyword: string): Promise<DoubanMovie[]> {
  const url = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`
  try {
    const text = await fetchWithProxy(url)
    const data = JSON.parse(text) as Array<Record<string, unknown>>
    return data.map((item) => ({
      id: String(item['id'] ?? ''),
      title: String(item['title'] ?? ''),
      rate: String(item['rate'] ?? ''),
      cover: String(item['img'] ?? ''),
      year: String(item['year'] ?? ''),
      genres: item['genres'] as string[] | undefined,
    }))
  } catch {
    return []
  }
}
