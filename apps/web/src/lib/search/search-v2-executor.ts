/**
 * Buscador v2 (MVP): sesión → tres buckets (strong / near / widened).
 * No usa `searchListingsLayered` ni la relajación legacy.
 *
 * Relajación incremental: near solo quita barrio; widened añade un solo paso
 * (superficie → dormitorios → precio). Operación y tipo no cambian en widened.
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

function foldLatin(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

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

/** Paso 1: igual que strong pero sin barrio; amenities como preferencia. */
function filtersNear(s: SearchSessionMVP): SearchFilters {
  const geo = geoSlice(s)
  const am = amenitySlice(s)
  return {
    q: s.q ?? undefined,
    operationType: s.operationType ?? undefined,
    propertyType: s.propertyType ?? undefined,
    city: s.city ?? undefined,
    neighborhood: undefined,
    minPrice: s.minPrice ?? undefined,
    maxPrice: s.maxPrice ?? undefined,
    minBedrooms: s.minBedrooms ?? undefined,
    minSurface: s.minSurface ?? undefined,
    maxSurface: s.maxSurface ?? undefined,
    ...am,
    amenitiesMatchMode: 'preferred',
    matchProfile: 'catalog',
    ...geo,
  }
}

/**
 * Paso 2: near + un solo relajamiento extra (superficie, dormitorio o precio).
 * Nunca altera operación ni tipo.
 */
function filtersWidened(s: SearchSessionMVP): SearchFilters {
  const base = filtersNear(s)
  const hadSurface = s.minSurface != null || s.maxSurface != null
  if (hadSurface) {
    return {
      ...base,
      minSurface: undefined,
      maxSurface: undefined,
    }
  }
  if (s.minBedrooms != null && s.minBedrooms > 0) {
    return {
      ...base,
      minBedrooms: Math.max(0, s.minBedrooms - 1),
    }
  }
  if (!s.fixedBudget && (s.minPrice != null || s.maxPrice != null)) {
    const { min, max } = stretchPrice(s.minPrice, s.maxPrice, false, 1.1, 0.9)
    return {
      ...base,
      minPrice: min,
      maxPrice: max,
    }
  }
  return base
}

/** Relajación extra: misma ciudad/tipo/op que «near», sin `multi_match` de texto libre. */
function filtersWidenedDropFreeText(s: SearchSessionMVP): SearchFilters {
  const geo = geoSlice(s)
  const am = amenitySlice(s)
  return {
    operationType: s.operationType ?? undefined,
    propertyType: s.propertyType ?? undefined,
    city: s.city ?? undefined,
    neighborhood: undefined,
    minPrice: s.minPrice ?? undefined,
    maxPrice: s.maxPrice ?? undefined,
    minBedrooms: s.minBedrooms ?? undefined,
    minSurface: s.minSurface ?? undefined,
    maxSurface: s.maxSurface ?? undefined,
    ...am,
    amenitiesMatchMode: 'preferred',
    matchProfile: 'catalog',
    ...geo,
  }
}

function searchFiltersEqual(a: SearchFilters, b: SearchFilters): boolean {
  return (
    a.operationType === b.operationType &&
    a.propertyType === b.propertyType &&
    a.minPrice === b.minPrice &&
    a.maxPrice === b.maxPrice &&
    a.minBedrooms === b.minBedrooms &&
    a.minSurface === b.minSurface &&
    a.maxSurface === b.maxSurface &&
    a.q === b.q &&
    (a.city ?? '') === (b.city ?? '') &&
    (a.neighborhood ?? '') === (b.neighborhood ?? '') &&
    (a.amenitiesMatchMode ?? 'preferred') === (b.amenitiesMatchMode ?? 'preferred')
  )
}

function explainFromSearchFilters(
  f: SearchFilters,
  s: SearchSessionMVP
): ExplainMatchFilters {
  return {
    q: f.q,
    operationType: f.operationType,
    propertyType: f.propertyType,
    city: f.city,
    neighborhood: f.neighborhood,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    minBedrooms: f.minBedrooms,
    minSurface: f.minSurface,
    maxSurface: f.maxSurface,
    amenities: f.amenities,
    bbox: s.mapMode === 'bbox' ? s.bbox ?? undefined : undefined,
    mapPolygonActive: s.mapMode === 'polygon',
    matchProfile: f.matchProfile,
  }
}

function widenedAddsRelaxation(s: SearchSessionMVP): boolean {
  const hadSurface = s.minSurface != null || s.maxSurface != null
  if (hadSurface) return true
  if (s.minBedrooms != null && s.minBedrooms > 0) return true
  if (!s.fixedBudget && (s.minPrice != null || s.maxPrice != null)) return true
  return false
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
  return {
    q: s.q ?? undefined,
    operationType: s.operationType ?? undefined,
    propertyType: s.propertyType ?? undefined,
    city: s.city ?? undefined,
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

function explainWidened(s: SearchSessionMVP): ExplainMatchFilters {
  const f = filtersWidened(s)
  return {
    q: s.q ?? undefined,
    operationType: f.operationType,
    propertyType: f.propertyType,
    city: s.city ?? undefined,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    minBedrooms: f.minBedrooms,
    minSurface: f.minSurface,
    maxSurface: f.maxSurface,
    amenities: s.amenityIds?.length ? s.amenityIds : undefined,
    bbox: s.mapMode === 'bbox' ? s.bbox ?? undefined : undefined,
    mapPolygonActive: s.mapMode === 'polygon',
    matchProfile: 'catalog',
  }
}

function explainForBucket(id: SearchV2BucketId, s: SearchSessionMVP): ExplainMatchFilters {
  if (id === 'strong') return explainStrong(s)
  if (id === 'near') return explainNear(s)
  return explainWidened(s)
}

function hitTouchesPlace(h: SearchHit, place: string): boolean {
  const p = foldLatin(place)
  if (p.length < 2) return true
  const addr = h.address
  const city = typeof addr.city === 'string' ? foldLatin(addr.city) : ''
  const nb = typeof addr.neighborhood === 'string' ? foldLatin(addr.neighborhood) : ''
  const title = foldLatin(h.title)
  const hay = `${city} ${nb} ${title}`
  return (
    hay.includes(p) ||
    p.includes(city) ||
    (nb.length > 2 && (hay.includes(nb) || p.includes(nb)))
  )
}

function hitMatchesTextIntent(h: SearchHit, qRaw: string): boolean {
  const q = foldLatin(qRaw)
  const tokens = q
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9áéíóúñü]+/gi, ''))
    .filter((t) => t.length >= 3)
  if (tokens.length === 0) return true
  const desc = typeof h.description === 'string' ? foldLatin(h.description) : ''
  const addrStr = JSON.stringify(h.address ?? {})
  const hay = `${foldLatin(h.title)} ${desc} ${foldLatin(addrStr)}`
  return tokens.some((t) => hay.includes(t))
}

function hitInsideCommittedBbox(h: SearchHit, s: SearchSessionMVP): boolean {
  if (!s.mapCommitted || s.mapMode !== 'bbox' || !s.bbox) return true
  const lat = h.location?.lat
  const lng = h.location?.lon
  if (lat == null || lng == null) return false
  const b = s.bbox
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east
}

function passesPriceSanity(h: SearchHit, s: SearchSessionMVP): boolean {
  const price = h.priceAmount
  if (!Number.isFinite(price) || price < 0) return false
  if (s.maxPrice != null && s.maxPrice > 0 && price > s.maxPrice * 2) {
    return false
  }
  if (s.minPrice != null && s.minPrice > 0 && price < s.minPrice * 0.45) {
    return false
  }
  return true
}

function passesOperationType(h: SearchHit, s: SearchSessionMVP): boolean {
  if (s.operationType && h.operationType !== s.operationType) return false
  if (s.propertyType?.trim() && h.propertyType !== s.propertyType.trim()) {
    return false
  }
  return true
}

function filterHitsSafety(
  hits: SearchHit[],
  s: SearchSessionMVP,
  bucket: SearchV2BucketId,
  opts?: { skipFreeTextPostFilter?: boolean }
): SearchHit[] {
  return hits.filter((h) => {
    if (!passesPriceSanity(h, s)) return false
    if (!passesOperationType(h, s)) return false
    if (!hitInsideCommittedBbox(h, s)) return false
    if (s.city?.trim() && !hitTouchesPlace(h, s.city.trim())) return false
    if (bucket === 'strong' && s.neighborhood?.trim()) {
      if (!hitTouchesPlace(h, s.neighborhood.trim())) return false
    }
    if (
      !opts?.skipFreeTextPostFilter &&
      s.q?.trim() &&
      s.q.trim().length >= 4
    ) {
      if (!hitMatchesTextIntent(h, s.q.trim())) return false
    }
    return true
  })
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

function takeFiltered(
  hits: SearchHit[],
  s: SearchSessionMVP,
  bucket: SearchV2BucketId,
  limit: number,
  opts?: { skipFreeTextPostFilter?: boolean }
): SearchHit[] {
  const filtered = filterHitsSafety(hits, s, bucket, opts)
  return filtered.slice(0, limit)
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

  const resStrong = await searchListings({ ...fStrong, limit: limit * 2, offset: 0 })
  if (!resStrong.fromEs) {
    return {
      sessionNormalized: normalized,
      buckets: emptyBuckets(),
      messages: [
        ...baseMessages,
        'El buscador no está disponible: no pudimos consultar el índice. Probá de nuevo en unos segundos.',
      ],
      emptyExplanation: null,
      actions: [],
      totalsByBucket: { strong: 0, near: 0, widened: 0 },
      orderedListingIds: [],
    }
  }

  const seen = new Set<string>()
  const strongHits = takeFiltered(resStrong.hits, normalized, 'strong', limit)
  for (const h of strongHits) seen.add(h.id)

  const nearAddsValue = Boolean(
    normalized.city?.trim() ||
      normalized.neighborhood?.trim() ||
      normalized.strictAmenities
  )

  let nearHits: SearchHit[] = []
  if (nearAddsValue && !searchFiltersEqual(fNear, fStrong)) {
    const resNear = await searchListings({
      ...fNear,
      limit: limit * 2 + seen.size,
      offset: 0,
    })
    nearHits =
      resNear.fromEs && resNear.hits.length > 0
        ? takeFiltered(
            resNear.hits.filter((h) => !seen.has(h.id)),
            normalized,
            'near',
            limit
          )
        : []
    for (const h of nearHits) seen.add(h.id)
  }

  const wideHits: SearchHit[] = []
  let widenedExplainUsed: ExplainMatchFilters = explainWidened(normalized)

  const appendWideHits = (
    hits: SearchHit[],
    filtersUsed: SearchFilters,
    skipQ: boolean
  ) => {
    const slice = takeFiltered(
      hits.filter((h) => !seen.has(h.id)),
      normalized,
      'widened',
      Math.max(0, limit - wideHits.length),
      skipQ ? { skipFreeTextPostFilter: true } : undefined
    )
    if (slice.length > 0) {
      widenedExplainUsed = explainFromSearchFilters(filtersUsed, normalized)
    }
    for (const h of slice) {
      wideHits.push(h)
      seen.add(h.id)
    }
  }

  if (widenedAddsRelaxation(normalized)) {
    const fWideNum = filtersWidened(normalized)
    if (!searchFiltersEqual(fWideNum, fNear)) {
      const resWide = await searchListings({
        ...fWideNum,
        limit: limit * 2 + seen.size,
        offset: 0,
      })
      if (resWide.fromEs && resWide.hits.length > 0) {
        appendWideHits(resWide.hits, fWideNum, false)
      }
    }
  }

  if (wideHits.length < limit && normalized.q?.trim()) {
    const fWideText = filtersWidenedDropFreeText(normalized)
    if (!searchFiltersEqual(fWideText, fNear)) {
      const resWideText = await searchListings({
        ...fWideText,
        limit: limit * 2 + seen.size,
        offset: 0,
      })
      if (resWideText.fromEs && resWideText.hits.length > 0) {
        appendWideHits(resWideText.hits, fWideText, true)
      }
    }
  }

  const buckets: ListingSearchV2Bucket[] = [
    {
      id: 'strong',
      label: SEARCH_V2_BUCKET_LABELS.strong,
      items: withMatchReasons(
        explainForBucket('strong', normalized),
        strongHits
      ) as unknown[],
      totalInBucket: strongHits.length,
    },
    {
      id: 'near',
      label: SEARCH_V2_BUCKET_LABELS.near,
      items: withMatchReasons(
        explainForBucket('near', normalized),
        nearHits
      ) as unknown[],
      totalInBucket: nearHits.length,
    },
    {
      id: 'widened',
      label: SEARCH_V2_BUCKET_LABELS.widened,
      items: withMatchReasons(widenedExplainUsed, wideHits) as unknown[],
      totalInBucket: wideHits.length,
    },
  ]

  const messages = [...baseMessages]
  if (nearHits.length > 0) {
    messages.push(
      '«Muy parecidos» solo amplía a toda la ciudad: mismos números, operación y tipo; el barrio deja de ser obligatorio.'
    )
  }
  if (wideHits.length > 0) {
    messages.push(
      '«Opciones ampliadas» mantiene operación y tipo; relaja un criterio numérico o, si hace falta, deja de exigir el texto libre en el índice (sigue el filtro por ciudad y amenities como preferencia).'
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

/**
 * Mismos filtros que la pasada «strong» de v2 (p. ej. fallback SQL en `listing.searchV2`).
 */
export function searchV2StrongListingSearchFilters(
  session: SearchSessionMVP
): SearchFilters {
  return filtersStrong(normalizeSearchSessionMVP(session))
}
