/**
 * Catálogo de facets para filtros escalables (Sprint 26 / doc 38).
 *
 * Fuente de verdad para: UI /buscar, `listing.search`, SQL, ES y alertas.
 * Los `id` de flags coinciden con valores en `features.amenities[]` y tipo `Amenity`.
 */

import type { Amenity } from './types/listing'

export type FacetValueType = 'flag' | 'enum' | 'range'

export type FacetId = string

export type FacetDefinition =
  | {
      id: FacetId
      type: 'flag'
      label: string
      /** Clave lógica para ES / features (documentación). */
      key: string
    }
  | {
      id: FacetId
      type: 'enum'
      label: string
      key: string
      values: readonly { value: string; label: string }[]
    }
  | {
      id: FacetId
      type: 'range'
      label: string
      key: string
      unit?: string
    }

export type FacetFilters = {
  flags?: FacetId[]
  excludeFlags?: FacetId[]
  enums?: Record<FacetId, string[]>
  ranges?: Record<FacetId, { min?: number | null; max?: number | null }>
}

/**
 * Catálogo público de flags (amenities filtrables). Ampliar aquí antes que en routers sueltos.
 */
export const FACETS_CATALOG: readonly FacetDefinition[] = [
  { id: 'balcony', type: 'flag', label: 'Balcón', key: 'amenities.balcony' },
  { id: 'terrace', type: 'flag', label: 'Terraza', key: 'amenities.terrace' },
  { id: 'parking', type: 'flag', label: 'Cochera', key: 'amenities.parking' },
  {
    id: 'air_conditioning',
    type: 'flag',
    label: 'Aire acondicionado',
    key: 'amenities.air_conditioning',
  },
  { id: 'heating', type: 'flag', label: 'Calefacción', key: 'amenities.heating' },
  { id: 'fireplace', type: 'flag', label: 'Chimenea', key: 'amenities.fireplace' },
  {
    id: 'front_facing',
    type: 'flag',
    label: 'Contra frente / frente',
    key: 'amenities.front_facing',
  },
  {
    id: 'credit_approved',
    type: 'flag',
    label: 'Apto crédito',
    key: 'amenities.credit_approved',
  },
  { id: 'pool', type: 'flag', label: 'Pileta', key: 'amenities.pool' },
  { id: 'gym', type: 'flag', label: 'Gimnasio', key: 'amenities.gym' },
  {
    id: 'security_24h',
    type: 'flag',
    label: 'Seguridad 24 h',
    key: 'amenities.security_24h',
  },
  { id: 'laundry', type: 'flag', label: 'Lavadero', key: 'amenities.laundry' },
  { id: 'rooftop', type: 'flag', label: 'Rooftop', key: 'amenities.rooftop' },
  { id: 'sum', type: 'flag', label: 'SUM', key: 'amenities.sum' },
  {
    id: 'playground',
    type: 'flag',
    label: 'Juegos infantiles',
    key: 'amenities.playground',
  },
  { id: 'garden', type: 'flag', label: 'Jardín', key: 'amenities.garden' },
  { id: 'bbq', type: 'flag', label: 'Parrilla', key: 'amenities.bbq' },
  { id: 'elevator', type: 'flag', label: 'Ascensor', key: 'amenities.elevator' },
  { id: 'doorman', type: 'flag', label: 'Portero', key: 'amenities.doorman' },
  { id: 'storage', type: 'flag', label: 'Baulera', key: 'amenities.storage' },
  { id: 'furnished', type: 'flag', label: 'Amoblado', key: 'amenities.furnished' },
  {
    id: 'pet_friendly',
    type: 'flag',
    label: 'Acepta mascotas',
    key: 'amenities.pet_friendly',
  },
  {
    id: 'wheelchair_accessible',
    type: 'flag',
    label: 'Accesible',
    key: 'amenities.wheelchair_accessible',
  },
] as const

export type FacetFlagDefinition = Extract<FacetDefinition, { type: 'flag' }>

export function getFacetFlagDefinitions(): readonly FacetFlagDefinition[] {
  return FACETS_CATALOG.filter((f): f is FacetFlagDefinition => f.type === 'flag')
}

/** Misma lista que admite `listing.search` (amenities + facets.flags). */
export const SEARCH_FILTER_AMENITIES = getFacetFlagDefinitions().map(
  (f) => f.id
) as readonly Amenity[]

export const FACET_FLAG_IDS_SET: ReadonlySet<string> = new Set(
  getFacetFlagDefinitions().map((f) => f.id)
)

const FACET_ENUM_IDS_SET: ReadonlySet<string> = new Set(
  FACETS_CATALOG.filter((f) => f.type === 'enum').map((f) => f.id)
)

const FACET_RANGE_IDS_SET: ReadonlySet<string> = new Set(
  FACETS_CATALOG.filter((f) => f.type === 'range').map((f) => f.id)
)

/**
 * Elimina ids desconocidos (inyección / versión vieja de cliente) antes de buscar.
 */
export function sanitizeListingSearchFacets(
  facets: FacetFilters | undefined
): FacetFilters | undefined {
  if (!facets) return undefined

  const flags = facets.flags?.filter((id) => FACET_FLAG_IDS_SET.has(id))
  const excludeFlags = facets.excludeFlags?.filter((id) =>
    FACET_FLAG_IDS_SET.has(id)
  )

  let enums: Record<string, string[]> | undefined
  if (facets.enums && Object.keys(facets.enums).length > 0) {
    const e = Object.fromEntries(
      Object.entries(facets.enums).filter(([k]) => FACET_ENUM_IDS_SET.has(k))
    )
    enums = Object.keys(e).length > 0 ? e : undefined
  }

  let ranges: Record<string, { min?: number | null; max?: number | null }> | undefined
  if (facets.ranges && Object.keys(facets.ranges).length > 0) {
    const r = Object.fromEntries(
      Object.entries(facets.ranges).filter(([k]) => FACET_RANGE_IDS_SET.has(k))
    )
    ranges = Object.keys(r).length > 0 ? r : undefined
  }

  const out: FacetFilters = {
    flags: flags?.length ? flags : undefined,
    excludeFlags: excludeFlags?.length ? excludeFlags : undefined,
    enums,
    ranges,
  }

  if (!out.flags && !out.excludeFlags && !out.enums && !out.ranges) {
    return undefined
  }
  return out
}
