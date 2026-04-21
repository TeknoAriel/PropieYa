/**
 * Pipeline compartido: ingest JSON Kiteprop/Properstar + bajas en ES + flush de notificaciones
 * de ciclo de vida (outbox → webhook KiteProp).
 * Lo usan GET /api/cron/import-yumblin y POST /api/webhooks/kiteprop-ingest.
 */

import { db, runYumblinImportSyncAllSources } from '@propieya/database'
import { PORTAL_STATS_TERMINALS } from '@propieya/shared'

import { recordPortalStatsEvent } from '@/lib/analytics/record-portal-stats-event'
import { flushPendingListingLifecycleWebhooks } from '@/lib/integrations/kiteprop-listing-lifecycle-webhook'
import { removeListingFromSearch } from '@/lib/search/sync'

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
  /** Siempre false: la publicación masiva de drafts en pipeline quedó deprecada (validación en ingesta). */
  searchIndexDeferred: false
  /** Eventos de webhook procesados tras la ingesta (sent / skipped / errors). */
  lifecycleWebhookFlush?: { processed: number; sent: number; skipped: number; errors: number }
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
  const deactivatedIds = results.flatMap((r) => r.deactivatedListingIds)
  const searchRemovalIds = [...new Set([...withdrawnIds, ...deactivatedIds])]
  if (searchRemovalIds.length > 0) {
    await Promise.allSettled(
      searchRemovalIds.map((id) =>
        removeListingFromSearch(id).catch((e) => {
          console.error('removeListingFromSearch failed for', id, e)
        })
      )
    )
  }

  const lifecycleWebhookFlush = await flushPendingListingLifecycleWebhooks(db, 50)

  recordPortalStatsEvent(db, {
    terminalId: PORTAL_STATS_TERMINALS.INGEST_RUN_COMPLETED,
    userId: null,
    payload: {
      imported: totals.imported,
      updated: totals.updated,
      unchanged: totals.unchanged,
      withdrawn: totals.withdrawn,
      skippedInvalid: totals.skippedInvalid,
      skippedUnchangedBySourceTime: totals.skippedUnchangedBySourceTime,
      /** Histórico: antes se publicaban borradores import en bloque; la publicación pasa por validación en ingesta. */
      publishedCount: 0,
      searchIndexDeferred: false,
      lifecycleWebhookFlush,
      feedSources: results.length,
    },
  })

  return {
    totals,
    resultsCount: results.length,
    searchIndexDeferred: false,
    lifecycleWebhookFlush,
  }
}
