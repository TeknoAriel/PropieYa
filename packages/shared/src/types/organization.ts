import { type UUID, type Timestamp, type Address } from './common'

/**
 * Tipos de organización
 */
export type OrganizationType =
  | 'real_estate_agency' // Inmobiliaria tradicional
  | 'developer' // Desarrollista/constructora
  | 'broker' // Corredor independiente
  | 'franchise' // Franquicia
  | 'network' // Red de inmobiliarias
  | 'association' // Colegio/asociación

/**
 * Estados de la organización
 */
export type OrganizationStatus = 'pending' | 'active' | 'suspended' | 'inactive'

/**
 * Plan de suscripción (post-MVP, pero definimos estructura)
 */
export type PlanType = 'free' | 'starter' | 'professional' | 'enterprise'

export interface Organization {
  id: UUID
  tenantId: UUID | null // Para white-label futuro
  type: OrganizationType
  status: OrganizationStatus

  // Datos básicos
  name: string
  legalName: string | null
  taxId: string | null // CUIT/RUT/etc
  registrationNumber: string | null // Matrícula

  // Contacto
  email: string
  phone: string | null
  website: string | null
  address: Address | null

  // Branding
  logoUrl: string | null
  primaryColor: string | null
  description: string | null

  // Configuración
  settings: OrganizationSettings

  // Plan (simplificado para MVP)
  planType: PlanType
  listingLimit: number | null // null = ilimitado
  userLimit: number | null

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  verifiedAt: Timestamp | null
}

export interface OrganizationSettings {
  // Vigencia
  autoRenewListings: boolean
  renewalReminderDays: number // días antes del vencimiento

  // Leads
  leadNotificationEmails: string[]
  leadAssignmentMode: 'manual' | 'round_robin' | 'by_listing'

  // Integración (post-MVP)
  apiEnabled: boolean
  webhookUrl: string | null

  // White-label (post-MVP)
  customDomain: string | null
  customTheme: Record<string, string> | null
}

export interface Team {
  id: UUID
  organizationId: UUID
  name: string
  description: string | null
  leaderId: UUID | null
  createdAt: Timestamp
  updatedAt: Timestamp
  isActive: boolean
}

export interface OrganizationInvite {
  id: UUID
  organizationId: UUID
  email: string
  role: string
  teamId: UUID | null
  invitedBy: UUID
  token: string
  expiresAt: Timestamp
  acceptedAt: Timestamp | null
  createdAt: Timestamp
}

export interface OrganizationStats {
  organizationId: UUID
  totalListings: number
  activeListings: number
  totalLeads: number
  leadsThisMonth: number
  averageResponseTime: number | null // minutos
  conversionRate: number | null // porcentaje
  updatedAt: Timestamp
}
