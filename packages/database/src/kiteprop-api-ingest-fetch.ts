import type { YumblinFeedFetchResult } from '@propieya/shared'
import { sha256HexFromString } from '@propieya/shared'

export type KitepropIngestMode = 'auto' | 'json' | 'api' | 'both'

export function resolveKitepropIngestMode(): KitepropIngestMode {
  const v = (process.env.KITEPROP_INGEST_MODE ?? 'auto').trim().toLowerCase()
  if (v === 'json' || v === 'feed' || v === 'static') return 'json'
  if (v === 'api' || v === 'rest') return 'api'
  if (v === 'both') return 'both'
  return 'auto'
}

export function getKitepropApiKeyForIngest(): string | null {
  const k =
    process.env.KITEPROP_API_KEY?.trim() || process.env.KITEPROP_API_TOKEN?.trim() || ''
  return k.length > 0 ? k : null
}

/** URL estable para `import_feed_sources` y comparación de modo API. */
export function buildKitepropPropertiesListUrl(): string {
  const base = (process.env.KITEPROP_API_BASE_URL?.trim() || 'https://www.kiteprop.com/api/v1').replace(
    /\/$/,
    ''
  )
  const pathSeg = (process.env.KITEPROP_PATH_PROPERTIES?.trim() || 'properties').replace(/^\//, '')
  const u = new URL(`${base}/${pathSeg}`)
  const extra = (process.env.KITEPROP_INGEST_PROPERTIES_QUERY ?? '').trim()
  if (extra) {
    const q = extra.startsWith('?') ? extra.slice(1) : extra
    const params = new URLSearchParams(q)
    params.forEach((val, key) => {
      u.searchParams.set(key, val)
    })
  }
  return u.toString()
}

/**
 * True si la URL apunta al listado REST de propiedades en kiteprop.com (misma forma que el cliente web).
 */
export function isKitepropPropertiesApiListUrl(feedUrl: string): boolean {
  try {
    const u = new URL(feedUrl)
    if (!/(^|\.)kiteprop\.com$/i.test(u.hostname)) return false
    const pathSeg = (process.env.KITEPROP_PATH_PROPERTIES?.trim() || 'properties')
      .replace(/^\//, '')
      .split('/')
      .filter(Boolean)
    if (pathSeg.length === 0) return false
    const parts = u.pathname.split('/').filter(Boolean)
    const last = parts[parts.length - 1]
    const wantLast = pathSeg[pathSeg.length - 1]
    if (!last || last !== wantLast) return false
    return true
  } catch {
    return false
  }
}

function extractItemsFromPropertiesPage(json: unknown): unknown[] {
  if (Array.isArray(json)) return json
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>
    const arr =
      o.data ?? o.properties ?? o.propiedades ?? o.items ?? o.avisos ?? o.listings ?? o.results
    return Array.isArray(arr) ? arr : []
  }
  return []
}

function readPaginationLastPage(json: unknown): number | null {
  if (!json || typeof json !== 'object') return null
  const o = json as Record<string, unknown>
  const meta = o.meta
  if (meta && typeof meta === 'object') {
    const m = meta as Record<string, unknown>
    const last = m.last_page ?? m.lastPage ?? m.total_pages ?? m.totalPages
    if (typeof last === 'number' && Number.isFinite(last) && last > 0) return Math.floor(last)
    if (last != null) {
      const n = parseInt(String(last), 10)
      return Number.isFinite(n) && n > 0 ? n : null
    }
  }
  const topLast = o.last_page ?? o.lastPage
  if (typeof topLast === 'number' && Number.isFinite(topLast) && topLast > 0) return Math.floor(topLast)
  if (topLast != null) {
    const n = parseInt(String(topLast), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

export function useKitepropPagedApiIngest(
  feedUrl: string,
  mode: KitepropIngestMode,
  hasRawData: boolean
): boolean {
  if (hasRawData) return false
  if (mode === 'json') return false
  if (mode === 'api') return true
  if (mode === 'both') return isKitepropPropertiesApiListUrl(feedUrl)
  // auto
  return Boolean(getKitepropApiKeyForIngest() && isKitepropPropertiesApiListUrl(feedUrl))
}

const MAX_PAGES = 5000

/**
 * Descarga todas las páginas del listado de propiedades (GET + X-API-Key) y devuelve un objeto
 * compatible con `extractListingsFromFeed` (`data` o `properties`, etc.).
 */
export async function fetchKitepropPropertiesAllPages(
  feedUrlTemplate: string
): Promise<YumblinFeedFetchResult> {
  const apiKey = getKitepropApiKeyForIngest()
  if (!apiKey) {
    throw new Error(
      'Ingest API Kiteprop: defina KITEPROP_API_KEY o KITEPROP_API_TOKEN (misma clave que REST/MCP).'
    )
  }

  const perPageRaw = parseInt(process.env.KITEPROP_INGEST_PER_PAGE ?? '100', 10)
  const perPage =
    Number.isFinite(perPageRaw) && perPageRaw > 0 ? Math.min(Math.max(perPageRaw, 1), 500) : 100

  const template = new URL(feedUrlTemplate)
  const all: unknown[] = []
  let lastPage: number | null = null
  let page = 1

  while (page <= MAX_PAGES) {
    const url = new URL(template.toString())
    url.searchParams.set('page', String(page))
    url.searchParams.set('per_page', String(perPage))

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        Accept: 'application/json',
      },
    })

    const text = await res.text()
    if (!res.ok) {
      throw new Error(`Kiteprop API propiedades HTTP ${res.status}: ${text.slice(0, 200)}`)
    }

    let json: unknown
    try {
      json = JSON.parse(text) as unknown
    } catch {
      throw new Error('Kiteprop API: respuesta no es JSON válido')
    }

    if (lastPage === null) {
      lastPage = readPaginationLastPage(json)
    }

    const batch = extractItemsFromPropertiesPage(json)
    if (batch.length === 0) {
      if (page === 1 && all.length === 0) {
        throw new Error(
          'Kiteprop API: primera página sin ítems (revisar filtros en KITEPROP_INGEST_PROPERTIES_QUERY o permisos de la API key).'
        )
      }
      break
    }

    all.push(...batch)

    if (lastPage != null && page >= lastPage) break
    if (lastPage == null && batch.length < perPage) break

    page++
  }

  const merged = { data: all }
  const bodyStr = JSON.stringify(merged)
  return {
    kind: 'ok',
    data: merged,
    bodySha256: sha256HexFromString(bodyStr),
  }
}
