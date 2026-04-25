/**
 * Chequeo operativo rápido de performance de portalVisibility.
 *
 * Uso:
 *   pnpm --filter @propieya/web exec tsx scripts/portal-visibility-ops-check.ts --sinceHours=24
 *
 * Env requeridas:
 *   PORTAL_VISIBILITY_OPS_BASE_URL (ej: https://propieyaweb.vercel.app)
 *   PORTAL_VISIBILITY_OPS_TOKEN    (fallback: PORTAL_VISIBILITY_OPS_SECRET o CRON_SECRET)
 */

export {}

function readArg(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (!raw) return fallback
  const n = parseInt(raw.split('=')[1] ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function asRows(v: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === 'object'))
}

async function main() {
  const baseUrl = (process.env.PORTAL_VISIBILITY_OPS_BASE_URL ?? '').trim()
  const token = (
    process.env.PORTAL_VISIBILITY_OPS_TOKEN ??
    process.env.PORTAL_VISIBILITY_OPS_SECRET ??
    process.env.CRON_SECRET ??
    ''
  ).trim()
  const sinceHours = readArg('sinceHours', 24)

  if (!baseUrl) {
    throw new Error('Falta PORTAL_VISIBILITY_OPS_BASE_URL')
  }
  if (!token) {
    throw new Error('Falta PORTAL_VISIBILITY_OPS_TOKEN (o PORTAL_VISIBILITY_OPS_SECRET / CRON_SECRET)')
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/internal/ops/portal-visibility-performance?sinceHours=${sinceHours}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = (await res.json()) as Record<string, unknown>

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`)
  }

  const totals = (json.totals as Record<string, unknown>) ?? {}
  console.log('== PortalVisibility Ops ==')
  console.log(`Ventana: ${sinceHours}h`)
  console.log(
    `Totales: impresiones=${Number(totals.impressions ?? 0)} | clics=${Number(totals.clicks ?? 0)} | CTR=${Number(totals.ctrPct ?? 0)}%`
  )

  const tierRows = asRows(json.byTierCtr).slice(0, 6)
  if (tierRows.length > 0) {
    console.log('\nCTR por tier:')
    for (const row of tierRows) {
      console.log(
        `- ${String(row.tier ?? 'unknown')}: imp=${Number(row.impressions ?? 0)}, clk=${Number(row.clicks ?? 0)}, ctr=${Number(row.ctr_pct ?? 0)}%`
      )
    }
  }

  const topListings = asRows(json.topListings).slice(0, 5)
  if (topListings.length > 0) {
    console.log('\nTop listings:')
    for (const row of topListings) {
      console.log(
        `- ${String(row.listingTitle ?? row.listingId ?? 'listing')}: imp=${Number(row.impressions ?? 0)}, clk=${Number(row.clicks ?? 0)}, ctr=${Number(row.ctr_pct ?? 0)}%`
      )
    }
  }

  const topProducts = asRows(json.topProducts).slice(0, 5)
  if (topProducts.length > 0) {
    console.log('\nTop productos:')
    for (const row of topProducts) {
      console.log(`- ${String(row.product ?? 'unknown')}: imp=${Number(row.impressions ?? 0)}`)
    }
  }
}

void main().catch((err) => {
  console.error('[portal-visibility-ops-check] error', err)
  process.exit(1)
})
