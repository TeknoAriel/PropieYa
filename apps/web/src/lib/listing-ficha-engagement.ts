/**
 * Engagement en ficha pública (solo cliente): visitas y reingreso.
 * Complementa `recordPublicView` (servidor) sin duplicar conteo de negocio.
 */

const VISIT_COUNT_KEY = 'propieya.listingFicha.visitCount.v1'
const LAST_SEEN_AT_KEY = 'propieya.listingFicha.lastSeenAt.v1'

/** Misma pestaña en poco tiempo: no cuenta como “volvió”. */
const RETURN_GAP_MS = 2 * 60 * 1000

function readJsonMap(key: string): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    return o && typeof o === 'object' && !Array.isArray(o)
      ? (o as Record<string, number>)
      : {}
  } catch {
    return {}
  }
}

function writeJsonMap(key: string, map: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(map))
  } catch {
    /* quota / private mode */
  }
}

export type ListingFichaEngagementBump = {
  visitCount: number
  isReturnVisit: boolean
}

/**
 * Llamar una vez por carga de ficha (después de tener `listingId`).
 * Incrementa contador local y detecta reingreso por tiempo desde la última vez.
 */
export function bumpListingFichaEngagement(listingId: string): ListingFichaEngagementBump {
  if (typeof window === 'undefined') {
    return { visitCount: 1, isReturnVisit: false }
  }
  const now = Date.now()
  const lastMap = readJsonMap(LAST_SEEN_AT_KEY)
  const prevSeen = lastMap[listingId]
  const isReturnVisit =
    prevSeen != null && Number.isFinite(prevSeen) && now - prevSeen > RETURN_GAP_MS

  const countMap = readJsonMap(VISIT_COUNT_KEY)
  const nextCount = (countMap[listingId] ?? 0) + 1
  countMap[listingId] = nextCount
  writeJsonMap(VISIT_COUNT_KEY, countMap)

  lastMap[listingId] = now
  writeJsonMap(LAST_SEEN_AT_KEY, lastMap)

  return { visitCount: nextCount, isReturnVisit }
}
