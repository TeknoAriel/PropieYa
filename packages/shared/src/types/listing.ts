import {
  type UUID,
  type Timestamp,
  type Currency,
  type Address,
  type GeoPoint,
} from './common'

/**
 * Tipo de propiedad
 */
export type PropertyType =
  | 'apartment' // Departamento
  | 'house' // Casa
  | 'ph' // PH
  | 'land' // Terreno
  | 'office' // Oficina
  | 'commercial' // Local comercial
  | 'warehouse' // Depósito/galpón
  | 'parking' // Cochera
  | 'development_unit' // Unidad de emprendimiento (post-MVP)

/**
 * Tipo de operación
 */
export type OperationType = 'sale' | 'rent' | 'temporary_rent'

/**
 * Estado del aviso en el ciclo de vigencia
 */
export type ListingStatus =
  | 'draft' // Borrador, no publicado
  | 'pending_review' // Pendiente de moderación
  | 'active' // Activo y visible
  | 'expiring_soon' // Próximo a vencer (27+ días sin renovar)
  | 'suspended' // Suspendido (30+ días sin renovar)
  | 'archived' // Archivado (15+ días suspendido)
  | 'sold' // Vendido/alquilado
  | 'withdrawn' // Dado de baja por el usuario

/**
 * Fuente del aviso
 */
export type ListingSource =
  | 'manual' // Cargado manualmente
  | 'api' // Integración API
  | 'feed' // Feed XML/JSON
  | 'import' // Importación masiva

/**
 * Orientación
 */
export type Orientation = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW'

/**
 * Disposición
 */
export type Disposition = 'front' | 'back' | 'internal' | 'lateral'

/**
 * Antigüedad
 */
export type AgeType = 'brand_new' | 'under_construction' | 'years'

/**
 * Amenities disponibles
 */
export type Amenity =
  | 'pool'
  | 'gym'
  | 'security_24h'
  | 'laundry'
  | 'rooftop'
  | 'sum' // Salón de usos múltiples
  | 'playground'
  | 'bbq'
  | 'garden'
  | 'balcony'
  | 'terrace'
  | 'parking'
  | 'storage'
  | 'elevator'
  | 'doorman'
  | 'air_conditioning'
  | 'heating'
  | 'furnished'
  | 'pet_friendly'
  | 'wheelchair_accessible'

export interface ListingPrice {
  amount: number
  currency: Currency
  pricePerM2: number | null
  showPrice: boolean // Permitir ocultar precio (consultar)
  expenses: number | null // Expensas mensuales
  expensesCurrency: Currency | null
}

export interface ListingSurface {
  total: number // m2 totales
  covered: number | null // m2 cubiertos
  semicovered: number | null // m2 semicubiertos
  land: number | null // m2 de terreno (para casas/terrenos)
}

export interface ListingRooms {
  bedrooms: number | null
  bathrooms: number | null
  toilettes: number | null
  garages: number | null
  total: number | null // Ambientes totales
}

export interface ListingAge {
  type: AgeType
  years: number | null // null si es brand_new o under_construction
}

export interface ListingFeatures {
  floor: number | null // Piso (para departamentos)
  totalFloors: number | null // Pisos del edificio
  orientation: Orientation | null
  disposition: Disposition | null
  age: ListingAge | null
  amenities: Amenity[]
  // Campos libres para características adicionales
  extras: Record<string, string | number | boolean>

  /**
   * Subrubro para propiedades `commercial` / `office`.
   * Se guarda dentro de `features` (JSONB) sin migración adicional.
   */
  commercialSub?: ListingCommercialSub | null

  /**
   * Campos rurales (agricola/ganadero/etc).
   * Se usa cuando `propertyType` representa terrenos/espacios rurales.
   */
  field?: ListingField | null
}

/**
 * Subrubros para espacios comerciales y oficinas.
 */
export type CommercialSubVariant =
  | 'retail'
  | 'medical'
  | 'business'
  | 'office'
  | 'unificado'
  | 'otro'

export interface CommercialSubRetail {
  variant: 'retail'
  label?: string | null
}

export interface CommercialSubMedical {
  variant: 'medical'
  label?: string | null
}

export interface CommercialSubBusiness {
  variant: 'business'
  label?: string | null
}

export interface CommercialSubOffice {
  variant: 'office'
  label?: string | null
}

export interface CommercialSubUnificado {
  /**
   * Variante para integradores que envían un “subrubro” unificado.
   * Guardamos la etiqueta (o un resumen) sin imponer estructura extra.
   */
  variant: 'unificado'
  label?: string | null
}

export interface CommercialSubOtro {
  variant: 'otro'
  label?: string | null
}

export type ListingCommercialSub =
  | CommercialSubRetail
  | CommercialSubMedical
  | CommercialSubBusiness
  | CommercialSubOffice
  | CommercialSubUnificado
  | CommercialSubOtro

/**
 * Variantes de "campo" para publicaciones de tipo `land`.
 */
export type FieldVariant = 'agricola' | 'ganadero' | 'mixto' | 'forestal' | 'otro'

export interface FieldAgricola {
  variant: 'agricola'
  hectares: number
  cropType: string
  irrigation?: string | null
  soilType?: string | null
}

export interface FieldGanadero {
  variant: 'ganadero'
  hectares: number
  animalSpecies: string
  headCount: number
  housingSystem?: string | null
}

export interface FieldMixto {
  variant: 'mixto'
  hectares: number
  cropType: string
  animalSpecies: string
  headCount: number
}

export interface FieldForestal {
  variant: 'forestal'
  hectares: number
  treeSpecies: string
  ageYears?: number | null
}

export interface FieldOtro {
  variant: 'otro'
  description: string
}

export type ListingField =
  | FieldAgricola
  | FieldGanadero
  | FieldMixto
  | FieldForestal
  | FieldOtro

export interface ListingMedia {
  id: UUID
  listingId: UUID
  type: 'image' | 'video' | 'floor_plan' | 'virtual_tour'
  url: string
  thumbnailUrl: string | null
  alt: string | null
  order: number
  isPrimary: boolean
  width: number | null
  height: number | null
  createdAt: Timestamp
}

export interface Listing {
  id: UUID
  organizationId: UUID
  publisherId: UUID // Usuario que publicó
  externalId: string | null // ID en sistema externo (para integraciones)

  // Tipo y operación
  propertyType: PropertyType
  operationType: OperationType

  // Estado
  status: ListingStatus
  source: ListingSource

  // Ubicación
  address: Address
  location: GeoPoint | null
  hideExactAddress: boolean

  // Título y descripción
  title: string
  description: string
  internalNotes: string | null // Notas internas para el equipo

  // Precios
  price: ListingPrice

  // Superficies
  surface: ListingSurface

  // Ambientes
  rooms: ListingRooms

  // Características
  features: ListingFeatures

  // Media
  mediaCount: number
  primaryImageUrl: string | null

  // Vigencia
  publishedAt: Timestamp | null
  lastValidatedAt: Timestamp | null
  expiresAt: Timestamp | null
  renewalCount: number

  // Métricas básicas
  viewCount: number
  contactCount: number
  favoriteCount: number

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp

  // Campos para búsqueda/matching (calculados)
  searchVector: string | null // Para full-text search
  qualityScore: number | null // Score de calidad del aviso (0-100)
}

export interface ListingWithMedia extends Listing {
  media: ListingMedia[]
}

export interface ListingValidation {
  id: UUID
  listingId: UUID
  validatedBy: UUID | null // null = automático
  validatedAt: Timestamp
  validationType: 'manual_renewal' | 'api_sync' | 'admin_review'
  notes: string | null
}

export interface ListingModeration {
  id: UUID
  listingId: UUID
  moderatorId: UUID
  action: 'approved' | 'rejected' | 'flagged'
  reason: string | null
  createdAt: Timestamp
}

// Para integración/feed (post-MVP pero definimos estructura)
export interface ListingIntegration {
  id: UUID
  organizationId: UUID
  name: string
  type: 'api' | 'xml_feed' | 'json_feed'
  endpoint: string | null
  apiKey: string | null
  fieldMapping: Record<string, string>
  syncFrequency: number // minutos
  lastSyncAt: Timestamp | null
  lastSyncStatus: 'success' | 'partial' | 'failed' | null
  lastSyncError: string | null
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
