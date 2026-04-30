import { inspect } from 'node:util'

import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { getDb } from '@propieya/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function serializeDbError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message?.trim()
    if (m) return m.slice(0, 800)
    const c = err.cause
    if (c instanceof Error && c.message?.trim()) return c.message.trim().slice(0, 800)
    return inspect(err, { depth: 3, breakLength: 100 }).slice(0, 800)
  }
  if (typeof err === 'string' && err.trim()) return err.slice(0, 800)
  try {
    return JSON.stringify(err).slice(0, 800)
  } catch {
    return 'error desconocido al conectar con PostgreSQL'
  }
}

/**
 * Health check para infra y deploy.
 * Verifica conectividad a PostgreSQL.
 * Retorna 503 si falla alguna dependencia crítica.
 */
export async function GET() {
  const startedAt = Date.now()
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {}

  // 1. Database
  try {
    const dbStart = Date.now()
    await getDb().execute(sql`SELECT 1`)
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (err) {
    checks.database = {
      status: 'error',
      error: serializeDbError(err),
    }
  }

  // 2. Esquema mínimo para operar auth/publicar/leads.
  try {
    const schemaStart = Date.now()
    const schemaRows = await getDb().execute(sql`
      SELECT
        to_regclass('public.users')::text AS users,
        to_regclass('public.organizations')::text AS organizations,
        to_regclass('public.listings')::text AS listings,
        to_regclass('public.leads')::text AS leads
    `)
    const first = (schemaRows as unknown as Array<Record<string, unknown>>)[0] ?? {}
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
      error: serializeDbError(err),
    }
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok')
  const status = allOk ? 200 : 503
  const body = {
    status: allOk ? 'healthy' : 'degraded',
    checks,
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA
      ? { commit: process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7), ref: process.env.VERCEL_GIT_COMMIT_REF }
      : undefined,
  }

  return NextResponse.json(body, { status })
}
