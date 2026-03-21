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

import { users } from './users'

/**
 * Conversaciones de búsqueda
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('active'),

    // Estado actual
    currentFilters: jsonb('current_filters').notNull().default({}),
    currentIntent: jsonb('current_intent'),
    context: jsonb('context').notNull().default({
      preferences: { mustHave: [], niceToHave: [], dealBreakers: [] },
      mentionedListings: [],
      viewedListings: [],
      likedListings: [],
      dislikedListings: [],
      mentionedNeighborhoods: [],
      priceDiscussions: [],
    }),

    // Métricas
    messageCount: integer('message_count').notNull().default(0),
    searchCount: integer('search_count').notNull().default(0),
    refinementCount: integer('refinement_count').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('conversations_user_idx').on(table.userId),
    sessionIdx: index('conversations_session_idx').on(table.sessionId),
    statusIdx: index('conversations_status_idx').on(table.status),
  })
)

/**
 * Mensajes de conversación
 */
export const conversationMessages = pgTable(
  'conversation_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(), // user, assistant, system
    content: text('content').notNull(),
    messageType: varchar('message_type', { length: 50 }), // Para assistant: greeting, confirmation, results, etc.
    extractedIntent: jsonb('extracted_intent'),
    searchId: varchar('search_id', { length: 100 }), // Si disparó búsqueda
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdx: index('conversation_messages_conv_idx').on(table.conversationId),
    createdIdx: index('conversation_messages_created_idx').on(table.createdAt),
  })
)

/**
 * Perfil de demanda del usuario
 */
export const demandProfiles = pgTable(
  'demand_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),

    // Preferencias estructuradas (ver tipos en @propieya/shared)
    propertyTypes: jsonb('property_types').notNull().default({}),
    operationTypes: jsonb('operation_types').notNull().default({}),
    location: jsonb('location').notNull().default({}),
    price: jsonb('price').notNull().default({}),
    space: jsonb('space').notNull().default({}),
    features: jsonb('features').notNull().default({}),

    // Referencias
    likedListings: jsonb('liked_listings').notNull().default([]),
    dislikedListings: jsonb('disliked_listings').notNull().default([]),
    contactedListings: jsonb('contacted_listings').notNull().default([]),
    discardReasons: jsonb('discard_reasons').notNull().default([]),

    // Resumen
    naturalLanguageSummary: text('natural_language_summary'),
    completeness: integer('completeness').notNull().default(0),
    confidence: integer('confidence').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastSearchAt: timestamp('last_search_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('demand_profiles_user_idx').on(table.userId),
    activeIdx: index('demand_profiles_active_idx').on(table.userId, table.isActive),
  })
)

/**
 * Alertas de búsqueda guardadas
 */
export const searchAlerts = pgTable(
  'search_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }),

    // Filtros de búsqueda
    filters: jsonb('filters').notNull(),
    filtersSummary: varchar('filters_summary', { length: 500 }).notNull(),

    // Configuración
    frequency: varchar('frequency', { length: 20 }).notNull().default('daily'),
    channels: jsonb('channels').notNull().default(['email']),
    isActive: boolean('is_active').notNull().default(true),

    // Métricas
    matchCount: integer('match_count').notNull().default(0),
    lastMatchAt: timestamp('last_match_at', { withTimezone: true }),
    lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('search_alerts_user_idx').on(table.userId),
    activeIdx: index('search_alerts_active_idx').on(table.isActive),
  })
)

/**
 * Historial de búsquedas
 */
export const searchHistory = pgTable(
  'search_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').notNull(),
    conversationId: uuid('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),

    // Búsqueda
    filters: jsonb('filters').notNull(),
    sort: varchar('sort', { length: 50 }),
    resultCount: integer('result_count').notNull(),
    processingTimeMs: integer('processing_time_ms'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('search_history_user_idx').on(table.userId),
    sessionIdx: index('search_history_session_idx').on(table.sessionId),
    createdIdx: index('search_history_created_idx').on(table.createdAt),
  })
)

// Relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(conversationMessages),
}))

export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationMessages.conversationId],
    references: [conversations.id],
  }),
}))

export const demandProfilesRelations = relations(demandProfiles, ({ one }) => ({
  user: one(users, {
    fields: [demandProfiles.userId],
    references: [users.id],
  }),
}))

export const searchAlertsRelations = relations(searchAlerts, ({ one }) => ({
  user: one(users, {
    fields: [searchAlerts.userId],
    references: [users.id],
  }),
}))
