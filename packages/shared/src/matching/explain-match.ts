import { AMENITY_LABELS, OPERATION_TYPE_LABELS, PROPERTY_TYPE_LABELS } from '../constants/listings'
import type { Amenity, OperationType, PropertyType } from '../types/listing'

/**
 * Filtros de búsqueda usados para explicar por qué un aviso coincide.
 * Alineado con `listing.search` en apps/web.
 */
export interface ExplainMatchFilters {
  q?: string
  operationType?: string
  propertyType?: string
  minPrice?: number
  maxPrice?: number
  minSurface?: number
  maxSurface?: number
  minBedrooms?: number
  minBathrooms?: number
  minGarages?: number
  floorMin?: number
  floorMax?: number
  escalera?: string
  city?: string
  neighborhood?: string
  amenities?: string[]
}

/** Datos mínimos del aviso (SQL o hit de ES). */
export interface ExplainMatchListing {
  title: string
  description?: string | null
  propertyType: string
  operationType: string
  priceAmount: number
  address?: unknown
  surfaceTotal: number
  bedrooms: number | null
  bathrooms?: number | null
  garages?: number | null
  features?: unknown
  /** En documentos ES puede venir en raíz */
  amenities?: string[]
  floor?: number | null
  escalera?: string | null
}

function normAddr(addr: unknown): { city?: string; neighborhood?: string } {
  if (!addr || typeof addr !== 'object') return {}
  const o = addr as Record<string, unknown>
  const city = typeof o.city === 'string' ? o.city : undefined
  const neighborhood =
    typeof o.neighborhood === 'string' ? o.neighborhood : undefined
  return { city, neighborhood }
}

function listingAmenities(l: ExplainMatchListing): string[] {
  if (l.amenities?.length) {
    return l.amenities.filter((x): x is string => typeof x === 'string')
  }
  const f = l.features
  if (f && typeof f === 'object' && 'amenities' in f) {
    const a = (f as { amenities?: unknown }).amenities
    if (Array.isArray(a)) {
      return a.filter((x): x is string => typeof x === 'string')
    }
  }
  return []
}

function listingFloor(l: ExplainMatchListing): number | null {
  if (typeof l.floor === 'number' && !Number.isNaN(l.floor)) return l.floor
  const f = l.features
  if (f && typeof f === 'object' && 'floor' in f) {
    const fl = (f as { floor?: unknown }).floor
    if (typeof fl === 'number' && !Number.isNaN(fl)) return fl
  }
  return null
}

function listingEscalera(l: ExplainMatchListing): string | null {
  if (typeof l.escalera === 'string' && l.escalera.trim()) {
    return l.escalera.trim().toUpperCase()
  }
  const f = l.features
  if (f && typeof f === 'object' && 'escalera' in f) {
    const e = (f as { escalera?: unknown }).escalera
    if (typeof e === 'string' && e.trim()) return e.trim().toUpperCase()
  }
  return null
}

function includesInsensitive(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase())
}

/**
 * Genera frases cortas en español sobre por qué el aviso coincide con los filtros activos.
 */
export function explainMatchReasons(
  filters: ExplainMatchFilters,
  listing: ExplainMatchListing
): string[] {
  const reasons: string[] = []
  const addr = normAddr(listing.address)

  if (filters.operationType && listing.operationType === filters.operationType) {
    const op = filters.operationType as OperationType
    const label = OPERATION_TYPE_LABELS[op] ?? filters.operationType
    reasons.push(`Operación: ${label}`)
  }

  if (filters.propertyType && listing.propertyType === filters.propertyType) {
    const pt = filters.propertyType as PropertyType
    const label = PROPERTY_TYPE_LABELS[pt] ?? listing.propertyType
    reasons.push(`Tipo: ${label}`)
  }

  if (filters.city?.trim()) {
    const c = filters.city.trim()
    if (addr.city && includesInsensitive(addr.city, c)) {
      reasons.push(`Ubicación: ciudad (${addr.city})`)
    }
  }

  if (filters.neighborhood?.trim()) {
    const n = filters.neighborhood.trim()
    if (addr.neighborhood && includesInsensitive(addr.neighborhood, n)) {
      reasons.push(`Ubicación: barrio (${addr.neighborhood})`)
    }
  }

  const price = listing.priceAmount
  if (filters.minPrice !== undefined && price >= filters.minPrice) {
    reasons.push('Precio: dentro del mínimo buscado')
  }
  if (filters.maxPrice !== undefined && price <= filters.maxPrice) {
    reasons.push('Precio: dentro del máximo buscado')
  }

  if (filters.minBedrooms !== undefined && listing.bedrooms != null) {
    if (listing.bedrooms >= filters.minBedrooms) {
      reasons.push(
        `Dormitorios: ${listing.bedrooms} (pediste al menos ${filters.minBedrooms})`
      )
    }
  }

  if (filters.minBathrooms !== undefined && listing.bathrooms != null) {
    if (listing.bathrooms >= filters.minBathrooms) {
      reasons.push(
        `Baños: ${listing.bathrooms} (pediste al menos ${filters.minBathrooms})`
      )
    }
  }

  if (filters.minGarages !== undefined && listing.garages != null) {
    if (listing.garages >= filters.minGarages) {
      reasons.push(
        `Cocheras: ${listing.garages} (pediste al menos ${filters.minGarages})`
      )
    }
  }

  if (filters.minSurface !== undefined) {
    if (listing.surfaceTotal >= filters.minSurface) {
      reasons.push(
        `Superficie: ${Math.round(listing.surfaceTotal)} m² (mínimo ${filters.minSurface} m²)`
      )
    }
  }
  if (filters.maxSurface !== undefined) {
    if (listing.surfaceTotal <= filters.maxSurface) {
      reasons.push(
        `Superficie: ${Math.round(listing.surfaceTotal)} m² (máximo ${filters.maxSurface} m²)`
      )
    }
  }

  const fl = listingFloor(listing)
  if (filters.floorMin !== undefined && fl != null && fl >= filters.floorMin) {
    reasons.push(`Piso: ${fl} (mínimo ${filters.floorMin})`)
  }
  if (filters.floorMax !== undefined && fl != null && fl <= filters.floorMax) {
    reasons.push(`Piso: ${fl} (máximo ${filters.floorMax})`)
  }

  if (filters.escalera?.trim()) {
    const want = filters.escalera.trim().toUpperCase()
    const got = listingEscalera(listing)
    if (got === want) {
      reasons.push(`Escalera: ${got}`)
    }
  }

  const lam = listingAmenities(listing)
  const lamSet = new Set(lam)
  if (filters.amenities?.length) {
    for (const a of filters.amenities) {
      if (lamSet.has(a)) {
        const label =
          a in AMENITY_LABELS
            ? AMENITY_LABELS[a as Amenity]
            : a
        reasons.push(`Amenities: ${label}`)
      }
    }
  }

  if (filters.q?.trim()) {
    const frag = filters.q.trim().slice(0, 120)
    const title = listing.title ?? ''
    const desc = listing.description ?? ''
    if (
      frag.length > 0 &&
      (includesInsensitive(title, frag) || includesInsensitive(desc, frag))
    ) {
      reasons.push('Texto: coincide con tu búsqueda')
    }
  }

  return reasons
}

/**
 * Enriquece resultados de búsqueda con `matchReasons`.
 */
export function withMatchReasons<T extends ExplainMatchListing>(
  filters: ExplainMatchFilters,
  rows: T[]
): Array<T & { matchReasons: string[] }> {
  return rows.map((row) => ({
    ...row,
    matchReasons: explainMatchReasons(filters, row),
  }))
}

/** Resumen legible para guardar en perfil de demanda o mostrar en UI. */
export function summarizeSearchFilters(filters: ExplainMatchFilters): string {
  const parts: string[] = []

  if (filters.operationType) {
    const op = filters.operationType as OperationType
    parts.push(OPERATION_TYPE_LABELS[op] ?? filters.operationType)
  }
  if (filters.propertyType) {
    const pt = filters.propertyType as PropertyType
    parts.push(PROPERTY_TYPE_LABELS[pt] ?? filters.propertyType)
  }
  if (filters.city?.trim()) parts.push(`en ${filters.city.trim()}`)
  if (filters.neighborhood?.trim()) parts.push(`barrio ${filters.neighborhood.trim()}`)
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const lo = filters.minPrice != null ? `desde ${filters.minPrice}` : ''
    const hi = filters.maxPrice != null ? `hasta ${filters.maxPrice}` : ''
    parts.push(['Precio', lo, hi].filter(Boolean).join(' '))
  }
  if (filters.minBedrooms !== undefined) {
    parts.push(`mín. ${filters.minBedrooms} dormitorios`)
  }
  if (filters.minSurface !== undefined) {
    parts.push(`mín. ${filters.minSurface} m²`)
  }
  if (filters.q?.trim()) parts.push(`búsqueda: «${filters.q.trim().slice(0, 80)}»`)

  return parts.length > 0
    ? parts.join(' · ')
    : 'Perfil de búsqueda sin criterios guardados.'
}

/** Heurística 0–100 según cuántos criterios están definidos. */
export function completenessFromFilters(filters: ExplainMatchFilters): number {
  let score = 0
  const bump = (n: number) => {
    score = Math.min(100, score + n)
  }
  if (filters.operationType) bump(15)
  if (filters.propertyType) bump(15)
  if (filters.city?.trim() || filters.neighborhood?.trim()) bump(20)
  if (filters.minPrice != null || filters.maxPrice != null) bump(15)
  if (filters.minBedrooms != null) bump(10)
  if (filters.minSurface != null) bump(10)
  if (filters.q?.trim()) bump(10)
  if (filters.amenities?.length) bump(5)
  return score
}
