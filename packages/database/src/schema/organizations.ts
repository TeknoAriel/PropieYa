import { relations } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core'

import { leads } from './leads'
import { listings } from './listings'
import { users } from './users'

/**
 * Organizaciones (inmobiliarias, desarrollistas, etc.)
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id'), // Para white-label futuro
    type: varchar('type', { length: 50 }).notNull(), // real_estate_agency, developer, broker, etc.
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, active, suspended, inactive

    // Datos básicos
    name: varchar('name', { length: 255 }).notNull(),
    legalName: varchar('legal_name', { length: 255 }),
    taxId: varchar('tax_id', { length: 50 }), // CUIT
    registrationNumber: varchar('registration_number', { length: 50 }), // Matrícula

    // Contacto
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    website: varchar('website', { length: 255 }),
    address: jsonb('address'),

    // Branding
    logoUrl: text('logo_url'),
    primaryColor: varchar('primary_color', { length: 7 }),
    description: text('description'),

    // Configuración
    settings: jsonb('settings').notNull().default({
      autoRenewListings: false,
      renewalReminderDays: 3,
      leadNotificationEmails: [],
      leadAssignmentMode: 'manual',
      apiEnabled: false,
      webhookUrl: null,
    }),

    // Plan
    planType: varchar('plan_type', { length: 20 }).notNull().default('free'),
    listingLimit: integer('listing_limit'),
    userLimit: integer('user_limit'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('organizations_tenant_idx').on(table.tenantId),
    statusIdx: index('organizations_status_idx').on(table.status),
    emailIdx: index('organizations_email_idx').on(table.email),
  })
)

/**
 * Equipos/sucursales dentro de una organización
 */
export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    leaderId: uuid('leader_id').references(() => users.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('teams_org_idx').on(table.organizationId),
  })
)

/**
 * Membresía de usuario en organización
 */
export const organizationMemberships = pgTable(
  'organization_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull(), // agent, coordinator, org_admin
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userOrgIdx: index('org_memberships_user_org_idx').on(table.userId, table.organizationId),
    orgIdx: index('org_memberships_org_idx').on(table.organizationId),
  })
)

/**
 * Invitaciones pendientes
 */
export const organizationInvites = pgTable(
  'organization_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: index('org_invites_token_idx').on(table.token),
    orgEmailIdx: index('org_invites_org_email_idx').on(table.organizationId, table.email),
  })
)

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(organizationMemberships),
  teams: many(teams),
  invites: many(organizationInvites),
  listings: many(listings),
  leads: many(leads),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  leader: one(users, {
    fields: [teams.leaderId],
    references: [users.id],
  }),
  members: many(organizationMemberships),
}))

export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  user: one(users, {
    fields: [organizationMemberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [organizationMemberships.organizationId],
    references: [organizations.id],
  }),
  team: one(teams, {
    fields: [organizationMemberships.teamId],
    references: [teams.id],
  }),
}))
