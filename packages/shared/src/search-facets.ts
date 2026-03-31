/**
 * Catálogo de facets para filtros escalables (Sprint 26).
 *
 * Principio: el contrato debe servir a UI, búsqueda (SQL/ES) y alertas
 * sin hardcodear cada amenity nuevo en múltiples capas.
 */

export type FacetValueType = 'flag' | 'enum' | 'range'

export type FacetId = string

export type FacetDefinition =
  | {
      id: FacetId
      type: 'flag'
      label: string
      /** Clave interna para materializar en ES o leer desde `features`. */
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
  /** Flags requeridos (true). */
  flags?: FacetId[]
  /** Flags excluidos (false). */
  excludeFlags?: FacetId[]
  /** Enum facet id → valores aceptados (OR). */
  enums?: Record<FacetId, string[]>
  /** Range facet id → min/max. */
  ranges?: Record<FacetId, { min?: number | null; max?: number | null }>
}

/**
 * Catálogo inicial: parte de lo ya existente como `amenities` (que hoy funciona como flags).
 * En el sprint se irá migrando gradualmente a facets sin romper compatibilidad.
 */
export const FACETS_CATALOG: readonly FacetDefinition[] = [
  // Flags tipo "amenity". Por ahora, el `id` coincide con el valor almacenado en `features.amenities[]`.
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
    label: 'Frente',
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
  { id: 'garden', type: 'flag', label: 'Jardín', key: 'amenities.garden' },
  { id: 'bbq', type: 'flag', label: 'Parrilla', key: 'amenities.bbq' },
  { id: 'elevator', type: 'flag', label: 'Ascensor', key: 'amenities.elevator' },
  { id: 'doorman', type: 'flag', label: 'Encargado', key: 'amenities.doorman' },
  { id: 'storage', type: 'flag', label: 'Baulera', key: 'amenities.storage' },
  { id: 'furnished', type: 'flag', label: 'Amoblado', key: 'amenities.furnished' },
] as const

