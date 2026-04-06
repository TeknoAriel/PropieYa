#!/usr/bin/env npx tsx
/**
 * Sincroniza listings activos a Elasticsearch u OpenSearch/Bonsai (sin CRON_SECRET).
 * Usa DATABASE_URL y ELASTICSEARCH_URL. OpenSearch si `USE_OPENSEARCH=1`, `SEARCH_BACKEND=opensearch`
 * o URL `*.bonsai.io` (ver `apps/web/src/lib/search/listing-search-engine.ts`).
 *
 * Uso: DATABASE_URL=... ELASTICSEARCH_URL=... pnpm sync-search:local
 * Bonsai: ENV_FILE=apps/web/.env.prod.verificar pnpm reindex:bonsai
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
        'Índice de búsqueda no disponible (Elasticsearch u OpenSearch/Bonsai). Revisar ELASTICSEARCH_URL, credenciales y USE_OPENSEARCH si el host no es Bonsai (*.bonsai.io / *.bonsaisearch.net).'
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

  const docs = rows.map((r) => {
    const features = (r.features ?? {}) as {
      amenities?: string[]
      feedAmenityRaw?: string[]
      floor?: number | null
      totalFloors?: number | null
      escalera?: string | null
      orientation?: string | null
    }
    return {
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
      surfaceCovered: r.surfaceCovered ?? null,
      surfaceSemicovered: r.surfaceSemicovered ?? null,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      garages: r.garages ?? null,
      totalRooms: r.totalRooms ?? null,
      floor: features.floor ?? null,
      totalFloors: features.totalFloors ?? null,
      escalera: features.escalera ?? null,
      orientation: features.orientation ?? null,
      primaryImageUrl: r.primaryImageUrl,
      publishedAt: r.publishedAt,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
      amenities: features.amenities ?? [],
      feedAmenityRaw: features.feedAmenityRaw ?? [],
    }
  })

  const { indexed, errors } = await bulkIndexListings(docs)
  console.log(`Indexadas: ${indexed}/${docs.length}, errores: ${errors}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
