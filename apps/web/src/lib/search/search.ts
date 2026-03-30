/**
 * Búsqueda de listings en Elasticsearch.
 */

import type { SearchFilters } from './types'
import { getEsClient } from './client'
import { getSearchParams } from './query'

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
}

export async function searchListings(
  filters: SearchFilters
): Promise<SearchResult> {
  const client = getEsClient()
  if (!client) {
    return { hits: [], total: 0, fromEs: false }
  }
  try {
    const params = getSearchParams(filters)
    const result = await client.search(params)
    const hits = (result.hits.hits ?? [])
      .map((h) => h._source as SearchHit | undefined)
      .filter((s): s is SearchHit => s != null)
    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : (result.hits.total as { value: number })?.value ?? 0
    return { hits, total, fromEs: true }
  } catch (err) {
    console.error('[searchListings] Elasticsearch error:', err)
    return { hits: [], total: 0, fromEs: false }
  }
}
