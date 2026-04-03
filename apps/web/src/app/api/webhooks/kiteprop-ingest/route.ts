/**
 * Webhook Kiteprop: dispara la misma ingesta que el cron, sin respetar IMPORT_SYNC_INTERVAL_HOURS.
 * Útil cuando en origen se publica/actualiza un aviso y se quiere refrescar el JSON antes del próximo tick.
 *
 * Auth: Authorization: Bearer <KITEPROP_INGEST_WEBHOOK_SECRET> si está definido;
 * si no, Bearer <CRON_SECRET> (mismo patrón que crons).
 */

import { NextResponse, type NextRequest } from 'next/server'

import { runYumblinImportPipeline } from '@/lib/cron/run-yumblin-import-pipeline'

export const runtime = 'nodejs'
export const maxDuration = 300

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const webhookSecret = process.env.KITEPROP_INGEST_WEBHOOK_SECRET?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()
  const secret = webhookSecret || cronSecret
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body =
      req.headers.get('content-type')?.includes('application/json') && req.body
        ? await req.json().catch(() => null)
        : null

    const result = await runYumblinImportPipeline({ enforceInterval: false })
    return NextResponse.json({
      ok: true,
      ...result,
      webhookNote:
        'Ingesta completa del feed JSON; el cuerpo del POST es opcional (solo trazabilidad).',
      received: body,
    })
  } catch (err) {
    console.error('Webhook kiteprop-ingest:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
