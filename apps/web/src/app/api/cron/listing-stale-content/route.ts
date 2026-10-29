/**
 * Cron: avisos publicados sin actualización de contenido ≥ LISTING_STALE_CONTENT_DAYS.
 *
 * Hasta 2026-12-27 (pausa de volumen, 60 días): no hace nada.
 * Después: no da de baja el aviso; notifica a Kiteprop para confirmar vigencia.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (igual que otros crons).
 */

import { NextResponse, type NextRequest } from 'next/server'

import { and, eq, inArray, isNotNull } from 'drizzle-orm'

import { db, listings, recordListingTransitionForKiteprop } from '@propieya/database'
import {
  getListingPublishConfigFromEnv,
  hasStaleValidityConfirmForFreshness,
  isStaleContentRulePaused,
  nextStaleValidityConfirmMarker,
  resolveListingContentFreshnessAt,
  resolveStaleContentPauseUntil,
  shouldExpireListingForStaleContent,
  staleContentConfirmRequestedMessageEs,
} from '@propieya/shared'

import { flushPendingListingLifecycleWebhooks } from '@/lib/integrations/kiteprop-listing-lifecycle-webhook'

export const runtime = 'nodejs'
export const maxDuration = 120

/** Tope diario de pings a Kiteprop cuando se levante la pausa (evita ráfaga). */
const MAX_CONFIRM_PER_RUN = 100

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = getListingPublishConfigFromEnv()
  const now = new Date()
  const pauseUntil = resolveStaleContentPauseUntil()

  if (isStaleContentRulePaused(now, pauseUntil)) {
    return NextResponse.json({
      skipped: 'volume_pause_60d',
      resumeAt: pauseUntil?.toISOString() ?? null,
      expired: 0,
      confirmRequested: 0,
    })
  }

  let confirmRequested = 0

  try {
    const candidates = await db
      .select({
        id: listings.id,
        status: listings.status,
        externalId: listings.externalId,
        publishedAt: listings.publishedAt,
        lastContentUpdatedAt: listings.lastContentUpdatedAt,
        createdAt: listings.createdAt,
        features: listings.features,
      })
      .from(listings)
      .where(
        and(
          inArray(listings.status, ['active', 'expiring_soon']),
          isNotNull(listings.publishedAt)
        )
      )

    for (const row of candidates) {
      if (confirmRequested >= MAX_CONFIRM_PER_RUN) break
      if (
        !shouldExpireListingForStaleContent(
          now,
          {
            status: row.status,
            publishedAt: row.publishedAt,
            lastContentUpdatedAt: row.lastContentUpdatedAt,
            createdAt: row.createdAt,
          },
          config
        )
      ) {
        continue
      }

      const freshness = resolveListingContentFreshnessAt({
        lastContentUpdatedAt: row.lastContentUpdatedAt,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
      })
      if (hasStaleValidityConfirmForFreshness(row.features, freshness)) {
        continue
      }

      const marker = nextStaleValidityConfirmMarker(
        now,
        freshness,
        config.staleContentDays
      )
      const prevFeatures =
        row.features && typeof row.features === 'object' && !Array.isArray(row.features)
          ? (row.features as Record<string, unknown>)
          : {}

      const [updated] = await db
        .update(listings)
        .set({
          features: {
            ...prevFeatures,
            staleValidityConfirm: marker,
          },
          updatedAt: now,
        })
        .where(
          and(
            eq(listings.id, row.id),
            inArray(listings.status, ['active', 'expiring_soon'])
          )
        )
        .returning({ id: listings.id })

      if (!updated) continue

      confirmRequested++
      const msg = staleContentConfirmRequestedMessageEs(config.staleContentDays)
      await recordListingTransitionForKiteprop({
        listingId: row.id,
        externalId: row.externalId,
        previousStatus: row.status,
        newStatus: row.status,
        source: 'expiration_job',
        reasonCode: 'STALE_CONTENT_CONFIRM_REQUESTED',
        reasonMessage: msg,
        details: {
          staleDaysConfigured: config.staleContentDays,
          publishedAt: row.publishedAt?.toISOString() ?? null,
          lastContentUpdatedAt: row.lastContentUpdatedAt?.toISOString() ?? null,
          keepPublished: true,
        },
      })
    }

    const flush = await flushPendingListingLifecycleWebhooks(db, 50)

    return NextResponse.json({
      expired: 0,
      confirmRequested,
      webhookFlush: flush,
    })
  } catch (err) {
    console.error('Cron listing-stale-content:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
