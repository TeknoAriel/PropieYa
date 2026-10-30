/**
 * Vigencia de avisos `source=import`: la fuente de verdad es el feed
 * (alta / update / withdrawn), no el calendario de 30 días de avisos manuales.
 *
 * Sin esto, un JSON 304 o ítems unchanged dejan `expires_at` viejo y
 * `check-validity` / `listing-stale-content` vacían el portal sin pegarle al origen.
 */
import { LISTING_VALIDITY } from '@propieya/shared'
import { and, count, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm'

import { db } from './client'
import { listings } from './schema'

/** Estados que el calendario / stale-content usaron para sacar import del portal. */
export const IMPORT_CALENDAR_REACTIVATABLE_STATUSES = [
  'suspended',
  'expired',
  'expiring_soon',
] as const

const IMPORT_HEARTBEAT_STATUSES = [
  'active',
  ...IMPORT_CALENDAR_REACTIVATABLE_STATUSES,
] as const

export type ImportValidityHeartbeatResult = {
  reactivated: number
  updated: number
}

function expiresAtFrom(now: Date): Date {
  return new Date(
    now.getTime() + LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  )
}

function sourceScope(
  importFeedSourceId: string | undefined,
  includeUnassigned: boolean
): SQL | undefined {
  if (!importFeedSourceId) return undefined
  if (includeUnassigned) {
    return or(
      eq(listings.importFeedSourceId, importFeedSourceId),
      isNull(listings.importFeedSourceId)
    )
  }
  return eq(listings.importFeedSourceId, importFeedSourceId)
}

/**
 * Reactiva import `suspended`/`expired`/`expiring_soon` y renueva `expires_at`
 * de los activos. No toca withdrawn / draft / rejected / sold / archived.
 * Un solo UPDATE; no llama a KiteProp ni descarga el feed.
 */
export async function heartbeatImportCatalogValidity(input: {
  organizationId?: string
  importFeedSourceId?: string
  includeUnassigned?: boolean
  now?: Date
} = {}): Promise<ImportValidityHeartbeatResult> {
  const now = input.now ?? new Date()
  const expiresAt = expiresAtFrom(now)
  const scope = sourceScope(
    input.importFeedSourceId,
    input.includeUnassigned === true
  )

  const baseWhere = and(
    eq(listings.source, 'import'),
    inArray(listings.status, [...IMPORT_HEARTBEAT_STATUSES]),
    ...(input.organizationId
      ? [eq(listings.organizationId, input.organizationId)]
      : []),
    ...(scope ? [scope] : [])
  )

  const [toReactivate] = await db
    .select({ c: count() })
    .from(listings)
    .where(
      and(
        eq(listings.source, 'import'),
        inArray(listings.status, [...IMPORT_CALENDAR_REACTIVATABLE_STATUSES]),
        ...(input.organizationId
          ? [eq(listings.organizationId, input.organizationId)]
          : []),
        ...(scope ? [scope] : [])
      )
    )

  const updatedRows = await db
    .update(listings)
    .set({
      status: sql`CASE
        WHEN ${listings.status} IN ('suspended', 'expired', 'expiring_soon') THEN 'active'
        ELSE ${listings.status}
      END`,
      publishedAt: sql`COALESCE(${listings.publishedAt}, NOW())`,
      lastValidatedAt: now,
      expiresAt,
      updatedAt: now,
    })
    .where(baseWhere)
    .returning({ id: listings.id })

  return {
    reactivated: Number(toReactivate?.c ?? 0),
    updated: updatedRows.length,
  }
}
