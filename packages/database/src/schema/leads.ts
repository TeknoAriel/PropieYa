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

import { listings } from './listings'
import { organizations } from './organizations'
import { conversations, demandProfiles } from './search'
import { users } from './users'

/**
 * Leads
 */
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),

    // Contacto
    contactUserId: uuid('contact_user_id').references(() => users.id, { onDelete: 'set null' }),
    contactName: varchar('contact_name', { length: 255 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 50 }),
    preferredContact: varchar('preferred_contact', { length: 20 }).notNull().default('email'),
    isVerified: boolean('is_verified').notNull().default(false),

    // Mensaje
    message: text('message').notNull(),
    messageGeneratedBySystem: boolean('message_generated_by_system').notNull().default(false),

    // Contexto enriquecido
    demandProfileId: uuid('demand_profile_id').references(() => demandProfiles.id, {
      onDelete: 'set null',
    }),
    conversationId: uuid('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    enrichment: jsonb('enrichment').notNull().default({}),
    qualityScore: integer('quality_score'),

    // Estado
    status: varchar('status', { length: 50 }).notNull().default('new'),
    intentLevel: varchar('intent_level', { length: 20 }).notNull().default('medium'),
    source: varchar('source', { length: 50 }).notNull().default('listing_contact'),

    // Seguimiento
    lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
    nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
    responseTimeMinutes: integer('response_time_minutes'),
    interactionCount: integer('interaction_count').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
  },
  (table) => ({
    orgIdx: index('leads_org_idx').on(table.organizationId),
    listingIdx: index('leads_listing_idx').on(table.listingId),
    statusIdx: index('leads_status_idx').on(table.status),
    assignedIdx: index('leads_assigned_idx').on(table.assignedTo),
    createdIdx: index('leads_created_idx').on(table.createdAt),
  })
)

/**
 * Notas en leads
 */
export const leadNotes = pgTable(
  'lead_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    content: text('content').notNull(),
    isPrivate: boolean('is_private').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdx: index('lead_notes_lead_idx').on(table.leadId),
  })
)

/**
 * Actividad/timeline del lead
 */
export const leadActivities = pgTable(
  'lead_activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    description: text('description').notNull(),
    metadata: jsonb('metadata'),
    performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdx: index('lead_activities_lead_idx').on(table.leadId),
    createdIdx: index('lead_activities_created_idx').on(table.createdAt),
  })
)

/**
 * Calificaciones de leads
 */
export const leadRatings = pgTable(
  'lead_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' })
      .unique(),
    ratedBy: uuid('rated_by')
      .notNull()
      .references(() => users.id),
    quality: integer('quality').notNull(), // 1-5
    relevance: integer('relevance').notNull(), // 1-5
    feedback: text('feedback'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdx: index('lead_ratings_lead_idx').on(table.leadId),
  })
)

// Relations
export const leadsRelations = relations(leads, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [leads.organizationId],
    references: [organizations.id],
  }),
  listing: one(listings, {
    fields: [leads.listingId],
    references: [listings.id],
  }),
  assignedAgent: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  contactUser: one(users, {
    fields: [leads.contactUserId],
    references: [users.id],
  }),
  demandProfile: one(demandProfiles, {
    fields: [leads.demandProfileId],
    references: [demandProfiles.id],
  }),
  conversation: one(conversations, {
    fields: [leads.conversationId],
    references: [conversations.id],
  }),
  notes: many(leadNotes),
  activities: many(leadActivities),
  rating: one(leadRatings),
}))

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  lead: one(leads, {
    fields: [leadNotes.leadId],
    references: [leads.id],
  }),
  author: one(users, {
    fields: [leadNotes.authorId],
    references: [users.id],
  }),
}))

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id],
  }),
  performer: one(users, {
    fields: [leadActivities.performedBy],
    references: [users.id],
  }),
}))
