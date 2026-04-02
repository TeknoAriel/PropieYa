/**
 * Tipos para el módulo de búsqueda.
 */

export interface ListingRow {
  id: string
  organizationId: string
  publisherId: string
  propertyType: string
  operationType: string
  status: string
  title: string
  description: string | null
  address: unknown
  locationLat: number | null
  locationLng: number | null
  priceAmount: number
  priceCurrency: string
  surfaceTotal: number
  surfaceCovered?: number | null
  surfaceSemicovered?: number | null
  bedrooms: number | null
  bathrooms: number | null
  garages?: number | null
  totalRooms?: number | null
  floor?: number | null
  totalFloors?: number | null
  escalera?: string | null
  orientation?: string | null
  primaryImageUrl: string | null
  publishedAt: Date | null
  updatedAt: Date
  createdAt: Date
  amenities?: string[]
  feedAmenityRaw?: string[]
}

export interface SearchFilters {
  q?: string
  operationType?: string
  propertyType?: string
  minPrice?: number
  maxPrice?: number
  minSurface?: number
  maxSurface?: number
  minBedrooms?: number
  minBathrooms?: number
  minGarages?: number
  floorMin?: number
  floorMax?: number
  escalera?: string
  orientation?: string
  minSurfaceCovered?: number
  maxSurfaceCovered?: number
  minTotalRooms?: number
  city?: string
  neighborhood?: string
  amenities?: string[]
  geoPoint?: { lat: number; lng: number }
  /** Radio en metros (requiere `geoPoint`). */
  geoRadius?: number
  /**
   * Facets escalables (Sprint 26). Inicialmente convivirá con `amenities`.
   * El backend debe interpretar esto de forma compatible.
   */
  facets?: {
    flags?: string[]
    excludeFlags?: string[]
    enums?: Record<string, string[]>
    ranges?: Record<string, { min?: number | null; max?: number | null }>
  }
  /** Filtro por rectángulo (mapa). */
  bbox?: { south: number; north: number; west: number; east: number }
  /** Polígono (mapa); orden de vértices = contorno. */
  polygon?: { lat: number; lng: number }[]
  limit?: number
  offset?: number
  /** Paginación ES: valores de `sort` del último hit de la página anterior. */
  searchAfter?: unknown[]
}
