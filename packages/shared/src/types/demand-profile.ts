import { type UUID, type Timestamp, type Currency, type GeoPoint } from './common'
import { type PropertyType, type OperationType, type Amenity } from './listing'

/**
 * Importancia de un criterio en el perfil de demanda
 */
export type CriterionImportance =
  | 'must_have' // Imprescindible - si no cumple, no sirve
  | 'very_important' // Muy importante - penaliza mucho si no cumple
  | 'nice_to_have' // Deseable - suma si cumple
  | 'indifferent' // Indiferente - no afecta score
  | 'deal_breaker' // Descarte - si cumple esto, no sirve

/**
 * Fuente de una preferencia
 */
export type PreferenceSource =
  | 'conversation' // Dicho explícitamente en conversación
  | 'action_save' // Inferido de guardar propiedad
  | 'action_discard' // Inferido de descartar propiedad
  | 'action_contact' // Inferido de contactar
  | 'action_view' // Inferido de ver ficha
  | 'explicit_rating' // Rating explícito del usuario
  | 'search_filter' // Usado en filtros de búsqueda

/**
 * Preferencia individual
 */
export interface DemandPreference<T = unknown> {
  value: T
  importance: CriterionImportance
  source: PreferenceSource
  confidence: number // 0-1, qué tan seguro estamos
  updatedAt: Timestamp
  sourceDetails?: string // "Dijo 'necesito balcón sí o sí'"
}

/**
 * Preferencia de ubicación
 */
export interface LocationPreference {
  neighborhoods: DemandPreference<string[]>
  cities: DemandPreference<string[]>
  states: DemandPreference<string[]>
  preferredPoints?: Array<{
    point: GeoPoint
    radius: number
    reason?: string // "Cerca del trabajo"
  }>
  avoidAreas?: Array<{
    neighborhoods: string[]
    reason?: string
  }>
}

/**
 * Preferencia de precio
 */
export interface PricePreference {
  maxPrice: DemandPreference<number>
  currency: Currency
  flexibility: 'strict' | 'somewhat_flexible' | 'very_flexible'
  flexibilityAmount?: number // Cuánto más podría pagar si vale la pena
  monthlyBudget?: DemandPreference<number> // Para alquileres
  maxExpenses?: DemandPreference<number>
}

/**
 * Preferencia de espacios
 */
export interface SpacePreference {
  minBedrooms: DemandPreference<number>
  maxBedrooms?: DemandPreference<number>
  minBathrooms?: DemandPreference<number>
  minTotalRooms?: DemandPreference<number>
  minGarages?: DemandPreference<number>
  minTotalSurface?: DemandPreference<number>
  minCoveredSurface?: DemandPreference<number>
}

/**
 * Preferencias de características
 */
export interface FeaturePreferences {
  // Amenities con su importancia
  amenities: Map<Amenity, CriterionImportance>

  // Características cualitativas
  qualitative: Array<{
    attribute: string // "luminoso", "silencioso", etc.
    importance: CriterionImportance
    source: PreferenceSource
  }>

  // Floor preferences (para deptos)
  floorPreference?: 'low' | 'high' | 'indifferent'
  minFloor?: number
  maxFloor?: number

  // Age
  preferNew?: boolean
  maxAge?: number
}

/**
 * Perfil de demanda completo
 */
export interface DemandProfile {
  id: UUID
  userId: UUID
  name?: string // "Mi búsqueda en Palermo", "Casa para la familia"
  isActive: boolean

  // Tipo de búsqueda
  propertyTypes: DemandPreference<PropertyType[]>
  operationTypes: DemandPreference<OperationType[]>

  // Preferencias estructuradas
  location: LocationPreference
  price: PricePreference
  space: SpacePreference
  features: FeaturePreferences

  // Propiedades de referencia
  likedListings: UUID[] // Propiedades que le gustaron
  dislikedListings: UUID[] // Propiedades descartadas
  contactedListings: UUID[] // Propiedades contactadas

  // Razones de descarte (para aprender)
  discardReasons: Array<{
    listingId: UUID
    reasons: string[]
    timestamp: Timestamp
  }>

  // Resumen en lenguaje natural (generado)
  naturalLanguageSummary?: string

  // Métricas
  completeness: number // 0-100, qué tan completo está el perfil
  confidence: number // 0-1, confianza global en el perfil

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  lastSearchAt?: Timestamp
}

/**
 * Criterio de matching para scoring
 */
export interface MatchingCriterion {
  name: string
  category: 'location' | 'price' | 'space' | 'features' | 'qualitative'
  importance: CriterionImportance
  weight: number // Peso en el scoring (0-100)
  evaluate: (listing: unknown, profile: DemandProfile) => MatchResult
}

/**
 * Resultado de evaluación de un criterio
 */
export interface MatchResult {
  score: number // 0-100
  fulfilled: boolean | 'partial'
  explanation: string
  penalty?: number // Para must_have no cumplidos
}

/**
 * Actualización del perfil de demanda
 */
export interface DemandProfileUpdate {
  profileId: UUID
  source: PreferenceSource
  changes: Array<{
    path: string // "location.neighborhoods", "price.maxPrice", etc.
    oldValue?: unknown
    newValue: unknown
    importance?: CriterionImportance
  }>
  context?: string // "Usuario dijo 'prefiero Palermo'"
  timestamp: Timestamp
}
