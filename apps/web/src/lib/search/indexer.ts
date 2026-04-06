/**
 * Indexación de listings en Elasticsearch u OpenSearch (Bonsai).
 */

import type { ListingRow } from './types'
import { getListingSearchEngine, getListingsIndex } from './client'
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
  const engine = getListingSearchEngine()
  if (!engine) return false
  return engine.ensureIndex(INDEX, listingsMapping)
}

export async function indexListing(row: ListingRow): Promise<boolean> {
  const engine = getListingSearchEngine()
  if (!engine) return false
  return engine.indexDocument(INDEX, row.id, listingToEsDoc(row))
}

export async function deleteListing(id: string): Promise<boolean> {
  const engine = getListingSearchEngine()
  if (!engine) return false
  return engine.deleteDocument(INDEX, id)
}

export async function bulkIndexListings(
  rows: ListingRow[]
): Promise<{ indexed: number; errors: number }> {
  const engine = getListingSearchEngine()
  if (!engine) return { indexed: 0, errors: rows.length }
  if (rows.length === 0) return { indexed: 0, errors: 0 }
  return engine.bulkIndex(
    INDEX,
    rows.map((row) => ({ id: row.id, doc: listingToEsDoc(row) }))
  )
}
