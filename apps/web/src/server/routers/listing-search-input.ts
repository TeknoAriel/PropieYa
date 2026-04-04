import { z } from 'zod'

import { sanitizeListingSearchFacets } from '@propieya/shared'

/** Rectángulo geográfico (WGS84). Sur ≤ norte, oeste ≤ este (sin cruce de antimeridiano). */
export const listingSearchBBoxSchema = z
  .object({
    south: z.number().gte(-90).lte(90),
    north: z.number().gte(-90).lte(90),
    west: z.number().gte(-180).lte(180),
    east: z.number().gte(-180).lte(180),
  })
  .refine((b) => b.south <= b.north, { message: 'bbox: south debe ser <= north' })
  .refine((b) => b.west <= b.east, { message: 'bbox: west debe ser <= east' })

/** Filtros de búsqueda pública (sin paginación), sin normalizar facets. */
export const listingSearchFiltersBaseSchema = z.object({
  q: z.string().max(200).optional(),
  operationType: z
    .enum(['sale', 'rent', 'temporary_rent'])
    .optional(),
  propertyType: z.string().max(50).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  minSurface: z.number().nonnegative().optional(),
  maxSurface: z.number().nonnegative().optional(),
  minBedrooms: z.number().int().min(0).max(50).optional(),
  minBathrooms: z.number().int().min(0).max(20).optional(),
  minGarages: z.number().int().min(0).max(20).optional(),
  floorMin: z.number().int().min(0).optional(),
  floorMax: z.number().int().min(0).optional(),
  escalera: z.string().max(10).optional(),
  /** Filtro por orientación (mismo enum que `features.orientation` en listings). */
  orientation: z
    .enum(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'])
    .optional(),
  minSurfaceCovered: z.number().nonnegative().optional(),
  maxSurfaceCovered: z.number().nonnegative().optional(),
  /** Ambientes totales (`PRINCIPALES|AMBIENTE` en OpenNavent → `totalRooms`). */
  minTotalRooms: z.number().int().min(0).max(50).optional(),
  city: z.string().max(120).optional(),
  neighborhood: z.string().max(120).optional(),
  /** Con ciudad/barrio: orden por cercanía a este punto (no filtra). Ignorado sin localidad. */
  sortNearLat: z.number().gte(-90).lte(90).optional(),
  sortNearLng: z.number().gte(-180).lte(180).optional(),
  amenities: z.array(z.string()).optional(),
  geoPoint: z
    .object({
      lat: z.number().gte(-90).lte(90),
      lng: z.number().gte(-180).lte(180),
    })
    .optional(),
  /** Radio en metros (hasta 50km). Requiere `geoPoint`. */
  geoRadius: z.number().positive().max(50000).optional(),
  facets: z
    .object({
      flags: z.array(z.string().max(80)).max(200).optional(),
      excludeFlags: z.array(z.string().max(80)).max(200).optional(),
      enums: z.record(z.string().max(80), z.array(z.string().max(80)).max(50)).optional(),
      ranges: z
        .record(
          z.string().max(80),
          z.object({
            min: z.number().nullable().optional(),
            max: z.number().nullable().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  bbox: listingSearchBBoxSchema.optional(),
  /** Polígono WGS84 (≥3 vértices, orden del contorno). ES: geo_polygon; SQL: ray casting. */
  polygon: z
    .array(
      z.object({
        lat: z.number().gte(-90).lte(90),
        lng: z.number().gte(-180).lte(180),
      })
    )
    .min(3)
    .max(60)
    .optional(),
  /**
   * `preferred`: amenities / facets.flags no excluyen en ES/SQL (solo ranking o boost).
   * `strict`: exigen presencia en inventario.
   */
  amenitiesMatchMode: z.enum(['preferred', 'strict']).optional().default('preferred'),
})

/** Filtros con `facets` saneados contra el catálogo (evita ids inyectados). */
export const listingSearchFiltersSchema = listingSearchFiltersBaseSchema.transform(
  (data) => ({
    ...data,
    facets: sanitizeListingSearchFacets(data.facets),
  })
)

export const listingSearchInputSchema = listingSearchFiltersBaseSchema
  .extend({
    limit: z.number().min(1).max(50).default(24),
    /** Sin cursor: paginación SQL (hasta N páginas); con Elasticsearch preferir `nextCursor`. */
    offset: z.number().min(0).max(50_000).default(0),
    /** Paginación profunda (Elasticsearch `search_after`); requiere `offset === 0`. */
    cursor: z.string().max(4096).optional(),
  })
  .refine((d) => !d.cursor?.trim() || d.offset === 0, {
    message: 'cursor solo se usa con offset 0',
    path: ['cursor'],
  })
  .transform((data) => ({
    ...data,
    facets: sanitizeListingSearchFacets(data.facets),
  }))

export type ListingSearchFiltersInput = z.infer<typeof listingSearchFiltersSchema>
export type ListingSearchInput = z.infer<typeof listingSearchInputSchema>
