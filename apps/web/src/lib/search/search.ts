/**
 * Búsqueda de listings en Elasticsearch.
 */

import type { SearchFilters } from './types'
import { getEsClient } from './client'
import { getSearchParams } from './query'
import { encodeListingSearchCursor } from './search-cursor'

export interface SearchHit {
  id: string
  title: string
  description: string
  propertyType: string
  operationType: string
  priceAmount: number
  priceCurrency: string
  address: Record<string, unknown>
  surfaceTotal: number
  bedrooms: number | null
  bathrooms: number | null
  garages?: number | null
  totalRooms?: number | null
  surfaceCovered?: number | null
  floor?: number | null
  escalera?: string | null
  orientation?: string | null
  amenities?: string[]
  /** geo_point en índice ES */
  location?: { lat: number; lon: number }
  primaryImageUrl: string | null
  publishedAt: string | null
  updatedAt?: string | null
}

export interface SearchResult {
  hits: SearchHit[]
  total: number
  /** false si ES no está configurado o falló */
  fromEs: boolean
  /** Siguiente página (solo ES); null si última página o índice incompleto. */
  nextCursor: string | null
}

export async function searchListings(
  filters: SearchFilters
): Promise<SearchResult> {
  const client = getEsClient()
  if (!client) {
    return { hits: [], total: 0, fromEs: false, nextCursor: null }
  }
  try {
    const params = getSearchParams(filters)
    const result = await client.search(params)
    const rawHits = result.hits.hits ?? []
    const hits = rawHits
      .map((h) => h._source as SearchHit | undefined)
      .filter((s): s is SearchHit => s != null)
    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : (result.hits.total as { value: number })?.value ?? 0
    const size = Math.min(filters.limit ?? 24, 50)
    let nextCursor: string | null = null
    const lastRaw = rawHits[rawHits.length - 1]
    if (
      rawHits.length > 0 &&
      rawHits.length === size &&
      lastRaw?.sort &&
      Array.isArray(lastRaw.sort)
    ) {
      try {
        nextCursor = encodeListingSearchCursor(lastRaw.sort as unknown[])
      } catch {
        nextCursor = null
      }
    }
    return { hits, total, fromEs: true, nextCursor }
  } catch (err) {
    console.error('[searchListings] Elasticsearch error:', err)
    return { hits: [], total: 0, fromEs: false, nextCursor: null }
  }
}
