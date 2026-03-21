/**
 * Cron: importa propiedades desde feed JSON Yumblin.
 * Vercel Cron: vercel.json "crons"
 *
 * Requiere: CRON_SECRET en env (header Authorization: Bearer <secret>)
 */

import { NextResponse, type NextRequest } from 'next/server'

import { eq } from 'drizzle-orm'

import {
  db,
  listings,
  listingMedia,
  organizations,
  organizationMemberships,
} from '@propieya/database'
import {
  extractListingsFromFeed,
  mapYumblinItem,
} from '@propieya/shared'

const YUMBLIN_URL =
  process.env.YUMBLIN_JSON_URL ??
  'https://static.kiteprop.com/kp/difusions/23705a4a85ab8f1d301c73aae5359a81a8b5c1ca/yumblin.json'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(YUMBLIN_URL)
    if (!res.ok) {
      return NextResponse.json(
        { error: `Feed error: ${res.status}` },
        { status: 502 }
      )
    }
    const raw = await res.json()
    const items = extractListingsFromFeed(raw)

    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1)
    if (!org) {
      return NextResponse.json({ error: 'No organization' }, { status: 500 })
    }

    const [membership] = await db
      .select({ userId: organizationMemberships.userId })
      .from(organizationMemberships)
      .where(eq(organizationMemberships.organizationId, org.id))
      .limit(1)
    if (!membership) {
      return NextResponse.json({ error: 'No publisher' }, { status: 500 })
    }

    const input = {
      organizationId: org.id,
      publisherId: membership.userId,
    }

    let imported = 0
    for (const item of items) {
      const mapped = mapYumblinItem(item as Record<string, unknown>, input)
      if (!mapped) continue

      if (mapped.externalId) {
        const existing = await db.query.listings.findFirst({
          where: eq(listings.externalId, mapped.externalId),
        })
        if (existing) continue
      }

      const [inserted] = await db
        .insert(listings)
        .values({
          organizationId: mapped.organizationId,
          publisherId: mapped.publisherId,
          externalId: mapped.externalId,
          propertyType: mapped.propertyType,
          operationType: mapped.operationType,
          source: 'import',
          address: mapped.address,
          title: mapped.title,
          description: mapped.description,
          priceAmount: mapped.priceAmount,
          priceCurrency: mapped.priceCurrency,
          surfaceTotal: mapped.surfaceTotal,
          bedrooms: mapped.bedrooms,
          bathrooms: mapped.bathrooms,
          locationLat: mapped.locationLat,
          locationLng: mapped.locationLng,
          primaryImageUrl: mapped.primaryImageUrl,
          mediaCount: mapped.imageUrls.length,
          status: 'draft',
        })
        .returning({ id: listings.id })

      if (inserted && mapped.imageUrls.length > 0) {
        for (let i = 0; i < mapped.imageUrls.length; i++) {
          const url = mapped.imageUrls[i]
          if (!url) continue
          await db.insert(listingMedia).values({
            listingId: inserted.id,
            type: 'image',
            url,
            order: i,
            isPrimary: i === 0,
          })
        }
      }
      imported++
    }

    return NextResponse.json({ imported, total: items.length })
  } catch (err) {
    console.error('Cron import-yumblin:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
