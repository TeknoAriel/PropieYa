import { z } from 'zod'

/** Alineado a `listing.search` / `sanitizeListingSearchFacets` (`search-facets.ts`). */
export const facetFiltersSchema = z.object({
  flags: z.array(z.string().max(80)).max(200).optional(),
  excludeFlags: z.array(z.string().max(80)).max(200).optional(),
  enums: z
    .record(z.string().max(80), z.array(z.string().max(80)).max(50))
    .optional(),
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

const propertyTypes = [
  'apartment',
  'house',
  'ph',
  'land',
  'office',
  'commercial',
  'warehouse',
  'parking',
] as const

const operationTypes = ['sale', 'rent', 'temporary_rent'] as const

const currencies = ['ARS', 'USD', 'CLP', 'UF', 'MXN'] as const

const sortFields = [
  'relevance',
  'price_asc',
  'price_desc',
  'price_per_m2_asc',
  'price_per_m2_desc',
  'date_desc',
  'date_asc',
  'surface_asc',
  'surface_desc',
] as const

export const searchFiltersSchema = z.object({
  propertyTypes: z.array(z.enum(propertyTypes)).optional(),
  operationTypes: z.array(z.enum(operationTypes)).optional(),
  neighborhoods: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  geoPoint: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  geoRadius: z.number().positive().max(50000).optional(),
  price: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      currency: z.enum(currencies),
    })
    .optional(),
  totalSurface: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
    })
    .optional(),
  bedroomsMin: z.number().int().min(0).optional(),
  bedroomsMax: z.number().int().optional(),
  bathroomsMin: z.number().int().min(0).optional(),
  totalRoomsMin: z.number().int().min(0).optional(),
  garagesMin: z.number().int().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  /** Facets catalogados (flags/enums/ranges); mismo contrato que búsqueda pública de listings. */
  facets: facetFiltersSchema.optional(),
  petFriendly: z.boolean().optional(),
  furnished: z.boolean().optional(),
  excludeIds: z.array(z.string()).optional(),
  organizationIds: z.array(z.string()).optional(),
})

export const searchRequestSchema = z.object({
  filters: searchFiltersSchema,
  sort: z.enum(sortFields).default('relevance'),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  viewMode: z.enum(['list', 'grid', 'map']).default('list'),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
  demandProfileId: z.string().optional(),
})

export const searchSuggestSchema = z.object({
  query: z.string().min(2).max(100),
  limit: z.number().int().positive().max(20).default(10),
})

export type FacetFiltersInput = z.infer<typeof facetFiltersSchema>
export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>
export type SearchRequestInput = z.infer<typeof searchRequestSchema>
export type SearchSuggestInput = z.infer<typeof searchSuggestSchema>
