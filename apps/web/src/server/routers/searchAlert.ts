import { TRPCError } from '@trpc/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import {
  listings,
  listingsSelectPublic,
  notifications,
  searchAlerts,
} from '@propieya/database'

import { buildFiltersSummary } from '../../lib/search-filter-summary'
import { recordPortalStatsEvent } from '../../lib/analytics/record-portal-stats-event'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
  listingSearchFiltersBaseSchema,
} from './listing-search-input'
import {
  PORTAL_STATS_TERMINALS,
  sanitizeListingSearchFacets,
} from '@propieya/shared'

type FeedNotificationItem = {
  kind: 'notification'
  id: string
  createdAt: Date
  notifType: string
  title: string
  body: string
  listingId: string | null
  priceLabel: string | null
  badgeLabel: string
}

type FeedSavedSearchItem = {
  kind: 'saved_search'
  id: string
  createdAt: Date
  /** Filtros persistidos (mismo shape que `listing.search` / crear alerta). */
  filters: Record<string, unknown>
  filtersSummary: string
  isActive: boolean
  badgeLabel: string
  lastActivityAt: Date
}

type FeedItem = FeedNotificationItem | FeedSavedSearchItem

export const searchAlertRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      listingSearchFiltersBaseSchema
        .extend({
          name: z.string().max(255).optional(),
        })
        .transform((data) => ({
          ...data,
          facets: sanitizeListingSearchFacets(data.facets),
        }))
    )
    .mutation(async ({ ctx, input }) => {
      const { name, ...filterFields } = input
      const filtersSummary = buildFiltersSummary(filterFields)

      const [row] = await ctx.db
        .insert(searchAlerts)
        .values({
          userId: ctx.session.userId,
          name: name?.trim() || null,
          filters: filterFields as Record<string, unknown>,
          filtersSummary,
          isActive: true,
          updatedAt: new Date(),
        })
        .returning({ id: searchAlerts.id })

      if (!row) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No se pudo crear la alerta' })
      }

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.SEARCH_ALERT_CREATED,
        userId: ctx.session.userId,
        payload: { hasCustomName: Boolean(name?.trim()) },
      })

      return { id: row.id, filtersSummary }
    }),

  /** Notificaciones de match + alertas guardadas, orden unificado por fecha. */
  getMyFeed: protectedProcedure.query(async ({ ctx }): Promise<FeedItem[]> => {
    const userId = ctx.session.userId

    const notifRows = await ctx.db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, userId),
        inArray(notifications.type, ['new_listing_match', 'price_change'])
      ),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
    })

    const alertRows = await ctx.db.query.searchAlerts.findMany({
      where: eq(searchAlerts.userId, userId),
      orderBy: [desc(searchAlerts.updatedAt)],
      limit: 50,
    })

    const items: FeedItem[] = []

    for (const n of notifRows) {
      let priceLabel: string | null = null
      let listingId: string | null = null
      const data = n.data as Record<string, unknown> | null
      if (data?.listingId && typeof data.listingId === 'string') {
        listingId = data.listingId
        const [listing] = await ctx.db
          .select(listingsSelectPublic)
          .from(listings)
          .where(eq(listings.id, listingId))
          .limit(1)
        if (listing && listing.showPrice !== false) {
          priceLabel = `${listing.priceCurrency} ${Number(listing.priceAmount).toLocaleString('es-AR')}`
        }
      }

      const badgeLabel =
        n.type === 'price_change' ? '📉 Bajó el precio' : '🏠 Nuevas publicaciones'

      items.push({
        kind: 'notification',
        id: n.id,
        createdAt: n.createdAt,
        notifType: n.type,
        title: n.title,
        body: n.body,
        listingId,
        priceLabel,
        badgeLabel,
      })
    }

    for (const a of alertRows) {
      const filters =
        a.filters && typeof a.filters === 'object' && !Array.isArray(a.filters)
          ? (a.filters as Record<string, unknown>)
          : {}
      items.push({
        kind: 'saved_search',
        id: a.id,
        createdAt: a.createdAt,
        filters,
        filtersSummary: a.filtersSummary,
        isActive: a.isActive,
        badgeLabel: '🏠 Nuevas publicaciones',
        lastActivityAt: a.lastNotifiedAt ?? a.updatedAt,
      })
    }

    const relevant = (it: FeedItem) =>
      it.kind === 'saved_search'
        ? it.lastActivityAt.getTime()
        : it.createdAt.getTime()

    items.sort((a, b) => relevant(b) - relevant(a))

    return items
  }),

  setActive: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.searchAlerts.findFirst({
        where: eq(searchAlerts.id, input.id),
      })
      if (!row || row.userId !== ctx.session.userId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      await ctx.db
        .update(searchAlerts)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(searchAlerts.id, input.id))
      return { ok: true as const }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.searchAlerts.findFirst({
        where: eq(searchAlerts.id, input.id),
      })
      if (!row || row.userId !== ctx.session.userId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      await ctx.db.delete(searchAlerts).where(eq(searchAlerts.id, input.id))
      return { ok: true as const }
    }),
})
