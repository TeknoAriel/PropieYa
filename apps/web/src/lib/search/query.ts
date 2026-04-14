/**
 * Query builder para búsqueda de listings.
 * Extrae filtros del texto (q) vía mergePublicSearchFromQuery; full-text solo sobre texto residual.
 *
 * Perfiles:
 * - `catalog`: restricciones duras (AND) en precio, localidad, dormitorios, etc.
 * - `intent`: operación/tipo duros; el resto rankea vía `should` + `constant_score` (sin excluir).
 */

import { inferListingMatchProfile, mergePublicSearchFromQuery } from '@propieya/shared'

import type { SearchFilters } from './types'
import { getListingsIndex } from './client'

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

function appendPriceClauses(
  must: Record<string, unknown>[],
  should: Record<string, unknown>[],
  intentSemi: boolean,
  minP?: number,
  maxP?: number
): void {
  if (minP === undefined && maxP === undefined) return
  if (!intentSemi) {
    if (minP !== undefined) {
      must.push({ range: { priceAmount: { gte: minP } } })
    }
    if (maxP !== undefined) {
      must.push({ range: { priceAmount: { lte: maxP } } })
    }
    return
  }
  if (minP !== undefined && maxP !== undefined) {
    should.push({
      constant_score: {
        filter: { range: { priceAmount: { gte: minP, lte: maxP } } },
        boost: 34,
      },
    })
    const lo = Math.max(0, Math.floor(minP * 0.82))
    const hi = Math.ceil(maxP * 1.22)
    should.push({
      constant_score: {
        filter: { range: { priceAmount: { gte: lo, lte: hi } } },
        boost: 16,
      },
    })
    return
  }
  if (maxP !== undefined) {
    should.push({
      constant_score: {
        filter: { range: { priceAmount: { lte: maxP } } },
        boost: 32,
      },
    })
    should.push({
      constant_score: {
        filter: { range: { priceAmount: { lte: Math.ceil(maxP * 1.22) } } },
        boost: 14,
      },
    })
  } else if (minP !== undefined) {
    should.push({
      constant_score: {
        filter: { range: { priceAmount: { gte: minP } } },
        boost: 32,
      },
    })
    should.push({
      constant_score: {
        filter: { range: { priceAmount: { gte: Math.floor(minP * 0.85) } } },
        boost: 14,
      },
    })
  }
}

function appendSurfaceClauses(
  must: Record<string, unknown>[],
  should: Record<string, unknown>[],
  intentSemi: boolean,
  minS?: number,
  maxS?: number
): void {
  if (minS === undefined && maxS === undefined) return
  if (!intentSemi) {
    if (minS !== undefined) must.push({ range: { surfaceTotal: { gte: minS } } })
    if (maxS !== undefined) must.push({ range: { surfaceTotal: { lte: maxS } } })
    return
  }
  if (minS !== undefined && maxS !== undefined) {
    should.push({
      constant_score: {
        filter: { range: { surfaceTotal: { gte: minS, lte: maxS } } },
        boost: 20,
      },
    })
    should.push({
      constant_score: {
        filter: {
          range: {
            surfaceTotal: {
              gte: Math.max(0, Math.floor(minS * 0.88)),
              lte: Math.ceil(maxS * 1.15),
            },
          },
        },
        boost: 10,
      },
    })
  } else if (minS !== undefined) {
    should.push({
      constant_score: {
        filter: { range: { surfaceTotal: { gte: minS } } },
        boost: 18,
      },
    })
    should.push({
      constant_score: {
        filter: {
          range: { surfaceTotal: { gte: Math.max(0, Math.floor(minS * 0.85)) } },
        },
        boost: 9,
      },
    })
  } else if (maxS !== undefined) {
    should.push({
      constant_score: {
        filter: { range: { surfaceTotal: { lte: maxS } } },
        boost: 18,
      },
    })
    should.push({
      constant_score: {
        filter: {
          range: { surfaceTotal: { lte: Math.ceil(maxS * 1.15) } },
        },
        boost: 9,
      },
    })
  }
}

function appendMinNumericBoost(
  must: Record<string, unknown>[],
  should: Record<string, unknown>[],
  intentSemi: boolean,
  field: 'bedrooms' | 'bathrooms' | 'garages',
  minV: number | undefined,
  boostExact: number,
  boostLoose: number
): void {
  if (minV === undefined) return
  if (!intentSemi) {
    must.push({ range: { [field]: { gte: minV } } })
    return
  }
  should.push({
    constant_score: {
      filter: { range: { [field]: { gte: minV } } },
      boost: boostExact,
    },
  })
  const loose = Math.max(0, minV - 1)
  should.push({
    constant_score: {
      filter: { range: { [field]: { gte: loose } } },
      boost: boostLoose,
    },
  })
}

function appendLocalityClauses(
  must: Record<string, unknown>[],
  should: Record<string, unknown>[],
  intentSemi: boolean,
  city?: string,
  neighborhood?: string
): void {
  const cityClause = city?.trim() ? esLocalityMatchClause(city) : null
  const nbClause = neighborhood?.trim() ? esLocalityMatchClause(neighborhood) : null
  if (intentSemi) {
    if (cityClause) {
      should.push({ constant_score: { filter: cityClause, boost: 26 } })
    }
    if (nbClause) {
      should.push({ constant_score: { filter: nbClause, boost: 26 } })
    }
  } else {
    if (cityClause) must.push(cityClause)
    if (nbClause) must.push(nbClause)
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
  const intentSemi =
    inferListingMatchProfile({
      q: filters.q,
      explicit: filters.matchProfile,
    }) === 'intent'

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

  appendPriceClauses(must, should, intentSemi, rest.minPrice, rest.maxPrice)
  appendSurfaceClauses(must, should, intentSemi, rest.minSurface, rest.maxSurface)
  appendMinNumericBoost(must, should, intentSemi, 'bedrooms', rest.minBedrooms, 18, 9)
  appendMinNumericBoost(must, should, intentSemi, 'bathrooms', rest.minBathrooms, 12, 6)
  appendMinNumericBoost(must, should, intentSemi, 'garages', rest.minGarages, 10, 5)

  if (!intentSemi) {
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
  } else {
    if (rest.floorMin !== undefined) {
      should.push({
        constant_score: {
          filter: { range: { floor: { gte: rest.floorMin } } },
          boost: 8,
        },
      })
    }
    if (rest.floorMax !== undefined) {
      should.push({
        constant_score: {
          filter: { range: { floor: { lte: rest.floorMax } } },
          boost: 8,
        },
      })
    }
    if (rest.escalera?.trim()) {
      should.push({
        constant_score: {
          filter: { term: { escalera: rest.escalera.trim().toUpperCase() } },
          boost: 8,
        },
      })
    }
    if (rest.orientation?.trim()) {
      should.push({
        constant_score: {
          filter: { term: { orientation: rest.orientation.trim() } },
          boost: 8,
        },
      })
    }
    if (rest.minSurfaceCovered !== undefined) {
      should.push({
        constant_score: {
          filter: { range: { surfaceCovered: { gte: rest.minSurfaceCovered } } },
          boost: 8,
        },
      })
    }
    if (rest.maxSurfaceCovered !== undefined) {
      should.push({
        constant_score: {
          filter: { range: { surfaceCovered: { lte: rest.maxSurfaceCovered } } },
          boost: 8,
        },
      })
    }
    if (rest.minTotalRooms !== undefined) {
      should.push({
        constant_score: {
          filter: { range: { totalRooms: { gte: rest.minTotalRooms } } },
          boost: 10,
        },
      })
    }
  }

  appendLocalityClauses(must, should, intentSemi, rest.city, rest.neighborhood)

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

  const useScoreSort = textQ.length > 0 || intentSemi
  const sort: Record<string, unknown>[] =
    useScoreSort
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

/** Longitud del array `sort` / `search_after` en ES (4–6 según texto, perfil intent o cercanía). */
export function getListingSearchSortKeyCount(filters: SearchFilters): 4 | 5 | 6 {
  const merged = mergePublicSearchFromQuery(filters)
  const textQ = sanitize(merged.residualTextQuery)
  const profile = inferListingMatchProfile({
    q: filters.q,
    explicit: filters.matchProfile,
  })
  const useScore = textQ.length > 0 || profile === 'intent'
  const base = useScore ? 5 : 4
  const { residualTextQuery: _r, ...geoRest } = merged
  return (base +
    (shouldApplyLocalityProximitySort(geoRest as SearchFilters) ? 1 : 0)) as 4 | 5 | 6
}

export function getSearchParams(filters: SearchFilters) {
  return {
    index: INDEX,
    body: buildSearchBody(filters),
  }
}
