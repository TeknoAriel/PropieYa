#!/usr/bin/env npx tsx
/**
 * Sincroniza listings activos a Elasticsearch (local, sin CRON_SECRET).
 * Usa DATABASE_URL y ELASTICSEARCH_URL del entorno.
 *
 * Uso: DATABASE_URL=... ELASTICSEARCH_URL=... pnpm sync-search:local
 * O con archivo: ENV_FILE=apps/web/.env.prod.verificar pnpm sync-search:local
 */

import { config } from 'dotenv'
import path from 'node:path'

const envFile = process.env.ENV_FILE
if (envFile) {
  config({ path: path.resolve(process.cwd(), envFile) })
} else {
  config()
}

import { eq } from 'drizzle-orm'

import { db, listings } from '@propieya/database'

async function main() {
  const { ensureIndex, bulkIndexListings } = await import(
    '../apps/web/src/lib/search/index'
  )

  const url = process.env.ELASTICSEARCH_URL
  if (!url?.trim()) {
    console.error('ELASTICSEARCH_URL no está definido')
    process.exit(1)
  }

  try {
    const ok = await ensureIndex()
    if (!ok) {
      console.error(
        'Elasticsearch no disponible. Revisar ELASTICSEARCH_URL y que el cluster esté activo.'
      )
      process.exit(1)
    }
  } catch (err) {
    console.error('Error ensureIndex:', err)
    process.exit(1)
  }

  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.status, 'active'))

  const docs = rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    publisherId: r.publisherId,
    propertyType: r.propertyType,
    operationType: r.operationType,
    status: r.status,
    title: r.title,
    description: r.description,
    address: r.address,
    locationLat: r.locationLat,
    locationLng: r.locationLng,
    priceAmount: r.priceAmount ?? 0,
    priceCurrency: r.priceCurrency ?? 'USD',
    surfaceTotal: r.surfaceTotal ?? 0,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    primaryImageUrl: r.primaryImageUrl,
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
  }))

  const { indexed, errors } = await bulkIndexListings(docs)
  console.log(`Indexadas: ${indexed}/${docs.length}, errores: ${errors}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
