/**
 * Reclasifica avisos activos a `development_unit` cuando el título/descripción
 * indica emprendimiento / en pozo (misma lógica que import tras fix de mapper).
 *
 * Uso:
 *   DATABASE_URL=... pnpm reclassify:development-units
 *   APPLY=1 DATABASE_URL=... pnpm reclassify:development-units
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

import { and, eq, ne, sql } from 'drizzle-orm'

import { db, listings } from '@propieya/database'
import { mapFeedPropertyTypeWithListingText } from '@propieya/shared'

const envFile = process.env.ENV_FILE
if (envFile) {
  config({ path: resolve(process.cwd(), envFile) })
} else {
  config()
}

const PAGE = 500

/** Pre-filtro SQL: solo filas con señales textuales probables (evita escanear 16k avisos). */
const CANDIDATE_WHERE = and(
  eq(listings.status, 'active'),
  ne(listings.propertyType, 'development_unit'),
  sql`(
    lower(${listings.title}) ~* 'en[[:space:]]+pozo'
    OR lower(${listings.title}) ~* 'emprendimiento'
    OR lower(${listings.description}) ~* 'en[[:space:]]+pozo'
    OR lower(${listings.description}) ~* 'emprendimiento'
  )`
)

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL no está definido')
    process.exit(1)
  }

  const apply = process.env.APPLY === '1' || process.env.APPLY === 'true'

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(CANDIDATE_WHERE)

  console.log('Candidatos SQL (pozo/emprendimiento, no development_unit):', countRow?.count ?? 0)

  let examined = 0
  let wouldChange = 0
  let updated = 0
  const samples: string[] = []
  let offset = 0

  for (;;) {
    const rows = await db
      .select({
        id: listings.id,
        title: listings.title,
        description: listings.description,
        propertyType: listings.propertyType,
      })
      .from(listings)
      .where(CANDIDATE_WHERE)
      .orderBy(listings.id)
      .limit(PAGE)
      .offset(offset)

    if (rows.length === 0) break

    for (const r of rows) {
      examined++
      const suggested = mapFeedPropertyTypeWithListingText('', {
        title: r.title,
        description: r.description,
      })
      if (suggested !== 'development_unit') continue

      wouldChange++
      if (samples.length < 15) {
        samples.push(
          `  ${r.propertyType} → development_unit | ${r.title.slice(0, 72)}${r.title.length > 72 ? '…' : ''}`
        )
      }

      if (apply) {
        await db
          .update(listings)
          .set({ propertyType: 'development_unit' })
          .where(eq(listings.id, r.id))
        updated++
      }
    }

    offset += rows.length
    if (rows.length < PAGE) break
  }

  console.log('Examinados (mapper):', examined)
  console.log('Cambiarían a development_unit:', wouldChange)
  if (apply) console.log('Actualizados:', updated)
  if (samples.length > 0) {
    console.log('\nMuestra:')
    for (const s of samples) console.log(s)
  }
  if (!apply && wouldChange > 0) {
    console.log('\nEjecutá APPLY=1 para persistir.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
