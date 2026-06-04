/**
 * Cron manual: reclasifica avisos «en pozo» / emprendimiento a development_unit.
 * Auth: Authorization: Bearer CRON_SECRET
 *
 * dryRun=1 (default): solo cuenta. dryRun=0: aplica updates.
 */
import { NextResponse, type NextRequest } from 'next/server'

import { reclassifyDevelopmentUnitsInProd } from '@/lib/cron/reclassify-development-units'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.CRON_SECRET?.trim() || ''
  if (!token) return false
  return req.headers.get('authorization') === `Bearer ${token}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') !== '0'

  try {
    const result = await reclassifyDevelopmentUnitsInProd({ apply: !dryRun })
    return NextResponse.json({ ok: true, dryRun, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
