#!/usr/bin/env npx tsx
/**
 * Compara `propertyType` que devolvería el mapper actual del feed Yumblin/Kiteprop
 * con lo guardado en DB para avisos importados (mismo `external_id` + organización).
 * Solo lectura; sirve para medir deuda antes/después de correr el cron de import.
 *
 * Uso:
 *   DATABASE_URL=... pnpm diff:import-types
 *   IMPORT_ORGANIZATION_ID=uuid YUMBLIN_JSON_URL=... pnpm diff:import-types
 */

import { config } from 'dotenv'
import path from 'node:path'

const envFile = process.env.ENV_FILE
if (envFile) {
  config({ path: path.resolve(process.cwd(), envFile) })
} else {
  config()
}

import { and, eq, isNotNull } from 'drizzle-orm'

import { db, listings, organizations } from '@propieya/database'

const DEFAULT_FEED_URL =
  'https://static.kiteprop.com/kp/difusions/23705a4a85ab8f1d301c73aae5359a81a8b5c1ca/yumblin.json'

const DUMMY_PUBLISHER = '00000000-0000-4000-8000-000000000099'

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL no está definido')
    process.exit(1)
  }

  let organizationId = process.env.IMPORT_ORGANIZATION_ID?.trim()
  if (!organizationId) {
    const [first] = await db.select({ id: organizations.id }).from(organizations).limit(1)
    if (!first) {
      console.error('No hay organizaciones en DB; definí IMPORT_ORGANIZATION_ID')
      process.exit(1)
    }
    organizationId = first.id
    console.log(`Usando primera organización: ${organizationId}\n`)
  }

  const feedUrl = process.env.YUMBLIN_JSON_URL?.trim() || DEFAULT_FEED_URL
  console.log(`GET ${feedUrl}`)
  const res = await fetch(feedUrl, { headers: { Accept: 'application/json' } })
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

  const rows = await db
    .select({
      id: listings.id,
      externalId: listings.externalId,
      propertyType: listings.propertyType,
    })
    .from(listings)
    .where(
      and(
        eq(listings.organizationId, organizationId),
        eq(listings.source, 'import'),
        isNotNull(listings.externalId)
      )
    )

  const byExternal = new Map<string, { id: string; propertyType: string }>()
  for (const r of rows) {
    if (r.externalId) byExternal.set(r.externalId, { id: r.id, propertyType: r.propertyType })
  }
  console.log(`Listings import en DB (con external_id): ${byExternal.size}\n`)

  let compared = 0
  let match = 0
  let mismatch = 0
  const mismatchByPair = new Map<string, number>()

  for (const item of items) {
    const mapped = mapYumblinItem(item as Record<string, unknown>, {
      organizationId,
      publisherId: DUMMY_PUBLISHER,
    })
    if (!mapped?.externalId) continue
    const existing = byExternal.get(mapped.externalId)
    if (!existing) continue
    compared++
    if (existing.propertyType === mapped.propertyType) {
      match++
    } else {
      mismatch++
      const key = `${existing.propertyType} → ${mapped.propertyType}`
      mismatchByPair.set(key, (mismatchByPair.get(key) ?? 0) + 1)
    }
  }

  console.log(`Comparados (presentes en feed y en DB): ${compared}`)
  console.log(`Coinciden: ${match}`)
  console.log(`Difieren: ${mismatch}`)
  if (mismatch > 0) {
    console.log('\nTop diferencias (DB → mapper actual):')
    const sorted = [...mismatchByPair.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
    for (const [k, c] of sorted) {
      console.log(`  ${c}\t${k}`)
    }
    console.log(
      '\nPróximo paso: ejecutar cron/import (`pnpm import:yumblin` o GET /api/cron/import-yumblin).'
    )
    console.log(
      'Si el hash del contenido cambió (p. ej. tras corregir mapFeedPropertyType), el sync actualizará `property_type`.'
    )
  } else if (compared === 0) {
    console.log(
      '\nNo hubo intersección feed↔DB (org distinta, external_id vacío en feed o DB vacía).'
    )
  } else {
    console.log('\nFeed y DB alineados en tipos para los avisos comparables.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
