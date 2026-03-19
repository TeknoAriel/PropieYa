/**
 * Tipos base compartidos en todo el sistema
 */

export type UUID = string

export type Timestamp = string // ISO 8601

export type Currency = 'ARS' | 'USD'

export type Locale = 'es-AR' | 'es' | 'en'

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CursorPagination {
  cursor: string | null
  limit: number
  hasMore: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: {
    pagination?: Pagination | CursorPagination
    timestamp: Timestamp
    requestId: string
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface GeoShape {
  type: 'polygon' | 'circle'
  coordinates: number[][] | GeoPoint
  radius?: number // metros, solo para circle
}

export interface Address {
  street: string
  number: string | null
  floor: string | null
  unit: string | null
  neighborhood: string
  city: string
  state: string
  country: string
  postalCode: string | null
  formatted: string
  location: GeoPoint | null
}

export interface PriceRange {
  min: number | null
  max: number | null
  currency: Currency
}

export interface SurfaceRange {
  min: number | null
  max: number | null
  unit: 'm2'
}

export type SortDirection = 'asc' | 'desc'

export interface SortOption {
  field: string
  direction: SortDirection
}
