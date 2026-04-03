import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { listings } from './listings'
import { organizations } from './organizations'
import { users } from './users'

/**
 * Hechos de telemetría del portal (doc 49 F2).
 * Sin PII en `payload`; IDs opcionales según el terminal.
 */
export const portalStatsEvents = pgTable(
  'portal_stats_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    terminalId: varchar('terminal_id', { length: 80 }).notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    listingId: uuid('listing_id').references(() => listings.id, {
      onDelete: 'set null',
    }),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    terminalCreatedIdx: index('portal_stats_events_terminal_created_idx').on(
      table.terminalId,
      table.createdAt
    ),
    orgCreatedIdx: index('portal_stats_events_org_created_idx').on(
      table.organizationId,
      table.createdAt
    ),
    listingCreatedIdx: index('portal_stats_events_listing_created_idx').on(
      table.listingId,
      table.createdAt
    ),
  })
)
