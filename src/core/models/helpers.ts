export function readString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  return text.length > 0 ? text : undefined
}

export function readInt(value: unknown): number | undefined {
  if (typeof value === 'number') return Math.floor(value)
  const n = Number(value)
  return Number.isNaN(n) ? undefined : Math.floor(n)
}

export function readDouble(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}
