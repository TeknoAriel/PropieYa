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

/**
 * Topónimo en ciudad/barrio del feed suele caer en `neighborhood`, título o descripción
 * mientras `address.city` queda vacío; un match solo sobre city devuelve 0 aunque haya oferta.
 */
function esLocalityMatchClause(placeRaw: string): Record<string, unknown> | null {
  const q = sanitize(placeRaw)
  if (q.length === 0) return null
  return {
    bool: {
      should: [
        { match: { 'address.city': { query: q, operator: 'and' } } },
        { match: { 'address.neighborhood': { query: q, operator: 'and' } } },
        { match: { title: { query: q, operator: 'and' } } },
        { match: { description: { query: q, operator: 'and' } } },
      ],
      minimum_should_match: 1,
    },
  }
}

/** Orden por distancia solo con localidad explícita y ancla válida (no filtra). */
export function shouldApplyLocalityProximitySort(
  rest: Pick<SearchFilters, 'city' | 'neighborhood' | 'sortNearLat' | 'sortNearLng'>
): boolean {
  const hasLocality = Boolean(rest.city?.trim() || rest.neighborhood?.trim())
  const lat = rest.sortNearLat
  const lng = rest.sortNearLng
  return (
    hasLocality &&
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

export function buildSearchBody(filters: SearchFilters): Record<string, unknown> {
  const merged = mergePublicSearchFromQuery(filters)
  const { residualTextQuery, ...rest } = merged
  const must: Record<string, unknown>[] = [{ term: { status: 'active' } }]
  const mustNot: Record<string, unknown>[] = []
  const should: Record<string, unknown>[] = []

  const amenityTerms = new Set<string>()
  for (const a of rest.amenities ?? []) amenityTerms.add(a)
  for (const f of rest.facets?.flags ?? []) amenityTerms.add(f)

  const strictAmenities = rest.amenitiesMatchMode === 'strict'
  if (amenityTerms.size > 0) {
    if (strictAmenities) {
      for (const term of amenityTerms) {
        must.push({ term: { amenities: term } })
      }
    } else {
      for (const term of amenityTerms) {
        should.push({
          constant_score: {
            filter: { term: { amenities: term } },
            boost: 2.2,
          },
        })
      }
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
        fields: [
          'title^3',
          'description^0.85',
          'address.city^1.2',
          'address.neighborhood^1.6',
        ],
        type: 'best_fields',
        fuzziness: 'AUTO',
        tie_breaker: 0.12,
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
  const cityClause = rest.city?.trim() ? esLocalityMatchClause(rest.city) : null
  if (cityClause) must.push(cityClause)
  const nbClause = rest.neighborhood?.trim()
    ? esLocalityMatchClause(rest.neighborhood)
    : null
  if (nbClause) must.push(nbClause)

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
  const searchAfter =
    Array.isArray(rest.searchAfter) && rest.searchAfter.length > 0
      ? rest.searchAfter
      : null

  /** Con texto residual, primero `_score` (relevancia) y luego recencia estable. */
  const dateSort: Record<string, unknown>[] = [
    {
      publishedAt: {
        order: 'desc' as const,
        unmapped_type: 'date',
        missing: '_last',
      },
    },
    {
      updatedAt: {
        order: 'desc' as const,
        unmapped_type: 'date',
        missing: '_last',
      },
    },
    {
      createdAt: {
        order: 'desc' as const,
        unmapped_type: 'date',
        missing: '_last',
      },
    },
    { id: { order: 'desc' as const } },
  ]
  const useProximity = shouldApplyLocalityProximitySort(rest)
  const geoDistSort: Record<string, unknown> | null = useProximity
    ? {
        _geo_distance: {
          location: {
            lat: rest.sortNearLat!,
            lon: rest.sortNearLng!,
          },
          order: 'asc' as const,
          unit: 'm' as const,
          missing: '_last',
        },
      }
    : null
  const sort: Record<string, unknown>[] =
    textQ.length > 0
      ? geoDistSort
        ? [{ _score: { order: 'desc' as const } }, geoDistSort, ...dateSort]
        : [{ _score: { order: 'desc' as const } }, ...dateSort]
      : geoDistSort
        ? [geoDistSort, ...dateSort]
        : dateSort

  const boolQuery: Record<string, unknown> = { must }
  if (mustNot.length > 0) boolQuery.must_not = mustNot
  if (should.length > 0) boolQuery.should = should

  const body: Record<string, unknown> = {
    query: { bool: boolQuery },
    sort,
    size,
    track_total_hits: true,
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

  if (searchAfter) {
    body.search_after = searchAfter
  } else {
    body.from = from
  }

  return body
}

/** Longitud del array `sort` / `search_after` en ES (4–6 según texto y cercanía por localidad). */
export function getListingSearchSortKeyCount(filters: SearchFilters): 4 | 5 | 6 {
  const merged = mergePublicSearchFromQuery(filters)
  const { residualTextQuery, ...rest } = merged
  const base = sanitize(residualTextQuery).length > 0 ? 5 : 4
  return (base + (shouldApplyLocalityProximitySort(rest as SearchFilters) ? 1 : 0)) as 4 | 5 | 6
}

export function getSearchParams(filters: SearchFilters) {
  return {
    index: INDEX,
    body: buildSearchBody(filters),
  }
}
