import { eq } from 'drizzle-orm'

import type { Database } from '@propieya/database'
import { leads, listings } from '@propieya/database'

import { createLead, isKitepropConfigured } from './kiteprop-client'

type KitepropLeadMeta = {
  syncedAt?: string
  syncStatus?: 'ok' | 'error'
  remoteId?: string | null
  lastError?: string
  lastAttemptAt?: string
  responsePreview?: string
}

function readKitepropMeta(enrichment: unknown): KitepropLeadMeta | undefined {
  if (!enrichment || typeof enrichment !== 'object') return undefined
  const k = (enrichment as Record<string, unknown>).kiteprop
  if (!k || typeof k !== 'object') return undefined
  return k as KitepropLeadMeta
}

/**
 * Tras activación (o creación ya activada), envía el lead a KiteProp una sola vez por éxito previo.
 * Idempotencia local: `enrichment.kiteprop.syncStatus === 'ok'`.
 * Reintenta si el último intento fue error.
 */
export async function syncActivatedLeadToKiteprop(
  db: Database,
  leadId: string
): Promise<void> {
  if (!isKitepropConfigured()) {
    return
  }

  const [row] = await db
    .select({
      id: leads.id,
      accessStatus: leads.accessStatus,
      contactName: leads.contactName,
      contactEmail: leads.contactEmail,
      contactPhone: leads.contactPhone,
      message: leads.message,
      enrichment: leads.enrichment,
      listingId: leads.listingId,
      listingTitle: listings.title,
      listingExternalId: listings.externalId,
    })
    .from(leads)
    .innerJoin(listings, eq(leads.listingId, listings.id))
    .where(eq(leads.id, leadId))
    .limit(1)

  if (!row || row.accessStatus !== 'activated') {
    return
  }

  const meta = readKitepropMeta(row.enrichment)
  if (meta?.syncStatus === 'ok') {
    return
  }

  const prev =
    row.enrichment && typeof row.enrichment === 'object'
      ? (row.enrichment as Record<string, unknown>)
      : {}

  const attemptAt = new Date().toISOString()

  const payload: Record<string, unknown> = {
    source: 'propieya',
    external_lead_id: row.id,
    propieya_listing_id: row.listingId,
    name: row.contactName,
    email: row.contactEmail,
    phone: row.contactPhone ?? undefined,
    message: row.message,
    property_title: row.listingTitle,
    property_external_id: row.listingExternalId ?? undefined,
  }

  const result = await createLead(payload)

  if (!result.ok) {
    console.error('[kiteprop-lead-sync] createLead falló', {
      leadId,
      status: result.status,
      message: result.message,
    })
    await db
      .update(leads)
      .set({
        enrichment: {
          ...prev,
          kiteprop: {
            ...meta,
            syncStatus: 'error' as const,
            lastError: result.message,
            lastAttemptAt: attemptAt,
          },
        },
      })
      .where(eq(leads.id, leadId))
    return
  }

  const data = result.data
  let remoteId: string | null = null
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const id = o.id ?? o.data
    if (typeof id === 'string' || typeof id === 'number') {
      remoteId = String(id)
    } else if (id && typeof id === 'object' && 'id' in id) {
      const inner = (id as Record<string, unknown>).id
      if (typeof inner === 'string' || typeof inner === 'number') remoteId = String(inner)
    }
  }

  const preview =
    typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 500)

  console.info('[kiteprop-lead-sync] createLead OK', {
    leadId,
    remoteId,
    httpStatus: result.status,
  })

  await db
    .update(leads)
    .set({
      enrichment: {
        ...prev,
        kiteprop: {
          ...meta,
          syncedAt: attemptAt,
          syncStatus: 'ok' as const,
          remoteId,
          lastAttemptAt: attemptAt,
          responsePreview: preview,
          lastError: undefined,
        },
      },
    })
    .where(eq(leads.id, leadId))
}

export function scheduleKitepropLeadSync(db: Database, leadId: string): void {
  void syncActivatedLeadToKiteprop(db, leadId).catch((err) => {
    console.error('[kiteprop-lead-sync] no manejado', { leadId, err })
  })
}
