import { z } from 'zod'

import {
  inferLocalityFromUserMessage,
  inferLocalityFromUserMessageTokens,
  inferNeighborhoodTokenForParentCity,
} from './locality-catalog-resolver'
import {
  extractPublicListingCodeFromQuery,
  stripPublicListingCodeFromQuery,
} from './public-listing-code'
import { mergePublicSearchWithResidual } from './search-query-merge'

/** Punto WGS84 (mapa / polígono). */
export const searchSessionGeoPointSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
})

export const searchSessionBBoxSchema = z.object({
  south: z.number().gte(-90).lte(90),
  north: z.number().gte(-90).lte(90),
  west: z.number().gte(-180).lte(180),
  east: z.number().gte(-180).lte(180),
})

/**
 * Sesión única del buscador v2 (MVP).
 * El cliente la serializa en URL y la envía tal cual al servidor en cada consulta.
 */
export const searchSessionMVPSchema = z.object({
  operationType: z.enum(['sale', 'rent', 'temporary_rent']).nullable().optional(),
  propertyType: z.string().max(50).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  neighborhood: z.string().max(120).nullable().optional(),
  q: z.string().max(200).nullable().optional(),
  minPrice: z.number().nonnegative().nullable().optional(),
  maxPrice: z.number().nonnegative().nullable().optional(),
  minBedrooms: z.number().int().min(0).max(50).nullable().optional(),
  minSurface: z.number().nonnegative().nullable().optional(),
  maxSurface: z.number().nonnegative().nullable().optional(),
  /** IDs de amenities / flags del catálogo público. */
  amenityIds: z.array(z.string().max(80)).max(40).optional().default([]),
  strictAmenities: z.boolean().optional().default(false),
  fixedBudget: z.boolean().optional().default(false),
  fixedPropertyType: z.boolean().optional().default(false),
  /** `bbox` | `polygon` solo aplican como filtro si `mapCommitted`. */
  mapMode: z.enum(['off', 'bbox', 'polygon']).optional().default('off'),
  bbox: searchSessionBBoxSchema.nullable().optional(),
  polygon: z.array(searchSessionGeoPointSchema).max(60).nullable().optional(),
  mapCommitted: z.boolean().optional().default(false),
  /**
   * Código público de aviso (p. ej. KP486622). Filtro duro en índice/SQL;
   * se detecta también desde `q` en `enrichSearchSessionMVPFromParsedQuery`.
   */
  publicListingCode: z.string().max(24).nullable().optional(),
})

export type SearchSessionMVP = z.infer<typeof searchSessionMVPSchema>

export type SearchV2BucketId = 'strong' | 'near' | 'widened'

/** Parche superficial de sesión (el cliente hace merge). */
export const searchV2SessionPatchSchema = searchSessionMVPSchema.partial()

export type SearchV2SessionPatch = z.infer<typeof searchV2SessionPatchSchema>

export const searchV2ActionSchema = z.object({
  id: z.string().max(64),
  label: z.string().max(200),
  patch: searchV2SessionPatchSchema.optional(),
})

export type SearchV2Action = z.infer<typeof searchV2ActionSchema>

export const listingSearchV2InputSchema = z.object({
  session: searchSessionMVPSchema,
  /** Tamaño de página del bloque exacto (12–50). */
  limitPerBucket: z.number().int().min(12).max(50).optional().default(24),
  /** Paginación ES profunda (`search_after`); opaco (base64url). */
  exactPageCursor: z.string().max(6000).optional(),
  /**
   * Desplazamiento para la página actual: en ES es `from` (máx. 500 en query builder);
   * en fallback SQL es `OFFSET`. Ignorado si `exactPageCursor` decodifica bien.
   */
  exactEsOffset: z.number().int().min(0).max(500_000).optional().default(0),
  /**
   * Si true, se calculan buckets «near» y «widened» (criterios relajados).
   * Por defecto false: solo resultados exactos en la primera capa.
   */
  includeAlternativeBuckets: z.boolean().optional().default(false),
})

export type ListingSearchV2Input = z.infer<typeof listingSearchV2InputSchema>

const NEIGHBORHOOD_TO_PARENT_CITY: Readonly<Record<string, string>> = {
  Palermo: 'CABA',
  Belgrano: 'CABA',
  'Nueva Córdoba': 'Córdoba',
  'Villa Crespo': 'CABA',
  Almagro: 'CABA',
  Caballito: 'CABA',
  Núñez: 'CABA',
  Recoleta: 'CABA',
  'San Telmo': 'CABA',
  'Puerto Madero': 'CABA',
  /** Heurística frecuente en Gran Rosario. */
  Centro: 'Rosario',
}

/**
 * Fusiona lo detectado en `q` (operación, tipo, amenities, localidad) en la sesión
 * y recorta `q` al texto residual. Los campos ya fijados en sesión no se pisan.
 */
export function enrichSearchSessionMVPFromParsedQuery(
  s: SearchSessionMVP
): SearchSessionMVP {
  const rawQ = s.q?.trim()
  let publicListingCode =
    s.publicListingCode?.trim().replace(/\s+/g, '').toUpperCase() ?? null
  if (publicListingCode && !/^KP\d{5,14}$/.test(publicListingCode)) {
    publicListingCode = null
  }

  let workQ = rawQ ?? ''
  const extractedFromQ = workQ ? extractPublicListingCodeFromQuery(workQ) : null
  if (extractedFromQ) {
    publicListingCode = extractedFromQ
    workQ = stripPublicListingCodeFromQuery(workQ, extractedFromQ)
  }

  if (!workQ && !publicListingCode) return s

  let city = s.city?.trim() ? s.city.trim() : null
  let neighborhood = s.neighborhood?.trim() ? s.neighborhood.trim() : null

  if (!city && !neighborhood && workQ) {
    const loc = inferLocalityFromUserMessageTokens(workQ)
    if (loc) {
      if (loc.kind === 'city') {
        city = loc.canonical
      } else {
        neighborhood = loc.canonical
        city = NEIGHBORHOOD_TO_PARENT_CITY[loc.canonical] ?? city
      }
    }
  }
  if (city && !neighborhood && workQ) {
    const phraseNb = inferLocalityFromUserMessage(workQ)
    if (phraseNb?.kind === 'neighborhood') {
      const parent = NEIGHBORHOOD_TO_PARENT_CITY[phraseNb.canonical]
      if (!parent || parent === city) {
        neighborhood = phraseNb.canonical
      }
    }
    if (!neighborhood) {
      const nbTok = inferNeighborhoodTokenForParentCity(workQ, city)
      if (nbTok) neighborhood = nbTok
    }
  }

  /**
   * «Casa» suelta no se mapea a `house` en el extractor global (evita ruido en «casa en venta»).
   * Si ya hay ancla geográfica (inferida o en sesión), el primer token «casa» es tipo + lugar.
   */
  let propertyTypeLeadingHint: string | null = null
  if (
    !s.fixedPropertyType &&
    !(s.propertyType?.trim()) &&
    workQ.trim().length > 0
  ) {
    const seg = workQ.trim().split(/\s+/)
    if (seg[0]?.toLowerCase() === 'casa' && (city || neighborhood)) {
      propertyTypeLeadingHint = 'house'
      workQ = seg.slice(1).join(' ').trim()
    }
  }

  const merged = mergePublicSearchWithResidual({
    q: workQ || undefined,
    city: city ?? undefined,
    neighborhood: neighborhood ?? undefined,
    operationType: s.operationType ?? undefined,
    propertyType: s.propertyType ?? propertyTypeLeadingHint ?? undefined,
    amenities: s.amenityIds?.length ? [...s.amenityIds] : undefined,
    minPrice: s.minPrice ?? undefined,
    maxPrice: s.maxPrice ?? undefined,
    minBedrooms: s.minBedrooms ?? undefined,
    minSurface: s.minSurface ?? undefined,
    maxSurface: s.maxSurface ?? undefined,
  })

  const amenityIds = [...new Set(merged.amenities ?? [])].slice(0, 40)
  const residual = merged.residualTextQuery.replace(/\s+/g, ' ').trim()
  const qOut = residual.length > 0 ? residual.slice(0, 200) : null

  const op =
    (merged.operationType ?? s.operationType) as SearchSessionMVP['operationType']
  const ptRaw = merged.propertyType ?? s.propertyType
  const pt = ptRaw?.trim() ? ptRaw.trim().slice(0, 50) : null

  return {
    ...s,
    operationType: op ?? null,
    propertyType: pt,
    city,
    neighborhood,
    amenityIds,
    q: qOut,
    minPrice: merged.minPrice ?? s.minPrice,
    maxPrice: merged.maxPrice ?? s.maxPrice,
    minBedrooms: merged.minBedrooms ?? s.minBedrooms,
    minSurface: merged.minSurface ?? s.minSurface,
    maxSurface: merged.maxSurface ?? s.maxSurface,
    publicListingCode,
  }
}

/**
 * Normaliza sesión (orden de precio, strings, flags de mapa coherentes).
 */
export function normalizeSearchSessionMVP(raw: unknown): SearchSessionMVP {
  const s = searchSessionMVPSchema.parse({
    amenityIds: [],
    strictAmenities: false,
    fixedBudget: false,
    fixedPropertyType: false,
    mapMode: 'off',
    mapCommitted: false,
    ...(typeof raw === 'object' && raw !== null ? raw : {}),
  })
  let minPrice = s.minPrice ?? null
  let maxPrice = s.maxPrice ?? null
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    const t = minPrice
    minPrice = maxPrice
    maxPrice = t
  }
  const city = s.city?.trim() ? s.city.trim() : null
  const neighborhood = s.neighborhood?.trim() ? s.neighborhood.trim() : null
  const q = s.q?.trim() ? s.q.trim().slice(0, 200) : null
  const propertyType = s.propertyType?.trim() ? s.propertyType.trim().slice(0, 50) : null
  const publicListingCode = s.publicListingCode?.trim()
    ? s.publicListingCode.trim().toUpperCase().slice(0, 24)
    : null

  let bbox = s.bbox ?? null
  let polygon = s.polygon?.length ? s.polygon : null
  let mapCommitted = s.mapCommitted
  if (mapCommitted) {
    const hasPoly = (polygon?.length ?? 0) >= 3
    const hasBox =
      bbox != null &&
      bbox.south <= bbox.north &&
      bbox.west <= bbox.east
    if (!hasPoly && !hasBox) {
      mapCommitted = false
      bbox = null
      polygon = null
    }
  }
  let mapMode: SearchSessionMVP['mapMode'] = 'off'
  if (!mapCommitted) {
    bbox = null
    polygon = null
  } else if (polygon && polygon.length >= 3) {
    mapMode = 'polygon'
  } else if (bbox) {
    mapMode = 'bbox'
  }

  const base: SearchSessionMVP = {
    ...s,
    city,
    neighborhood,
    q,
    propertyType,
    minPrice,
    maxPrice,
    mapMode,
    bbox,
    polygon,
    mapCommitted,
    amenityIds: s.amenityIds ?? [],
    publicListingCode:
      publicListingCode && /^KP\d{5,14}$/.test(publicListingCode)
        ? publicListingCode
        : null,
  }
  return enrichSearchSessionMVPFromParsedQuery(base)
}

/**
 * ¿La sesión tiene señales de intención acotada? (p. ej. asistente que no debe
 * disparar búsqueda masiva ante un prompt vago.)
 *
 * El listado público (`listing.searchV2`) **no** depende de esto: con sesión vacía
 * se muestra el catálogo activo y se refina al agregar criterios.
 */
export function searchSessionHasAnchor(s: SearchSessionMVP): boolean {
  const n = normalizeSearchSessionMVP(s)
  if (n.publicListingCode?.trim()) {
    return true
  }
  if (
    n.operationType === 'sale' ||
    n.operationType === 'rent' ||
    n.operationType === 'temporary_rent'
  ) {
    return true
  }
  if (n.city || n.neighborhood) return true
  if (n.q && n.q.length >= 2) return true
  if (
    n.mapCommitted &&
    ((n.mapMode === 'polygon' && (n.polygon?.length ?? 0) >= 3) ||
      (n.mapMode === 'bbox' && n.bbox != null))
  ) {
    return true
  }
  return false
}

export const SEARCH_V2_BUCKET_LABELS: Record<SearchV2BucketId, string> = {
  strong: 'Encajan con lo que pediste',
  near: 'Muy parecidos',
  widened: 'Opciones ampliadas',
}

/** Conteos de ítems devueltos por bucket en esta respuesta (página actual). */
export type SearchV2BucketTotals = Record<SearchV2BucketId, number>

/**
 * Respuesta del procedimiento `listing.searchV2`.
 * `items` son filas públicas alineadas a `listing.search` (con `matchReasons` si aplica).
 */
export type ListingSearchV2Bucket = {
  id: SearchV2BucketId
  label: string
  items: unknown[]
  /**
   * Para `strong`: total elegible en índice/SQL (≥ `items.length`).
   * Para `near`/`widened`: total en índice para esa pasada relajada, o longitud de `items` si no aplica.
   */
  totalInBucket: number
}

export type ListingSearchV2Result = {
  sessionNormalized: SearchSessionMVP
  buckets: ListingSearchV2Bucket[]
  messages: string[]
  emptyExplanation: string | null
  actions: SearchV2Action[]
  totalsByBucket: SearchV2BucketTotals
  /**
   * Total en índice (o conteo SQL en fallback) para los filtros «strong» — misma intención
   * que la primera pasada ES, sin relajar barrio ni criterios numéricos.
   * Puede ser mucho mayor que la suma de tarjetas mostradas (`totalsByBucket`).
   */
  strictCatalogTotal: number
  /** Ids en orden de lista global (strong → near → widened) para mapa/lista alineados. */
  orderedListingIds: string[]
  /** Siguiente página del bloque exacto vía ES (`search_after`). */
  exactNextCursor: string | null
  /**
   * Siguiente offset para páginas sin cursor (ES `from` ≤ 500 o fallback SQL).
   * Null si no hay página siguiente.
   */
  exactEsOffsetNext: number | null
}
