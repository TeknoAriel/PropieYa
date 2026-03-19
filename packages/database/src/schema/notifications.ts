import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

import { users } from './users'

/**
 * Notificaciones
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    channel: varchar('channel', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    priority: varchar('priority', { length: 20 }).notNull().default('normal'),

    // Contenido
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    data: jsonb('data').notNull(),

    // Acción
    actionUrl: text('action_url'),
    actionLabel: varchar('action_label', { length: 100 }),

    // Tracking
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('notifications_user_idx').on(table.userId),
    userStatusIdx: index('notifications_user_status_idx').on(table.userId, table.status),
    typeIdx: index('notifications_type_idx').on(table.type),
    createdIdx: index('notifications_created_idx').on(table.createdAt),
  })
)

/**
 * Preferencias de notificación del usuario
 */
export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Preferencias por tipo
  typePreferences: jsonb('type_preferences').notNull().default({}),

  // Horarios
  quietHoursEnabled: boolean('quiet_hours_enabled').notNull().default(false),
  quietHoursStart: varchar('quiet_hours_start', { length: 5 }), // "22:00"
  quietHoursEnd: varchar('quiet_hours_end', { length: 5 }), // "08:00"
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Argentina/Buenos_Aires'),

  // Email digest
  emailDigestEnabled: boolean('email_digest_enabled').notNull().default(false),
  emailDigestFrequency: varchar('email_digest_frequency', { length: 20 }).default('daily'),

  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}))
