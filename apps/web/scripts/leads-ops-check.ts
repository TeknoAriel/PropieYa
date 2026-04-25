/**
 * Consulta rápida de salud operativa de leads (producción/preview).
 *
 * Uso:
 *   LEADS_OPS_TOKEN=... pnpm --filter @propieya/web exec tsx scripts/leads-ops-check.ts
 *   LEADS_OPS_BASE_URL=https://propieyaweb.vercel.app LEADS_OPS_TOKEN=... pnpm --filter @propieya/web exec tsx scripts/leads-ops-check.ts --sinceHours=24 --pendingOlderThanHours=24
 */

function intArg(name: string, fallback: number): number {
  const pref = `--${name}=`
  const arg = process.argv.find((a) => a.startsWith(pref))
  if (!arg) return fallback
  const n = parseInt(arg.slice(pref.length), 10)
  return Number.isFinite(n) ? n : fallback
}

async function main() {
  const baseUrl = (process.env.LEADS_OPS_BASE_URL ?? 'https://propieyaweb.vercel.app').replace(
    /\/$/,
    ''
  )
  const token =
    process.env.LEADS_OPS_TOKEN?.trim() || process.env.CRON_SECRET?.trim() || ''
  if (!token) {
    throw new Error('Definí LEADS_OPS_TOKEN (o CRON_SECRET) para autenticar el endpoint.')
  }

  const sinceHours = intArg('sinceHours', 24)
  const pendingOlderThanHours = intArg('pendingOlderThanHours', 24)
  const url = `${baseUrl}/api/internal/ops/leads-health?sinceHours=${sinceHours}&pendingOlderThanHours=${pendingOlderThanHours}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // plain text
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`)
  }

  const data = body as {
    generatedAt: string
    totals: {
      leadsInWindow: number
      pendingInWindow: number
      syncErrorInWindow: number
      unknownRouteInWindow: number
    }
    alerts: {
      highSyncErrors: boolean
      highPendingAging: boolean
      unknownRouteDetected: boolean
      suddenZeroLeads: boolean
    }
    distribution?: {
      assignedBy?: Array<{ assigned_by?: string; total?: number }>
      syncStatus?: Array<{ sync_status?: string; total?: number }>
    }
  }

  console.log('=== Leads Ops Check ===')
  console.log('generatedAt:', data.generatedAt)
  console.log('totals:', data.totals)
  console.log('alerts:', data.alerts)
  console.log('assignedBy:', data.distribution?.assignedBy ?? [])
  console.log('syncStatus:', data.distribution?.syncStatus ?? [])
}

void main().catch((err) => {
  console.error('[leads-ops-check] error:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
