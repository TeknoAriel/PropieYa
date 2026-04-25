import { NextResponse, type NextRequest } from 'next/server'
import { sql } from 'drizzle-orm'

import { getDb } from '@propieya/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const token =
    process.env.LEADS_OPS_SECRET?.trim() || process.env.CRON_SECRET?.trim() || ''
  if (!token) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${token}`
}

function intParam(url: URL, name: string, fallback: number, min: number, max: number): number {
  const raw = url.searchParams.get(name)
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const sinceHours = intParam(url, 'sinceHours', 24, 1, 24 * 30)
  const pendingOlderThanHours = intParam(url, 'pendingOlderThanHours', 24, 1, 24 * 30)
  const db = getDb()

  try {
    const [totals] = await db.execute(sql`
      with windowed as (
        select
          l.id,
          l.created_at,
          l.access_status,
          coalesce(l.enrichment->>'assignedBy', 'unknown') as assigned_by,
          coalesce(l.enrichment->'kiteprop'->>'syncStatus', 'not_attempted') as sync_status
        from leads l
        where l.created_at >= now() - (${sinceHours} || ' hours')::interval
      )
      select
        count(*)::int as leads_in_window,
        count(*) filter (where access_status = 'pending')::int as pending_in_window,
        count(*) filter (where sync_status = 'error')::int as sync_error_in_window,
        count(*) filter (where assigned_by = 'unknown')::int as unknown_route_in_window
      from windowed
    `)

    const assignedByRows = await db.execute(sql`
      select
        coalesce(l.enrichment->>'assignedBy', 'unknown') as assigned_by,
        count(*)::int as total
      from leads l
      where l.created_at >= now() - (${sinceHours} || ' hours')::interval
      group by 1
      order by total desc, assigned_by asc
    `)

    const syncRows = await db.execute(sql`
      select
        coalesce(l.enrichment->'kiteprop'->>'syncStatus', 'not_attempted') as sync_status,
        count(*)::int as total
      from leads l
      where l.created_at >= now() - (${sinceHours} || ' hours')::interval
      group by 1
      order by total desc, sync_status asc
    `)

    const pendingAgingRows = await db.execute(sql`
      select
        l.id,
        l.listing_id as "listingId",
        li.title as "listingTitle",
        round(extract(epoch from (now() - l.created_at)) / 3600.0, 1) as "ageHours",
        l.created_at as "createdAt",
        coalesce(l.enrichment->>'assignedBy', 'unknown') as "assignedBy"
      from leads l
      inner join listings li on li.id = l.listing_id
      where l.access_status = 'pending'
        and l.created_at <= now() - (${pendingOlderThanHours} || ' hours')::interval
      order by l.created_at asc
      limit 50
    `)

    const listingRows = await db.execute(sql`
      select
        l.listing_id as "listingId",
        li.title as "listingTitle",
        o.name as "organizationName",
        count(*)::int as total
      from leads l
      inner join listings li on li.id = l.listing_id
      inner join organizations o on o.id = l.organization_id
      where l.created_at >= now() - (${sinceHours} || ' hours')::interval
      group by 1, 2, 3
      order by total desc, "listingTitle" asc
      limit 20
    `)

    const repeatedErrorRows = await db.execute(sql`
      select
        coalesce(l.enrichment->'kiteprop'->>'lastError', 'unknown') as error_message,
        count(*)::int as total
      from leads l
      where l.created_at >= now() - (${sinceHours} || ' hours')::interval
        and coalesce(l.enrichment->'kiteprop'->>'syncStatus', '') = 'error'
      group by 1
      order by total desc, error_message asc
      limit 10
    `)

    const leadCount = Number(totals?.leads_in_window ?? 0)
    const syncErrors = Number(totals?.sync_error_in_window ?? 0)
    const pendingOld = pendingAgingRows.length
    const unknownRoute = Number(totals?.unknown_route_in_window ?? 0)
    const alerts = {
      highSyncErrors: syncErrors >= 10,
      highPendingAging: pendingOld >= 20,
      unknownRouteDetected: unknownRoute > 0,
      suddenZeroLeads: leadCount === 0,
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      window: {
        sinceHours,
        pendingOlderThanHours,
      },
      totals: {
        leadsInWindow: leadCount,
        pendingInWindow: Number(totals?.pending_in_window ?? 0),
        syncErrorInWindow: syncErrors,
        unknownRouteInWindow: unknownRoute,
      },
      distribution: {
        assignedBy: assignedByRows,
        syncStatus: syncRows,
      },
      pendingAging: pendingAgingRows,
      topListings: listingRows,
      repeatedSyncErrors: repeatedErrorRows,
      alerts,
    })
  } catch (err) {
    console.error('[ops.leads-health] error', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
