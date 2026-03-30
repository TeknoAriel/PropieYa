#!/usr/bin/env npx tsx
/**
 * Descarga el JSON Yumblin/Kiteprop y reporta cobertura de campos (p. ej. typeproperty)
 * vs lo que produce mapYumblinItem (propertyType canónico).
 *
 * Uso: pnpm audit:yumblin-fields
 *      YUMBLIN_JSON_URL=https://... pnpm audit:yumblin-fields
 */

import { config } from 'dotenv'
import path from 'node:path'

const envFile = process.env.ENV_FILE
if (envFile) {
  config({ path: path.resolve(process.cwd(), envFile) })
} else {
  config()
}

const DEFAULT_FEED_URL =
  'https://static.kiteprop.com/kp/difusions/23705a4a85ab8f1d301c73aae5359a81a8b5c1ca/yumblin.json'

function normKey(k: string): string {
  return k.toLowerCase().replace(/_/g, '')
}

function hasLogicalKey(item: Record<string, unknown>, logical: string): boolean {
  const want = normKey(logical)
  return Object.keys(item).some((ik) => normKey(ik) === want)
}

function getByLogicalKey(item: Record<string, unknown>, logical: string): unknown {
  const want = normKey(logical)
  for (const ik of Object.keys(item)) {
    if (normKey(ik) === want) return item[ik]
  }
  return undefined
}

function hasKeyAliasDeep(obj: unknown, logical: string, maxDepth: number): boolean {
  if (maxDepth < 0 || obj === null || obj === undefined) return false
  if (typeof obj !== 'object') return false
  const want = normKey(logical)
  if (Array.isArray(obj)) {
    return obj.some((el) => hasKeyAliasDeep(el, logical, maxDepth - 1))
  }
  const o = obj as Record<string, unknown>
  for (const k of Object.keys(o)) {
    if (normKey(k) === want) return true
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object' && hasKeyAliasDeep(v, logical, maxDepth - 1)) {
      return true
    }
  }
  return false
}

async function main() {
  const url = process.env.YUMBLIN_JSON_URL?.trim() || DEFAULT_FEED_URL
  console.log(`GET ${url}\n`)

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
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

  let withTypeProperty = 0
  let withTypePropertyDeep = 0
  let withPropertyTypeSnake = 0
  let withTipo = 0
  const rawTypePropertyValues = new Map<string, number>()
  const rawPropertyTypeSnake = new Map<string, number>()

  for (const item of items) {
    if (hasLogicalKey(item, 'typeproperty')) withTypeProperty++
    if (hasKeyAliasDeep(item, 'typeproperty', 6)) withTypePropertyDeep++
    if (hasLogicalKey(item, 'property_type')) withPropertyTypeSnake++
    if (hasLogicalKey(item, 'tipo')) withTipo++
    const v = getByLogicalKey(item, 'typeproperty')
    if (v !== undefined && v !== null && v !== '') {
      const s = String(v).trim().toLowerCase()
      rawTypePropertyValues.set(s, (rawTypePropertyValues.get(s) ?? 0) + 1)
    }
    const pt = getByLogicalKey(item, 'property_type')
    if (pt !== undefined && pt !== null && pt !== '') {
      const s = String(pt).trim().toLowerCase()
      rawPropertyTypeSnake.set(s, (rawPropertyTypeSnake.get(s) ?? 0) + 1)
    }
  }

  const n = items.length
  console.log('\nPresencia de claves (primer nivel, insensible a mayúsculas / guiones bajos):')
  console.log(
    `  typeproperty: ${withTypeProperty} (${((100 * withTypeProperty) / n).toFixed(1)}%)`
  )
  console.log(
    `  typeproperty en cualquier nivel (prof.≤6): ${withTypePropertyDeep} (${((100 * withTypePropertyDeep) / n).toFixed(1)}%)`
  )
  console.log(
    `  property_type: ${withPropertyTypeSnake} (${((100 * withPropertyTypeSnake) / n).toFixed(1)}%)`
  )
  console.log(`  tipo: ${withTipo} (${((100 * withTipo) / n).toFixed(1)}%)`)

  const topRaw = [...rawTypePropertyValues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  if (topRaw.length > 0) {
    console.log('\nValores más frecuentes en typeproperty (normalizado a minúsculas):')
    for (const [val, c] of topRaw) {
      console.log(`  ${c}\t${val}`)
    }
  }

  const topSnake = [...rawPropertyTypeSnake.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  if (topSnake.length > 0) {
    console.log('\nValores más frecuentes en property_type (feed, minúsculas):')
    for (const [val, c] of topSnake) {
      console.log(`  ${c}\t${val}`)
    }
  }

  const dummyOrg = '00000000-0000-4000-8000-000000000001'
  const dummyPub = '00000000-0000-4000-8000-000000000002'
  const fromMap = new Map<string, number>()
  let mappedOk = 0
  let skipped = 0
  for (const item of items) {
    const row = mapYumblinItem(item, {
      organizationId: dummyOrg,
      publisherId: dummyPub,
    })
    if (!row) {
      skipped++
      continue
    }
    mappedOk++
    fromMap.set(row.propertyType, (fromMap.get(row.propertyType) ?? 0) + 1)
  }

  console.log(`\nmapYumblinItem: válidos ${mappedOk}, omitidos (null) ${skipped}`)
  console.log('Distribución propertyType tras mapper (con getValue + mapFeedPropertyType):')
  for (const [t, c] of [...fromMap.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t}: ${c}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
