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

import { and, eq, sql } from 'drizzle-orm'

import { db, listings } from '@propieya/database'

/** Palabra completa "casa" / "casas" (evita cascada, casamiento, etc.). */
const WORD_CASA_RE = '[[:<:]](casa|casas)[[:>:]]'

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

  const suspiciousWhere = and(
    eq(listings.status, 'active'),
    eq(listings.propertyType, 'apartment'),
    sql`(${listings.title} ~* ${WORD_CASA_RE} OR ${listings.description} ~* ${WORD_CASA_RE})`
  )

  const [suspRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(suspiciousWhere)

  const suspicious = suspRow?.count ?? 0
  console.log(
    '\nSospechosos: apartment activo pero título o descripción contienen la palabra "casa/casas" (regex palabra completa):'
  )
  console.log(`  count: ${suspicious}`)

  if (suspicious > 0) {
    const samples = await db
      .select({
        id: listings.id,
        title: listings.title,
        propertyType: listings.propertyType,
      })
      .from(listings)
      .where(suspiciousWhere)
      .limit(12)

    console.log('\n  Muestra (máx. 12):')
    for (const r of samples) {
      const t = r.title.length > 72 ? `${r.title.slice(0, 69)}…` : r.title
      console.log(`    ${r.id}  [${r.propertyType}]  ${t}`)
    }
  }

  console.log('\n--- Conclusión automática (orientativa) ---')
  if (odd.length > 0) {
    console.log(
      '  Hay tipos no canónicos: conviene corregir datos o reimportar con mapper actualizado.'
    )
  } else if (suspicious > 0) {
    console.log(
      `  Hay ${suspicious} avisos apartment con "casa" en texto: probable clasificación de feed/import.`
    )
    console.log(
      '  Reimportar con el mapper actual (`mapFeedPropertyType`) puede corregir si el feed envía tipo explícito; si no, revisar manual o reglas SQL puntuales.'
    )
  } else if (!byType.some((r) => r.propertyType === 'house') && total > 0) {
    console.log(
      '  Ningún listing activo es tipo `house`: búsqueda por "casa" como tipo estructural no devolverá filas hasta que existan `house` o se reclasifique.'
    )
    console.log(
      '  Si el feed trae casas como otro código, reimportar tras el último mapper suele ser el camino más barato.'
    )
  } else {
    console.log('  Distribución coherente con enums; reimport no obligatorio por esta auditoría.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
