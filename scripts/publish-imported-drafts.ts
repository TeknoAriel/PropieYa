#!/usr/bin/env npx tsx
/**
 * Publica todas las propiedades en draft importadas (source=import).
 *
 * El import por defecto ya crea avisos `active` (salvo IMPORT_INGEST_AS_DRAFT=true).
 * Este script sirve para bases con miles de drafts históricos o tras cambiar la política.
 *
 * Uso: DATABASE_URL=... pnpm publish:imported
 */

import 'dotenv/config'

import { and, eq, inArray } from 'drizzle-orm'

import { db, listings } from '@propieya/database'
import { LISTING_VALIDITY } from '@propieya/shared'

const MANUAL_VALIDITY_DAYS = LISTING_VALIDITY.MANUAL_VALIDITY_DAYS

async function main() {
  const drafts = await db
    .select({ id: listings.id, title: listings.title })
    .from(listings)
    .where(and(eq(listings.status, 'draft'), eq(listings.source, 'import')))

  if (drafts.length === 0) {
    console.log('No hay drafts importados para publicar.')
    return
  }

  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  )

  const ids = drafts.map((d) => d.id)
  const result = await db
    .update(listings)
    .set({
      status: 'active',
      publishedAt: now,
      lastValidatedAt: now,
      expiresAt,
      updatedAt: now,
    })
    .where(inArray(listings.id, ids))
    .returning({ id: listings.id })

  console.log(`Publicadas ${result.length} propiedades.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
