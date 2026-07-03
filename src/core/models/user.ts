import { readString, readInt, readDouble } from './helpers'

// ─── WatchHistoryItem ────────────────────────────────────────

export interface WatchHistoryItem {
  vodId: string
  sourceKey: string
  vodName: string
  vodPic?: string
  lastPlayTime: number
  progress: number
  episode?: string
}

export function watchHistoryItemFromJson(json: unknown): WatchHistoryItem {
  const map = json as Record<string, unknown>
  return {
    vodId: readString(map['vod_id']) ?? '',
    sourceKey: readString(map['source_key']) ?? '',
    vodName: readString(map['vod_name']) ?? '',
    vodPic: readString(map['vod_pic']),
    lastPlayTime: readInt(map['last_play_time']) ?? 0,
    progress: readDouble(map['progress']) ?? 0,
    episode: readString(map['episode']),
  }
}

// ─── FavoriteItem ────────────────────────────────────────────

export interface FavoriteItem {
  vodId: string
  sourceKey: string
  vodName: string
  createdTime: number
  vodPic?: string
  vodRemarks?: string
  vodActor?: string
  vodDirector?: string
  vodContent?: string
}

export function favoriteItemFromJson(json: unknown): FavoriteItem {
  const map = json as Record<string, unknown>
  return {
    vodId: readString(map['vod_id']) ?? '',
    sourceKey: readString(map['source_key']) ?? '',
    vodName: readString(map['vod_name']) ?? '',
    createdTime: readInt(map['created_time']) ?? 0,
    vodPic: readString(map['vod_pic']),
    vodRemarks: readString(map['vod_remarks']),
    vodActor: readString(map['vod_actor']),
    vodDirector: readString(map['vod_director']),
    vodContent: readString(map['vod_content']),
  }
}
