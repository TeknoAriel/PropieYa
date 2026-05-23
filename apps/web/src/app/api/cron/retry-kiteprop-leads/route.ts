/**
 * Cron: reintenta envío de consultas a KiteProp (POST /messages) que quedaron sin sync OK.
 * Auth: Authorization: Bearer CRON_SECRET
 */

import { NextResponse, type NextRequest } from 'next/server'

import { getDb } from '@propieya/database'

import { isKitepropConfigured } from '@/lib/integrations/kiteprop-client'
import { retryFailedKitepropLeadSyncs } from '@/lib/integrations/kiteprop-lead-sync'

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

  if (!isKitepropConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'KITEPROP_API_KEY no configurada en Vercel (portal web)',
      },
      { status: 503 }
    )
  }

  const url = new URL(req.url)
  const sinceHours = Math.min(
    168,
    Math.max(1, parseInt(url.searchParams.get('sinceHours') ?? '72', 10) || 72)
  )
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('limit') ?? '40', 10) || 40)
  )

  try {
    const db = getDb()
    const result = await retryFailedKitepropLeadSyncs(db, { sinceHours, limit })
    return NextResponse.json({
      ok: true,
      sinceHours,
      limit,
      ...result,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron.retry-kiteprop-leads]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
