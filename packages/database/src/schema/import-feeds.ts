import { relations } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { organizations } from './organizations'

/**
 * Estado por fuente de importación (feed URL) para sync incremental:
 * ETag / Last-Modified / hash del body para evitar reprocesar cuando no hay cambios.
 */
export const importFeedSources = pgTable(
  'import_feed_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    feedUrl: text('feed_url').notNull(),
    lastEtag: varchar('last_etag', { length: 512 }),
    lastModified: varchar('last_modified', { length: 128 }),
    /** SHA-256 del cuerpo JSON (cuando no hay ETag fiable en el CDN). */
    lastBodySha256: varchar('last_body_sha256', { length: 64 }),
    lastSuccessfulSyncAt: timestamp('last_successful_sync_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgUrlUq: uniqueIndex('import_feed_sources_org_url_uq').on(
      table.organizationId,
      table.feedUrl
    ),
    orgIdx: index('import_feed_sources_org_idx').on(table.organizationId),
  })
)

export const importFeedSourcesRelations = relations(importFeedSources, ({ one }) => ({
  organization: one(organizations, {
    fields: [importFeedSources.organizationId],
    references: [organizations.id],
  }),
}))
