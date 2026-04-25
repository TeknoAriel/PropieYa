import { eq } from 'drizzle-orm'

import type { Database } from '@propieya/database'
import { leads, listings } from '@propieya/database'

import { isKitepropConfigured } from './kiteprop-client'
import { createPropertyInquiryInKiteProp } from './kiteprop-properties'

type KitepropLeadMeta = {
  syncedAt?: string
  syncStatus?: 'ok' | 'error'
  remoteId?: string | null
  lastError?: string
  lastAttemptAt?: string
  responsePreview?: string
}

type LeadRoutingMeta = {
  assignedUserId?: string | null
  assignedUserName?: string | null
}

function readKitepropMeta(enrichment: unknown): KitepropLeadMeta | undefined {
  if (!enrichment || typeof enrichment !== 'object') return undefined
  const k = (enrichment as Record<string, unknown>).kiteprop
  if (!k || typeof k !== 'object') return undefined
  return k as KitepropLeadMeta
}

function readRoutingMeta(enrichment: unknown): LeadRoutingMeta | undefined {
  if (!enrichment || typeof enrichment !== 'object') return undefined
  return enrichment as LeadRoutingMeta
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

  const routing = readRoutingMeta(row.enrichment)

  const inquiry = await createPropertyInquiryInKiteProp({
    property_id: row.listingExternalId ?? undefined,
    property_code: row.listingExternalId ?? undefined,
    property_title: row.listingTitle,
    source: 'Propieya',
    page_url:
      (row.enrichment as Record<string, unknown> | null | undefined)?.pageUrl as
        | string
        | undefined,
    lead_intent_id: row.id,
    name: row.contactName,
    email: row.contactEmail,
    phone: row.contactPhone ?? undefined,
    message: row.message,
    assigned_user_id: routing?.assignedUserId ?? undefined,
    assigned_user_name: routing?.assignedUserName ?? undefined,
  })

  if (!inquiry.ok) {
    if (inquiry.reason === 'contract_not_confirmed' || inquiry.reason === 'not_configured') {
      return
    }
    console.error('[kiteprop-lead-sync] createPropertyInquiryInKiteProp falló', {
      leadId,
      reason: inquiry.reason,
      message: inquiry.message,
    })
    await db
      .update(leads)
      .set({
        enrichment: {
          ...prev,
          kiteprop: {
            ...meta,
            syncStatus: 'error' as const,
            lastError: inquiry.message,
            lastAttemptAt: attemptAt,
          },
        },
      })
      .where(eq(leads.id, leadId))
    return
  }

  const remoteId = inquiry.contactId ?? null
  const preview = JSON.stringify({ mode: inquiry.mode, contactId: inquiry.contactId ?? null })

  console.info('[kiteprop-lead-sync] createPropertyInquiryInKiteProp OK', {
    leadId,
    remoteId,
    mode: inquiry.mode,
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
