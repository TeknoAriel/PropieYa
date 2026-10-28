/**
 * Reindexa avisos `active` a Elasticsearch / OpenSearch.
 * Lo usan el cron `sync-search` y la reactivación de catálogo import.
 */
import { eq } from 'drizzle-orm'

import { db, listings } from '@propieya/database'

import { bulkIndexListings, ensureIndex, type ListingRow } from '@/lib/search'

export async function reindexActiveListings(): Promise<{
  ok: boolean
  total: number
  indexed: number
  errors: number
}> {
  const ready = await ensureIndex()
  if (!ready) {
    return { ok: false, total: 0, indexed: 0, errors: 0 }
  }

  const rows = await db.select().from(listings).where(eq(listings.status, 'active'))
  const docs: ListingRow[] = rows.map((r) => {
    const features = (r.features ?? {}) as {
      amenities?: string[]
      floor?: number | null
      totalFloors?: number | null
      escalera?: string | null
      orientation?: string | null
    }
    return {
      id: r.id,
      organizationId: r.organizationId,
      publisherId: r.publisherId,
      propertyType: r.propertyType,
      operationType: r.operationType,
      status: r.status,
      title: r.title,
      description: r.description,
      address: r.address,
      locationLat: r.locationLat,
      locationLng: r.locationLng,
      priceAmount: r.priceAmount ?? 0,
      priceCurrency: r.priceCurrency ?? 'USD',
      surfaceTotal: r.surfaceTotal ?? 0,
      surfaceCovered: r.surfaceCovered ?? null,
      surfaceSemicovered: r.surfaceSemicovered ?? null,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      garages: r.garages ?? null,
      totalRooms: r.totalRooms ?? null,
      floor: features.floor ?? null,
      totalFloors: features.totalFloors ?? null,
      escalera: features.escalera ?? null,
      orientation: features.orientation ?? null,
      primaryImageUrl: r.primaryImageUrl,
      publishedAt: r.publishedAt,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
      amenities: features.amenities ?? [],
    }
  })

  const { indexed, errors } = await bulkIndexListings(docs)
  return { ok: true, total: docs.length, indexed, errors }
}
