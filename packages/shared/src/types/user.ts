import { type UUID, type Timestamp } from './common'

/**
 * Roles del sistema
 * - visitor: no registrado (implícito)
 * - user: usuario registrado básico
 * - agent: agente/corredor de una inmobiliaria
 * - coordinator: coordinador de equipo/sucursal
 * - org_admin: administrador de organización
 * - platform_admin: administrador de plataforma Propieya
 * - support: soporte/operaciones
 */
export type UserRole =
  | 'user'
  | 'agent'
  | 'coordinator'
  | 'org_admin'
  | 'platform_admin'
  | 'support'

/**
 * Permisos granulares
 */
export type Permission =
  // Listings
  | 'listing:create'
  | 'listing:read'
  | 'listing:update'
  | 'listing:delete'
  | 'listing:publish'
  | 'listing:moderate'
  // Leads
  | 'lead:view'
  | 'lead:manage'
  | 'lead:assign'
  // Organization
  | 'org:read'
  | 'org:manage'
  | 'org:members'
  | 'org:billing'
  // Platform
  | 'platform:admin'
  | 'platform:support'
  // Analytics
  | 'analytics:own'
  | 'analytics:team'
  | 'analytics:org'
  | 'analytics:platform'

/**
 * Mapeo de roles a permisos
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: ['listing:read'],
  agent: [
    'listing:create',
    'listing:read',
    'listing:update',
    'listing:delete',
    'listing:publish',
    'lead:view',
    'lead:manage',
    'org:read',
    'analytics:own',
  ],
  coordinator: [
    'listing:create',
    'listing:read',
    'listing:update',
    'listing:delete',
    'listing:publish',
    'lead:view',
    'lead:manage',
    'lead:assign',
    'org:read',
    'org:members',
    'analytics:own',
    'analytics:team',
  ],
  org_admin: [
    'listing:create',
    'listing:read',
    'listing:update',
    'listing:delete',
    'listing:publish',
    'lead:view',
    'lead:manage',
    'lead:assign',
    'org:read',
    'org:manage',
    'org:members',
    'org:billing',
    'analytics:own',
    'analytics:team',
    'analytics:org',
  ],
  platform_admin: [
    'listing:create',
    'listing:read',
    'listing:update',
    'listing:delete',
    'listing:publish',
    'listing:moderate',
    'lead:view',
    'lead:manage',
    'lead:assign',
    'org:read',
    'org:manage',
    'org:members',
    'org:billing',
    'platform:admin',
    'analytics:own',
    'analytics:team',
    'analytics:org',
    'analytics:platform',
  ],
  support: [
    'listing:read',
    'listing:moderate',
    'lead:view',
    'org:read',
    'platform:support',
    'analytics:platform',
  ],
}

export interface User {
  id: UUID
  email: string
  emailVerified: boolean
  name: string
  phone: string | null
  phoneVerified: boolean
  avatarUrl: string | null
  locale: string
  timezone: string
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp | null
  isActive: boolean
}

export interface UserPreferences {
  userId: UUID
  theme: 'light' | 'dark' | 'system'
  displayMode: 'simple' | 'professional'
  emailNotifications: {
    newListings: boolean
    priceChanges: boolean
    leadUpdates: boolean
    marketing: boolean
  }
  pushNotifications: boolean
}

export interface UserSession {
  userId: UUID
  sessionId: UUID
  deviceInfo: string | null
  ipAddress: string | null
  createdAt: Timestamp
  expiresAt: Timestamp
  isActive: boolean
}

export interface OrganizationMembership {
  userId: UUID
  organizationId: UUID
  role: UserRole
  teamId: UUID | null
  invitedBy: UUID | null
  joinedAt: Timestamp
  isActive: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthUser extends User {
  memberships: OrganizationMembership[]
  preferences: UserPreferences
}
