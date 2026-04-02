/**
 * Lista temporal de avisos a comparar (sessionStorage). Máx. 3 UUIDs.
 * Evento `propieya:compare-change` para sincronizar UI (dock, botones).
 */

export const COMPARE_LISTINGS_EVENT = 'propieya:compare-change'

const STORAGE_KEY = 'propieya.compare.ids.v1'
const MAX = 3

function parseStored(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
      .slice(0, MAX)
  } catch {
    return []
  }
}

export function readCompareIds(): string[] {
  if (typeof window === 'undefined') return []
  return parseStored(sessionStorage.getItem(STORAGE_KEY))
}

export function writeCompareIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  const uniq = [...new Set(ids)].slice(0, MAX)
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(uniq))
  window.dispatchEvent(new Event(COMPARE_LISTINGS_EVENT))
}

export function addCompareId(
  id: string
): { ok: true } | { ok: false; reason: 'max' | 'duplicate' } {
  const cur = readCompareIds()
  if (cur.includes(id)) return { ok: false, reason: 'duplicate' }
  if (cur.length >= MAX) return { ok: false, reason: 'max' }
  writeCompareIds([...cur, id])
  return { ok: true }
}

export function removeCompareId(id: string): void {
  writeCompareIds(readCompareIds().filter((x) => x !== id))
}

export function clearCompareIds(): void {
  writeCompareIds([])
}

export function toggleCompareId(
  id: string
): { ok: true; inList: boolean } | { ok: false; reason: 'max' } {
  const cur = readCompareIds()
  if (cur.includes(id)) {
    removeCompareId(id)
    return { ok: true, inList: false }
  }
  const add = addCompareId(id)
  if (!add.ok && add.reason === 'max') return { ok: false, reason: 'max' }
  return { ok: true, inList: true }
}
