/**
 * Buscador v2 (MVP): sesión → tres buckets (strong / near / widened).
 * No usa `searchListingsLayered` ni la relajación legacy.
 */

import type {
  ExplainMatchFilters,
  ListingSearchV2Bucket,
  ListingSearchV2Result,
  SearchSessionMVP,
  SearchV2Action,
  SearchV2BucketId,
} from '@propieya/shared'
import {
  SEARCH_V2_BUCKET_LABELS,
  normalizeSearchSessionMVP,
  searchSessionHasAnchor,
  withMatchReasons,
} from '@propieya/shared'

import type { SearchFilters } from './types'
import { searchListings, type SearchHit } from './search'

const BUCKET_ORDER: SearchV2BucketId[] = ['strong', 'near', 'widened']

function geoSlice(s: SearchSessionMVP): Pick<SearchFilters, 'bbox' | 'polygon'> {
  if (!s.mapCommitted) return {}
  if (s.mapMode === 'polygon' && s.polygon && s.polygon.length >= 3) {
    return { polygon: s.polygon }
  }
  if (s.mapMode === 'bbox' && s.bbox) return { bbox: s.bbox }
  return {}
}

function amenitySlice(s: SearchSessionMVP): Pick<SearchFilters, 'amenities' | 'facets'> {
  const ids = s.amenityIds ?? []
  if (ids.length === 0) return {}
  return {
    amenities: ids,
    facets: { flags: ids },
  }
}

function stretchPrice(
  minP: number | null | undefined,
  maxP: number | null | undefined,
  fixed: boolean,
  factorUp: number,
  factorDown: number
): { min?: number; max?: number } {
  if (fixed) {
    return {
      min: minP ?? undefined,
      max: maxP ?? undefined,
    }
  }
  let min = minP ?? undefined
  let max = maxP ?? undefined
  if (max !== undefined) max = Math.ceil(max * factorUp)
  if (min !== undefined) min = Math.floor(min * factorDown)
  return { min, max }
}

function filtersStrong(s: SearchSessionMVP): SearchFilters {
  const geo = geoSlice(s)
  const am = amenitySlice(s)
  return {
    q: s.q ?? undefined,
    operationType: s.operationType ?? undefined,
    propertyType: s.propertyType ?? undefined,
    city: s.city ?? undefined,
    neighborhood: s.neighborhood ?? undefined,
    minPrice: s.minPrice ?? undefined,
    maxPrice: s.maxPrice ?? undefined,
    minBedrooms: s.minBedrooms ?? undefined,
    minSurface: s.minSurface ?? undefined,
    maxSurface: s.maxSurface ?? undefined,
    ...am,
    amenitiesMatchMode: s.strictAmenities ? 'strict' : 'preferred',
    matchProfile: 'catalog',
    ...geo,
  }
}

function filtersNear(s: SearchSessionMVP): SearchFilters {
  const geo = geoSlice(s)
  const am = amenitySlice(s)
  const { min, max } = stretchPrice(s.minPrice, s.maxPrice, s.fixedBudget, 1.1, 0.9)
  return {
    q: s.q ?? undefined,
    operationType: s.operationType ?? undefined,
    propertyType: s.fixedPropertyType ? (s.propertyType ?? undefined) : undefined,
    city: s.city ?? undefined,
    neighborhood: undefined,
    minPrice: min,
    maxPrice: max,
    minBedrooms:
      s.minBedrooms != null ? Math.max(0, s.minBedrooms - 1) : undefined,
    minSurface: undefined,
    maxSurface: undefined,
    ...am,
    amenitiesMatchMode: 'preferred',
    matchProfile: 'catalog',
    ...geo,
  }
}

function filtersWidened(s: SearchSessionMVP): SearchFilters {
  const geo = geoSlice(s)
  const am = amenitySlice(s)
  const { min, max } = stretchPrice(s.minPrice, s.maxPrice, s.fixedBudget, 1.22, 0.85)
  return {
    q: s.q ?? undefined,
    operationType: undefined,
    propertyType: undefined,
    city: s.city ?? undefined,
    neighborhood: undefined,
    minPrice: min,
    maxPrice: max,
    minBedrooms: undefined,
    minSurface: undefined,
    maxSurface: undefined,
    ...am,
    amenitiesMatchMode: 'preferred',
    matchProfile: 'intent',
    ...geo,
  }
}

function explainStrong(s: SearchSessionMVP): ExplainMatchFilters {
  return {
    q: s.q ?? undefined,
    operationType: s.operationType ?? undefined,
    propertyType: s.propertyType ?? undefined,
    city: s.city ?? undefined,
    neighborhood: s.neighborhood ?? undefined,
    minPrice: s.minPrice ?? undefined,
    maxPrice: s.maxPrice ?? undefined,
    minBedrooms: s.minBedrooms ?? undefined,
    minSurface: s.minSurface ?? undefined,
    maxSurface: s.maxSurface ?? undefined,
    amenities: s.amenityIds?.length ? s.amenityIds : undefined,
    bbox: s.mapMode === 'bbox' ? s.bbox ?? undefined : undefined,
    mapPolygonActive: s.mapMode === 'polygon',
    matchProfile: 'catalog',
  }
}

function explainNear(s: SearchSessionMVP): ExplainMatchFilters {
  const { min, max } = stretchPrice(s.minPrice, s.maxPrice, s.fixedBudget, 1.1, 0.9)
  return {
    q: s.q ?? undefined,
    operationType: s.operationType ?? undefined,
    propertyType: s.fixedPropertyType ? (s.propertyType ?? undefined) : undefined,
    city: s.city ?? undefined,
    minPrice: min,
    maxPrice: max,
    minBedrooms:
      s.minBedrooms != null ? Math.max(0, s.minBedrooms - 1) : undefined,
    amenities: s.amenityIds?.length ? s.amenityIds : undefined,
    bbox: s.mapMode === 'bbox' ? s.bbox ?? undefined : undefined,
    mapPolygonActive: s.mapMode === 'polygon',
    matchProfile: 'catalog',
  }
}

function explainWidened(s: SearchSessionMVP): ExplainMatchFilters {
  const { min, max } = stretchPrice(s.minPrice, s.maxPrice, s.fixedBudget, 1.22, 0.85)
  return {
    q: s.q ?? undefined,
    city: s.city ?? undefined,
    minPrice: min,
    maxPrice: max,
    amenities: s.amenityIds?.length ? s.amenityIds : undefined,
    bbox: s.mapMode === 'bbox' ? s.bbox ?? undefined : undefined,
    mapPolygonActive: s.mapMode === 'polygon',
    matchProfile: 'intent',
  }
}

function explainForBucket(id: SearchV2BucketId, s: SearchSessionMVP): ExplainMatchFilters {
  if (id === 'strong') return explainStrong(s)
  if (id === 'near') return explainNear(s)
  return explainWidened(s)
}

function buildActions(s: SearchSessionMVP): SearchV2Action[] {
  const out: SearchV2Action[] = []
  if (s.neighborhood?.trim()) {
    out.push({
      id: 'drop_neighborhood',
      label: 'Quitar barrio',
      patch: { neighborhood: null },
    })
  }
  if (s.strictAmenities) {
    out.push({
      id: 'relax_amenities',
      label: 'Amenities como preferencia (no obligatorios)',
      patch: { strictAmenities: false },
    })
  }
  if (s.mapCommitted) {
    out.push({
      id: 'unmap_filter',
      label: 'Dejar de filtrar por el mapa',
      patch: { mapCommitted: false, mapMode: 'off', bbox: null, polygon: null },
    })
  }
  if (s.minPrice != null || s.maxPrice != null) {
    out.push({
      id: 'clear_price',
      label: 'Quitar filtro de precio',
      patch: { minPrice: null, maxPrice: null },
    })
  }
  if (s.propertyType?.trim() && s.fixedPropertyType) {
    out.push({
      id: 'unfix_type',
      label: 'Permitir otros tipos de propiedad',
      patch: { fixedPropertyType: false },
    })
  }
  return out.slice(0, 5)
}

function emptyBuckets(): ListingSearchV2Bucket[] {
  return BUCKET_ORDER.map((id) => ({
    id,
    label: SEARCH_V2_BUCKET_LABELS[id],
    items: [],
    totalInBucket: 0,
  }))
}

export async function runListingSearchV2(opts: {
  session: SearchSessionMVP
  limitPerBucket: number
}): Promise<ListingSearchV2Result> {
  const limit = Math.min(40, Math.max(1, opts.limitPerBucket))
  const normalized = normalizeSearchSessionMVP(opts.session)

  const baseMessages: string[] = []
  const hadGeoDrawn =
    opts.session.bbox != null || (opts.session.polygon?.length ?? 0) >= 3
  if (!opts.session.mapCommitted && hadGeoDrawn) {
    baseMessages.push(
      'El mapa se muestra como referencia. Para filtrar por zona, usá «Buscar en esta zona».'
    )
  }

  if (!searchSessionHasAnchor(normalized)) {
    return {
      sessionNormalized: normalized,
      buckets: emptyBuckets(),
      messages: baseMessages,
      emptyExplanation:
        'Elegí al menos una ciudad, un barrio, una zona en el mapa (y confirmala con «Buscar en esta zona») o escribí palabras clave.',
      actions: [],
      totalsByBucket: { strong: 0, near: 0, widened: 0 },
      orderedListingIds: [],
    }
  }

  const fStrong = filtersStrong(normalized)
  const fNear = filtersNear(normalized)
  const fWide = filtersWidened(normalized)

  const resStrong = await searchListings({ ...fStrong, limit, offset: 0 })
  if (!resStrong.fromEs) {
    return {
      sessionNormalized: normalized,
      buckets: emptyBuckets(),
      messages: [
        ...baseMessages,
        'El buscador no está disponible en este momento. Probá de nuevo en unos segundos.',
      ],
      emptyExplanation:
        'No pudimos consultar el índice de búsqueda. Los resultados aparecerán cuando el servicio vuelva a responder.',
      actions: [],
      totalsByBucket: { strong: 0, near: 0, widened: 0 },
      orderedListingIds: [],
    }
  }

  const seen = new Set<string>()
  const strongHits = resStrong.hits.slice(0, limit)
  for (const h of strongHits) seen.add(h.id)

  const resNear = await searchListings({ ...fNear, limit: limit + seen.size, offset: 0 })
  const nearHits =
    resNear.fromEs && resNear.hits.length > 0
      ? resNear.hits.filter((h) => !seen.has(h.id)).slice(0, limit)
      : []
  for (const h of nearHits) seen.add(h.id)

  const resWide = await searchListings({
    ...fWide,
    limit: limit + seen.size,
    offset: 0,
  })
  const wideHits =
    resWide.fromEs && resWide.hits.length > 0
      ? resWide.hits.filter((h) => !seen.has(h.id)).slice(0, limit)
      : []

  const buckets: ListingSearchV2Bucket[] = [
    {
      id: 'strong',
      label: SEARCH_V2_BUCKET_LABELS.strong,
      items: withMatchReasons(explainForBucket('strong', normalized), strongHits) as unknown[],
      totalInBucket: strongHits.length,
    },
    {
      id: 'near',
      label: SEARCH_V2_BUCKET_LABELS.near,
      items: withMatchReasons(explainForBucket('near', normalized), nearHits) as unknown[],
      totalInBucket: nearHits.length,
    },
    {
      id: 'widened',
      label: SEARCH_V2_BUCKET_LABELS.widened,
      items: withMatchReasons(explainForBucket('widened', normalized), wideHits) as unknown[],
      totalInBucket: wideHits.length,
    },
  ]

  const messages = [...baseMessages]
  if (nearHits.length > 0) {
    messages.push(
      'En «Muy parecidos» relajamos barrio, algunos números o tipo (según tu búsqueda); los amenities no excluyen salvo modo estricto en la primera sección.'
    )
  }
  if (wideHits.length > 0) {
    messages.push(
      'En «Opciones ampliadas» pueden aparecer otras operaciones y criterios más flexibles, siempre acotadas a tu ciudad o zona confirmada en el mapa.'
    )
  }

  const totalCount = strongHits.length + nearHits.length + wideHits.length
  let emptyExplanation: string | null = null
  if (totalCount === 0) {
    emptyExplanation =
      'No hay avisos que encajen aún con estos criterios. Probá las acciones de abajo o flexibilizá un requisito.'
  }

  const orderedListingIds = [
    ...strongHits.map((h) => h.id),
    ...nearHits.map((h) => h.id),
    ...wideHits.map((h) => h.id),
  ]

  return {
    sessionNormalized: normalized,
    buckets,
    messages,
    emptyExplanation,
    actions: totalCount === 0 ? buildActions(normalized) : [],
    totalsByBucket: {
      strong: strongHits.length,
      near: nearHits.length,
      widened: wideHits.length,
    },
    orderedListingIds,
  }
}
