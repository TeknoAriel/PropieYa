/**
 * Cron: avisos publicados (active / expiring_soon) sin actualización de contenido
 * por más de LISTING_STALE_CONTENT_DAYS → estado `expired` + notificación KiteProp (outbox).
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (igual que otros crons).
 */

import { NextResponse, type NextRequest } from 'next/server'

import { and, eq, inArray, isNotNull } from 'drizzle-orm'

import { db, listings, recordListingTransitionForKiteprop } from '@propieya/database'
import {
  getListingPublishConfigFromEnv,
  shouldExpireListingForStaleContent,
  staleContentExpiredMessageEs,
} from '@propieya/shared'

import { flushPendingListingLifecycleWebhooks } from '@/lib/integrations/kiteprop-listing-lifecycle-webhook'
import { removeListingFromSearch } from '@/lib/search/sync'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = getListingPublishConfigFromEnv()
  const now = new Date()
  let expired = 0

  try {
    const candidates = await db
      .select({
        id: listings.id,
        status: listings.status,
        externalId: listings.externalId,
        publishedAt: listings.publishedAt,
        lastContentUpdatedAt: listings.lastContentUpdatedAt,
        createdAt: listings.createdAt,
      })
      .from(listings)
      .where(
        and(
          inArray(listings.status, ['active', 'expiring_soon']),
          isNotNull(listings.publishedAt)
        )
      )

    for (const row of candidates) {
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

      const [updated] = await db
        .update(listings)
        .set({
          status: 'expired',
          publishedAt: null,
          expiresAt: null,
          lastValidatedAt: null,
          lastContentUpdatedAt: null,
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

      expired++
      await removeListingFromSearch(row.id).catch(() => {})

      const msg = staleContentExpiredMessageEs(config.staleContentDays)
      await recordListingTransitionForKiteprop({
        listingId: row.id,
        externalId: row.externalId,
        previousStatus: row.status,
        newStatus: 'expired',
        source: 'expiration_job',
        reasonCode: 'STALE_CONTENT_EXPIRED',
        reasonMessage: msg,
        details: {
          staleDaysConfigured: config.staleContentDays,
          publishedAt: row.publishedAt?.toISOString() ?? null,
          lastContentUpdatedAt: row.lastContentUpdatedAt?.toISOString() ?? null,
        },
      })
    }

    const flush = await flushPendingListingLifecycleWebhooks(db, 50)

    return NextResponse.json({
      expired,
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
