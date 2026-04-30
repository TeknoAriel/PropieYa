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
    // Raw: getDb() tipa execute(SQLWrapper); forzamos firma mínima para health.
    const db = getDb() as unknown as { execute: (q: string) => Promise<unknown> }
    await db.execute('SELECT 1')
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (err) {
    checks.database = {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // 2. Tablas mínimas para operar auth + panel de propiedades/leads.
  try {
    const schemaStart = Date.now()
    const db = getDb()
    const rows = await (
      db as unknown as { execute: (q: string) => Promise<unknown> }
    ).execute(
      "SELECT to_regclass('public.users')::text AS users, to_regclass('public.organizations')::text AS organizations, to_regclass('public.listings')::text AS listings, to_regclass('public.leads')::text AS leads"
    )
    const first = (rows as unknown as Array<Record<string, unknown>>)[0] ?? {}
    const missing = ['users', 'organizations', 'listings', 'leads'].filter((k) => !first[k])
    if (missing.length === 0) {
      checks.schema = { status: 'ok', latencyMs: Date.now() - schemaStart }
    } else {
      checks.schema = {
        status: 'error',
        latencyMs: Date.now() - schemaStart,
        error: `tablas faltantes: ${missing.join(', ')}`,
      }
    }
  } catch (err) {
    checks.schema = {
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

