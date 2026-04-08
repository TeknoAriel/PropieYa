import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'

import { listings, portalStatsEvents } from '@propieya/database'
import { PORTAL_STATS_TERMINALS } from '@propieya/shared'

import { createTRPCRouter, protectedProcedure } from '../trpc'

function numField(o: Record<string, unknown>, key: string): number {
  const v = o[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

function boolField(o: Record<string, unknown>, key: string): boolean {
  return o[key] === true
}

function lastIngestFromPayload(
  payload: unknown,
  at: Date
): {
  at: string
  imported: number
  updated: number
  unchanged: number
  withdrawn: number
  publishedCount: number
  feedSources: number
  searchIndexDeferred: boolean
} | null {
  if (!payload || typeof payload !== 'object') {
    return {
      at: at.toISOString(),
      imported: 0,
      updated: 0,
      unchanged: 0,
      withdrawn: 0,
      publishedCount: 0,
      feedSources: 0,
      searchIndexDeferred: false,
    }
  }
  const o = payload as Record<string, unknown>
  return {
    at: at.toISOString(),
    imported: numField(o, 'imported'),
    updated: numField(o, 'updated'),
    unchanged: numField(o, 'unchanged'),
    withdrawn: numField(o, 'withdrawn'),
    publishedCount: numField(o, 'publishedCount'),
    feedSources: numField(o, 'feedSources'),
    searchIndexDeferred: boolField(o, 'searchIndexDeferred'),
  }
}

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

  /**
   * Vista global de `portal_stats_events` (incluye ingest sin org/listing).
   * Solo `analytics:platform` (p. ej. platform_admin, support).
   */
  platformPortalActivityByTerminal: protectedProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(90).default(7),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session.permissions.includes('analytics:platform')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sin permiso para métricas de plataforma',
        })
      }

      const days = input?.days ?? 7
      const since = new Date()
      since.setUTCDate(since.getUTCDate() - days)
      since.setUTCHours(0, 0, 0, 0)

      const terminalRows = await ctx.db
        .select({
          terminalId: portalStatsEvents.terminalId,
          count: sql<number>`count(*)::int`,
        })
        .from(portalStatsEvents)
        .where(gte(portalStatsEvents.createdAt, since))
        .groupBy(portalStatsEvents.terminalId)

      const terminals = terminalRows
        .map((r) => ({
          terminalId: r.terminalId,
          count: Number(r.count),
        }))
        .sort((a, b) => b.count - a.count)

      const totalEvents = terminals.reduce((s, t) => s + t.count, 0)

      const [viewAgg] = await ctx.db
        .select({
          totalViews: sql<number>`coalesce(sum(${listings.viewCount}), 0)::int`,
        })
        .from(listings)

      const [lastIngestRow] = await ctx.db
        .select({
          createdAt: portalStatsEvents.createdAt,
          payload: portalStatsEvents.payload,
        })
        .from(portalStatsEvents)
        .where(
          eq(
            portalStatsEvents.terminalId,
            PORTAL_STATS_TERMINALS.INGEST_RUN_COMPLETED
          )
        )
        .orderBy(desc(portalStatsEvents.createdAt))
        .limit(1)

      const lastIngestRun = lastIngestRow
        ? lastIngestFromPayload(
            lastIngestRow.payload,
            lastIngestRow.createdAt
          )
        : null

      return {
        days,
        since: since.toISOString(),
        terminals,
        totalEvents,
        totalListingViewsAll: Number(viewAgg?.totalViews ?? 0),
        lastIngestRun,
      }
    }),
})
