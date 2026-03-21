#!/usr/bin/env npx tsx
/**
 * Importa propiedades desde el feed JSON Yumblin (Kiteprop).
 *
 * Uso:
 *   pnpm import:yumblin
 *   pnpm import:yumblin -- --file=./lacapital.json
 *   IMPORT_ORGANIZATION_ID=xxx IMPORT_PUBLISHER_ID=yyy pnpm import:yumblin
 *
 * Variables:
 *   DATABASE_URL          - Obligatoria
 *   IMPORT_ORGANIZATION_ID - UUID de la organización destino
 *   IMPORT_PUBLISHER_ID   - UUID del usuario publicador
 *   YUMBLIN_JSON_URL     - URL del feed (default: yumblin.json en docs/19)
 */

import 'dotenv/config'

import { eq } from 'drizzle-orm'

import {
  db,
  listings,
  listingMedia,
  organizations,
  organizationMemberships,
} from '@propieya/database'
import {
  extractListingsFromFeed,
  mapYumblinItem,
} from '@propieya/shared'

const YUMBLIN_URL =
  process.env.YUMBLIN_JSON_URL ??
  'https://static.kiteprop.com/kp/difusions/23705a4a85ab8f1d301c73aae5359a81a8b5c1ca/yumblin.json'

async function main() {
  const orgId = process.env.IMPORT_ORGANIZATION_ID
  const pubId = process.env.IMPORT_PUBLISHER_ID

  const fileArg = process.argv.find((a) => a.startsWith('--file='))
  const filePath = fileArg?.slice('--file='.length)

  let raw: unknown

  if (filePath) {
    const fs = await import('node:fs/promises')
    const buf = await fs.readFile(filePath, 'utf-8')
    raw = JSON.parse(buf)
  } else {
    const res = await fetch(YUMBLIN_URL)
    if (!res.ok) {
      throw new Error(`Error al obtener feed: ${res.status} ${res.statusText}`)
    }
    raw = await res.json()
  }

  const items = extractListingsFromFeed(raw)
  console.log(`Items en el feed: ${items.length}`)

  if (items.length === 0) {
    console.log('No hay propiedades para importar.')
    return
  }

  let organizationId = orgId
  let publisherId = pubId

  if (!organizationId || !publisherId) {
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .limit(1)

    if (!org) {
      console.error(
        'No hay organizaciones en la DB. Creá una desde el panel o usá IMPORT_ORGANIZATION_ID.'
      )
      process.exit(1)
    }
    organizationId = org.id

    const [membership] = await db
      .select({ userId: organizationMemberships.userId })
      .from(organizationMemberships)
      .where(eq(organizationMemberships.organizationId, org.id))
      .limit(1)

    if (!membership) {
      console.error(
        'No hay miembros en la organización. Usá IMPORT_PUBLISHER_ID con un user existente.'
      )
      process.exit(1)
    }
    publisherId = membership.userId
    console.log(`Usando org ${organizationId}, publisher ${publisherId}`)
  }

  const input = { organizationId, publisherId }
  let imported = 0
  let skipped = 0

  for (const item of items) {
    const mapped = mapYumblinItem(item as Record<string, unknown>, input)
    if (!mapped) {
      skipped++
      continue
    }

    const [inserted] = await db
      .insert(listings)
      .values({
        organizationId: mapped.organizationId,
        publisherId: mapped.publisherId,
        externalId: mapped.externalId,
        propertyType: mapped.propertyType,
        operationType: mapped.operationType,
        source: 'import',
        address: mapped.address,
        title: mapped.title,
        description: mapped.description,
        priceAmount: mapped.priceAmount,
        priceCurrency: mapped.priceCurrency,
        surfaceTotal: mapped.surfaceTotal,
        bedrooms: mapped.bedrooms,
        bathrooms: mapped.bathrooms,
        locationLat: mapped.locationLat,
        locationLng: mapped.locationLng,
        primaryImageUrl: mapped.primaryImageUrl,
        mediaCount: mapped.imageUrls.length,
        status: 'draft',
      })
      .returning({ id: listings.id })

    if (inserted && mapped.imageUrls.length > 0) {
      for (let i = 0; i < mapped.imageUrls.length; i++) {
        await db.insert(listingMedia).values({
          listingId: inserted.id,
          type: 'image',
          url: mapped.imageUrls[i],
          order: i,
          isPrimary: i === 0,
        })
      }
    }

    imported++
  }

  console.log(`Importadas: ${imported}, omitidas: ${skipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
