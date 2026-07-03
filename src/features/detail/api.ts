export { fetchDetail } from '@/features/search/api'

/**
 * Parse vodPlayUrl into episodes.
 * Format: "1$url1#2$url2$$$1$url3#2$url4"
 * - `$$$` separates sources
 * - `#` separates episodes within a source
 * - `$` separates episode name from URL
 */
export interface ParsedEpisode {
  name: string
  url: string
}

export interface ParsedSource {
  name: string
  episodes: ParsedEpisode[]
}

export function parsePlayUrl(playUrl: string): ParsedSource[] {
  if (!playUrl) return []

  const sourceParts = playUrl.split('$$$')

  return sourceParts.map((sourceStr, si) => {
    const epParts = sourceStr.split('#')
    const episodes = epParts.map((epStr) => {
      const dollarIdx = epStr.indexOf('$')
      if (dollarIdx === -1) {
        return { name: epStr, url: '' }
      }
      return {
        name: epStr.substring(0, dollarIdx),
        url: epStr.substring(dollarIdx + 1),
      }
    })

    return {
      name: sourceParts.length > 1 ? `播放源 ${si + 1}` : '剧集列表',
      episodes,
    }
  })
}
