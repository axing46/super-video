import { readString, readInt } from './helpers'

// ─── SiteWithStatus ──────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

export interface SiteWithStatus {
  key: string
  name: string
  baseUrl: string
  detailUrl?: string
  enabled: boolean
  lastCheck?: number
  isHealthy?: boolean
  healthStatus?: string
  responseTimeMs?: number
  statusMessage?: string
  comment?: string
  r18?: boolean
  group?: string
}

export function getEffectiveHealthStatus(site: SiteWithStatus): HealthStatus {
  const normalized = site.healthStatus?.trim()
  if (normalized && normalized.length > 0) return normalized as HealthStatus
  if (site.isHealthy === undefined) return 'unknown'
  return site.isHealthy ? 'healthy' : 'unhealthy'
}

export function isBadHealth(site: SiteWithStatus): boolean {
  const status = getEffectiveHealthStatus(site)
  return status === 'degraded' || status === 'unhealthy'
}

export function siteWithStatusFromJson(json: unknown): SiteWithStatus {
  const map = json as Record<string, unknown>
  return {
    key: readString(map['key']) ?? '',
    name: readString(map['name']) ?? '',
    baseUrl: readString(map['base_url']) ?? '',
    detailUrl: readString(map['detail_url']) ?? readString(map['detail']),
    enabled: (map['enabled'] as boolean) ?? false,
    lastCheck: readInt(map['last_check']),
    isHealthy: map['is_healthy'] as boolean | undefined,
    healthStatus: readString(map['health_status']),
    responseTimeMs: readInt(map['response_time_ms']),
    statusMessage: readString(map['status_message']),
    comment: readString(map['comment']),
    r18: map['r18'] as boolean | undefined,
    group: readString(map['group']),
  }
}

// ─── RemoteSource ────────────────────────────────────────────

export interface RemoteSource {
  key: string
  name: string
  api: string
  detail: string
  group?: string
  r18?: boolean
  comment?: string
}

export function remoteSourceFromJson(json: unknown): RemoteSource {
  const map = json as Record<string, unknown>
  return {
    key: readString(map['key']) ?? '',
    name: readString(map['name']) ?? '',
    api: readString(map['api']) ?? '',
    detail: readString(map['detail']) ?? '',
    group: readString(map['group']),
    r18: map['r18'] as boolean | undefined,
    comment: readString(map['comment']),
  }
}

// ─── LocalVodSource (for storage) ────────────────────────────

export interface LocalVodSource {
  key: string
  name: string
  apiUrl: string
  detailUrl: string
  enabled: boolean
  lastCheck?: number
  isHealthy?: boolean
  healthStatus?: string
  responseTimeMs?: number
  statusMessage?: string
  comment?: string
  r18?: boolean
  group?: string
}

export function localVodSourceFromStorage(json: unknown): LocalVodSource {
  const map = json as Record<string, unknown>
  return {
    key: readString(map['key']) ?? '',
    name: readString(map['name']) ?? '',
    apiUrl: readString(map['api_url']) ?? '',
    detailUrl: readString(map['detail_url']) ?? '',
    enabled: (map['enabled'] as boolean) ?? true,
    lastCheck: readInt(map['last_check']),
    isHealthy: map['is_healthy'] as boolean | undefined,
    healthStatus: readString(map['health_status']),
    responseTimeMs: readInt(map['response_time_ms']),
    statusMessage: readString(map['status_message']),
    comment: readString(map['comment']),
    r18: map['r18'] as boolean | undefined,
    group: readString(map['group']),
  }
}

export function localVodSourceToJson(source: LocalVodSource): Record<string, unknown> {
  return {
    key: source.key,
    name: source.name,
    api_url: source.apiUrl,
    detail_url: source.detailUrl,
    enabled: source.enabled,
    last_check: source.lastCheck,
    is_healthy: source.isHealthy,
    health_status: source.healthStatus,
    response_time_ms: source.responseTimeMs,
    status_message: source.statusMessage,
    comment: source.comment,
    r18: source.r18,
    group: source.group,
  }
}

export function localVodSourceToSiteStatus(source: LocalVodSource): SiteWithStatus {
  return {
    key: source.key,
    name: source.name,
    baseUrl: source.apiUrl,
    detailUrl: source.detailUrl,
    enabled: source.enabled,
    lastCheck: source.lastCheck,
    isHealthy: source.isHealthy,
    healthStatus: source.healthStatus,
    responseTimeMs: source.responseTimeMs,
    statusMessage: source.statusMessage,
    comment: source.comment,
    r18: source.r18,
    group: source.group,
  }
}
