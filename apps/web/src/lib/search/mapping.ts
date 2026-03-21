/**
 * Mapping del índice de listings en Elasticsearch.
 */

import type { MappingProperty } from '@elastic/elasticsearch/api/types'

export const listingsMapping: Record<string, MappingProperty> = {
  id: { type: 'keyword' },
  organizationId: { type: 'keyword' },
  publisherId: { type: 'keyword' },
  propertyType: { type: 'keyword' },
  operationType: { type: 'keyword' },
  status: { type: 'keyword' },
  title: {
    type: 'text',
    analyzer: 'standard',
    fields: { keyword: { type: 'keyword' } },
  },
  description: {
    type: 'text',
    analyzer: 'standard',
    index: true,
  },
  address: {
    type: 'object',
    properties: {
      city: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
      neighborhood: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
      street: { type: 'keyword' },
      state: { type: 'keyword' },
      country: { type: 'keyword' },
    },
  },
  location: {
    type: 'geo_point',
  },
  priceAmount: { type: 'float' },
  priceCurrency: { type: 'keyword' },
  surfaceTotal: { type: 'float' },
  bedrooms: { type: 'integer' },
  bathrooms: { type: 'integer' },
  primaryImageUrl: { type: 'keyword', index: false },
  publishedAt: { type: 'date' },
  createdAt: { type: 'date' },
}
