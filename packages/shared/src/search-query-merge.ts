/**
 * Une filtros explícitos de UI con los extraídos del texto `q` (Sprint 22).
 * `residualTextQuery` es lo que debe ir a full-text (ES / ILIKE), sin repetir lo ya filtrado.
 */

import {
  extractFiltersFromQueryDetailed,
  stripConsumedPartsFromQuery,
} from './search-term-extractor'

/**
 * Campos que el extractor puede completar desde texto libre.
 * `operationType` / `propertyType` como string para compatir con inputs Zod/tRPC.
 */
export type MergeableSearchBase = {
  q?: string
  operationType?: string
  propertyType?: string
  amenities?: string[]
  minSurface?: number
  maxSurface?: number
  minBedrooms?: number
  minBathrooms?: number
  minGarages?: number
  floorMin?: number
  floorMax?: number
  escalera?: string
  minPrice?: number
  maxPrice?: number
  /** Ancla opcional para orden por cercanía (no filtra); solo con localidad explícita en servidor. */
  sortNearLat?: number
  sortNearLng?: number
}

/** Entrada para `residualPublicSearchText` (merge + quitar localidad ya filtrada). */
export type ResidualSearchTextInput = MergeableSearchBase & {
  city?: string
  neighborhood?: string
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripPlaceTokens(text: string, place: string | undefined): string {
  if (!place?.trim() || !text) return text
  const t = place.trim()
  const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, 'gi')
  return text.replace(re, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Merge de `q` + filtros, con `residualTextQuery` ya recortado (sin ciudad/barrio repetidos en texto).
 */
export function mergePublicSearchWithResidual(input: ResidualSearchTextInput) {
  const { city, neighborhood, ...mergeable } = input
  const m = mergePublicSearchFromQuery(mergeable)
  let r = m.residualTextQuery.trim()
  r = stripPlaceTokens(r, city)
  r = stripPlaceTokens(r, neighborhood)
  const displayResidual = r.replace(/\s+/g, ' ').trim()
  return { ...m, residualTextQuery: displayResidual }
}

/**
 * Texto que debe ir a `q` en URL y a full-text: sin lo ya cubierto por filtros estructurados
 * ni por ciudad/barrio explícitos (evita «casa en venta en funes» + en Funes en UI y ES).
 */
export function residualPublicSearchText(input: ResidualSearchTextInput): string {
  return mergePublicSearchWithResidual(input).residualTextQuery
}

export function mergePublicSearchFromQuery<T extends MergeableSearchBase>(
  input: T
): T & { residualTextQuery: string } {
  const q = input.q?.trim()
  if (!q) {
    return { ...input, residualTextQuery: '' }
  }
  const { filters: ex, consumedParts } = extractFiltersFromQueryDetailed(q)
  const residualTextQuery = stripConsumedPartsFromQuery(q, consumedParts)
  return {
    ...input,
    /**
     * Si el texto declara operación o tipo (p. ej. «en alquiler», «departamento»), debe ganar
     * sobre la URL / páginas `/venta` y `/alquiler` que envían `operationType` forzado; si no,
     * seguiríamos buscando venta+depto y el listado queda en cero.
     */
    operationType: ex.operationType ?? input.operationType,
    propertyType: ex.propertyType ?? input.propertyType,
    amenities: [...new Set([...(input.amenities ?? []), ...((ex.amenities ?? []) as string[])])],
    minSurface: ex.minSurface ?? input.minSurface,
    maxSurface: ex.maxSurface ?? input.maxSurface,
    minBedrooms: ex.minBedrooms ?? input.minBedrooms,
    minBathrooms: ex.minBathrooms ?? input.minBathrooms,
    minGarages: ex.minGarages ?? input.minGarages,
    floorMin: ex.floorMin ?? input.floorMin,
    floorMax: ex.floorMax ?? input.floorMax,
    escalera: ex.escalera ?? input.escalera,
    minPrice: ex.minPrice ?? input.minPrice,
    maxPrice: ex.maxPrice ?? input.maxPrice,
    residualTextQuery,
  }
}
