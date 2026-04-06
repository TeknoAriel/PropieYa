/**
 * Elasticsearch 8 u OpenSearch (Bonsai): mismo URL (`ELASTICSEARCH_URL`) y mapping.
 * `@elastic/elasticsearch` rechaza OpenSearch en el handshake; OpenSearch usa otro cliente.
 */

import { Client as EsClient } from '@elastic/elasticsearch'
import { Client as OsClient } from '@opensearch-project/opensearch'

export type ListingSearchResponse = {
  hits: {
    hits: Array<{ _source?: unknown; sort?: unknown[] }>
    total: number | { value: number }
  }
}

export type ListingSearchEngine = {
  search(params: {
    index: string
    body: Record<string, unknown>
  }): Promise<ListingSearchResponse>
  ensureIndex(index: string, properties: Record<string, unknown>): Promise<boolean>
  indexDocument(
    index: string,
    id: string,
    document: Record<string, unknown>
  ): Promise<boolean>
  deleteDocument(index: string, id: string): Promise<boolean>
  bulkIndex(
    index: string,
    rows: Array<{ id: string; doc: Record<string, unknown> }>
  ): Promise<{ indexed: number; errors: number }>
}

function getNodeUrl(): string | null {
  const u = process.env.ELASTICSEARCH_URL?.trim()
  return u && u.length > 0 ? u : null
}

/**
 * OpenSearch/Bonsai si `USE_OPENSEARCH` / `SEARCH_BACKEND` lo indican o la URL es Bonsai (`*.bonsai.io`, `*.bonsaisearch.net`).
 * Forzar Elasticsearch: `SEARCH_BACKEND=elasticsearch`.
 */
export function isOpenSearchBackend(): boolean {
  const flag = (
    process.env.USE_OPENSEARCH ??
    process.env.SEARCH_BACKEND ??
    ''
  ).toLowerCase()
  if (flag === 'elasticsearch' || flag === 'es' || flag === 'elastic') {
    return false
  }
  if (
    flag === '1' ||
    flag === 'true' ||
    flag === 'yes' ||
    flag === 'opensearch'
  ) {
    return true
  }
  const url = getNodeUrl() ?? ''
  return (
    /\.bonsai\.io\b/i.test(url) || /\.bonsaisearch\.net\b/i.test(url)
  )
}

function coerceIndexExists(result: unknown): boolean {
  if (typeof result === 'boolean') return result
  if (
    result &&
    typeof result === 'object' &&
    'body' in result &&
    typeof (result as { body: unknown }).body === 'boolean'
  ) {
    return (result as { body: boolean }).body
  }
  return Boolean(result)
}

function createElasticsearchEngine(url: string): ListingSearchEngine {
  const client = new EsClient({ node: url })
  return {
    async search(params) {
      const r = await client.search({
        index: params.index,
        body: params.body,
      })
      return {
        hits: {
          hits: (r.hits?.hits ?? []) as Array<{
            _source?: unknown
            sort?: unknown[]
          }>,
          total: r.hits?.total as number | { value: number },
        },
      }
    },

    async ensureIndex(index, properties) {
      try {
        const exists = await client.indices.exists({ index })
        if (!coerceIndexExists(exists)) {
          await client.indices.create({
            index,
            mappings: { properties: properties as never },
          })
        }
        return true
      } catch {
        return false
      }
    },

    async indexDocument(index, id, document) {
      try {
        await client.index({
          index,
          id,
          document,
          refresh: false,
        })
        return true
      } catch {
        return false
      }
    },

    async deleteDocument(index, id) {
      try {
        await client.delete({ index, id, refresh: false })
        return true
      } catch (err: unknown) {
        const e = err as { meta?: { statusCode?: number } }
        if (e.meta?.statusCode === 404) return true
        return false
      }
    },

    async bulkIndex(index, rows) {
      if (rows.length === 0) return { indexed: 0, errors: 0 }
      try {
        const operations = rows.flatMap((row) => [
          { index: { _index: index, _id: row.id } },
          row.doc,
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
    },
  }
}

function createOpenSearchEngine(url: string): ListingSearchEngine {
  const client = new OsClient({ node: url })
  return {
    async search(params) {
      const r = await client.search({
        index: params.index,
        body: params.body,
      })
      const body = r.body as {
        hits?: {
          hits?: Array<{ _source?: unknown; sort?: unknown[] }>
          total?: number | { value: number }
        }
      }
      return {
        hits: {
          hits: body.hits?.hits ?? [],
          total: body.hits?.total ?? 0,
        },
      }
    },

    async ensureIndex(index, properties) {
      try {
        const ex = await client.indices.exists({ index })
        if (!coerceIndexExists(ex)) {
          await client.indices.create({
            index,
            body: { mappings: { properties } },
          })
        }
        return true
      } catch {
        return false
      }
    },

    async indexDocument(index, id, document) {
      try {
        await client.index({
          index,
          id,
          body: document,
          refresh: false,
        })
        return true
      } catch {
        return false
      }
    },

    async deleteDocument(index, id) {
      try {
        await client.delete({ index, id, refresh: false })
        return true
      } catch (err: unknown) {
        const e = err as { meta?: { statusCode?: number }; statusCode?: number }
        const code = e.meta?.statusCode ?? e.statusCode
        if (code === 404) return true
        return false
      }
    },

    async bulkIndex(index, rows) {
      if (rows.length === 0) return { indexed: 0, errors: 0 }
      try {
        const body: object[] = []
        for (const row of rows) {
          body.push({ index: { _index: index, _id: row.id } })
          body.push(row.doc)
        }
        const r = await client.bulk({
          body: body as never,
          refresh: false,
        })
        const resBody = r.body as {
          items?: Array<{ index?: { error?: unknown } }>
        }
        const items = resBody.items ?? []
        const errors = items.filter((i) => i.index?.error != null).length
        return { indexed: rows.length - errors, errors }
      } catch {
        return { indexed: 0, errors: rows.length }
      }
    },
  }
}

let _engine: ListingSearchEngine | null | undefined

export function getListingSearchEngine(): ListingSearchEngine | null {
  if (_engine !== undefined) return _engine
  const url = getNodeUrl()
  if (!url) {
    _engine = null
    return null
  }
  _engine = isOpenSearchBackend()
    ? createOpenSearchEngine(url)
    : createElasticsearchEngine(url)
  return _engine
}

/** Solo tests: invalidar singleton tras cambiar `process.env`. */
export function resetListingSearchEngineCache(): void {
  _engine = undefined
}
