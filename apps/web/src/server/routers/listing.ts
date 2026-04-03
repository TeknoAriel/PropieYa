import { randomUUID } from 'node:crypto'

import { z } from 'zod'
import { eq, and, desc, ilike, or, gte, lte, sql, count, ne, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

import type { Database } from '@propieya/database'
import {
  listings,
  listingMedia,
  listingsSelectPublic,
  organizations,
  organizationMemberships,
  searchHistory,
} from '@propieya/database'
import {
  createListingSchema,
  updateListingSchema,
  LISTING_VALIDITY,
  mergePublicSearchFromQuery,
  FACETS_CATALOG,
  SEARCH_FILTER_AMENITIES,
  withMatchReasons,
  PORTAL_STATS_TERMINALS,
  type ExplainMatchFilters,
} from '@propieya/shared'

import {
  getPresignedPutUrl,
  isS3Configured,
  publicMediaUrl,
  sanitizeUploadFilename,
} from '../s3-presign'
import {
  syncListingToSearch,
  removeListingFromSearch,
} from '../../lib/search/sync'
import { searchListings } from '../../lib/search/search'
import { getListingSearchSortKeyCount } from '../../lib/search/query'
import type { SearchFilters } from '../../lib/search/types'
import { decodeListingSearchCursor } from '../../lib/search/search-cursor'
import { sqlPointInPolygonLngLat } from '../../lib/search/point-in-polygon-sql'
import {
  extractIntentionFromMessage,
  type ConversationPrior,
} from '../../lib/llm'
import { checkRateLimit } from '../../lib/rate-limit'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc'
import { listingSearchInputSchema } from './listing-search-input'

const conversationalPriorFiltersSchema = z.object({
  q: z.string().max(200).optional(),
  operationType: z.enum(['sale', 'rent', 'temporary_rent']).optional(),
  propertyType: z.string().max(50).optional(),
  city: z.string().max(120).optional(),
  neighborhood: z.string().max(120).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  minBedrooms: z.number().int().min(0).max(50).optional(),
  minSurface: z.number().nonnegative().optional(),
  amenities: z.array(z.string().max(80)).max(25).optional(),
})

const searchConversationalInputSchema = z.object({
  message: z.string().min(1).max(500),
  previousContext: z
    .object({
      userMessage: z.string().max(500),
      filters: conversationalPriorFiltersSchema,
    })
    .optional(),
})

function conversationPriorFromInput(
  previous: z.infer<typeof searchConversationalInputSchema>['previousContext']
): ConversationPrior | null {
  if (!previous?.filters) return null
  const f = previous.filters
  return {
    userMessage: previous.userMessage,
    intention: {
      q: f.q,
      operationType: f.operationType,
      propertyType: f.propertyType,
      city: f.city,
      neighborhood: f.neighborhood,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      minBedrooms: f.minBedrooms,
      minSurface: f.minSurface,
      amenities: f.amenities,
    },
  }
}

/** Evita que el usuario inyecte comodines ILIKE (%, _). */
function sanitizeIlikeFragment(raw: string): string {
  return raw.trim().slice(0, 120).replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ')
}

/** Historial de búsqueda (usuarios logueados). No bloquea la respuesta si falla el insert. */
function persistSearchHistoryRow(
  db: Database,
  opts: {
    userId: string
    filters: Record<string, unknown>
    resultCount: number
    startedAt: number
  }
): void {
  void (async () => {
    try {
      await db.insert(searchHistory).values({
        userId: opts.userId,
        sessionId: randomUUID(),
        conversationId: null,
        filters: opts.filters,
        sort: null,
        resultCount: opts.resultCount,
        processingTimeMs: Date.now() - opts.startedAt,
      })
    } catch {
      // no bloquear búsqueda
    }
  })()
}

/** Listados: más reciente arriba. Público: por publicación + desempate. Panel (mis avisos): por última modificación. */
const ORDER_PUBLIC_RECENCY = [
  desc(listings.publishedAt),
  desc(listings.updatedAt),
  desc(listings.createdAt),
]

const ORDER_PANEL_RECENCY = [
  desc(listings.updatedAt),
  desc(listings.createdAt),
]

export const listingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createListingSchema)
    .mutation(async ({ input, ctx }) => {
      let organizationId = ctx.session.organizationId

      // Bootstrap para dev: si el usuario no tiene organización, se crea una básica.
      if (!organizationId) {
        const [org] = await ctx.db
          .insert(organizations)
          .values({
            type: 'real_estate_agency',
            name: `${ctx.session.name} Propiedades`,
            email: ctx.session.email,
          })
          .returning({ id: organizations.id })

        if (!org) {
          throw new Error('No se pudo crear la organización')
        }

        organizationId = org.id

        await ctx.db.insert(organizationMemberships).values({
          userId: ctx.session.userId,
          organizationId,
          role: 'org_admin',
        })
      }

      const pricePerM2 =
        input.surface.total > 0 ? input.price.amount / input.surface.total : null

      const [created] = await ctx.db
        .insert(listings)
        .values({
          organizationId,
          publisherId: ctx.session.userId,
          propertyType: input.propertyType,
          operationType: input.operationType,
          status: 'draft',
          address: input.address,
          locationLat: input.location?.lat ?? null,
          locationLng: input.location?.lng ?? null,
          hideExactAddress: input.hideExactAddress,
          title: input.title,
          description: input.description,
          internalNotes: input.internalNotes,
          priceAmount: input.price.amount,
          priceCurrency: input.price.currency,
          pricePerM2,
          showPrice: input.price.showPrice,
          expenses: input.price.expenses,
          expensesCurrency: input.price.expensesCurrency,
          surfaceTotal: input.surface.total,
          surfaceCovered: input.surface.covered,
          surfaceSemicovered: input.surface.semicovered,
          surfaceLand: input.surface.land,
          bedrooms: input.rooms.bedrooms,
          bathrooms: input.rooms.bathrooms,
          toilettes: input.rooms.toilettes,
          garages: input.rooms.garages,
          totalRooms: input.rooms.total,
          features: input.features,
          updatedAt: new Date(),
        })
        .returning()

      return created
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const publishedAt = new Date()
      const expiresAt = new Date(
        publishedAt.getTime() +
          LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
      )

      const [updated] = await ctx.db
        .update(listings)
        .set({
          status: 'active',
          publishedAt,
          lastValidatedAt: new Date(),
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, input.id))
        .returning()

      if (updated) {
        syncListingToSearch(ctx.db, input.id).catch(() => {})
      }
      return updated ?? null
    }),

  renew: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const allowedStatuses = ['expiring_soon', 'suspended']
      if (!allowedStatuses.includes(existing.status)) {
        throw new Error(
          'Solo se pueden renovar propiedades por vencer o suspendidas'
        )
      }

      const now = new Date()
      const expiresAt = new Date(
        now.getTime() +
          LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
      )

      const [updated] = await ctx.db
        .update(listings)
        .set({
          status: 'active',
          lastValidatedAt: now,
          expiresAt,
          renewalCount: (existing.renewalCount ?? 0) + 1,
          updatedAt: now,
        })
        .where(eq(listings.id, input.id))
        .returning()

      if (updated && updated.status === 'active') {
        syncListingToSearch(ctx.db, input.id).catch(() => {})
      }
      return updated ?? null
    }),

  /** Detalle para el publicador (cualquier estado). */
  getMineById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [listing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!listing) {
        return null
      }

      const media = await ctx.db.query.listingMedia.findMany({
        where: eq(listingMedia.listingId, input.id),
        orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
      })

      return { ...listing, media }
    }),

  listMine: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [eq(listings.publisherId, ctx.session.userId)]

      if (input.status) {
        conditions.push(eq(listings.status, input.status))
      }
      if (input.search) {
        conditions.push(ilike(listings.title, `%${input.search}%`))
      }

      return ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(and(...conditions))
        .orderBy(...ORDER_PANEL_RECENCY)
        .limit(input.limit)
    }),

  /** Conteos por estado para el dashboard del panel (avisos del publicador). */
  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const publisherId = ctx.session.userId
    const rows = await ctx.db
      .select({
        status: listings.status,
        n: count(),
      })
      .from(listings)
      .where(eq(listings.publisherId, publisherId))
      .groupBy(listings.status)

    const byStatus: Record<string, number> = {}
    let totalListings = 0
    for (const r of rows) {
      const n = Number(r.n)
      byStatus[r.status] = n
      totalListings += n
    }

    const known = [
      'draft',
      'pending_review',
      'active',
      'expiring_soon',
      'suspended',
      'archived',
      'sold',
      'withdrawn',
    ] as const
    for (const s of known) {
      if (byStatus[s] === undefined) byStatus[s] = 0
    }

    return { byStatus, totalListings }
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateListingSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const data = input.data
      const surfaceTotal = data.surface?.total ?? existing.surfaceTotal
      const priceAmount = data.price?.amount ?? existing.priceAmount
      const pricePerM2 = surfaceTotal > 0 ? priceAmount / surfaceTotal : null

      const [updated] = await ctx.db
        .update(listings)
        .set({
          propertyType: data.propertyType ?? existing.propertyType,
          operationType: data.operationType ?? existing.operationType,
          address: data.address ?? existing.address,
          locationLat: data.location?.lat ?? existing.locationLat,
          locationLng: data.location?.lng ?? existing.locationLng,
          hideExactAddress: data.hideExactAddress ?? existing.hideExactAddress,
          title: data.title ?? existing.title,
          description: data.description ?? existing.description,
          internalNotes: data.internalNotes ?? existing.internalNotes,
          priceAmount,
          priceCurrency: data.price?.currency ?? existing.priceCurrency,
          pricePerM2,
          showPrice: data.price?.showPrice ?? existing.showPrice,
          expenses: data.price?.expenses ?? existing.expenses,
          expensesCurrency:
            data.price?.expensesCurrency ?? existing.expensesCurrency,
          surfaceTotal,
          surfaceCovered: data.surface?.covered ?? existing.surfaceCovered,
          surfaceSemicovered:
            data.surface?.semicovered ?? existing.surfaceSemicovered,
          surfaceLand: data.surface?.land ?? existing.surfaceLand,
          bedrooms: data.rooms?.bedrooms ?? existing.bedrooms,
          bathrooms: data.rooms?.bathrooms ?? existing.bathrooms,
          toilettes: data.rooms?.toilettes ?? existing.toilettes,
          garages: data.rooms?.garages ?? existing.garages,
          totalRooms: data.rooms?.total ?? existing.totalRooms,
          features: data.features ?? existing.features,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, input.id))
        .returning()

      if (updated && updated.status === 'active') {
        syncListingToSearch(ctx.db, input.id).catch(() => {})
      }
      return updated
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [archived] = await ctx.db
        .update(listings)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .returning()

      if (archived) {
        removeListingFromSearch(input.id).catch(() => {})
      }
      return archived ?? null
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [listing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(eq(listings.id, input.id), eq(listings.status, 'active'))
        )
        .limit(1)

      if (!listing) {
        return null
      }

      const media = await ctx.db.query.listingMedia.findMany({
        where: eq(listingMedia.listingId, input.id),
        orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
      })

      return {
        ...listing,
        media,
      }
    }),

  /**
   * Vista pública de ficha (F1 doc 49): incrementa `view_count` en DB y log estructurado opcional.
   * Llamar una vez por carga de página desde el cliente (evita duplicar con ref por Strict Mode).
   */
  recordPublicView: publicProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [row] = await ctx.db
        .update(listings)
        .set({
          viewCount: sql`${listings.viewCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(listings.id, input.listingId), eq(listings.status, 'active'))
        )
        .returning({
          id: listings.id,
          organizationId: listings.organizationId,
        })

      if (!row) {
        return { ok: false as const }
      }

      if (process.env.LOG_PORTAL_STATS === '1') {
        console.log(
          JSON.stringify({
            terminal: PORTAL_STATS_TERMINALS.LISTING_FICHA_VIEW,
            listingId: row.id,
            organizationId: row.organizationId,
            ts: new Date().toISOString(),
          })
        )
      }

      return { ok: true as const }
    }),

  /** Comparación pública: hasta 3 avisos activos, en el orden pedido (dedupe). */
  getComparePublic: publicProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(2).max(3),
      })
    )
    .query(async ({ input, ctx }) => {
      const seen = new Set<string>()
      const orderedIds: string[] = []
      for (const id of input.ids) {
        if (seen.has(id)) continue
        seen.add(id)
        orderedIds.push(id)
        if (orderedIds.length >= 3) break
      }
      if (orderedIds.length < 2) {
        return []
      }

      const rows = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(inArray(listings.id, orderedIds), eq(listings.status, 'active'))
        )

      const byId = new Map(rows.map((r) => [r.id, r]))
      const ordered = orderedIds
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))

      if (ordered.length < 2) {
        return ordered
      }

      const ids = ordered.map((r) => r.id)
      const allMedia = await ctx.db.query.listingMedia.findMany({
        where: inArray(listingMedia.listingId, ids),
        orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
      })

      const firstImageByListing = new Map<string, string>()
      for (const m of allMedia) {
        if (m.type !== 'image') continue
        if (!firstImageByListing.has(m.listingId)) {
          firstImageByListing.set(m.listingId, m.url)
        }
      }

      return ordered.map((row) => ({
        ...row,
        primaryImageUrl:
          row.primaryImageUrl ??
          firstImageByListing.get(row.id) ??
          null,
      }))
    }),

  /** Avisos similares (misma operación y tipo, ciudad si existe, banda de precio ±30%). */
  similar: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        limit: z.number().min(1).max(12).default(6),
      })
    )
    .query(async ({ input, ctx }) => {
      const [base] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(eq(listings.id, input.id), eq(listings.status, 'active'))
        )
        .limit(1)

      if (!base) {
        return []
      }

      const conditions = [
        eq(listings.status, 'active'),
        ne(listings.id, input.id),
        eq(listings.operationType, base.operationType),
        eq(listings.propertyType, base.propertyType),
      ]

      const addr = base.address as Record<string, unknown> | null | undefined
      const cityRaw = typeof addr?.city === 'string' ? addr.city : ''
      const city = sanitizeIlikeFragment(cityRaw)
      if (city.length > 0) {
        conditions.push(
          sql`COALESCE(${listings.address}->>'city', '') ILIKE ${`%${city}%`}`
        )
      }

      const price = Number(base.priceAmount)
      if (!Number.isNaN(price) && price > 0 && base.showPrice !== false) {
        const low = Math.max(0, Math.floor(price * 0.7))
        const high = Math.ceil(price * 1.3)
        conditions.push(gte(listings.priceAmount, low))
        conditions.push(lte(listings.priceAmount, high))
      }

      const rows = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(and(...conditions))
        .orderBy(...ORDER_PUBLIC_RECENCY)
        .limit(input.limit)

      if (rows.length === 0) {
        return []
      }

      const ids = rows.map((r) => r.id)
      const allMedia = await ctx.db.query.listingMedia.findMany({
        where: inArray(listingMedia.listingId, ids),
        orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
      })

      const primaryByListing = new Map<string, string>()
      for (const m of allMedia) {
        if (!primaryByListing.has(m.listingId)) {
          primaryByListing.set(m.listingId, m.url)
        }
      }

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        operationType: row.operationType,
        propertyType: row.propertyType,
        priceAmount: row.priceAmount,
        priceCurrency: row.priceCurrency,
        address: row.address,
        surfaceTotal: row.surfaceTotal,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        primaryImageUrl: primaryByListing.get(row.id) ?? null,
      }))
    }),

  getFeatured: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(6),
      })
    )
    .query(async ({ input, ctx }) => {
      return ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(eq(listings.status, 'active'))
        .orderBy(...ORDER_PUBLIC_RECENCY)
        .limit(input.limit)
    }),

  /** Catálogo de facets (flags/enums/ranges) para UI y clientes; alineado a `sanitizeListingSearchFacets`. */
  getSearchFacetsCatalog: publicProcedure.query(() => ({
    facets: FACETS_CATALOG,
  })),

  /** Búsqueda pública (solo avisos activos). Usa ES si está configurado, fallback a SQL. */
  search: publicProcedure
    .input(listingSearchInputSchema)
    .query(async ({ input, ctx }) => {
      const startedAt = Date.now()
      const perfStart = Date.now()
      const logSearchMs = process.env.LOG_SEARCH_MS === '1'
      const sessionUserId = ctx.session?.userId
      const filtersSnapshot = JSON.parse(JSON.stringify(input)) as Record<string, unknown>

      const { limit, offset, cursor, ...explainFilters } = input

      let searchAfter: unknown[] | undefined
      if (cursor?.trim()) {
        const decoded = decodeListingSearchCursor(cursor.trim())
        if (!decoded) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cursor de búsqueda inválido o expirado.',
          })
        }
        const expectedKeys = getListingSearchSortKeyCount(
          explainFilters as SearchFilters
        )
        if (decoded.length !== expectedKeys) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'La paginación no coincide con esta búsqueda. Volvé a la primera página o refrescá.',
          })
        }
        searchAfter = decoded
      }

      const esOffset = searchAfter ? 0 : offset

      const esResult = await searchListings({
        q: input.q,
        operationType: input.operationType,
        propertyType: input.propertyType,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        minSurface: input.minSurface,
        maxSurface: input.maxSurface,
        minBedrooms: input.minBedrooms,
        minBathrooms: input.minBathrooms,
        minGarages: input.minGarages,
        floorMin: input.floorMin,
        floorMax: input.floorMax,
        escalera: input.escalera,
        orientation: input.orientation,
        minSurfaceCovered: input.minSurfaceCovered,
        maxSurfaceCovered: input.maxSurfaceCovered,
        minTotalRooms: input.minTotalRooms,
        city: input.city,
        neighborhood: input.neighborhood,
        amenities: input.amenities,
        geoPoint: input.geoPoint,
        geoRadius: input.geoRadius,
        facets: input.facets,
        bbox: input.bbox,
        polygon: input.polygon,
        limit,
        offset: esOffset,
        searchAfter,
      })

      const persistThisSearch =
        Boolean(sessionUserId) &&
        !cursor?.trim() &&
        input.offset === 0

      // Si ES responde pero el índice está vacío o desincronizado, total=0 y antes
      // no había fallback: el buscador quedaba en silencio. SQL es fuente de verdad.
      // Paginación por cursor (search_after) no es reproducible en SQL: no mezclar.
      if (!(esResult.fromEs && esResult.total > 0) && searchAfter) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'No se pudo cargar la página siguiente sin el índice de búsqueda. Volvé al listado o refrescá la página.',
        })
      }

      if (esResult.fromEs && esResult.total > 0) {
        if (persistThisSearch) {
          persistSearchHistoryRow(ctx.db, {
            userId: sessionUserId!,
            filters: filtersSnapshot,
            resultCount: esResult.total,
            startedAt,
          })
        }
        return {
          items: withMatchReasons(
            explainFilters as ExplainMatchFilters,
            esResult.hits
          ),
          total: esResult.total,
          nextCursor: esResult.nextCursor,
        }
      }

      const merged = mergePublicSearchFromQuery(input)
      const { residualTextQuery, ...sqlInputBase } = merged
      const sqlInput = {
        ...sqlInputBase,
        facets: input.facets,
        polygon: input.polygon,
      }

      const conditions = [eq(listings.status, 'active')]
      if (residualTextQuery.trim()) {
        const frag = sanitizeIlikeFragment(residualTextQuery)
        if (frag.length > 0) {
          const pat = `%${frag}%`
          conditions.push(
            or(
              ilike(listings.title, pat),
              ilike(listings.description, pat)
            )!
          )
        }
      }
      if (sqlInput.operationType) {
        conditions.push(eq(listings.operationType, sqlInput.operationType))
      }
      if (sqlInput.propertyType) {
        conditions.push(eq(listings.propertyType, sqlInput.propertyType))
      }
      if (sqlInput.minPrice !== undefined) {
        conditions.push(gte(listings.priceAmount, sqlInput.minPrice))
      }
      if (sqlInput.maxPrice !== undefined) {
        conditions.push(lte(listings.priceAmount, sqlInput.maxPrice))
      }
      if (sqlInput.minBedrooms !== undefined) {
        conditions.push(gte(listings.bedrooms, sqlInput.minBedrooms))
      }
      if (sqlInput.minBathrooms !== undefined) {
        conditions.push(gte(listings.bathrooms, sqlInput.minBathrooms))
      }
      if (sqlInput.minGarages !== undefined) {
        conditions.push(gte(listings.garages, sqlInput.minGarages))
      }
      if (sqlInput.minSurface !== undefined) {
        conditions.push(gte(listings.surfaceTotal, sqlInput.minSurface))
      }
      if (sqlInput.maxSurface !== undefined) {
        conditions.push(lte(listings.surfaceTotal, sqlInput.maxSurface))
      }
      if (sqlInput.floorMin !== undefined) {
        conditions.push(
          sql`(${listings.features}->>'floor') IS NULL OR ((${listings.features}->>'floor')::int) >= ${sqlInput.floorMin}`
        )
      }
      if (sqlInput.floorMax !== undefined) {
        conditions.push(
          sql`(${listings.features}->>'floor') IS NULL OR ((${listings.features}->>'floor')::int) <= ${sqlInput.floorMax}`
        )
      }
      if (sqlInput.escalera?.trim()) {
        conditions.push(
          sql`(${listings.features}->>'escalera') = ${sqlInput.escalera.trim().toUpperCase()}`
        )
      }
      if (sqlInput.orientation) {
        conditions.push(
          sql`(${listings.features}->>'orientation') = ${sqlInput.orientation}`
        )
      }
      if (sqlInput.minSurfaceCovered !== undefined) {
        conditions.push(
          sql`${listings.surfaceCovered} IS NOT NULL AND ${listings.surfaceCovered} >= ${sqlInput.minSurfaceCovered}`
        )
      }
      if (sqlInput.maxSurfaceCovered !== undefined) {
        conditions.push(
          sql`${listings.surfaceCovered} IS NOT NULL AND ${listings.surfaceCovered} <= ${sqlInput.maxSurfaceCovered}`
        )
      }
      if (sqlInput.minTotalRooms !== undefined) {
        conditions.push(
          sql`${listings.totalRooms} IS NOT NULL AND ${listings.totalRooms} >= ${sqlInput.minTotalRooms}`
        )
      }
      if (sqlInput.city?.trim()) {
        const c = sanitizeIlikeFragment(sqlInput.city)
        if (c.length > 0) {
          conditions.push(
            sql`COALESCE(${listings.address}->>'city', '') ILIKE ${`%${c}%`}`
          )
        }
      }
      if (sqlInput.neighborhood?.trim()) {
        const n = sanitizeIlikeFragment(sqlInput.neighborhood)
        if (n.length > 0) {
          conditions.push(
            sql`COALESCE(${listings.address}->>'neighborhood', '') ILIKE ${`%${n}%`}`
          )
        }
      }
      if (sqlInput.amenities && sqlInput.amenities.length > 0) {
        const allowed = SEARCH_FILTER_AMENITIES as readonly string[]
        for (const a of sqlInput.amenities) {
          if (allowed.includes(a)) {
            conditions.push(
              sql`(${listings.features}->'amenities') @> to_jsonb(ARRAY[${a}]::text[])`
            )
          }
        }
      }

      // Facets flags/excludes (Sprint 26). Inicialmente se interpretan como amenities.
      if (sqlInput.facets?.flags && sqlInput.facets.flags.length > 0) {
        const allowed = SEARCH_FILTER_AMENITIES as readonly string[]
        for (const f of sqlInput.facets.flags) {
          if (allowed.includes(f)) {
            conditions.push(
              sql`(${listings.features}->'amenities') @> to_jsonb(ARRAY[${f}]::text[])`
            )
          }
        }
      }
      if (sqlInput.facets?.excludeFlags && sqlInput.facets.excludeFlags.length > 0) {
        const allowed = SEARCH_FILTER_AMENITIES as readonly string[]
        for (const f of sqlInput.facets.excludeFlags) {
          if (allowed.includes(f)) {
            conditions.push(
              sql`NOT ((${listings.features}->'amenities') @> to_jsonb(ARRAY[${f}]::text[]) )`
            )
          }
        }
      }

      if (sqlInput.bbox) {
        const { south, north, west, east } = sqlInput.bbox
        conditions.push(sql`${listings.locationLat} IS NOT NULL`)
        conditions.push(sql`${listings.locationLng} IS NOT NULL`)
        conditions.push(gte(listings.locationLat, south))
        conditions.push(lte(listings.locationLat, north))
        conditions.push(gte(listings.locationLng, west))
        conditions.push(lte(listings.locationLng, east))
      }

      // Búsqueda por radio (Sprint 26): aproximación por bounding box.
      if (sqlInput.geoPoint && sqlInput.geoRadius) {
        const { lat, lng } = sqlInput.geoPoint
        const rMeters = sqlInput.geoRadius
        const rKm = rMeters / 1000
        const latDelta = rKm / 111
        const lngDelta = rKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))

        conditions.push(sql`${listings.locationLat} IS NOT NULL`)
        conditions.push(sql`${listings.locationLng} IS NOT NULL`)
        conditions.push(gte(listings.locationLat, lat - latDelta))
        conditions.push(lte(listings.locationLat, lat + latDelta))
        conditions.push(gte(listings.locationLng, lng - lngDelta))
        conditions.push(lte(listings.locationLng, lng + lngDelta))
      }

      if (sqlInput.polygon && sqlInput.polygon.length >= 3) {
        conditions.push(sql`${listings.locationLat} IS NOT NULL`)
        conditions.push(sql`${listings.locationLng} IS NOT NULL`)
        conditions.push(
          sqlPointInPolygonLngLat(
            listings.locationLng,
            listings.locationLat,
            sqlInput.polygon
          )
        )
      }

      const whereClause = and(...conditions)
      const [totalRow] = await ctx.db
        .select({ c: count() })
        .from(listings)
        .where(whereClause)
      const sqlTotal = Number(totalRow?.c ?? 0)

      const rows = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(whereClause)
        .orderBy(...ORDER_PUBLIC_RECENCY)
        .limit(limit)
        .offset(offset)
      if (persistThisSearch) {
        persistSearchHistoryRow(ctx.db, {
          userId: sessionUserId!,
          filters: filtersSnapshot,
          resultCount: sqlTotal,
          startedAt,
        })
      }
      if (logSearchMs) {
        console.info(
          '[listing.search]',
          JSON.stringify({
            phase: 'sql_done',
            ms: Date.now() - perfStart,
            total: sqlTotal,
            rowCount: rows.length,
            limit,
            offset,
          })
        )
      }
      return {
        items: withMatchReasons(explainFilters as ExplainMatchFilters, rows),
        total: sqlTotal,
        nextCursor: null,
      }
    }),

  /** Búsqueda conversacional: extrae intención del mensaje y devuelve filtros + resultados. */
  searchConversational: publicProcedure
    .input(searchConversationalInputSchema)
    .mutation(async ({ input, ctx }) => {
      if (!checkRateLimit(ctx.ip)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Máximo 10 búsquedas por minuto. Esperá un momento.',
        })
      }

      const prior = conversationPriorFromInput(input.previousContext)
      const intention = await extractIntentionFromMessage(
        input.message,
        prior ?? undefined
      )
      const explainFilters: ExplainMatchFilters = {
        q: intention.q,
        operationType: intention.operationType,
        propertyType: intention.propertyType,
        city: intention.city,
        neighborhood: intention.neighborhood,
        minPrice: intention.minPrice,
        maxPrice: intention.maxPrice,
        minBedrooms: intention.minBedrooms,
        minSurface: intention.minSurface,
        amenities: intention.amenities,
      }
      const filters = {
        ...explainFilters,
        limit: 24,
        offset: 0,
      }
      // Nota: facets aún no se extraen desde texto; solo via UI (Sprint 26).

      const esResult = await searchListings(filters)

      if (esResult.fromEs && esResult.total > 0) {
        return {
          filters,
          hits: withMatchReasons(explainFilters, esResult.hits),
          total: esResult.total,
        }
      }

      const conditions = [eq(listings.status, 'active')]
      if (filters.q?.trim()) {
        const frag = sanitizeIlikeFragment(filters.q)
        if (frag.length > 0) {
          const pat = `%${frag}%`
          conditions.push(
            or(
              ilike(listings.title, pat),
              ilike(listings.description, pat)
            )!
          )
        }
      }
      if (filters.operationType) {
        conditions.push(eq(listings.operationType, filters.operationType))
      }
      if (filters.propertyType) {
        conditions.push(eq(listings.propertyType, filters.propertyType))
      }
      if (filters.minPrice !== undefined) {
        conditions.push(gte(listings.priceAmount, filters.minPrice))
      }
      if (filters.maxPrice !== undefined) {
        conditions.push(lte(listings.priceAmount, filters.maxPrice))
      }
      if (filters.minBedrooms !== undefined) {
        conditions.push(gte(listings.bedrooms, filters.minBedrooms))
      }
      if (filters.minSurface !== undefined) {
        conditions.push(gte(listings.surfaceTotal, filters.minSurface))
      }
      if (filters.city?.trim()) {
        const c = sanitizeIlikeFragment(filters.city)
        if (c.length > 0) {
          conditions.push(
            sql`COALESCE(${listings.address}->>'city', '') ILIKE ${`%${c}%`}`
          )
        }
      }
      if (filters.neighborhood?.trim()) {
        const n = sanitizeIlikeFragment(filters.neighborhood)
        if (n.length > 0) {
          conditions.push(
            sql`COALESCE(${listings.address}->>'neighborhood', '') ILIKE ${`%${n}%`}`
          )
        }
      }
      if (filters.amenities && filters.amenities.length > 0) {
        const allowed = SEARCH_FILTER_AMENITIES as readonly string[]
        for (const a of filters.amenities) {
          if (allowed.includes(a)) {
            conditions.push(
              sql`(${listings.features}->'amenities') @> to_jsonb(ARRAY[${a}]::text[])`
            )
          }
        }
      }

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(and(...conditions))

      const total = countResult?.count ?? 0

      const hits = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(and(...conditions))
        .orderBy(...ORDER_PUBLIC_RECENCY)
        .limit(filters.limit ?? 24)
        .offset(filters.offset ?? 0)

      return {
        filters,
        hits: withMatchReasons(explainFilters, hits),
        total,
      }
    }),

  getPresignedUploadUrl: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        filename: z.string().min(1).max(200),
        contentType: z.string().min(1).max(120),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isS3Configured()) {
        throw new Error(
          'Almacenamiento de archivos no configurado (S3/R2). Revisá variables en docs/21-s3-media.md.'
        )
      }

      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.listingId),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const safeName = sanitizeUploadFilename(input.filename)
      const key = `listings/${input.listingId}/${randomUUID()}-${safeName}`
      const uploadUrl = await getPresignedPutUrl({
        key,
        contentType: input.contentType,
      })
      const fileUrl = publicMediaUrl(key)

      return { uploadUrl, fileUrl, key }
    }),

  addMedia: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        url: z.string().url().max(2048),
        type: z.enum(['image', 'video', 'floor_plan', 'virtual_tour']).default('image'),
        isPrimary: z.boolean().optional(),
        alt: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.listingId),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const mediaRows = await ctx.db.query.listingMedia.findMany({
        where: eq(listingMedia.listingId, input.listingId),
      })

      const order = mediaRows.length
      const noPrimaryYet = !existing.primaryImageUrl && mediaRows.length === 0
      const isPrimary = input.isPrimary ?? noPrimaryYet

      if (isPrimary) {
        await ctx.db
          .update(listingMedia)
          .set({ isPrimary: false })
          .where(eq(listingMedia.listingId, input.listingId))
      }

      const [row] = await ctx.db
        .insert(listingMedia)
        .values({
          listingId: input.listingId,
          type: input.type,
          url: input.url,
          order,
          isPrimary,
          alt: input.alt ?? null,
        })
        .returning()

      const nextPrimary = isPrimary
        ? input.url
        : (existing.primaryImageUrl ?? input.url)

      await ctx.db
        .update(listings)
        .set({
          primaryImageUrl: nextPrimary,
          mediaCount: existing.mediaCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, input.listingId))

      return row
    }),

  removeMedia: protectedProcedure
    .input(z.object({ mediaId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const media = await ctx.db.query.listingMedia.findFirst({
        where: eq(listingMedia.id, input.mediaId),
      })
      if (!media) throw new Error('Imagen no encontrada')

      const [listing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, media.listingId),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)
      if (!listing) throw new Error('Propiedad no encontrada')

      await ctx.db.delete(listingMedia).where(eq(listingMedia.id, input.mediaId))

      const remaining = await ctx.db.query.listingMedia.findMany({
        where: eq(listingMedia.listingId, media.listingId),
        orderBy: [listingMedia.order],
      })

      const newPrimary = remaining[0]?.url ?? null
      await ctx.db
        .update(listings)
        .set({
          primaryImageUrl: newPrimary,
          mediaCount: remaining.length,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, media.listingId))

      const firstRemaining = remaining[0]
      if (firstRemaining && firstRemaining.id !== media.id) {
        await ctx.db
          .update(listingMedia)
          .set({ isPrimary: true })
          .where(eq(listingMedia.id, firstRemaining.id))
      }

      return { ok: true }
    }),

  setPrimaryMedia: protectedProcedure
    .input(z.object({ mediaId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const media = await ctx.db.query.listingMedia.findFirst({
        where: eq(listingMedia.id, input.mediaId),
      })
      if (!media) throw new Error('Imagen no encontrada')

      const [listing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, media.listingId),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)
      if (!listing) throw new Error('Propiedad no encontrada')

      await ctx.db
        .update(listingMedia)
        .set({ isPrimary: false })
        .where(eq(listingMedia.listingId, media.listingId))

      await ctx.db
        .update(listingMedia)
        .set({ isPrimary: true })
        .where(eq(listingMedia.id, input.mediaId))

      await ctx.db
        .update(listings)
        .set({
          primaryImageUrl: media.url,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, media.listingId))

      return { ok: true }
    }),
})
