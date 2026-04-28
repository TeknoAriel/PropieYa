import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'

import {
  inventoryAuditSnapshots,
  listingLifecycleEvents,
  listings,
  portalStatsEvents,
} from '@propieya/database'
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
  operationsHealthOverview: protectedProcedure
    .input(
      z
        .object({
          leadsWindowHours: z.number().int().min(6).max(24 * 30).default(48),
          lifecycleWindowHours: z.number().int().min(6).max(24 * 30).default(48),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session.permissions.includes('analytics:platform')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sin permiso para salud operativa de plataforma.',
        })
      }
      const leadsWindowHours = input?.leadsWindowHours ?? 48
      const lifecycleWindowHours = input?.lifecycleWindowHours ?? 48
      const now = new Date()
      const leadsSince = new Date(now.getTime() - leadsWindowHours * 60 * 60 * 1000)
      const lifecycleSince = new Date(now.getTime() - lifecycleWindowHours * 60 * 60 * 1000)
      const webhookStaleSince = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const [inventoryByStatus, latestAudit, lifecycleRows, lifecycleLastErrorRows, leadOpsRows, cronRows] =
        await Promise.all([
          ctx.db
            .select({
              status: listings.status,
              c: sql<number>`count(*)::int`,
            })
            .from(listings)
            .groupBy(listings.status),
          ctx.db
            .select()
            .from(inventoryAuditSnapshots)
            .orderBy(desc(inventoryAuditSnapshots.snapshotDate))
            .limit(1),
          ctx.db
            .select({
              status: listingLifecycleEvents.kitepropWebhookStatus,
              c: sql<number>`count(*)::int`,
              lastAt: sql<string | null>`max(${listingLifecycleEvents.createdAt})::text`,
            })
            .from(listingLifecycleEvents)
            .where(gte(listingLifecycleEvents.createdAt, lifecycleSince))
            .groupBy(listingLifecycleEvents.kitepropWebhookStatus),
          ctx.db
            .select({
              error: listingLifecycleEvents.kitepropWebhookError,
              createdAt: listingLifecycleEvents.createdAt,
            })
            .from(listingLifecycleEvents)
            .where(eq(listingLifecycleEvents.kitepropWebhookStatus, 'error'))
            .orderBy(desc(listingLifecycleEvents.createdAt))
            .limit(1),
          ctx.db.execute(sql`
            select
              count(*)::int as leads_in_window,
              count(*) filter (where access_status = 'pending')::int as pending_activation,
              count(*) filter (where coalesce(enrichment->'kiteprop'->>'syncStatus', 'not_attempted') = 'error')::int as sync_error,
              max(created_at)::text as last_lead_at
            from leads
            where created_at >= ${leadsSince}
          `),
          ctx.db
            .select({
              terminalId: portalStatsEvents.terminalId,
              createdAt: portalStatsEvents.createdAt,
              payload: portalStatsEvents.payload,
            })
            .from(portalStatsEvents)
            .where(
              and(
                inArray(portalStatsEvents.terminalId, [
                  PORTAL_STATS_TERMINALS.INGEST_RUN_COMPLETED,
                  PORTAL_STATS_TERMINALS.INVENTORY_AUDIT_DAILY,
                ]),
                gte(portalStatsEvents.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
              )
            )
            .orderBy(desc(portalStatsEvents.createdAt))
            .limit(40),
        ])

      const byStatus = new Map<string, number>()
      for (const row of inventoryByStatus) byStatus.set(row.status, Number(row.c))
      const inventory = {
        total: Array.from(byStatus.values()).reduce((acc, v) => acc + v, 0),
        active: byStatus.get('active') ?? 0,
        withdrawn: byStatus.get('withdrawn') ?? 0,
        rejected: byStatus.get('rejected') ?? 0,
        suspended: byStatus.get('suspended') ?? 0,
      }

      const auditRow = latestAudit[0] ?? null
      const auditMetrics =
        auditRow && auditRow.metrics && typeof auditRow.metrics === 'object'
          ? (auditRow.metrics as Record<string, unknown>)
          : {}
      const auditAlerts = Array.isArray(auditRow?.alerts)
        ? (auditRow?.alerts as string[])
        : []
      const latestInventoryAudit = auditRow
        ? {
            snapshotDateUtc: auditRow.snapshotDate,
            createdAt: auditRow.createdAt.toISOString(),
            feedCount:
              typeof auditMetrics.feed_count === 'number' ? Number(auditMetrics.feed_count) : null,
            activeTotal:
              typeof auditMetrics.active_total === 'number'
                ? Number(auditMetrics.active_total)
                : null,
            alerts: auditAlerts,
          }
        : null

      const lifecycleByStatus = {
        pending: 0,
        sent: 0,
        skipped: 0,
        error: 0,
      }
      let lastLifecycleAt: string | null = null
      for (const row of lifecycleRows) {
        if (row.status in lifecycleByStatus) {
          lifecycleByStatus[row.status as keyof typeof lifecycleByStatus] = Number(row.c)
        }
        if (row.lastAt && (!lastLifecycleAt || row.lastAt > lastLifecycleAt)) {
          lastLifecycleAt = row.lastAt
        }
      }
      const lifecycleLastError = lifecycleLastErrorRows[0]
        ? {
            message: lifecycleLastErrorRows[0].error ?? 'Error no especificado',
            createdAt: lifecycleLastErrorRows[0].createdAt.toISOString(),
          }
        : null

      const leadRow = (leadOpsRows[0] ?? {}) as Record<string, unknown>
      const leadOps = {
        leadsInWindow: Number(leadRow.leads_in_window ?? 0),
        pendingActivation: Number(leadRow.pending_activation ?? 0),
        syncError: Number(leadRow.sync_error ?? 0),
        lastLeadAt: typeof leadRow.last_lead_at === 'string' ? leadRow.last_lead_at : null,
      }

      const ingestEvent = cronRows.find(
        (row) => row.terminalId === PORTAL_STATS_TERMINALS.INGEST_RUN_COMPLETED
      )
      const inventoryAuditEvent = cronRows.find(
        (row) => row.terminalId === PORTAL_STATS_TERMINALS.INVENTORY_AUDIT_DAILY
      )
      const ingestPayload =
        ingestEvent?.payload && typeof ingestEvent.payload === 'object'
          ? (ingestEvent.payload as Record<string, unknown>)
          : {}
      const inventoryAuditPayload =
        inventoryAuditEvent?.payload && typeof inventoryAuditEvent.payload === 'object'
          ? (inventoryAuditEvent.payload as Record<string, unknown>)
          : {}

      const alerts: string[] = []
      if ((latestInventoryAudit?.feedCount ?? null) === 0) alerts.push('feed_count_0')
      if (
        (latestInventoryAudit?.alerts ?? []).some(
          (item) => item.includes('active_drop_pct') || item.includes('dangerous_abs_delta_active')
        )
      ) {
        alerts.push('caida_fuerte_inventario')
      }
      if (leadOps.syncError >= 10) alerts.push('muchos_leads_sync_error')
      if (!lastLifecycleAt || new Date(lastLifecycleAt).getTime() < webhookStaleSince.getTime()) {
        alerts.push('webhook_sin_actividad_reciente')
      }
      if (
        lifecycleByStatus.error > 0 ||
        Number((ingestPayload.lifecycleWebhookFlush as Record<string, unknown> | undefined)?.errors ?? 0) >
          0
      ) {
        alerts.push('webhook_con_errores')
      }
      if (!ingestEvent || now.getTime() - ingestEvent.createdAt.getTime() > 36 * 60 * 60 * 1000) {
        alerts.push('cron_ingesta_desactualizado')
      }
      if (
        !inventoryAuditEvent ||
        now.getTime() - inventoryAuditEvent.createdAt.getTime() > 36 * 60 * 60 * 1000
      ) {
        alerts.push('cron_auditoria_desactualizado')
      }

      return {
        generatedAt: now.toISOString(),
        inventory,
        latestInventoryAudit,
        integrations: {
          kitepropPropertiesWebhook: {
            byStatus: lifecycleByStatus,
            lastActivityAt: lastLifecycleAt,
            lastError: lifecycleLastError,
          },
          leadsSync: leadOps,
          ingest: {
            lastRunAt: ingestEvent?.createdAt.toISOString() ?? null,
            imported: Number(ingestPayload.imported ?? 0),
            updated: Number(ingestPayload.updated ?? 0),
            withdrawn: Number(ingestPayload.withdrawn ?? 0),
            lifecycleWebhookErrors: Number(
              (ingestPayload.lifecycleWebhookFlush as Record<string, unknown> | undefined)?.errors ?? 0
            ),
          },
          inventoryAudit: {
            lastRunAt: inventoryAuditEvent?.createdAt.toISOString() ?? null,
            alertCount: Number(inventoryAuditPayload.alert_count ?? 0),
          },
        },
        alerts,
      }
    }),
})
