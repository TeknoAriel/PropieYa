/**
 * Cron: auditoría diaria de inventario (solo lectura + snapshot en DB + alertas).
 * No publica avisos ni toca búsqueda; solo métricas y persistencia operativa.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> si CRON_SECRET está definido.
 *
 * @see docs/60-INVENTORY-DAILY-AUDIT.md
 */

import { NextResponse, type NextRequest } from 'next/server'

import { db } from '@propieya/database'
import { PORTAL_STATS_TERMINALS } from '@propieya/shared'

import { recordPortalStatsEvent } from '@/lib/analytics/record-portal-stats-event'
import {
  persistInventoryAuditSnapshot,
  runInventoryDailyAudit,
} from '@/lib/inventory-audit/run-inventory-daily-audit'

export const runtime = 'nodejs'
export const maxDuration = 120

async function notifyWebhook(body: Record<string, unknown>): Promise<void> {
  const url = process.env.INVENTORY_AUDIT_WEBHOOK_URL?.trim()
  if (!url) return
  const secret = process.env.INVENTORY_AUDIT_WEBHOOK_SECRET?.trim()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (secret) {
    headers.Authorization = `Bearer ${secret}`
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.warn(
      '[inventory-audit] webhook HTTP',
      res.status,
      await res.text().catch(() => '')
    )
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { metrics, alerts, logLine } = await runInventoryDailyAudit(db)
    console.log(logLine)

    await persistInventoryAuditSnapshot(
      db,
      metrics.snapshot_date_utc,
      metrics,
      alerts
    )

    recordPortalStatsEvent(db, {
      terminalId: PORTAL_STATS_TERMINALS.INVENTORY_AUDIT_DAILY,
      payload: {
        snapshot_date_utc: metrics.snapshot_date_utc,
        feed_count: metrics.feed_count,
        db_total: metrics.db_total,
        active_total: metrics.active_total,
        withdrawn_total: metrics.withdrawn_total,
        alert_count: alerts.length,
        alerts,
      },
    })

    const webhookPayload = {
      kind: 'inventory_daily_audit',
      snapshot_date_utc: metrics.snapshot_date_utc,
      alerts,
      summary: {
        feed_count: metrics.feed_count,
        db_total: metrics.db_total,
        active_total: metrics.active_total,
        withdrawn_total: metrics.withdrawn_total,
        rejected_total: metrics.rejected_total,
        suspended_total: metrics.suspended_total,
        draft_total: metrics.draft_total,
        rosario_active_sale: metrics.rosario_active_sale,
        rosario_active_rent: metrics.rosario_active_rent,
        delta_active_vs_previous: metrics.delta_active_vs_previous,
        delta_feed_vs_previous: metrics.delta_feed_vs_previous,
      },
    }

    try {
      await notifyWebhook(webhookPayload)
    } catch (whErr) {
      console.warn('[inventory-audit] webhook error', whErr)
    }

    return NextResponse.json({
      ok: true,
      snapshot_date_utc: metrics.snapshot_date_utc,
      alerts,
      metrics: {
        feed_count: metrics.feed_count,
        feed_error: metrics.feed_error,
        db_total: metrics.db_total,
        active_total: metrics.active_total,
        withdrawn_total: metrics.withdrawn_total,
        rejected_total: metrics.rejected_total,
        suspended_total: metrics.suspended_total,
        draft_total: metrics.draft_total,
        rosario_active_sale: metrics.rosario_active_sale,
        rosario_active_rent: metrics.rosario_active_rent,
        by_status: metrics.by_status,
        previous_snapshot_date_utc: metrics.previous_snapshot_date_utc,
        delta_active_vs_previous: metrics.delta_active_vs_previous,
        delta_active_percent_vs_previous: metrics.delta_active_percent_vs_previous,
        delta_withdrawn_vs_previous: metrics.delta_withdrawn_vs_previous,
        delta_withdrawn_percent_vs_previous: metrics.delta_withdrawn_percent_vs_previous,
        delta_feed_vs_previous: metrics.delta_feed_vs_previous,
        thresholds: metrics.thresholds,
      },
    })
  } catch (err) {
    console.error('Cron inventory-audit:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
