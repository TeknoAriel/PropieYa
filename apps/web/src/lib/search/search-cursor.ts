/**
 * Cursor opaco para paginación profunda en Elasticsearch (`search_after`).
 * Orden en ES: 4–6 claves (fechas + id; opcional `_score`; opcional `_geo_distance` con localidad).
 */

const SORT_LEN_MIN = 4
const SORT_LEN_MAX = 6

export function encodeListingSearchCursor(sort: unknown[]): string {
  if (
    !Array.isArray(sort) ||
    sort.length < SORT_LEN_MIN ||
    sort.length > SORT_LEN_MAX
  ) {
    throw new Error('encodeListingSearchCursor: sort inválido')
  }
  return Buffer.from(JSON.stringify(sort), 'utf8').toString('base64url')
}

export function decodeListingSearchCursor(s: string): unknown[] | null {
  const trimmed = s.trim()
  if (!trimmed || trimmed.length > 4096) return null
  try {
    const raw = Buffer.from(trimmed, 'base64url').toString('utf8')
    const parsed = JSON.parse(raw) as unknown
    if (
      !Array.isArray(parsed) ||
      parsed.length < SORT_LEN_MIN ||
      parsed.length > SORT_LEN_MAX
    ) {
      return null
    }
    const idIdx = parsed.length - 1
    if (typeof parsed[idIdx] !== 'string' || parsed[idIdx].length === 0) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
