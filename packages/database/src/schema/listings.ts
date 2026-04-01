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
  doublePrecision,
  index,
} from 'drizzle-orm/pg-core'

import { importFeedSources } from './import-feeds'
import { organizations } from './organizations'
import { users } from './users'

/**
 * Propiedades/avisos
 */
export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    publisherId: uuid('publisher_id')
      .notNull()
      .references(() => users.id),
    externalId: varchar('external_id', { length: 255 }), // ID en sistema externo
    /** Hash del payload importado; evita UPDATE si el ítem del feed no cambió. */
    importContentHash: varchar('import_content_hash', { length: 64 }),
    importFeedSourceId: uuid('import_feed_source_id')
      .references(() => importFeedSources.id, { onDelete: 'cascade' }),

    /**
     * Si está definido, apunta al aviso “canonical” del grupo (duplicado MLS-ready / Sprint 26.8).
     * FK a `listings.id` se puede añadir en migración SQL; búsqueda pública excluye `dedup_canonical_id IS NOT NULL`.
     */
    dedupCanonicalId: uuid('dedup_canonical_id'),

    // Tipo y operación
    propertyType: varchar('property_type', { length: 50 }).notNull(),
    operationType: varchar('operation_type', { length: 50 }).notNull(),

    // Estado
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    source: varchar('source', { length: 50 }).notNull().default('manual'),

    // Ubicación
    address: jsonb('address').notNull(),
    locationLat: doublePrecision('location_lat'),
    locationLng: doublePrecision('location_lng'),
    hideExactAddress: boolean('hide_exact_address').notNull().default(false),

    // Título y descripción
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    internalNotes: text('internal_notes'),

    // Precio
    priceAmount: doublePrecision('price_amount').notNull(),
    priceCurrency: varchar('price_currency', { length: 3 }).notNull().default('USD'),
    pricePerM2: doublePrecision('price_per_m2'),
    showPrice: boolean('show_price').notNull().default(true),
    expenses: doublePrecision('expenses'),
    expensesCurrency: varchar('expenses_currency', { length: 3 }),

    // Superficie
    surfaceTotal: doublePrecision('surface_total').notNull(),
    surfaceCovered: doublePrecision('surface_covered'),
    surfaceSemicovered: doublePrecision('surface_semicovered'),
    surfaceLand: doublePrecision('surface_land'),

    // Ambientes
    bedrooms: integer('bedrooms'),
    bathrooms: integer('bathrooms'),
    toilettes: integer('toilettes'),
    garages: integer('garages'),
    totalRooms: integer('total_rooms'),

    // Características
    features: jsonb('features').notNull().default({}),

    // Media
    mediaCount: integer('media_count').notNull().default(0),
    primaryImageUrl: text('primary_image_url'),

    // Vigencia
    publishedAt: timestamp('published_at', { withTimezone: true }),
    lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    renewalCount: integer('renewal_count').notNull().default(0),

    // Métricas
    viewCount: integer('view_count').notNull().default(0),
    contactCount: integer('contact_count').notNull().default(0),
    favoriteCount: integer('favorite_count').notNull().default(0),

    // Score de calidad
    qualityScore: integer('quality_score'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('listings_org_idx').on(table.organizationId),
    statusIdx: index('listings_status_idx').on(table.status),
    typeOpIdx: index('listings_type_op_idx').on(table.propertyType, table.operationType),
    expiresIdx: index('listings_expires_idx').on(table.expiresAt),
    locationIdx: index('listings_location_idx').on(table.locationLat, table.locationLng),
    priceIdx: index('listings_price_idx').on(table.priceAmount, table.priceCurrency),
    externalIdx: index('listings_external_idx').on(table.organizationId, table.externalId),
    importFeedSourceIdx: index('listings_import_feed_source_idx').on(
      table.importFeedSourceId
    ),
    dedupCanonicalIdx: index('listings_dedup_canonical_idx').on(table.dedupCanonicalId),
  })
)

/**
 * Media de propiedades
 */
export const listingMedia = pgTable(
  'listing_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // image, video, floor_plan, virtual_tour
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    alt: varchar('alt', { length: 255 }),
    order: integer('order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
    width: integer('width'),
    height: integer('height'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingIdx: index('listing_media_listing_idx').on(table.listingId),
    orderIdx: index('listing_media_order_idx').on(table.listingId, table.order),
  })
)

/**
 * Historial de validaciones/renovaciones
 */
export const listingValidations = pgTable(
  'listing_validations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    validatedBy: uuid('validated_by').references(() => users.id), // null = automático
    validationType: varchar('validation_type', { length: 50 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingIdx: index('listing_validations_listing_idx').on(table.listingId),
  })
)

/**
 * Moderación de avisos
 */
export const listingModerations = pgTable(
  'listing_moderations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    moderatorId: uuid('moderator_id')
      .notNull()
      .references(() => users.id),
    action: varchar('action', { length: 50 }).notNull(), // approved, rejected, flagged
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingIdx: index('listing_moderations_listing_idx').on(table.listingId),
  })
)

/**
 * Propiedades favoritas de usuarios
 */
export const userFavorites = pgTable(
  'user_favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userListingIdx: index('user_favorites_user_listing_idx').on(table.userId, table.listingId),
    userIdx: index('user_favorites_user_idx').on(table.userId),
  })
)

/**
 * Propiedades descartadas por usuarios
 */
export const userDiscards = pgTable(
  'user_discards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    reasons: jsonb('reasons'), // Array de razones
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userListingIdx: index('user_discards_user_listing_idx').on(table.userId, table.listingId),
    userIdx: index('user_discards_user_idx').on(table.userId),
  })
)

// Relations
export const listingsRelations = relations(listings, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [listings.organizationId],
    references: [organizations.id],
  }),
  publisher: one(users, {
    fields: [listings.publisherId],
    references: [users.id],
  }),
  media: many(listingMedia),
  validations: many(listingValidations),
  moderations: many(listingModerations),
}))

export const listingMediaRelations = relations(listingMedia, ({ one }) => ({
  listing: one(listings, {
    fields: [listingMedia.listingId],
    references: [listings.id],
  }),
}))
