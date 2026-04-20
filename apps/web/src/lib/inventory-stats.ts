import { and, count, eq, isNotNull } from 'drizzle-orm'

import { db, listings, organizations } from '@propieya/database'

export type PublicInventoryStats = {
  /** Filas en tabla `organizations` (cuentas tipo inmobiliaria / org en el portal). */
  totalOrganizations: number
  totalListings: number
  activeListings: number
  listingsFromImportSource: number
  activeListingsFromImport: number
  listingsWithExternalId: number
  feedUrlConfigured: boolean
  /** URL del feed si está en env; si no, texto guía. */
  feedUrlHint: string
  cronIngestPath: string
  cronResponseNote: string
  ingestWebhookPath: string
  ingestWebhookNote: string
}

/**
 * Agregados sobre `listings` para visibilidad operativa (ingest vs manual).
 * No expone datos sensibles; sirve para `/api/inventory-stats` y página estado.
 */
export async function getPublicInventoryStats(): Promise<PublicInventoryStats> {
  const [
    [orgRow],
    [totalRow],
    [activeRow],
    [importRow],
    [activeImportRow],
    [extRow],
  ] = await Promise.all([
    db.select({ c: count() }).from(organizations),
    db.select({ c: count() }).from(listings),
    db
      .select({ c: count() })
      .from(listings)
      .where(eq(listings.status, 'active')),
    db
      .select({ c: count() })
      .from(listings)
      .where(eq(listings.source, 'import')),
    db
      .select({ c: count() })
      .from(listings)
      .where(
        and(eq(listings.status, 'active'), eq(listings.source, 'import'))
      ),
    db
      .select({ c: count() })
      .from(listings)
      .where(isNotNull(listings.externalId)),
  ])

  const trimmedFeed = process.env.YUMBLIN_JSON_URL?.trim()
  const feedUrlHint = trimmedFeed
    ? trimmedFeed
    : 'Default en código (Properstar vía static.kiteprop — ver docs/37 y 44).'

  return {
    totalOrganizations: Number(orgRow?.c ?? 0),
    totalListings: Number(totalRow?.c ?? 0),
    activeListings: Number(activeRow?.c ?? 0),
    listingsFromImportSource: Number(importRow?.c ?? 0),
    activeListingsFromImport: Number(activeImportRow?.c ?? 0),
    listingsWithExternalId: Number(extRow?.c ?? 0),
    feedUrlConfigured: Boolean(trimmedFeed),
    feedUrlHint,
    cronIngestPath: '/api/cron/import-yumblin',
    cronResponseNote:
      'Cada ejecución del cron devuelve JSON con totals (imported, updated, unchanged, withdrawn, etc.). Requiere header Authorization: Bearer <CRON_SECRET> si CRON_SECRET está definido en Vercel.',
    ingestWebhookPath: '/api/webhooks/kiteprop-ingest',
    ingestWebhookNote:
      'POST con Bearer KITEPROP_INGEST_WEBHOOK_SECRET (o CRON_SECRET si no hay webhook secret). Ignora IMPORT_SYNC_INTERVAL_HOURS. Ver docs/48.',
  }
}
