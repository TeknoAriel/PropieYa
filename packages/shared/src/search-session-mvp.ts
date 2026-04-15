import { z } from 'zod'

import { inferLocalityFromUserMessage } from './locality-catalog-resolver'
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
  limitPerBucket: z.number().int().min(1).max(40).optional().default(20),
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
}

/**
 * Fusiona lo detectado en `q` (operación, tipo, amenities, localidad) en la sesión
 * y recorta `q` al texto residual. Los campos ya fijados en sesión no se pisan.
 */
export function enrichSearchSessionMVPFromParsedQuery(
  s: SearchSessionMVP
): SearchSessionMVP {
  const rawQ = s.q?.trim()
  if (!rawQ) return s

  let city = s.city?.trim() ? s.city.trim() : null
  let neighborhood = s.neighborhood?.trim() ? s.neighborhood.trim() : null

  if (!city && !neighborhood) {
    const loc = inferLocalityFromUserMessage(rawQ)
    if (loc) {
      if (loc.kind === 'city') {
        city = loc.canonical
      } else {
        neighborhood = loc.canonical
        city = NEIGHBORHOOD_TO_PARENT_CITY[loc.canonical] ?? city
      }
    }
  }

  const merged = mergePublicSearchWithResidual({
    q: rawQ,
    city: city ?? undefined,
    neighborhood: neighborhood ?? undefined,
    operationType: s.operationType ?? undefined,
    propertyType: s.propertyType ?? undefined,
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
  }
  return enrichSearchSessionMVPFromParsedQuery(base)
}

/** ¿Hay al menos un ancla para evitar un “widened” mundial absurdo? */
export function searchSessionHasAnchor(s: SearchSessionMVP): boolean {
  const n = normalizeSearchSessionMVP(s)
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

/** Totales por bucket (hits ES devueltos en esta página). */
export type SearchV2BucketTotals = Record<SearchV2BucketId, number>

/**
 * Respuesta del procedimiento `listing.searchV2`.
 * `items` son filas públicas alineadas a `listing.search` (con `matchReasons` si aplica).
 */
export type ListingSearchV2Bucket = {
  id: SearchV2BucketId
  label: string
  items: unknown[]
  totalInBucket: number
}

export type ListingSearchV2Result = {
  sessionNormalized: SearchSessionMVP
  buckets: ListingSearchV2Bucket[]
  messages: string[]
  emptyExplanation: string | null
  actions: SearchV2Action[]
  totalsByBucket: SearchV2BucketTotals
  /** Ids en orden de lista global (strong → near → widened) para mapa/lista alineados. */
  orderedListingIds: string[]
}
