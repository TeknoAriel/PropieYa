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
type MergeableSearchBase = {
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
    operationType: input.operationType ?? ex.operationType,
    propertyType: input.propertyType ?? ex.propertyType,
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
