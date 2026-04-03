import { z } from 'zod'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'

import { listings, portalStatsEvents } from '@propieya/database'

import { createTRPCRouter, protectedProcedure } from '../trpc'

/**
 * Métricas agregadas para el panel B2B (doc 49 F3).
 * Lee `portal_stats_events` en ventana móvil (sin tabla rollup intermedia en esta versión).
 */
export const statsRouter = createTRPCRouter({
  /**
   * Conteo por `terminal_id` en ventana móvil.
   * Si el usuario tiene `organizationId`, se agrega por org; si no, solo avisos donde es publicador.
   */
  portalActivityByTerminal: protectedProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(90).default(7),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 7
      const since = new Date()
      since.setUTCDate(since.getUTCDate() - days)
      since.setUTCHours(0, 0, 0, 0)

      const orgId = ctx.session.organizationId
      const publisherId = ctx.session.userId

      let eventWhere:
        | ReturnType<typeof and>
        | undefined

      if (orgId) {
        eventWhere = and(
          eq(portalStatsEvents.organizationId, orgId),
          gte(portalStatsEvents.createdAt, since)
        )
      } else {
        const mine = await ctx.db
          .select({ id: listings.id })
          .from(listings)
          .where(eq(listings.publisherId, publisherId))
        const ids = mine.map((m) => m.id)
        if (ids.length === 0) {
          return {
            days,
            since: since.toISOString(),
            terminals: [] as { terminalId: string; count: number }[],
            totalListingViews: 0,
          }
        }
        eventWhere = and(
          inArray(portalStatsEvents.listingId, ids),
          gte(portalStatsEvents.createdAt, since)
        )
      }

      const terminalRows = await ctx.db
        .select({
          terminalId: portalStatsEvents.terminalId,
          count: sql<number>`count(*)::int`,
        })
        .from(portalStatsEvents)
        .where(eventWhere)
        .groupBy(portalStatsEvents.terminalId)

      const terminals = terminalRows
        .map((r) => ({
          terminalId: r.terminalId,
          count: Number(r.count),
        }))
        .sort((a, b) => b.count - a.count)

      const listingScope = orgId
        ? eq(listings.organizationId, orgId)
        : eq(listings.publisherId, publisherId)

      const [viewAgg] = await ctx.db
        .select({
          totalViews: sql<number>`coalesce(sum(${listings.viewCount}), 0)::int`,
        })
        .from(listings)
        .where(listingScope)

      return {
        days,
        since: since.toISOString(),
        terminals,
        totalListingViews: Number(viewAgg?.totalViews ?? 0),
      }
    }),
})
