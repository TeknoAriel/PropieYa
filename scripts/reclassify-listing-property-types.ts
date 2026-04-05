#!/usr/bin/env npx tsx
/**
 * Reclasifica `property_type` en listings **activos** usando título + descripción
 * (misma lógica que el import: `mapFeedPropertyTypeWithListingText` sin código de feed).
 *
 * Por defecto solo propone cambios **apartment → otro** (conservador).
 * Con `RECLASSIFY_ALL=1` compara cualquier tipo actual con la sugerencia (más riesgoso).
 *
 * Uso:
 *   DATABASE_URL=... pnpm reclassify:listing-types
 *   APPLY=1 DATABASE_URL=... pnpm reclassify:listing-types
 *   RECLASSIFY_ALL=1 APPLY=1 DATABASE_URL=... pnpm reclassify:listing-types
 *
 * Después en producción: sincronizar Elasticsearch (`pnpm reindex:es` o cron sync) para que
 * búsquedas ES reflejen los nuevos tipos.
 */

import { config } from 'dotenv'
import path from 'node:path'

const envFile = process.env.ENV_FILE
if (envFile) {
  config({ path: path.resolve(process.cwd(), envFile) })
} else {
  config()
}

import { and, eq, gt } from 'drizzle-orm'

import { db, listings } from '@propieya/database'
import { mapFeedPropertyTypeWithListingText } from '@propieya/shared'

const PAGE = 400

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL no está definido')
    process.exit(1)
  }

  const apply = process.env.APPLY === '1' || process.env.APPLY === 'true'
  const reclassifyAll =
    process.env.RECLASSIFY_ALL === '1' || process.env.RECLASSIFY_ALL === 'true'

  let examined = 0
  let wouldChange = 0
  let updated = 0
  const samples: string[] = []

  let lastId: string | undefined

  for (;;) {
    const whereClause = lastId
      ? and(eq(listings.status, 'active'), gt(listings.id, lastId))
      : eq(listings.status, 'active')

    const rows = await db
      .select({
        id: listings.id,
        title: listings.title,
        description: listings.description,
        propertyType: listings.propertyType,
      })
      .from(listings)
      .where(whereClause)
      .orderBy(listings.id)
      .limit(PAGE)

    if (rows.length === 0) break

    for (const r of rows) {
      examined++
      const suggested = mapFeedPropertyTypeWithListingText('', {
        title: r.title,
        description: r.description,
      })
      if (suggested === r.propertyType) continue

      const allow =
        reclassifyAll ||
        (r.propertyType === 'apartment' && suggested !== 'apartment')

      if (!allow) continue

      wouldChange++
      if (samples.length < 20) {
        samples.push(
          `  ${r.id}  ${r.propertyType} → ${suggested}  | ${r.title.slice(0, 64)}${r.title.length > 64 ? '…' : ''}`
        )
      }

      if (apply) {
        await db
          .update(listings)
          .set({ propertyType: suggested })
          .where(eq(listings.id, r.id))
        updated++
      }
    }

    lastId = rows[rows.length - 1]?.id
    if (!lastId) break
  }

  console.log(`Listings activos examinados: ${examined}`)
  console.log(
    `Cambios ${apply ? 'aplicados' : 'propuestos'} (conservador${reclassifyAll ? ' DESACTIVADO (RECLASSIFY_ALL)' : ''}): ${wouldChange}`
  )
  if (apply) console.log(`Filas actualizadas (UPDATE): ${updated}`)
  if (samples.length > 0) {
    console.log(`\nMuestra (máx. 20):\n${samples.join('\n')}`)
  }
  if (!apply && wouldChange > 0) {
    console.log('\nPara escribir en DB: APPLY=1 pnpm reclassify:listing-types')
  }
  if (apply && wouldChange > 0) {
    console.log('\nRecordá reindexar / sync ES en el entorno correspondiente.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
