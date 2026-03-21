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
  bedrooms: number | null
  bathrooms: number | null
  primaryImageUrl: string | null
  publishedAt: Date | null
  createdAt: Date
}

export interface SearchFilters {
  q?: string
  operationType?: string
  propertyType?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  city?: string
  neighborhood?: string
  limit?: number
  offset?: number
}
