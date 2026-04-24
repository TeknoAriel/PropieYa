import { count, desc, lt, sql } from 'drizzle-orm'

import type { Database } from '@propieya/database'
import {
  db as defaultDb,
  inventoryAuditSnapshots,
  listings,
} from '@propieya/database'
import { extractListingsFromFeed } from '@propieya/shared'

/** Misma URL default que ingest Properstar (`yumblin-import-sync`). */
const DEFAULT_FEED_URL =
  'https://static.kiteprop.com/kp/difusions/f89cbd8ca785fc34317df63d29ab8ea9d68a7b1c/properstar.json'

const FEED_FETCH_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.INVENTORY_AUDIT_FEED_TIMEOUT_MS ?? '45000', 10) || 45000, 5000),
  120_000
)

function parsePctEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (raw === undefined || raw === '') return fallback
  const n = parseFloat(raw.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

function parseBoolEnv(name: string, defaultTrue: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase()
  if (v === undefined || v === '') return defaultTrue
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
  return defaultTrue
}

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export type InventoryDailyAuditMetrics = {
  snapshot_date_utc: string
  feed_url_used: string
  feed_count: number | null
  feed_error?: string
  db_total: number
  by_status: Record<string, number>
  active_total: number
  withdrawn_total: number
  rejected_total: number
  suspended_total: number
  draft_total: number
  rosario_active_sale: number
  rosario_active_rent: number
  previous_snapshot_date_utc: string | null
  previous_active_total: number | null
  previous_withdrawn_total: number | null
  previous_feed_count: number | null
  delta_active_vs_previous: number | null
  delta_active_percent_vs_previous: number | null
  delta_withdrawn_vs_previous: number | null
  delta_withdrawn_percent_vs_previous: number | null
  delta_feed_vs_previous: number | null
  thresholds: {
    active_drop_pct: number
    withdrawn_rise_pct: number
    dangerous_abs_delta_active: number
    alert_feed_zero: boolean
    alert_feed_fetch_fail: boolean
  }
}

export type InventoryDailyAuditResult = {
  metrics: InventoryDailyAuditMetrics
  alerts: string[]
  /** Una línea JSON para logs estructurados (Datadog, etc.). */
  logLine: string
}

async function fetchFeedCount(feedUrl: string): Promise<{
  count: number | null
  error?: string
}> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), FEED_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(feedUrl, {
      signal: ac.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return { count: null, error: `HTTP ${res.status}` }
    }
    const data: unknown = await res.json()
    const arr = extractListingsFromFeed(data)
    return { count: arr.length }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { count: null, error: msg }
  } finally {
    clearTimeout(t)
  }
}

export async function runInventoryDailyAudit(
  db: Database = defaultDb
): Promise<InventoryDailyAuditResult> {
  const snapshotDate = utcDateString()
  const feedUrl =
    process.env.YUMBLIN_JSON_URL?.trim() ||
    process.env.INVENTORY_AUDIT_FEED_URL?.trim() ||
    DEFAULT_FEED_URL

  const activeDropPct = parsePctEnv('INVENTORY_AUDIT_ACTIVE_DROP_PCT_ALERT', 5)
  const withdrawnRisePct = parsePctEnv('INVENTORY_AUDIT_WITHDRAWN_RISE_PCT_ALERT', 20)
  const dangerousAbsDeltaRaw = process.env.INVENTORY_AUDIT_DANGEROUS_ABS_DELTA_ACTIVE?.trim()
  const dangerousAbsDelta =
    dangerousAbsDeltaRaw !== undefined && dangerousAbsDeltaRaw !== ''
      ? Math.max(0, parseInt(dangerousAbsDeltaRaw, 10) || 1000)
      : 1000
  const alertFeedZero = parseBoolEnv('INVENTORY_AUDIT_ALERT_FEED_ZERO', true)
  const alertFeedFetchFail = parseBoolEnv('INVENTORY_AUDIT_ALERT_FEED_FETCH_FAIL', true)

  const [feedResult, statusRows, rosarioRow, prevRow] = await Promise.all([
    fetchFeedCount(feedUrl),
    db
      .select({ status: listings.status, c: count() })
      .from(listings)
      .groupBy(listings.status),
    db
      .select({
        rosario_sale: sql<number>`coalesce(sum(case when ${listings.status} = 'active' and ${listings.operationType} = 'sale' and lower(coalesce(${listings.address}->>'city','')) like '%rosario%' then 1 else 0 end), 0)::int`,
        rosario_rent: sql<number>`coalesce(sum(case when ${listings.status} = 'active' and (${listings.operationType} = 'rent' or ${listings.operationType} = 'temporary_rent') and lower(coalesce(${listings.address}->>'city','')) like '%rosario%' then 1 else 0 end), 0)::int`,
      })
      .from(listings),
    db
      .select()
      .from(inventoryAuditSnapshots)
      .where(lt(inventoryAuditSnapshots.snapshotDate, snapshotDate))
      .orderBy(desc(inventoryAuditSnapshots.snapshotDate))
      .limit(1),
  ])

  const byStatus: Record<string, number> = {}
  let dbTotal = 0
  for (const row of statusRows) {
    const n = Number(row.c)
    byStatus[row.status] = n
    dbTotal += n
  }

  const pick = (s: string) => byStatus[s] ?? 0
  const active_total = pick('active')
  const withdrawn_total = pick('withdrawn')
  const rejected_total = pick('rejected')
  const suspended_total = pick('suspended')
  const draft_total = pick('draft')

  const rosario_active_sale = Number(rosarioRow[0]?.rosario_sale ?? 0)
  const rosario_active_rent = Number(rosarioRow[0]?.rosario_rent ?? 0)

  let previous_snapshot_date_utc: string | null = null
  let previous_active_total: number | null = null
  let previous_withdrawn_total: number | null = null
  let previous_feed_count: number | null = null

  if (prevRow[0]) {
    previous_snapshot_date_utc = prevRow[0].snapshotDate
    const pm = prevRow[0].metrics as Record<string, unknown>
    previous_active_total =
      typeof pm.active_total === 'number' ? pm.active_total : null
    previous_withdrawn_total =
      typeof pm.withdrawn_total === 'number' ? pm.withdrawn_total : null
    previous_feed_count =
      typeof pm.feed_count === 'number' ? pm.feed_count : null
  }

  const delta_active_vs_previous =
    previous_active_total !== null ? active_total - previous_active_total : null
  const delta_withdrawn_vs_previous =
    previous_withdrawn_total !== null
      ? withdrawn_total - previous_withdrawn_total
      : null
  const delta_feed_vs_previous =
    previous_feed_count !== null && feedResult.count !== null
      ? feedResult.count - previous_feed_count
      : null

  const delta_active_percent_vs_previous =
    previous_active_total !== null &&
    previous_active_total > 0 &&
    delta_active_vs_previous !== null
      ? (delta_active_vs_previous / previous_active_total) * 100
      : null

  const delta_withdrawn_percent_vs_previous =
    previous_withdrawn_total !== null &&
    previous_withdrawn_total > 0 &&
    delta_withdrawn_vs_previous !== null
      ? (delta_withdrawn_vs_previous / previous_withdrawn_total) * 100
      : previous_withdrawn_total === 0 && (delta_withdrawn_vs_previous ?? 0) > 0
        ? 100
        : null

  const metrics: InventoryDailyAuditMetrics = {
    snapshot_date_utc: snapshotDate,
    feed_url_used: feedUrl,
    feed_count: feedResult.count,
    feed_error: feedResult.error,
    db_total: dbTotal,
    by_status: byStatus,
    active_total,
    withdrawn_total,
    rejected_total,
    suspended_total,
    draft_total,
    rosario_active_sale,
    rosario_active_rent,
    previous_snapshot_date_utc,
    previous_active_total,
    previous_withdrawn_total,
    previous_feed_count,
    delta_active_vs_previous,
    delta_active_percent_vs_previous,
    delta_withdrawn_vs_previous,
    delta_withdrawn_percent_vs_previous,
    delta_feed_vs_previous,
    thresholds: {
      active_drop_pct: activeDropPct,
      withdrawn_rise_pct: withdrawnRisePct,
      dangerous_abs_delta_active: dangerousAbsDelta,
      alert_feed_zero: alertFeedZero,
      alert_feed_fetch_fail: alertFeedFetchFail,
    },
  }

  const alerts: string[] = []

  if (feedResult.error && alertFeedFetchFail) {
    alerts.push(`feed_fetch_failed:${feedResult.error}`)
  }
  if (feedResult.count === 0 && !feedResult.error && alertFeedZero) {
    alerts.push('feed_count_zero')
  }
  if (
    delta_active_percent_vs_previous !== null &&
    delta_active_percent_vs_previous < 0 &&
    Math.abs(delta_active_percent_vs_previous) >= activeDropPct
  ) {
    alerts.push(
      `active_drop_pct:${Math.abs(delta_active_percent_vs_previous).toFixed(2)}>=${activeDropPct}`
    )
  }
  if (
    delta_withdrawn_percent_vs_previous !== null &&
    delta_withdrawn_percent_vs_previous >= withdrawnRisePct
  ) {
    alerts.push(
      `withdrawn_rise_pct:${delta_withdrawn_percent_vs_previous.toFixed(2)}>=${withdrawnRisePct}`
    )
  }
  if (
    delta_active_vs_previous !== null &&
    delta_active_vs_previous < 0 &&
    Math.abs(delta_active_vs_previous) >= dangerousAbsDelta
  ) {
    alerts.push(
      `dangerous_abs_delta_active:${Math.abs(delta_active_vs_previous)}>=${dangerousAbsDelta}`
    )
  }

  const logLine = JSON.stringify({
    event: 'inventory_daily_audit',
    snapshot_date_utc: snapshotDate,
    feed_count: feedResult.count,
    db_total: dbTotal,
    active_total,
    withdrawn_total,
    alerts,
  })

  return { metrics, alerts, logLine }
}

export async function persistInventoryAuditSnapshot(
  db: Database,
  snapshotDateUtc: string,
  metrics: InventoryDailyAuditMetrics,
  alerts: string[]
): Promise<void> {
  await db
    .insert(inventoryAuditSnapshots)
    .values({
      snapshotDate: snapshotDateUtc,
      metrics: metrics as unknown as Record<string, unknown>,
      alerts,
    })
    .onConflictDoUpdate({
      target: inventoryAuditSnapshots.snapshotDate,
      set: {
        metrics: metrics as unknown as Record<string, unknown>,
        alerts,
        createdAt: new Date(),
      },
    })
}

/** Último snapshot guardado (cualquier día); útil para smoke checks. */
export async function getLatestInventoryAuditSnapshot(db: Database = defaultDb) {
  const row = await db
    .select()
    .from(inventoryAuditSnapshots)
    .orderBy(desc(inventoryAuditSnapshots.snapshotDate))
    .limit(1)
  return row[0] ?? null
}
