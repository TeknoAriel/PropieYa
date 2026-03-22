/**
 * Query builder para búsqueda de listings.
 */

import type { SearchFilters } from './types'
import { getListingsIndex } from './client'

const INDEX = getListingsIndex()

function sanitize(q: string): string {
  return q.trim().slice(0, 200).replace(/[<>*?":|\\[\]{}()&]/g, ' ')
}

export function buildSearchBody(filters: SearchFilters): Record<string, unknown> {
  const must: Record<string, unknown>[] = [{ term: { status: 'active' } }]

  if (filters.q?.trim()) {
    const q = sanitize(filters.q)
    if (q.length > 0) {
      must.push({
        multi_match: {
          query: q,
          fields: ['title^2', 'description', 'address.city', 'address.neighborhood'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      })
    }
  }

  if (filters.operationType) {
    must.push({ term: { operationType: filters.operationType } })
  }
  if (filters.propertyType) {
    must.push({ term: { propertyType: filters.propertyType } })
  }
  if (filters.minPrice !== undefined) {
    must.push({ range: { priceAmount: { gte: filters.minPrice } } })
  }
  if (filters.maxPrice !== undefined) {
    must.push({ range: { priceAmount: { lte: filters.maxPrice } } })
  }
  if (filters.minBedrooms !== undefined) {
    must.push({ range: { bedrooms: { gte: filters.minBedrooms } } })
  }
  if (filters.city?.trim()) {
    const c = sanitize(filters.city)
    if (c.length > 0) {
      must.push({
        match: { 'address.city': { query: c, operator: 'or' } },
      })
    }
  }
  if (filters.neighborhood?.trim()) {
    const n = sanitize(filters.neighborhood)
    if (n.length > 0) {
      must.push({
        match: { 'address.neighborhood': { query: n, operator: 'or' } },
      })
    }
  }

  const size = Math.min(filters.limit ?? 24, 50)
  const from = Math.min(filters.offset ?? 0, 500)

  return {
    query: { bool: { must } },
    sort: [{ publishedAt: { order: 'desc', unmapped_type: 'date' } }],
    size,
    from,
    _source: [
      'id',
      'title',
      'description',
      'propertyType',
      'operationType',
      'priceAmount',
      'priceCurrency',
      'address',
      'surfaceTotal',
      'bedrooms',
      'bathrooms',
      'primaryImageUrl',
      'publishedAt',
    ],
  }
}

export function getSearchParams(filters: SearchFilters) {
  return {
    index: INDEX,
    body: buildSearchBody(filters),
  }
}
