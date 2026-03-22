/**
 * Helpers para sincronizar listings con Elasticsearch desde el router.
 */

import { eq } from 'drizzle-orm'

import { listings, type Database } from '@propieya/database'
import { indexListing, deleteListing } from './indexer'
import type { ListingRow } from './types'

export async function syncListingToSearch(
  db: Database,
  listingId: string
): Promise<void> {
  const row = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  })
  if (!row || row.status !== 'active') return
  const doc: ListingRow = {
    id: row.id,
    organizationId: row.organizationId,
    publisherId: row.publisherId,
    propertyType: row.propertyType,
    operationType: row.operationType,
    status: row.status,
    title: row.title,
    description: row.description,
    address: row.address,
    locationLat: row.locationLat,
    locationLng: row.locationLng,
    priceAmount: row.priceAmount ?? 0,
    priceCurrency: row.priceCurrency ?? 'USD',
    surfaceTotal: row.surfaceTotal ?? 0,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    primaryImageUrl: row.primaryImageUrl,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
  }
  await indexListing(doc)
}

export async function removeListingFromSearch(listingId: string): Promise<void> {
  await deleteListing(listingId)
}
