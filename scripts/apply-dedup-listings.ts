#!/usr/bin/env npx tsx
/**
 * Marca avisos duplicados dentro de la misma organización (huella `computeListingDedupFingerprint`).
 * El “canonical” es el más reciente por `publishedAt` (empate: `qualityScore`).
 * Tras ejecutar: `pnpm sync-search:local` o CRON sync-search para actualizar ES.
 *
 * Uso: DATABASE_URL=... pnpm dedup:apply
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
import { computeListingDedupFingerprint } from '@propieya/shared'

async function main() {
  await db.update(listings).set({ dedupCanonicalId: null })

  const rows = await db.query.listings.findMany({
    where: eq(listings.status, 'active'),
  })

  const byFp = new Map<string, typeof rows>()
  for (const r of rows) {
    const fp = computeListingDedupFingerprint({
      organizationId: r.organizationId,
      title: r.title,
      priceAmount: r.priceAmount ?? 0,
      surfaceTotal: r.surfaceTotal ?? 0,
      locationLat: r.locationLat,
      locationLng: r.locationLng,
    })
    const arr = byFp.get(fp) ?? []
    arr.push(r)
    byFp.set(fp, arr)
  }

  let marked = 0
  for (const [, group] of byFp) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => {
      const ta = a.publishedAt?.getTime() ?? 0
      const tb = b.publishedAt?.getTime() ?? 0
      if (tb !== ta) return tb - ta
      return (b.qualityScore ?? 0) - (a.qualityScore ?? 0)
    })
    const canonical = sorted[0]!
    for (let i = 1; i < sorted.length; i++) {
      const dup = sorted[i]!
      await db
        .update(listings)
        .set({ dedupCanonicalId: canonical.id })
        .where(eq(listings.id, dup.id))
      marked += 1
    }
  }

  console.log(
    `Duplicados marcados (dedup_canonical_id): ${marked} / ${rows.length} avisos activos.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
