import { readString } from './helpers'

// ─── DoubanSubject ───────────────────────────────────────────

export interface DoubanSubject {
  id?: string
  title: string
  cover?: string
  rate?: string
  year?: string
}

export function doubanSubjectFromJson(json: unknown): DoubanSubject {
  const map = json as Record<string, unknown>
  return {
    id: readString(map['id']),
    title: readString(map['title']) ?? '',
    cover: readString(map['cover']) ?? readString(map['cover_url']),
    rate: readString(map['rate']),
    year: readString(map['year']),
  }
}

// ─── DoubanSearchResponse ────────────────────────────────────

export interface DoubanSearchResponse {
  subjects: DoubanSubject[]
}

export function doubanSearchResponseFromJson(json: unknown): DoubanSearchResponse {
  const map = json as Record<string, unknown>
  const list = (map['subjects'] as unknown[]) ?? []
  return {
    subjects: list.map(doubanSubjectFromJson),
  }
}

// ─── DoubanItem (internal, from douban_repository) ───────────

export interface DoubanItem {
  id: string
  title: string
  poster: string
  rate?: string
  year?: string
}
