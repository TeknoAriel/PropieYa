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
  createdAt: Date
  amenities?: string[]
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
  city?: string
  neighborhood?: string
  amenities?: string[]
  limit?: number
  offset?: number
}
