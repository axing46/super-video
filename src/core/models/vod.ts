// ─── Helper readers ──────────────────────────────────────────

function readString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  return text.length > 0 ? text : undefined
}

function readInt(value: unknown): number | undefined {
  if (typeof value === 'number') return Math.floor(value)
  const n = Number(value)
  return Number.isNaN(n) ? undefined : Math.floor(n)
}

function readDouble(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

// ─── VodItem ─────────────────────────────────────────────────

export interface VodItem {
  sourceKey: string
  vodId: string
  vodName: string
  vodPlayUrl: string
  vodPic?: string
  vodRemarks?: string
  vodActor?: string
  vodDirector?: string
  vodContent?: string
  vodYear?: string
  vodArea?: string
  vodClass?: string
  vodTag?: string
  vodDuration?: string
  vodLang?: string
  typeName?: string
  avgSpeedMs?: number
}

export function vodItemFromJson(json: unknown): VodItem {
  const map = json as Record<string, unknown>
  return {
    sourceKey: readString(map['source_key']) ?? '',
    vodId: readString(map['vod_id']) ?? '',
    vodName: readString(map['vod_name']) ?? '',
    vodPlayUrl: readString(map['vod_play_url']) ?? '',
    vodPic: readString(map['vod_pic']),
    vodRemarks: readString(map['vod_remarks']),
    vodActor: readString(map['vod_actor']),
    vodDirector: readString(map['vod_director']),
    vodContent: readString(map['vod_content']),
    vodYear: readString(map['vod_year']),
    vodArea: readString(map['vod_area']),
    vodClass: readString(map['vod_class']),
    vodTag: readString(map['vod_tag']),
    vodDuration: readString(map['vod_duration']),
    vodLang: readString(map['vod_lang']),
    typeName: readString(map['type_name']),
    avgSpeedMs: readInt(map['avg_speed_ms']),
  }
}

// ─── SearchResult ────────────────────────────────────────────

export interface SearchResult {
  items: VodItem[]
  filteredCount: number
}

export function searchResultFromJson(json: unknown): SearchResult {
  const map = json as Record<string, unknown>
  const list = (map['items'] as unknown[]) ?? []
  return {
    items: list.map(vodItemFromJson),
    filteredCount: readInt(map['filtered_count']) ?? 0,
  }
}
