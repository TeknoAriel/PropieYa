import { eq, sql } from 'drizzle-orm'

import type { Database } from '@propieya/database'
import { leads, listings } from '@propieya/database'

import { getKitepropPropertyIdFromListingFeatures } from '@propieya/shared'

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

export function isLeadEligibleForKitepropSync(
  accessStatus: string,
  listingSource: string
): boolean {
  return accessStatus === 'activated' || listingSource === 'import'
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

async function persistKitepropSyncMeta(
  db: Database,
  leadId: string,
  prev: Record<string, unknown>,
  meta: KitepropLeadMeta | undefined,
  patch: KitepropLeadMeta
): Promise<void> {
  await db
    .update(leads)
    .set({
      enrichment: {
        ...prev,
        kiteprop: {
          ...meta,
          ...patch,
        },
      },
    })
    .where(eq(leads.id, leadId))
}

/**
 * Envía el lead a KiteProp (POST /messages con property_id cuando aplica).
 * Idempotencia: no reenvía si `enrichment.kiteprop.syncStatus === 'ok'`.
 */
export async function syncActivatedLeadToKiteprop(
  db: Database,
  leadId: string
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const [row] = await db
    .select({
      id: leads.id,
      accessStatus: leads.accessStatus,
      listingSource: listings.source,
      contactName: leads.contactName,
      contactEmail: leads.contactEmail,
      contactPhone: leads.contactPhone,
      message: leads.message,
      enrichment: leads.enrichment,
      listingId: leads.listingId,
      listingTitle: listings.title,
      listingExternalId: listings.externalId,
      listingFeatures: listings.features,
    })
    .from(leads)
    .innerJoin(listings, eq(leads.listingId, listings.id))
    .where(eq(leads.id, leadId))
    .limit(1)

  if (!row) {
    console.warn('[kiteprop-lead-sync] skip_missing_lead', { leadId })
    return { ok: false, skipped: 'missing_lead' }
  }

  const prev =
    row.enrichment && typeof row.enrichment === 'object'
      ? (row.enrichment as Record<string, unknown>)
      : {}

  const meta = readKitepropMeta(row.enrichment)
  const attemptAt = new Date().toISOString()
  const configured = isKitepropConfigured()
  const kitepropPropertyId = getKitepropPropertyIdFromListingFeatures(row.listingFeatures)

  console.info('[kiteprop-lead-sync] start', {
    leadId,
    configured,
    accessStatus: row.accessStatus,
    listingSource: row.listingSource,
    listingExternalId: row.listingExternalId ?? null,
    kitepropPropertyId,
  })

  if (!configured) {
    const err = 'KITEPROP_API_KEY no configurada en el portal (Vercel)'
    console.warn('[kiteprop-lead-sync] skip_not_configured', { leadId })
    await persistKitepropSyncMeta(db, leadId, prev, meta, {
      syncStatus: 'error',
      lastError: err,
      lastAttemptAt: attemptAt,
    })
    return { ok: false, error: err }
  }

  if (!isLeadEligibleForKitepropSync(row.accessStatus, row.listingSource)) {
    console.info('[kiteprop-lead-sync] skip_not_eligible', {
      leadId,
      accessStatus: row.accessStatus,
      listingSource: row.listingSource,
    })
    return { ok: false, skipped: 'not_eligible' }
  }

  if (meta?.syncStatus === 'ok') {
    console.info('[kiteprop-lead-sync] skip_already_synced', { leadId })
    return { ok: true, skipped: 'already_synced' }
  }

  const routing = readRoutingMeta(row.enrichment)

  const inquiry = await createPropertyInquiryInKiteProp({
    kiteprop_property_id: kitepropPropertyId ?? undefined,
    property_id: kitepropPropertyId ?? row.listingExternalId ?? undefined,
    property_code: row.listingExternalId ?? undefined,
    external_id: row.listingExternalId ?? undefined,
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
      return { ok: false, error: inquiry.message }
    }
    console.error('[kiteprop-lead-sync] createPropertyInquiryInKiteProp falló', {
      leadId,
      reason: inquiry.reason,
      message: inquiry.message,
    })
    await persistKitepropSyncMeta(db, leadId, prev, meta, {
      syncStatus: 'error',
      lastError: inquiry.message,
      lastAttemptAt: attemptAt,
    })
    return { ok: false, error: inquiry.message }
  }

  const remoteId = inquiry.contactId ?? null
  const preview = JSON.stringify({
    mode: inquiry.mode,
    contactId: inquiry.contactId ?? null,
    propertyId: kitepropPropertyId ?? null,
    externalId: row.listingExternalId ?? null,
  })

  console.info('[kiteprop-lead-sync] createPropertyInquiryInKiteProp OK', {
    leadId,
    remoteId,
    mode: inquiry.mode,
  })

  await persistKitepropSyncMeta(db, leadId, prev, meta, {
    syncedAt: attemptAt,
    syncStatus: 'ok',
    remoteId,
    lastAttemptAt: attemptAt,
    responsePreview: preview,
    lastError: undefined,
  })

  return { ok: true }
}

/** Reintenta leads elegibles sin sync OK (últimas N horas). */
export async function retryFailedKitepropLeadSyncs(
  db: Database,
  options?: { sinceHours?: number; limit?: number }
): Promise<{ attempted: number; succeeded: number; failed: number; skipped: number }> {
  const sinceHours = Math.min(168, Math.max(1, options?.sinceHours ?? 72))
  const limit = Math.min(100, Math.max(1, options?.limit ?? 40))

  const rows = await db.execute(sql`
    select l.id as lead_id
    from leads l
    inner join listings li on li.id = l.listing_id
    where l.created_at >= now() - (${sinceHours} || ' hours')::interval
      and (
        l.access_status = 'activated'
        or li.source = 'import'
      )
      and coalesce(l.enrichment->'kiteprop'->>'syncStatus', '') is distinct from 'ok'
    order by l.created_at desc
    limit ${limit}
  `)

  const leadIds = (rows as unknown as Array<{ lead_id: string }>).map((r) => r.lead_id)
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (const leadId of leadIds) {
    const result = await syncActivatedLeadToKiteprop(db, leadId)
    if (result.skipped) skipped += 1
    else if (result.ok) succeeded += 1
    else failed += 1
  }

  return { attempted: leadIds.length, succeeded, failed, skipped }
}

/**
 * Dispara sync a KiteProp. En lead.create/activate se debe **await** esta promesa
 * (serverless no garantiza trabajo fire-and-forget tras la respuesta HTTP).
 */
export function scheduleKitepropLeadSync(db: Database, leadId: string): Promise<void> {
  return syncActivatedLeadToKiteprop(db, leadId).then((result) => {
    if (!result.ok && result.error) {
      console.error('[kiteprop-lead-sync] sync falló', { leadId, error: result.error })
    }
  })
}
