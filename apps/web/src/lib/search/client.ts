/**
 * Configuración del índice de búsqueda (Elasticsearch u OpenSearch/Bonsai).
 * Ver `listing-search-engine.ts` y `USE_OPENSEARCH` / detección `*.bonsai.io`.
 */

const prefix = process.env.ELASTICSEARCH_INDEX_PREFIX ?? 'propieya'

export { getListingSearchEngine, isOpenSearchBackend } from './listing-search-engine'

export function getListingsIndex(): string {
  return `${prefix}-listings`
}

export function isEsConfigured(): boolean {
  return Boolean(process.env.ELASTICSEARCH_URL?.trim())
}
