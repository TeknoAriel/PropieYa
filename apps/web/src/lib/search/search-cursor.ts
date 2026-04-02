/**
 * Cursor opaco para paginación profunda en Elasticsearch (`search_after`).
 * Orden de sort en ES: publishedAt, updatedAt, createdAt, id (4 valores).
 */

const SORT_VALUES_LEN = 4

export function encodeListingSearchCursor(sort: unknown[]): string {
  if (!Array.isArray(sort) || sort.length !== SORT_VALUES_LEN) {
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
    if (!Array.isArray(parsed) || parsed.length !== SORT_VALUES_LEN) {
      return null
    }
    if (typeof parsed[3] !== 'string' || parsed[3].length === 0) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
