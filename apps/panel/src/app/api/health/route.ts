import { NextResponse } from 'next/server'

import { getDb } from '@propieya/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Health check para deploy (Panel).
 * Verifica conectividad a PostgreSQL.
 */
export async function GET() {
  const startedAt = Date.now()
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {}

  // 1. Database
  try {
    const dbStart = Date.now()
    // Panel no depende directamente de `drizzle-orm`; ejecutamos sin el helper `sql` tipado.
    await (getDb() as any).execute('SELECT 1')
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (err) {
    checks.database = {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok')
  const status = allOk ? 200 : 503

  const body = {
    status: allOk ? 'healthy' : 'degraded',
    checks,
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(body, { status })
}

