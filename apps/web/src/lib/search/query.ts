/**
 * Query builder para búsqueda de listings.
 * Extrae filtros del texto (q) vía mergePublicSearchFromQuery; full-text solo sobre texto residual.
 */

import type { SearchFilters } from './types'
import { getListingsIndex } from './client'
import { mergePublicSearchFromQuery } from '@propieya/shared'

const INDEX = getListingsIndex()

function sanitize(q: string): string {
  return q.trim().slice(0, 200).replace(/[<>*?":|\\[\]{}()&]/g, ' ')
}

export function buildSearchBody(filters: SearchFilters): Record<string, unknown> {
  const merged = mergePublicSearchFromQuery(filters)
  const { residualTextQuery, ...rest } = merged
  const must: Record<string, unknown>[] = [{ term: { status: 'active' } }]
  const mustNot: Record<string, unknown>[] = []

  /** Cada amenity como `term` (AND), alineado al SQL con varios `@>`. */
  if ((rest.amenities?.length ?? 0) > 0) {
    for (const a of rest.amenities!) {
      must.push({ term: { amenities: a } })
    }
  }

  /** Facets flags/excludes (Sprint 26). Inicialmente se materializan como amenities. */
  if ((rest.facets?.flags?.length ?? 0) > 0) {
    for (const f of rest.facets!.flags!) {
      must.push({ term: { amenities: f } })
    }
  }
  if ((rest.facets?.excludeFlags?.length ?? 0) > 0) {
    for (const f of rest.facets!.excludeFlags!) {
      mustNot.push({ term: { amenities: f } })
    }
  }

  const textQ = sanitize(residualTextQuery)
  if (textQ.length > 0) {
    must.push({
      multi_match: {
        query: textQ,
        fields: ['title^2', 'description', 'address.city', 'address.neighborhood'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    })
  }

  if (rest.operationType) {
    must.push({ term: { operationType: rest.operationType } })
  }
  if (rest.propertyType) {
    must.push({ term: { propertyType: rest.propertyType } })
  }
  if (rest.minPrice !== undefined) {
    must.push({ range: { priceAmount: { gte: rest.minPrice } } })
  }
  if (rest.maxPrice !== undefined) {
    must.push({ range: { priceAmount: { lte: rest.maxPrice } } })
  }
  if (rest.minSurface !== undefined) {
    must.push({ range: { surfaceTotal: { gte: rest.minSurface } } })
  }
  if (rest.maxSurface !== undefined) {
    must.push({ range: { surfaceTotal: { lte: rest.maxSurface } } })
  }
  if (rest.minBedrooms !== undefined) {
    must.push({ range: { bedrooms: { gte: rest.minBedrooms } } })
  }
  if (rest.minBathrooms !== undefined) {
    must.push({ range: { bathrooms: { gte: rest.minBathrooms } } })
  }
  if (rest.minGarages !== undefined) {
    must.push({ range: { garages: { gte: rest.minGarages } } })
  }
  if (rest.floorMin !== undefined) {
    must.push({ range: { floor: { gte: rest.floorMin } } })
  }
  if (rest.floorMax !== undefined) {
    must.push({ range: { floor: { lte: rest.floorMax } } })
  }
  if (rest.escalera?.trim()) {
    must.push({ term: { escalera: rest.escalera.trim().toUpperCase() } })
  }
  if (rest.orientation?.trim()) {
    must.push({ term: { orientation: rest.orientation.trim() } })
  }
  if (rest.minSurfaceCovered !== undefined) {
    must.push({
      range: { surfaceCovered: { gte: rest.minSurfaceCovered } },
    })
  }
  if (rest.maxSurfaceCovered !== undefined) {
    must.push({
      range: { surfaceCovered: { lte: rest.maxSurfaceCovered } },
    })
  }
  if (rest.minTotalRooms !== undefined) {
    must.push({
      range: { totalRooms: { gte: rest.minTotalRooms } },
    })
  }
  if (rest.city?.trim()) {
    const c = sanitize(rest.city)
    if (c.length > 0) {
      must.push({
        match: { 'address.city': { query: c, operator: 'or' } },
      })
    }
  }
  if (rest.neighborhood?.trim()) {
    const n = sanitize(rest.neighborhood)
    if (n.length > 0) {
      must.push({
        match: { 'address.neighborhood': { query: n, operator: 'or' } },
      })
    }
  }

  if (rest.bbox) {
    const { south, north, west, east } = rest.bbox
    must.push({
      geo_bounding_box: {
        location: {
          top_left: { lat: north, lon: west },
          bottom_right: { lat: south, lon: east },
        },
      },
    })
  }

  if (rest.polygon && rest.polygon.length >= 3) {
    must.push({
      geo_polygon: {
        location: {
          points: rest.polygon.map((p) => ({ lat: p.lat, lon: p.lng })),
        },
      },
    })
  }

  if (rest.geoPoint && rest.geoRadius) {
    must.push({
      geo_distance: {
        distance: `${Math.round(rest.geoRadius)}m`,
        location: { lat: rest.geoPoint.lat, lon: rest.geoPoint.lng },
      },
    })
  }

  const size = Math.min(rest.limit ?? 24, 50)
  const from = Math.min(rest.offset ?? 0, 500)

  return {
    query: { bool: { must, ...(mustNot.length > 0 ? { must_not: mustNot } : {}) } },
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
