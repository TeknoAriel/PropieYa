/**
 * Cron: revisa vigencia de avisos (active → expiring_soon → suspended).
 * Vercel Cron: vercel.json "crons"
 *
 * Requiere: CRON_SECRET en env (header Authorization: Bearer <secret>)
 */

import { NextResponse, type NextRequest } from 'next/server'

import { and, eq, gt, inArray, lt, lte } from 'drizzle-orm'

import { db, listings, users } from '@propieya/database'
import {
  LISTING_VALIDITY,
  type ListingStatus,
} from '@propieya/shared'

import { sendExpiringSoonEmail } from '@/lib/email'
import { removeListingFromSearch } from '@/lib/search/sync'

export const runtime = 'nodejs'
export const maxDuration = 60

const EXPIRING_SOON_MS =
  LISTING_VALIDITY.EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const expiringSoonThreshold = new Date(now.getTime() + EXPIRING_SOON_MS)

    // 1. Suspender: expiring_soon o active con expiresAt < now
    const toSuspend = await db
      .select({ id: listings.id })
      .from(listings)
      .where(
        and(
          inArray(listings.status, ['active', 'expiring_soon']),
          lt(listings.expiresAt, now)
        )
      )

    let suspended = 0
    for (const row of toSuspend) {
      const [updated] = await db
        .update(listings)
        .set({
          status: 'suspended' as ListingStatus,
          updatedAt: now,
        })
        .where(eq(listings.id, row.id))
        .returning({ id: listings.id })
      if (updated) {
        suspended++
        await removeListingFromSearch(row.id)
      }
    }

    // 2. Marcar expiring_soon: active con expiresAt dentro de X días
    const panelUrl =
      process.env.NEXT_PUBLIC_PANEL_URL ?? 'http://localhost:3011'

    const toExpiringSoon = await db
      .select({
        id: listings.id,
        title: listings.title,
        publisherEmail: users.email,
      })
      .from(listings)
      .innerJoin(users, eq(listings.publisherId, users.id))
      .where(
        and(
          eq(listings.status, 'active'),
          lte(listings.expiresAt, expiringSoonThreshold),
          gt(listings.expiresAt, now)
        )
      )

    let expiringSoon = 0
    for (const row of toExpiringSoon) {
      const [updated] = await db
        .update(listings)
        .set({
          status: 'expiring_soon' as ListingStatus,
          updatedAt: now,
        })
        .where(eq(listings.id, row.id))
        .returning({ id: listings.id })
      if (updated) {
        expiringSoon++
        if (row.publisherEmail) {
          const renewUrl = `${panelUrl}/propiedades/${row.id}`
          await sendExpiringSoonEmail({
            to: row.publisherEmail,
            listingTitle: row.title,
            renewUrl,
          })
        }
      }
    }

    return NextResponse.json({
      suspended,
      expiringSoon,
    })
  } catch (err) {
    console.error('Cron check-validity:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
