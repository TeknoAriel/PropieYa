import {
  type Currency,
  type GeoPoint,
  type GeoShape,
  type PriceRange,
  type SurfaceRange,
  type CursorPagination,
} from './common'
import {
  type PropertyType,
  type OperationType,
  type Amenity,
  type Orientation,
  type AgeType,
} from './listing'

/**
 * Filtros de búsqueda estructurados
 * Estos filtros se usan tanto desde la UI tradicional como traducidos desde conversación
 */
export interface SearchFilters {
  // Tipo y operación
  propertyTypes?: PropertyType[]
  operationTypes?: OperationType[]

  // Ubicación
  neighborhoods?: string[]
  cities?: string[]
  states?: string[]
  geoPoint?: GeoPoint // Centro de búsqueda
  geoRadius?: number // Radio en metros
  geoShape?: GeoShape // Polígono dibujado en mapa

  // Precio
  price?: PriceRange

  // Superficie
  totalSurface?: SurfaceRange
  coveredSurface?: SurfaceRange

  // Ambientes
  bedroomsMin?: number
  bedroomsMax?: number
  bathroomsMin?: number
  totalRoomsMin?: number
  totalRoomsMax?: number
  garagesMin?: number

  // Características
  amenities?: Amenity[]
  orientations?: Orientation[]
  floorMin?: number
  floorMax?: number
  ageType?: AgeType
  ageYearsMax?: number

  // Otros
  petFriendly?: boolean
  furnished?: boolean
  withExpenses?: boolean
  expensesMax?: number

  // Fuente/organización
  organizationIds?: string[]

  // Exclusiones
  excludeIds?: string[] // IDs de listings a excluir (ya vistos, descartados)
}

/**
 * Opciones de ordenamiento
 */
export type SearchSortField =
  | 'relevance' // Por score de matching/relevancia
  | 'price_asc'
  | 'price_desc'
  | 'price_per_m2_asc'
  | 'price_per_m2_desc'
  | 'date_desc' // Más recientes
  | 'date_asc'
  | 'surface_asc'
  | 'surface_desc'

/**
 * Vista de resultados
 */
export type SearchViewMode = 'list' | 'grid' | 'map'

/**
 * Request de búsqueda completo
 */
export interface SearchRequest {
  filters: SearchFilters
  sort?: SearchSortField
  cursor?: string
  limit?: number
  viewMode?: SearchViewMode

  // Para personalización
  userId?: string // Si está logueado, para personalizar resultados
  sessionId?: string // Para tracking de sesión anónima

  // Contexto conversacional
  conversationId?: string // Si viene de una conversación
  demandProfileId?: string // Para aplicar matching
}

/**
 * Facets dinámicos para filtros
 */
export interface SearchFacets {
  propertyTypes: Array<{ value: PropertyType; count: number }>
  operationTypes: Array<{ value: OperationType; count: number }>
  neighborhoods: Array<{ value: string; count: number }>
  cities: Array<{ value: string; count: number }>
  amenities: Array<{ value: Amenity; count: number }>
  priceRanges: Array<{ min: number; max: number; count: number }>
  bedroomCounts: Array<{ value: number; count: number }>
}

/**
 * Resultado de búsqueda individual
 */
export interface SearchResultItem {
  id: string
  score: number // Score de Elasticsearch
  matchScore?: number // Score de matching con perfil de demanda (0-100)
  matchExplanation?: MatchExplanation // Explicación del match
  listing: SearchResultListing
}

/**
 * Listing simplificado para resultados de búsqueda
 * (no incluye toda la data de la ficha completa)
 */
export interface SearchResultListing {
  id: string
  title: string
  propertyType: PropertyType
  operationType: OperationType
  price: {
    amount: number
    currency: Currency
    pricePerM2: number | null
    showPrice: boolean
  }
  surface: {
    total: number
    covered: number | null
  }
  rooms: {
    bedrooms: number | null
    bathrooms: number | null
    total: number | null
  }
  address: {
    neighborhood: string
    city: string
    formatted: string
  }
  location: GeoPoint | null
  primaryImageUrl: string | null
  mediaCount: number
  publishedAt: string
  organizationName: string
}

/**
 * Explicación del match para el usuario
 */
export interface MatchExplanation {
  score: number
  summary: string // "Cumple 8 de 10 criterios"
  matches: MatchCriterion[]
  partialMatches: MatchCriterion[]
  mismatches: MatchCriterion[]
  bonuses: MatchCriterion[] // Cosas buenas no pedidas explícitamente
}

export interface MatchCriterion {
  criterion: string // "Ubicación", "Precio", "Ambientes", etc.
  description: string // "Está en Palermo como pediste"
  weight: number // Importancia del criterio
  fulfilled: boolean | 'partial'
}

/**
 * Response de búsqueda completa
 */
export interface SearchResponse {
  results: SearchResultItem[]
  facets: SearchFacets
  pagination: CursorPagination
  totalCount: number
  appliedFilters: SearchFilters
  searchId: string // Para analytics y conversación
  processingTimeMs: number
}

/**
 * Sugerencias de búsqueda (autocomplete)
 */
export interface SearchSuggestion {
  type: 'neighborhood' | 'city' | 'address' | 'query'
  text: string
  highlight: string // Con <em> para resaltar match
  data?: Record<string, unknown>
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[]
  recentSearches?: string[]
}
