/**
 * Indexación de listings en Elasticsearch.
 */

import type { ListingRow } from './types'
import { getEsClient, getListingsIndex } from './client'
import { listingsMapping } from './mapping'

const INDEX = getListingsIndex()

export function listingToEsDoc(row: ListingRow): Record<string, unknown> {
  const addr = (row.address as Record<string, unknown>) ?? {}
  const doc: Record<string, unknown> = {
    id: row.id,
    organizationId: row.organizationId,
    publisherId: row.publisherId,
    propertyType: row.propertyType,
    operationType: row.operationType,
    status: row.status,
    title: row.title,
    description: row.description ?? '',
    address: addr,
    priceAmount: row.priceAmount,
    priceCurrency: row.priceCurrency,
    surfaceTotal: row.surfaceTotal,
    surfaceCovered: row.surfaceCovered ?? null,
    surfaceSemicovered: row.surfaceSemicovered ?? null,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    garages: row.garages ?? null,
    totalRooms: row.totalRooms ?? null,
    floor: row.floor ?? null,
    totalFloors: row.totalFloors ?? null,
    escalera: row.escalera ?? null,
    orientation: row.orientation ?? null,
    primaryImageUrl: row.primaryImageUrl ?? null,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    amenities: row.amenities ?? [],
    ...(row.feedAmenityRaw && row.feedAmenityRaw.length > 0
      ? { feedAmenityRaw: row.feedAmenityRaw }
      : {}),
    ...(row.dedupCanonicalId
      ? { dedupCanonicalId: row.dedupCanonicalId }
      : {}),
  }
  if (
    row.locationLat != null &&
    row.locationLng != null &&
    !Number.isNaN(row.locationLat) &&
    !Number.isNaN(row.locationLng)
  ) {
    doc.location = { lat: row.locationLat, lon: row.locationLng }
  }
  return doc
}

export async function ensureIndex(): Promise<boolean> {
  const client = getEsClient()
  if (!client) return false
  try {
    const exists = await client.indices.exists({ index: INDEX })
    if (!exists) {
      await client.indices.create({
        index: INDEX,
        body: { mappings: { properties: listingsMapping } },
      })
    }
    return true
  } catch {
    return false
  }
}

export async function indexListing(row: ListingRow): Promise<boolean> {
  const client = getEsClient()
  if (!client) return false
  try {
    await client.index({
      index: INDEX,
      id: row.id,
      document: listingToEsDoc(row),
      refresh: false,
    })
    return true
  } catch {
    return false
  }
}

export async function deleteListing(id: string): Promise<boolean> {
  const client = getEsClient()
  if (!client) return false
  try {
    await client.delete({ index: INDEX, id, refresh: false })
    return true
  } catch (err: unknown) {
    const e = err as { meta?: { statusCode?: number } }
    if (e.meta?.statusCode === 404) return true
    return false
  }
}

export async function bulkIndexListings(
  rows: ListingRow[]
): Promise<{ indexed: number; errors: number }> {
  const client = getEsClient()
  if (!client || rows.length === 0) return { indexed: 0, errors: rows.length }
  try {
    const operations = rows.flatMap((row) => [
      { index: { _index: INDEX, _id: row.id } },
      listingToEsDoc(row),
    ])
    const result = await client.bulk({
      refresh: false,
      operations,
    })
    const errors = result.items.filter((i) => i.index?.error != null).length
    return { indexed: rows.length - errors, errors }
  } catch {
    return { indexed: 0, errors: rows.length }
  }
}
