import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Información del deploy actual.
 * - Deploy por **Git** en Vercel: `VERCEL_GIT_COMMIT_SHA` / `VERCEL_GIT_COMMIT_REF`.
 * - Deploy por **CLI** (workflow Promote): el workflow pasa `BUILD_COMMIT_SHA` y `BUILD_GIT_REF`
 *   porque el CLI no siempre rellena las variables de Git del sistema.
 */
export async function GET() {
  const sha =
    process.env.BUILD_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VITE_GIT_COMMIT_SHA ??
    null
  const ref =
    process.env.BUILD_GIT_REF ??
    process.env.VERCEL_GIT_COMMIT_REF ??
    null

  return NextResponse.json({
    commit: sha ? sha.slice(0, 7) : null,
    commitFull: sha,
    branch: ref,
    deployedAt: process.env.VERCEL ? 'vercel' : 'local',
  })
}
