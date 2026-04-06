#!/usr/bin/env npx tsx
/**
 * Descarga el feed Yumblin/Properstar, toma una muestra (50–100 por defecto)
 * repartida a lo largo del array, y guarda feed raw + tipo mapeado por mapYumblinItem.
 *
 * Uso:
 *   pnpm sample:feed-types
 *   SAMPLE_SIZE=80 YUMBLIN_JSON_URL=https://... pnpm sample:feed-types
 *   SAMPLE_OUT=tmp/mi-muestra.json pnpm sample:feed-types
 */

import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

const envFile = process.env.ENV_FILE
if (envFile) {
  config({ path: path.resolve(process.cwd(), envFile) })
} else {
  config()
}

const DEFAULT_FEED_URL =
  'https://static.kiteprop.com/kp/difusions/f89cbd8ca785fc34317df63d29ab8ea9d68a7b1c/properstar.json'

function pickIndices(total: number, want: number): number[] {
  if (total <= want) return Array.from({ length: total }, (_, i) => i)
  const out: number[] = []
  for (let k = 0; k < want; k++) {
    out.push(Math.floor((k * (total - 1)) / Math.max(want - 1, 1)))
  }
  return [...new Set(out)].sort((a, b) => a - b)
}

function getLogical(item: Record<string, unknown>, key: string): unknown {
  const want = key.toLowerCase().replace(/_/g, '')
  for (const ik of Object.keys(item)) {
    if (ik.toLowerCase().replace(/_/g, '') === want) return item[ik]
  }
  return undefined
}

async function main() {
  const url = process.env.YUMBLIN_JSON_URL?.trim() || DEFAULT_FEED_URL
  const sampleSize = Math.min(
    500,
    Math.max(1, parseInt(process.env.SAMPLE_SIZE ?? '100', 10) || 100)
  )
  const outPath =
    process.env.SAMPLE_OUT?.trim() ||
    path.join(process.cwd(), 'tmp', 'sample-feed-property-types.json')

  console.log(`GET ${url}`)
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    console.error(`HTTP ${res.status}`)
    process.exit(1)
  }

  const data = (await res.json()) as unknown
  const { extractListingsFromFeed, mapYumblinItem } = await import(
    '../packages/shared/src/xml/yumblin-mapper'
  )

  const items = extractListingsFromFeed(data)
  console.log(`Ítems en feed: ${items.length}`)
  if (items.length === 0) {
    process.exit(0)
  }

  const dummyOrg = '00000000-0000-4000-8000-000000000001'
  const dummyPub = '00000000-0000-4000-8000-000000000002'
  const indices = pickIndices(items.length, sampleSize)

  const rows: Array<{
    index: number
    public_code: string | null
    property_type: string | null
    property_type_old: string | null
    mappedPropertyType: string | null
    mappable: boolean
    title: string
  }> = []

  const mappedCounts = new Map<string, number>()
  const rawCounts = new Map<string, number>()

  for (const i of indices) {
    const item = items[i] as Record<string, unknown>
    const pt = getLogical(item, 'property_type')
    const pto = getLogical(item, 'property_type_old')
    const code = getLogical(item, 'public_code')
    const row = mapYumblinItem(item, { organizationId: dummyOrg, publisherId: dummyPub })
    const mpt = row?.propertyType ?? null
    const rawKey =
      pt != null && String(pt).trim() !== ''
        ? String(pt).trim()
        : pto != null && String(pto).trim() !== ''
          ? `old:${String(pto).trim()}`
          : '(sin tipo en raíz)'
    rawCounts.set(rawKey, (rawCounts.get(rawKey) ?? 0) + 1)
    if (mpt) mappedCounts.set(mpt, (mappedCounts.get(mpt) ?? 0) + 1)

    rows.push({
      index: i,
      public_code: code != null ? String(code) : null,
      property_type: pt != null ? String(pt) : null,
      property_type_old: pto != null ? String(pto) : null,
      mappedPropertyType: mpt,
      mappable: row != null,
      title: String(item.title ?? item.titulo ?? '').slice(0, 120),
    })
  }

  console.log('\n--- Conteo en muestra: property_type (feed, raíz) ---')
  const rawSorted = [...rawCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [k, n] of rawSorted.slice(0, 25)) {
    console.log(`  ${n}\t${k}`)
  }
  if (rawSorted.length > 25) console.log(`  … +${rawSorted.length - 25} valores distintos`)

  console.log('\n--- Conteo en muestra: mapYumblinItem → propertyType (canónico) ---')
  const mapSorted = [...mappedCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [k, n] of mapSorted) {
    console.log(`  ${n}\t${k}`)
  }

  const onlyApartment = mapSorted.length === 1 && mapSorted[0]?.[0] === 'apartment'
  const mappableRows = rows.filter((r) => r.mappable)
  const apartmentPct =
    mappableRows.length > 0
      ? Math.round(((mappedCounts.get('apartment') ?? 0) / mappableRows.length) * 100)
      : 0
  console.log(
    `\nResumen: ${mappableRows.length}/${rows.length} mapeables; ` +
      `apartment entre mapeables ~${apartmentPct}%`
  )
  if (onlyApartment) {
    console.log('⚠ En esta muestra todo salió apartment (revisar feed o filtros de precio/superficie).')
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  const payload = {
    generatedAt: new Date().toISOString(),
    feedUrl: url,
    feedTotalItems: items.length,
    sampleSize: rows.length,
    sampleIndices: indices,
    summaryRawPropertyType: Object.fromEntries(rawSorted),
    summaryMappedPropertyType: Object.fromEntries(mapSorted),
    rows,
  }
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
  console.log(`\nJSON escrito: ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
