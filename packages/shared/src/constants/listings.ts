import type { PropertyType, OperationType, ListingStatus, Amenity } from '../types/listing'

/**
 * Etiquetas de tipos de propiedad
 */
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Departamento',
  house: 'Casa',
  ph: 'PH',
  land: 'Terreno',
  office: 'Oficina',
  commercial: 'Local comercial',
  warehouse: 'Depósito',
  parking: 'Cochera',
  development_unit: 'Unidad en emprendimiento',
}

/**
 * Etiquetas de tipos de operación
 */
export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  sale: 'Venta',
  rent: 'Alquiler',
  temporary_rent: 'Alquiler temporario',
}

/**
 * Etiquetas de estados de aviso
 */
export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Borrador',
  pending_review: 'En revisión',
  active: 'Activo',
  expiring_soon: 'Por vencer',
  suspended: 'Suspendido',
  archived: 'Archivado',
  sold: 'Vendido/Alquilado',
  withdrawn: 'Dado de baja',
  rejected: 'Rechazado (validación)',
  expired: 'Vencido (sin actualizar contenido)',
}

/**
 * Colores de estados de aviso
 */
export const LISTING_STATUS_COLORS: Record<ListingStatus, string> = {
  draft: 'gray',
  pending_review: 'yellow',
  active: 'green',
  expiring_soon: 'orange',
  suspended: 'red',
  archived: 'gray',
  sold: 'blue',
  withdrawn: 'gray',
  rejected: 'red',
  expired: 'orange',
}

/**
 * Etiquetas de amenities
 */
export const AMENITY_LABELS: Record<Amenity, string> = {
  pool: 'Pileta',
  gym: 'Gimnasio',
  security_24h: 'Seguridad 24h',
  laundry: 'Lavadero',
  rooftop: 'Rooftop',
  sum: 'SUM',
  playground: 'Juegos infantiles',
  bbq: 'Parrilla',
  garden: 'Jardín',
  balcony: 'Balcón',
  terrace: 'Terraza',
  parking: 'Cochera',
  storage: 'Baulera',
  elevator: 'Ascensor',
  doorman: 'Portero',
  air_conditioning: 'Aire acondicionado',
  heating: 'Calefacción',
  furnished: 'Amoblado',
  pet_friendly: 'Acepta mascotas',
  wheelchair_accessible: 'Accesible',
  fireplace: 'Chimenea',
  front_facing: 'Contra frente',
  credit_approved: 'Apto crédito',
}

/**
 * Iconos de amenities (Lucide icon names)
 */
export const AMENITY_ICONS: Record<Amenity, string> = {
  pool: 'waves',
  gym: 'dumbbell',
  security_24h: 'shield-check',
  laundry: 'shirt',
  rooftop: 'building',
  sum: 'users',
  playground: 'baby',
  bbq: 'flame',
  garden: 'trees',
  balcony: 'square',
  terrace: 'sun',
  parking: 'car',
  storage: 'box',
  elevator: 'arrow-up-down',
  doorman: 'user-check',
  air_conditioning: 'snowflake',
  heating: 'thermometer',
  furnished: 'sofa',
  pet_friendly: 'paw-print',
  wheelchair_accessible: 'accessibility',
  fireplace: 'flame',
  front_facing: 'building-front',
  credit_approved: 'credit-card',
}

/**
 * Configuración de vigencia
 */
export const LISTING_VALIDITY = {
  /** Días de validez para avisos manuales */
  MANUAL_VALIDITY_DAYS: 30,
  /** Días antes del vencimiento para notificar */
  EXPIRING_SOON_DAYS: 3,
  /** Días suspendido antes de archivar */
  SUSPENDED_TO_ARCHIVED_DAYS: 15,
  /** Horas máximas sin refresh para integraciones */
  API_MAX_HOURS_WITHOUT_REFRESH: 24,
  /** Horas sin sync para suspender avisos de integración */
  API_SUSPEND_HOURS: 72,
} as const

/**
 * Límites de media
 */
export const MEDIA_LIMITS = {
  MAX_IMAGES_PER_LISTING: 30,
  MAX_IMAGE_SIZE_MB: 10,
  MIN_IMAGE_WIDTH: 800,
  MIN_IMAGE_HEIGHT: 600,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  THUMBNAIL_WIDTH: 400,
  THUMBNAIL_HEIGHT: 300,
} as const
