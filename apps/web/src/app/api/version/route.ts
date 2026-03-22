import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Información del deploy actual.
 * Vercel inyecta VERCEL_GIT_COMMIT_SHA y VERCEL_GIT_COMMIT_REF.
 * Sirve para verificar qué commit está desplegado.
 */
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VITE_GIT_COMMIT_SHA ?? null
  const ref = process.env.VERCEL_GIT_COMMIT_REF ?? null

  return NextResponse.json({
    commit: sha ? sha.slice(0, 7) : null,
    commitFull: sha,
    branch: ref,
    deployedAt: process.env.VERCEL ? 'vercel' : 'local',
  })
}
