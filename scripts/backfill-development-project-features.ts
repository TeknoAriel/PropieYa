/**
 * Persiste `features.developmentProjectKey` y `developmentProjectName` en unidades activas.
 *
 * Uso: DATABASE_URL=... pnpm backfill:development-project
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { and, eq } from 'drizzle-orm'

import { getDb, listings } from '@propieya/database'
import { developmentProjectFieldsFromFeedItem } from '@propieya/shared'

config({ path: resolve(__dirname, '../apps/web/.env.local') })
config({ path: resolve(__dirname, '../apps/web/.env') })

const BATCH = 200

async function main() {
  const db = getDb()
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      address: listings.address,
      features: listings.features,
    })
    .from(listings)
    .where(
      and(eq(listings.status, 'active'), eq(listings.propertyType, 'development_unit'))
    )

  let updated = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    for (const row of chunk) {
      const address = (row.address ?? {}) as {
        city?: string
        neighborhood?: string
      }
      const city = String(address.city ?? '').trim() || 'Argentina'
      const neighborhood = address.neighborhood
        ? String(address.neighborhood).trim()
        : null

      const fields = developmentProjectFieldsFromFeedItem(
        {},
        row.title,
        city,
        neighborhood
      )

      const f = row.features && typeof row.features === 'object' && !Array.isArray(row.features)
        ? (row.features as Record<string, unknown>)
        : {}

      if (
        f.developmentProjectKey === fields.developmentProjectKey &&
        f.developmentProjectName === fields.developmentProjectName
      ) {
        continue
      }

      const merged = {
        ...f,
        developmentProjectKey: fields.developmentProjectKey,
        developmentProjectName: fields.developmentProjectName,
        ...(fields.deliveryDate ? { deliveryDate: fields.deliveryDate } : {}),
      }

      await db
        .update(listings)
        .set({ features: merged })
        .where(eq(listings.id, row.id))

      updated += 1
    }
  }

  console.log('Listings development_unit:', rows.length, 'actualizados:', updated)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
