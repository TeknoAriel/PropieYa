/**
 * Rellena `features.kitepropPropertyId` en listings importados desde feed Yumblin/Properstar.
 *
 * Uso: DATABASE_URL=... pnpm backfill:kiteprop-property-id
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'

import { getDb } from '@propieya/database'
import {
  extractListingsFromFeed,
  peekFeedExternalId,
  peekFeedKitepropNumericPropertyId,
} from '@propieya/shared'

config({ path: resolve(__dirname, '../apps/web/.env.prod.audit') })

const FEED_URLS = [
  process.env.YUMBLIN_JSON_URL?.trim(),
  'https://static.kiteprop.com/kp/difusions/23705a4a85ab8f1d301c73aae5359a81a8b5c1ca/yumblin.json',
  'https://static.kiteprop.com/kp/difusions/f89cbd8ca785fc34317df63d29ab8ea9d68a7b1c/properstar.json',
].filter((u): u is string => Boolean(u?.length))

const BATCH = 400

async function loadFeedItems(): Promise<{ url: string; items: Record<string, unknown>[] }> {
  for (const feedUrl of FEED_URLS) {
    const res = await fetch(feedUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'Propieya-Backfill/1.0' },
      cache: 'no-store',
    })
    if (!res.ok) continue
    const json = (await res.json()) as unknown
    const items = extractListingsFromFeed(json) as Record<string, unknown>[]
    if (items.length > 0) return { url: feedUrl, items }
  }
  throw new Error('Ningún feed devolvió ítems')
}

async function main() {
  const { url: feedUrl, items } = await loadFeedItems()
  console.log('Feed:', feedUrl, 'ítems:', items.length)

  const byPublicCode = new Map<string, number>()
  for (const item of items) {
    const code = peekFeedExternalId(item)
    const numericId = peekFeedKitepropNumericPropertyId(item)
    if (!code || numericId == null) continue
    byPublicCode.set(code, numericId)
  }
  console.log('Mapa public_code → id:', byPublicCode.size)

  const db = getDb()
  const rows = await db.execute(sql`
    select id, external_id
    from listings
    where source = 'import'
      and external_id is not null
      and status = 'active'
  `)

  const updates: { id: string; external_id: string; numericId: number }[] = []
  let missing = 0
  for (const row of rows as unknown as Array<{ id: string; external_id: string }>) {
    const numericId = byPublicCode.get(row.external_id)
    if (numericId == null) {
      missing += 1
      continue
    }
    updates.push({ id: row.id, external_id: row.external_id, numericId })
  }

  let updated = 0
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH)
    const values = chunk
      .map((c) => `('${c.id}'::uuid, ${c.numericId})`)
      .join(',')
    const result = await db.execute(sql.raw(`
      update listings l
      set
        features = jsonb_set(
          case
            when l.features is null then '{}'::jsonb
            when jsonb_typeof(l.features) = 'object' then l.features
            else '{}'::jsonb
          end,
          '{kitepropPropertyId}',
          to_jsonb(v.kp_id)
        ),
        updated_at = now()
      from (values ${values}) as v(id, kp_id)
      where l.id = v.id
        and coalesce(
          case when jsonb_typeof(l.features) = 'object' then l.features->>'kitepropPropertyId' else null end,
          ''
        ) is distinct from v.kp_id::text
    `))
    updated += Number((result as { rowCount?: number }).rowCount ?? 0)
    console.log(`Lote ${i / BATCH + 1}: ${chunk.length} filas`)
  }

  console.log('Actualizados:', updated, 'sin match en feed:', missing, 'listings activos import:', rows.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
