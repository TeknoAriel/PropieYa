import { sql } from 'drizzle-orm'

import type { Database } from '@propieya/database'
import type { LocalityCatalogEntry } from '@propieya/shared'

type Cache = { atMs: number; entries: LocalityCatalogEntry[] }

let cache: Cache | null = null
const TTL_MS = 5 * 60 * 1000

/**
 * Pares ciudad/barrio distintos de avisos activos (conteo por par).
 * Cache en memoria ~5 min por instancia serverless.
 */
export async function getListingLocalityCatalog(
  db: Database
): Promise<readonly LocalityCatalogEntry[]> {
  const now = Date.now()
  if (cache && now - cache.atMs < TTL_MS) {
    return cache.entries
  }

  const executed = await db.execute(sql`
    SELECT
      TRIM(COALESCE(address->>'city', '')) AS city,
      TRIM(COALESCE(address->>'neighborhood', '')) AS neighborhood,
      COUNT(*)::int AS cnt
    FROM listings
    WHERE status = 'active'
    GROUP BY 1, 2
    HAVING TRIM(COALESCE(address->>'city', '')) != ''
       OR TRIM(COALESCE(address->>'neighborhood', '')) != ''
    ORDER BY cnt DESC
    LIMIT 2500
  `)

  const rows = executed as unknown as Array<{
    city: string
    neighborhood: string
    cnt: number | string
  }>

  const entries: LocalityCatalogEntry[] = []
  for (const row of rows) {
    const city = String(row.city ?? '').trim()
    const neighborhood = String(row.neighborhood ?? '').trim()
    const cntRaw = row.cnt
    const count =
      typeof cntRaw === 'number' && !Number.isNaN(cntRaw)
        ? cntRaw
        : parseInt(String(cntRaw), 10) || 0
    const cityNorm = city.length > 0 ? city : '—'
    entries.push({
      city: cityNorm,
      neighborhood: neighborhood.length > 0 ? neighborhood : null,
      count,
    })
  }

  cache = { atMs: now, entries }
  return entries
}
