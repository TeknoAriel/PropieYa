/**
 * Corrige `development_unit` que ya no califican (lote/casa falsos positivos).
 * Uso: ENV_FILE=apps/web/.env.prod.audit APPLY=1 pnpm exec tsx scripts/demote-false-development-units.ts
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

import { and, eq } from 'drizzle-orm'

import { db, listings } from '@propieya/database'
import { mapFeedPropertyTypeWithListingText } from '@propieya/shared'

const envFile = process.env.ENV_FILE
if (envFile) {
  config({ path: resolve(process.cwd(), envFile) })
} else {
  config()
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL no está definido')
    process.exit(1)
  }
  const apply = process.env.APPLY === '1' || process.env.APPLY === 'true'

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      propertyType: listings.propertyType,
    })
    .from(listings)
    .where(and(eq(listings.status, 'active'), eq(listings.propertyType, 'development_unit')))

  let wouldChange = 0
  let updated = 0
  const samples: string[] = []

  for (const r of rows) {
    const suggested = mapFeedPropertyTypeWithListingText('', {
      title: r.title,
      description: r.description,
    })
    if (suggested === 'development_unit') continue
    wouldChange++
    if (samples.length < 15) {
      samples.push(`  development_unit → ${suggested} | ${r.title.slice(0, 70)}`)
    }
    if (apply) {
      await db
        .update(listings)
        .set({ propertyType: suggested })
        .where(eq(listings.id, r.id))
      updated++
    }
  }

  console.log('Activos development_unit:', rows.length)
  console.log('A demover:', wouldChange)
  if (apply) console.log('Actualizados:', updated)
  for (const s of samples) console.log(s)
  if (!apply && wouldChange > 0) console.log('\nEjecutá APPLY=1 para persistir.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
