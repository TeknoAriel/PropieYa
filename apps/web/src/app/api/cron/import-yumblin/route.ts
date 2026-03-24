/**
 * Cron: sincroniza propiedades desde feed JSON Yumblin (Kiteprop).
 * - HTTP condicional (ETag / 304) y hash del body para evitar trabajo si no hubo cambios.
 * - Altas, actualizaciones (hash por ítem) y bajas (withdrawn si ya no está en el feed).
 *
 * Vercel Cron: vercel.json "crons" — en producción cada hora; el intervalo mínimo entre
 * ejecuciones reales se controla con IMPORT_SYNC_INTERVAL_HOURS (p. ej. 240 ≈ 10 días en prueba).
 *
 * Requiere: CRON_SECRET (header Authorization: Bearer <secret>)
 */

import { NextResponse, type NextRequest } from 'next/server'

import { and, eq } from 'drizzle-orm'

import { db, listings, runYumblinImportSyncAllSources } from '@propieya/database'
import { LISTING_VALIDITY } from '@propieya/shared'

import { syncListingToSearch } from '@/lib/search/sync'

export const runtime = 'nodejs'
/** Sync masivo: Vercel Pro permite hasta 300s; ajustar según plan. */
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const enforceInterval =
    process.env.IMPORT_SYNC_ENFORCE_INTERVAL !== 'false'

  try {
    const { results } = await runYumblinImportSyncAllSources({ enforceInterval })
    const totals = results.reduce(
      (acc, r) => {
        acc.imported += r.counts.imported
        acc.updated += r.counts.updated
        acc.unchanged += r.counts.unchanged
        acc.skippedInvalid += r.counts.skippedInvalid
        acc.withdrawn += r.counts.withdrawn
        return acc
      },
      {
        imported: 0,
        updated: 0,
        unchanged: 0,
        skippedInvalid: 0,
        withdrawn: 0,
      }
    )

    // Publica los borradores generados por la importación (source=import).
    // Así, el cron deja de ser "solo sincronización" y pasa a "sincronización + actualización visible".
    const drafts = await db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.status, 'draft'), eq(listings.source, 'import')))

    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
    )

    let publishedIds: string[] = []
    if (drafts.length > 0) {
      const updated = await db
        .update(listings)
        .set({
          status: 'active',
          publishedAt: now,
          lastValidatedAt: now,
          expiresAt,
          updatedAt: now,
        })
        .where(and(eq(listings.status, 'draft'), eq(listings.source, 'import')))
        .returning({ id: listings.id })
      publishedIds = updated.map((r) => r.id)
      await Promise.allSettled(
        publishedIds.map((id) =>
          syncListingToSearch(db, id).catch((e) => {
            console.error('syncListingToSearch failed for', id, e)
          })
        )
      )
    }

    return NextResponse.json({
      totals,
      resultsCount: results.length,
      publishedCount: publishedIds.length,
    })
  } catch (err) {
    console.error('Cron import-yumblin:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
