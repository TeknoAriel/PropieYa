import { type UUID, type Timestamp } from './common'

/**
 * Tipo de notificación
 */
export type NotificationType =
  // Para usuarios buscadores
  | 'new_listing_match' // Nueva propiedad que matchea su búsqueda
  | 'price_change' // Cambio de precio en propiedad guardada
  | 'listing_sold' // Propiedad guardada vendida/alquilada

  // Para publicadores
  | 'new_lead' // Nuevo lead recibido
  | 'listing_expiring' // Aviso próximo a vencer
  | 'listing_suspended' // Aviso suspendido
  | 'listing_approved' // Aviso aprobado por moderación
  | 'listing_rejected' // Aviso rechazado por moderación

  // Para admins
  | 'new_organization' // Nueva organización registrada
  | 'moderation_required' // Aviso requiere moderación

  // Sistema
  | 'system_announcement' // Anuncio del sistema

/**
 * Canal de notificación
 */
export type NotificationChannel = 'in_app' | 'email' | 'push'

/**
 * Estado de notificación
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

/**
 * Prioridad de notificación
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

/**
 * Notificación
 */
export interface Notification {
  id: UUID
  userId: UUID
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  priority: NotificationPriority

  // Contenido
  title: string
  body: string
  data: NotificationData

  // Acción
  actionUrl: string | null
  actionLabel: string | null

  // Tracking
  sentAt: Timestamp | null
  deliveredAt: Timestamp | null
  readAt: Timestamp | null
  clickedAt: Timestamp | null

  // Metadata
  createdAt: Timestamp
  expiresAt: Timestamp | null
}

/**
 * Datos específicos por tipo de notificación
 */
export type NotificationData =
  | NewListingMatchData
  | PriceChangeData
  | NewLeadData
  | ListingExpiringData
  | SystemAnnouncementData

export interface NewListingMatchData {
  type: 'new_listing_match'
  listingId: UUID
  listingTitle: string
  matchScore: number
  alertId: UUID
}

export interface PriceChangeData {
  type: 'price_change'
  listingId: UUID
  listingTitle: string
  oldPrice: number
  newPrice: number
  currency: string
}

export interface NewLeadData {
  type: 'new_lead'
  leadId: UUID
  listingId: UUID
  listingTitle: string
  contactName: string
  intentLevel: string
}

export interface ListingExpiringData {
  type: 'listing_expiring'
  listingId: UUID
  listingTitle: string
  expiresAt: Timestamp
  daysRemaining: number
}

export interface SystemAnnouncementData {
  type: 'system_announcement'
  announcementId: UUID
  category: string
}

/**
 * Alerta de búsqueda guardada
 */
export interface SearchAlert {
  id: UUID
  userId: UUID
  name: string | null

  // Filtros de la búsqueda
  filters: Record<string, unknown>
  filtersSummary: string // "3 amb en Palermo, hasta USD 200K"

  // Configuración
  frequency: 'immediate' | 'daily' | 'weekly'
  channels: NotificationChannel[]
  isActive: boolean

  // Métricas
  matchCount: number // Cuántas propiedades han matcheado
  lastMatchAt: Timestamp | null
  lastNotifiedAt: Timestamp | null

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Preferencias de notificación del usuario
 */
export interface NotificationPreferences {
  userId: UUID

  // Por tipo
  typePreferences: Record<
    NotificationType,
    {
      enabled: boolean
      channels: NotificationChannel[]
    }
  >

  // Horarios
  quietHoursEnabled: boolean
  quietHoursStart: string | null // "22:00"
  quietHoursEnd: string | null // "08:00"
  timezone: string

  // Email digest
  emailDigestEnabled: boolean
  emailDigestFrequency: 'daily' | 'weekly'

  updatedAt: Timestamp
}

/**
 * Request para crear notificación
 */
export interface CreateNotificationRequest {
  userId: UUID
  type: NotificationType
  title: string
  body: string
  data: NotificationData
  priority?: NotificationPriority
  channels?: NotificationChannel[]
  actionUrl?: string
  actionLabel?: string
  expiresAt?: Timestamp
}

/**
 * Template de notificación
 */
export interface NotificationTemplate {
  type: NotificationType
  channel: NotificationChannel
  subject?: string // Para email
  title: string
  body: string
  variables: string[] // Variables disponibles para interpolación
}
