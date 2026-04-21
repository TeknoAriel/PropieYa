#!/usr/bin/env npx tsx
/**
 * Publica borradores importados (source=import) que **cumplan** la validación de publicabilidad.
 *
 * El import por defecto ya crea avisos `active` cuando el ítem es válido (salvo IMPORT_INGEST_AS_DRAFT=true).
 * Este script sirve para bases con drafts históricos: solo activa filas que pasan `assessListingPublishability`.
 *
 * Uso: DATABASE_URL=... pnpm publish:imported
 */

import 'dotenv/config'

import { and, eq } from 'drizzle-orm'

import { db, listings } from '@propieya/database'
import {
  assessListingPublishability,
  getListingPublishConfigFromEnv,
  listingRowToPublishabilityInput,
  LISTING_VALIDITY,
} from '@propieya/shared'

const MANUAL_VALIDITY_DAYS = LISTING_VALIDITY.MANUAL_VALIDITY_DAYS

async function main() {
  const publishConfig = getListingPublishConfigFromEnv()
  const draftRows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.status, 'draft'), eq(listings.source, 'import')))

  if (draftRows.length === 0) {
    console.log('No hay drafts importados para publicar.')
    return
  }

  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  )

  let published = 0
  let skipped = 0

  for (const row of draftRows) {
    const assessment = assessListingPublishability(
      listingRowToPublishabilityInput(
        {
          operationType: row.operationType,
          propertyType: row.propertyType,
          priceAmount: row.priceAmount,
          priceCurrency: row.priceCurrency,
          title: row.title,
          description: row.description,
          address: row.address,
        },
        row.mediaCount,
        publishConfig
      )
    )
    if (!assessment.ok) {
      skipped++
      continue
    }

    const [upd] = await db
      .update(listings)
      .set({
        status: 'active',
        publishedAt: now,
        lastValidatedAt: now,
        expiresAt,
        lastContentUpdatedAt: now,
        updatedAt: now,
      })
      .where(and(eq(listings.id, row.id), eq(listings.status, 'draft')))
      .returning({ id: listings.id })

    if (upd) published++
  }

  console.log(
    `Publicadas ${published} propiedades (${skipped} omitidas por validación de publicabilidad).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
