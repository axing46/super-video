import { readString } from './helpers'

// ─── PlayEpisode ─────────────────────────────────────────────

export interface PlayEpisode {
  name: string
  url: string
  proxyUrl?: string
  httpHeaders?: Record<string, string>
}

export function playEpisodeFromJson(json: unknown): PlayEpisode {
  const map = json as Record<string, unknown>
  return {
    name: readString(map['name']) ?? '',
    url: readString(map['url']) ?? '',
    proxyUrl: readString(map['proxy_url']),
    httpHeaders: readStringMap(map['http_headers']),
  }
}

export function getEffectiveUrl(episode: PlayEpisode): string {
  return episode.proxyUrl && episode.proxyUrl.length > 0
    ? episode.proxyUrl
    : episode.url
}

// ─── PlaySource ──────────────────────────────────────────────

export interface PlaySource {
  name: string
  episodes: PlayEpisode[]
}

export function playSourceFromJson(json: unknown): PlaySource {
  const map = json as Record<string, unknown>
  const list = (map['episodes'] as unknown[]) ?? []
  return {
    name: readString(map['name']) ?? '',
    episodes: list.map(playEpisodeFromJson),
  }
}

// ─── PlayResult ──────────────────────────────────────────────

export interface PlayResult {
  sources: PlaySource[]
}

export function playResultFromJson(json: unknown): PlayResult {
  const map = json as Record<string, unknown>
  const list = (map['sources'] as unknown[]) ?? []
  return {
    sources: list.map(playSourceFromJson),
  }
}

// ─── Helper ──────────────────────────────────────────────────

function readStringMap(value: unknown): Record<string, string> | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const map = value as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(map)) {
    const s = readString(v)
    if (s !== undefined) result[k] = s
  }
  return Object.keys(result).length > 0 ? result : undefined
}
