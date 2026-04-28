import { NextResponse, type NextRequest } from 'next/server'
import { sql } from 'drizzle-orm'

import { getDb } from '@propieya/database'
import { PORTAL_STATS_TERMINALS } from '@propieya/shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const token =
    process.env.PORTAL_VISIBILITY_OPS_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ''
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
  const db = getDb()

  try {
    const impressionsTerminal = PORTAL_STATS_TERMINALS.LISTING_PORTAL_VISIBILITY_IMPRESSION
    const clicksTerminal = PORTAL_STATS_TERMINALS.LISTING_PORTAL_VISIBILITY_CLICK

    const [totals] = await db.execute(sql`
      with pv as (
        select
          terminal_id,
          coalesce(payload->>'tier', 'standard') as tier
        from portal_stats_events
        where created_at >= now() - (${sinceHours} || ' hours')::interval
          and terminal_id in (${impressionsTerminal}, ${clicksTerminal})
      )
      select
        count(*) filter (where terminal_id = ${impressionsTerminal})::int as impressions_total,
        count(*) filter (where terminal_id = ${clicksTerminal})::int as clicks_total,
        count(*) filter (where tier = 'standard')::int as standard_events
      from pv
    `)

    const impressionsByTier = await db.execute(sql`
      select
        coalesce(payload->>'tier', 'standard') as tier,
        count(*)::int as impressions
      from portal_stats_events
      where created_at >= now() - (${sinceHours} || ' hours')::interval
        and terminal_id = ${impressionsTerminal}
      group by 1
      order by impressions desc, tier asc
    `)

    const clicksByTier = await db.execute(sql`
      select
        coalesce(payload->>'tier', 'standard') as tier,
        count(*)::int as clicks
      from portal_stats_events
      where created_at >= now() - (${sinceHours} || ' hours')::interval
        and terminal_id = ${clicksTerminal}
      group by 1
      order by clicks desc, tier asc
    `)

    const byTierCtr = await db.execute(sql`
      with i as (
        select
          coalesce(payload->>'tier', 'standard') as tier,
          count(*)::int as impressions
        from portal_stats_events
        where created_at >= now() - (${sinceHours} || ' hours')::interval
          and terminal_id = ${impressionsTerminal}
        group by 1
      ),
      c as (
        select
          coalesce(payload->>'tier', 'standard') as tier,
          count(*)::int as clicks
        from portal_stats_events
        where created_at >= now() - (${sinceHours} || ' hours')::interval
          and terminal_id = ${clicksTerminal}
        group by 1
      )
      select
        coalesce(i.tier, c.tier) as tier,
        coalesce(i.impressions, 0)::int as impressions,
        coalesce(c.clicks, 0)::int as clicks,
        round(
          case
            when coalesce(i.impressions, 0) > 0
            then (coalesce(c.clicks, 0)::numeric / i.impressions::numeric) * 100
            else 0
          end
        , 2) as ctr_pct
      from i
      full outer join c on c.tier = i.tier
      order by impressions desc, clicks desc
    `)

    const bySurface = await db.execute(sql`
      with base as (
        select
          terminal_id,
          coalesce(payload->>'surface', 'unknown') as surface
        from portal_stats_events
        where created_at >= now() - (${sinceHours} || ' hours')::interval
          and terminal_id in (${impressionsTerminal}, ${clicksTerminal})
      )
      select
        surface,
        count(*) filter (where terminal_id = ${impressionsTerminal})::int as impressions,
        count(*) filter (where terminal_id = ${clicksTerminal})::int as clicks
      from base
      group by 1
      order by impressions desc, clicks desc, surface asc
    `)

    const topListings = await db.execute(sql`
      with i as (
        select
          e.listing_id,
          count(*)::int as impressions
        from portal_stats_events e
        where e.created_at >= now() - (${sinceHours} || ' hours')::interval
          and e.terminal_id = ${impressionsTerminal}
          and e.listing_id is not null
        group by 1
      ),
      c as (
        select
          e.listing_id,
          count(*)::int as clicks
        from portal_stats_events e
        where e.created_at >= now() - (${sinceHours} || ' hours')::interval
          and e.terminal_id = ${clicksTerminal}
          and e.listing_id is not null
        group by 1
      )
      select
        coalesce(i.listing_id, c.listing_id) as "listingId",
        l.title as "listingTitle",
        coalesce(i.impressions, 0)::int as impressions,
        coalesce(c.clicks, 0)::int as clicks,
        round(
          case
            when coalesce(i.impressions, 0) > 0
            then (coalesce(c.clicks, 0)::numeric / i.impressions::numeric) * 100
            else 0
          end
        , 2) as ctr_pct
      from i
      full outer join c on c.listing_id = i.listing_id
      left join listings l on l.id = coalesce(i.listing_id, c.listing_id)
      order by impressions desc, clicks desc
      limit 20
    `)

    const topProducts = await db.execute(sql`
      select
        p.product_id as product,
        count(*)::int as impressions
      from portal_stats_events e
      cross join lateral (
        select jsonb_array_elements_text(
          case
            when jsonb_typeof(e.payload->'products') = 'array'
            then e.payload->'products'
            else '[]'::jsonb
          end
        ) as product_id
      ) p
      where e.created_at >= now() - (${sinceHours} || ' hours')::interval
        and e.terminal_id = ${impressionsTerminal}
      group by 1
      order by impressions desc, product asc
      limit 20
    `)

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      window: { sinceHours },
      totals: {
        impressions: Number(totals?.impressions_total ?? 0),
        clicks: Number(totals?.clicks_total ?? 0),
        ctrPct:
          Number(totals?.impressions_total ?? 0) > 0
            ? Number(
                (
                  (Number(totals?.clicks_total ?? 0) /
                    Number(totals?.impressions_total ?? 0)) *
                  100
                ).toFixed(2)
              )
            : 0,
      },
      impressionsByTier,
      clicksByTier,
      byTierCtr,
      bySurface,
      topListings,
      topProducts,
      extensionSurfaces: ['landing_featured', 'developments_featured', 'home_featured'],
    })
  } catch (err) {
    console.error('[ops.portal-visibility-performance] error', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
