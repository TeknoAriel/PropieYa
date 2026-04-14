import { type UUID, type Timestamp } from './common'
import { type DemandProfile } from './demand-profile'
import { type MatchingResult } from './matching'

/**
 * Visibilidad de datos / monetización en panel (independiente de `LeadStatus` CRM).
 */
export type LeadAccessStatus = 'pending' | 'activated' | 'managed'

/** Cómo se desbloqueó el contacto del lead */
export type LeadActivationMode = 'plan' | 'pay_per_lead'

/**
 * Estado del lead
 */
export type LeadStatus =
  | 'new' // Nuevo, sin contactar
  | 'contacted' // Contactado
  | 'qualified' // Calificado (interesado real)
  | 'negotiating' // En negociación
  | 'converted' // Convertido (operación cerrada)
  | 'lost' // Perdido
  | 'archived' // Archivado

/**
 * Nivel de intención estimado
 */
export type IntentLevel = 'low' | 'medium' | 'high' | 'very_high'

/**
 * Fuente del lead
 */
export type LeadSource =
  | 'listing_contact' // Contacto desde ficha
  | 'conversation' // Desde conversación
  | 'alert' // Desde alerta
  | 'saved_search' // Desde búsqueda guardada
  | 'external' // Fuente externa

/**
 * Lead básico
 */
export interface Lead {
  id: UUID
  organizationId: UUID
  listingId: UUID
  assignedTo: UUID | null // Agente asignado

  // Datos del contacto
  contact: LeadContact

  // Mensaje original
  message: string
  messageGeneratedBySystem: boolean

  // Contexto enriquecido
  enrichment: LeadEnrichment

  // Estado
  status: LeadStatus
  intentLevel: IntentLevel
  source: LeadSource

  // Seguimiento
  notes: LeadNote[]
  lastContactAt: Timestamp | null
  nextFollowUpAt: Timestamp | null

  // Métricas
  responseTimeMinutes: number | null
  interactionCount: number

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  convertedAt: Timestamp | null
}

/**
 * Datos de contacto del lead
 */
export interface LeadContact {
  userId: UUID | null // null si no está registrado
  name: string
  email: string
  phone: string | null
  preferredContact: 'email' | 'phone' | 'whatsapp'
  isVerified: boolean
}

/**
 * Enriquecimiento del lead
 */
export interface LeadEnrichment {
  // Resumen del perfil de demanda
  demandSummary: string | null
  demandProfileId: UUID | null

  // Preferencias clave detectadas
  keyPreferences: Array<{
    criterion: string
    value: string
    importance: string
  }>

  // Match con la propiedad contactada
  matchScore: number | null
  matchExplanation: string | null

  // Historial de interacción
  interactionHistory: LeadInteractionSummary

  // Score de calidad del lead (0-100)
  qualityScore: number

  // Señales de intención
  intentSignals: IntentSignal[]
}

/**
 * Resumen de interacción del usuario
 */
export interface LeadInteractionSummary {
  totalSearches: number
  totalListingsViewed: number
  listingsViewedIds: UUID[]
  listingsSavedIds: UUID[]
  listingsDiscardedIds: UUID[]
  listingsContactedIds: UUID[]
  averageTimeOnListingSeconds: number | null
  lastActiveAt: Timestamp
  conversationsCount: number
  daysActive: number
}

/**
 * Señales de intención
 */
export interface IntentSignal {
  signal: string
  strength: 'weak' | 'medium' | 'strong'
  description: string
  timestamp: Timestamp
}

/**
 * Nota en el lead
 */
export interface LeadNote {
  id: UUID
  authorId: UUID
  authorName: string
  content: string
  createdAt: Timestamp
  isPrivate: boolean
}

/**
 * Actividad del lead (timeline)
 */
export interface LeadActivity {
  id: UUID
  leadId: UUID
  type: LeadActivityType
  description: string
  metadata?: Record<string, unknown>
  performedBy: UUID | null
  createdAt: Timestamp
}

export type LeadActivityType =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'note_added'
  | 'contacted'
  | 'follow_up_scheduled'
  | 'converted'
  | 'lost'

/**
 * Calificación del lead por la inmobiliaria
 */
export interface LeadRating {
  leadId: UUID
  ratedBy: UUID
  quality: 1 | 2 | 3 | 4 | 5
  relevance: 1 | 2 | 3 | 4 | 5
  feedback: string | null
  createdAt: Timestamp
}

/**
 * Request para crear lead
 */
export interface CreateLeadRequest {
  listingId: UUID
  contact: {
    name: string
    email: string
    phone?: string
    preferredContact?: 'email' | 'phone' | 'whatsapp'
  }
  message: string
  useGeneratedMessage?: boolean
  source?: LeadSource
  sessionId?: string
  conversationId?: string
}

/**
 * Lead con datos expandidos para vista de detalle
 */
export interface LeadWithDetails extends Lead {
  listing: {
    id: UUID
    title: string
    address: string
    price: number
    currency: string
    primaryImageUrl: string | null
  }
  assignedAgent: {
    id: UUID
    name: string
    email: string
  } | null
  demandProfile: DemandProfile | null
  matchingResult: MatchingResult | null
  activities: LeadActivity[]
}
