#!/usr/bin/env npx tsx
/**
 * Auditoría: conteos de property_type en listings activos (y muestra de valores raros).
 * Ayuda a detectar casas mal clasificadas como departamento u otros desajustes feed/SQL.
 *
 * Uso: DATABASE_URL=... pnpm audit:listing-types
 * O: ENV_FILE=apps/web/.env.prod.verificar pnpm audit:listing-types
 */

import { config } from 'dotenv'
import path from 'node:path'

const envFile = process.env.ENV_FILE
if (envFile) {
  config({ path: path.resolve(process.cwd(), envFile) })
} else {
  config()
}

import { eq, sql } from 'drizzle-orm'

import { db, listings } from '@propieya/database'

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL no está definido')
    process.exit(1)
  }

  const byType = await db
    .select({
      propertyType: listings.propertyType,
      count: sql<number>`count(*)::int`,
    })
    .from(listings)
    .where(eq(listings.status, 'active'))
    .groupBy(listings.propertyType)
    .orderBy(sql`count(*) DESC`)

  console.log('Listings activos por property_type (SQL):')
  let total = 0
  for (const row of byType) {
    total += row.count
    console.log(`  ${row.propertyType}: ${row.count}`)
  }
  console.log(`  TOTAL: ${total}`)

  const canonical = new Set([
    'apartment',
    'house',
    'ph',
    'land',
    'office',
    'commercial',
    'warehouse',
    'parking',
    'development_unit',
  ])
  const odd = byType.filter((r) => !canonical.has(r.propertyType))
  if (odd.length > 0) {
    console.log('\nValores no canónicos (revisar import o datos legacy):')
    for (const r of odd) {
      console.log(`  "${r.propertyType}": ${r.count}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
