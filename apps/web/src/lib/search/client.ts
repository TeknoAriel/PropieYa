/**
 * Cliente Elasticsearch para búsqueda de listings.
 * Si ELASTICSEARCH_URL no está configurado, las funciones fallan silenciosamente.
 */

import { Client } from '@elastic/elasticsearch'

const url = process.env.ELASTICSEARCH_URL
const prefix = process.env.ELASTICSEARCH_INDEX_PREFIX ?? 'propieya'

let _client: Client | null = null

export function getEsClient(): Client | null {
  if (!url?.trim()) return null
  if (!_client) {
    _client = new Client({ node: url })
  }
  return _client
}

export function getListingsIndex(): string {
  return `${prefix}-listings`
}

export function isEsConfigured(): boolean {
  return Boolean(url?.trim())
}
