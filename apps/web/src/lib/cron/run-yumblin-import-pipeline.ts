/**
 * Pipeline compartido: ingest JSON Kiteprop/Properstar + bajas en ES + publicación de borradores de import.
 * Lo usan GET /api/cron/import-yumblin y POST /api/webhooks/kiteprop-ingest.
 */

import { and, eq } from 'drizzle-orm'

import { db, listings, runYumblinImportSyncAllSources } from '@propieya/database'
import { LISTING_VALIDITY } from '@propieya/shared'

import { removeListingFromSearch, syncListingToSearch } from '@/lib/search/sync'

export interface YumblinImportPipelineResult {
  totals: {
    imported: number
    updated: number
    unchanged: number
    skippedInvalid: number
    skippedUnchangedBySourceTime: number
    withdrawn: number
  }
  resultsCount: number
  publishedCount: number
}

export async function runYumblinImportPipeline(options: {
  enforceInterval: boolean
}): Promise<YumblinImportPipelineResult> {
  const { results } = await runYumblinImportSyncAllSources({
    enforceInterval: options.enforceInterval,
  })

  const totals = results.reduce(
    (acc, r) => {
      acc.imported += r.counts.imported
      acc.updated += r.counts.updated
      acc.unchanged += r.counts.unchanged
      acc.skippedInvalid += r.counts.skippedInvalid
      acc.skippedUnchangedBySourceTime += r.counts.skippedUnchangedBySourceTime
      acc.withdrawn += r.counts.withdrawn
      return acc
    },
    {
      imported: 0,
      updated: 0,
      unchanged: 0,
      skippedInvalid: 0,
      skippedUnchangedBySourceTime: 0,
      withdrawn: 0,
    }
  )

  const withdrawnIds = results.flatMap((r) => r.withdrawnListingIds)
  if (withdrawnIds.length > 0) {
    await Promise.allSettled(
      withdrawnIds.map((id) =>
        removeListingFromSearch(id).catch((e) => {
          console.error('removeListingFromSearch failed for', id, e)
        })
      )
    )
  }

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

  return {
    totals,
    resultsCount: results.length,
    publishedCount: publishedIds.length,
  }
}
