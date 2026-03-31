import { z } from 'zod'

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

/** Filtros de búsqueda pública (sin paginación). */
export const listingSearchFiltersSchema = z.object({
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
  amenities: z.array(z.string()).optional(),
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
})

export const listingSearchInputSchema = listingSearchFiltersSchema.extend({
  limit: z.number().min(1).max(50).default(24),
  offset: z.number().min(0).max(500).default(0),
})

export type ListingSearchFiltersInput = z.infer<typeof listingSearchFiltersSchema>
export type ListingSearchInput = z.infer<typeof listingSearchInputSchema>
