/**
 * Query builder para búsqueda de listings.
 * Extrae filtros del texto (q) vía extractFiltersFromQuery para búsqueda por asistente.
 */

import type { SearchFilters } from './types'
import { getListingsIndex } from './client'
import { extractFiltersFromQuery } from '@propieya/shared'

const INDEX = getListingsIndex()

function sanitize(q: string): string {
  return q.trim().slice(0, 200).replace(/[<>*?":|\\[\]{}()&]/g, ' ')
}

/** Combina filtros explícitos con los extraídos del texto de búsqueda. */
function mergeFilters(filters: SearchFilters): SearchFilters {
  if (!filters.q?.trim()) return filters
  const extracted = extractFiltersFromQuery(filters.q)
  return {
    ...filters,
    amenities: [...new Set([...(filters.amenities ?? []), ...(extracted.amenities ?? [])])],
    minSurface: extracted.minSurface ?? filters.minSurface,
    maxSurface: extracted.maxSurface ?? filters.maxSurface,
    minBedrooms: extracted.minBedrooms ?? filters.minBedrooms,
    minBathrooms: extracted.minBathrooms ?? filters.minBathrooms,
    minGarages: extracted.minGarages ?? filters.minGarages,
    floorMin: extracted.floorMin ?? filters.floorMin,
    floorMax: extracted.floorMax ?? filters.floorMax,
    escalera: extracted.escalera ?? filters.escalera,
    minPrice: extracted.minPrice ?? filters.minPrice,
    maxPrice: extracted.maxPrice ?? filters.maxPrice,
  }
}

export function buildSearchBody(filters: SearchFilters): Record<string, unknown> {
  const merged = mergeFilters(filters)
  const must: Record<string, unknown>[] = [{ term: { status: 'active' } }]

  if ((merged.amenities?.length ?? 0) > 0) {
    must.push({ terms: { amenities: merged.amenities } })
  }

  if (merged.q?.trim()) {
    const q = sanitize(merged.q)
    if (q.length > 0) {
      must.push({
        multi_match: {
          query: q,
          fields: ['title^2', 'description', 'address.city', 'address.neighborhood'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      })
    }
  }

  if (merged.operationType) {
    must.push({ term: { operationType: merged.operationType } })
  }
  if (merged.propertyType) {
    must.push({ term: { propertyType: merged.propertyType } })
  }
  if (merged.minPrice !== undefined) {
    must.push({ range: { priceAmount: { gte: merged.minPrice } } })
  }
  if (merged.maxPrice !== undefined) {
    must.push({ range: { priceAmount: { lte: merged.maxPrice } } })
  }
  if (merged.minSurface !== undefined) {
    must.push({ range: { surfaceTotal: { gte: merged.minSurface } } })
  }
  if (merged.maxSurface !== undefined) {
    must.push({ range: { surfaceTotal: { lte: merged.maxSurface } } })
  }
  if (merged.minBedrooms !== undefined) {
    must.push({ range: { bedrooms: { gte: merged.minBedrooms } } })
  }
  if (merged.minBathrooms !== undefined) {
    must.push({ range: { bathrooms: { gte: merged.minBathrooms } } })
  }
  if (merged.minGarages !== undefined) {
    must.push({ range: { garages: { gte: merged.minGarages } } })
  }
  if (merged.floorMin !== undefined) {
    must.push({ range: { floor: { gte: merged.floorMin } } })
  }
  if (merged.floorMax !== undefined) {
    must.push({ range: { floor: { lte: merged.floorMax } } })
  }
  if (merged.escalera?.trim()) {
    must.push({ term: { escalera: merged.escalera.trim().toUpperCase() } })
  }
  if (merged.orientation?.trim()) {
    must.push({ term: { orientation: merged.orientation.trim() } })
  }
  if (merged.minSurfaceCovered !== undefined) {
    must.push({
      range: { surfaceCovered: { gte: merged.minSurfaceCovered } },
    })
  }
  if (merged.maxSurfaceCovered !== undefined) {
    must.push({
      range: { surfaceCovered: { lte: merged.maxSurfaceCovered } },
    })
  }
  if (merged.minTotalRooms !== undefined) {
    must.push({
      range: { totalRooms: { gte: merged.minTotalRooms } },
    })
  }
  if (merged.city?.trim()) {
    const c = sanitize(merged.city)
    if (c.length > 0) {
      must.push({
        match: { 'address.city': { query: c, operator: 'or' } },
      })
    }
  }
  if (merged.neighborhood?.trim()) {
    const n = sanitize(merged.neighborhood)
    if (n.length > 0) {
      must.push({
        match: { 'address.neighborhood': { query: n, operator: 'or' } },
      })
    }
  }

  if (merged.bbox) {
    const { south, north, west, east } = merged.bbox
    must.push({
      geo_bounding_box: {
        location: {
          top_left: { lat: north, lon: west },
          bottom_right: { lat: south, lon: east },
        },
      },
    })
  }

  const size = Math.min(merged.limit ?? 24, 50)
  const from = Math.min(merged.offset ?? 0, 500)

  return {
    query: { bool: { must } },
    sort: [
      { publishedAt: { order: 'desc', unmapped_type: 'date' } },
      { updatedAt: { order: 'desc', unmapped_type: 'date' } },
      { createdAt: { order: 'desc', unmapped_type: 'date' } },
    ],
    size,
    from,
    _source: [
      'id',
      'title',
      'description',
      'propertyType',
      'operationType',
      'priceAmount',
      'priceCurrency',
      'address',
      'surfaceTotal',
      'surfaceCovered',
      'bedrooms',
      'bathrooms',
      'garages',
      'totalRooms',
      'floor',
      'escalera',
      'orientation',
      'amenities',
      'location',
      'primaryImageUrl',
      'publishedAt',
      'updatedAt',
    ],
  }
}

export function getSearchParams(filters: SearchFilters) {
  return {
    index: INDEX,
    body: buildSearchBody(filters),
  }
}
