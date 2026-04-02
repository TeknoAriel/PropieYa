/**
 * Helpers para sincronizar listings con Elasticsearch desde el router.
 */

import { eq } from 'drizzle-orm'

import { listings, listingsSelectPublic, type Database } from '@propieya/database'
import { indexListing, deleteListing } from './indexer'
import type { ListingRow } from './types'

export async function syncListingToSearch(
  db: Database,
  listingId: string
): Promise<void> {
  const [row] = await db
    .select(listingsSelectPublic)
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1)
  if (!row || row.status !== 'active') return
  const features = (row.features ?? {}) as {
    amenities?: string[]
    feedAmenityRaw?: string[]
    floor?: number | null
    totalFloors?: number | null
    escalera?: string | null
    orientation?: string | null
  }
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
    surfaceCovered: row.surfaceCovered ?? null,
    surfaceSemicovered: row.surfaceSemicovered ?? null,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    garages: row.garages ?? null,
    totalRooms: row.totalRooms ?? null,
    floor: features.floor ?? null,
    totalFloors: features.totalFloors ?? null,
    escalera: features.escalera ?? null,
    orientation: features.orientation ?? null,
    primaryImageUrl: row.primaryImageUrl,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    amenities: features.amenities ?? [],
    feedAmenityRaw: features.feedAmenityRaw ?? [],
  }
  await indexListing(doc)
}

export async function removeListingFromSearch(listingId: string): Promise<void> {
  await deleteListing(listingId)
}
