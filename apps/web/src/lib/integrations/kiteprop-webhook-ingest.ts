import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  assessListingPublishability,
  computeImportContentHash,
  getListingPublishConfigFromEnv,
  LISTING_VALIDITY,
  listingRowToPublishabilityInput,
  mapYumblinItem,
  type MappedListingRow,
} from '@propieya/shared'
import {
  db,
  listingMedia,
  listings,
  organizationMemberships,
  organizations,
} from '@propieya/database'
import { and, eq } from 'drizzle-orm'

import { getPropertyByIdFromKiteProp } from '@/lib/integrations/kiteprop-properties'
import { removeListingFromSearch, syncListingToSearch } from '@/lib/search/sync'

type JsonRecord = Record<string, unknown>

export type KitepropWebhookEnvelope = {
  eventType: string
  eventId: string | null
  externalId: string | null
  propertyCode: string | null
}

export type KitepropWebhookProcessResult = {
  status: "created" | "updated" | "unchanged" | "ignored"
  listingId?: string
  reason?: string
}

export const SUPPORTED_KITEPROP_EVENTS = new Set(['property.created', 'property.updated'])

function asRecord(v: unknown): JsonRecord | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  return v as JsonRecord
}

function asString(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim()
    return t.length > 0 ? t : null
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v)
  return null
}

function isSafeHexSignature(v: string): boolean {
  return /^[a-f0-9]{64}$/i.test(v)
}

function constantTimeStringEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export function verifyKitepropWebhookSignature(input: {
  rawBody: string
  signatureHeader: string | null
  secret: string
}): boolean {
  const { rawBody, signatureHeader, secret } = input
  if (!signatureHeader || !secret) return false

  const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBase64 = createHmac('sha256', secret).update(rawBody).digest('base64')

  const rawCandidates = signatureHeader
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("sha256=")) return part.slice("sha256=".length).trim()
      if (part.includes("=")) return part.split("=").slice(1).join("=").trim()
      return part
    })

  for (const c of rawCandidates) {
    if (!c) continue
    if (isSafeHexSignature(c)) {
      if (constantTimeStringEquals(c.toLowerCase(), expectedHex)) return true
      continue
    }
    if (constantTimeStringEquals(c, expectedBase64)) return true
  }
  return false
}

export function parseKitepropWebhookEnvelope(payload: unknown): KitepropWebhookEnvelope | null {
  const root = asRecord(payload)
  if (!root) return null

  const eventType =
    asString(root.event) ??
    asString(root.type) ??
    asString(root.eventType) ??
    asString(root.event_type) ??
    null
  if (!eventType) return null

  const data = asRecord(root.data)
  const property = asRecord(data?.property)
  const entity = asRecord(root.entity)

  const externalId =
    asString(property?.id) ??
    asString(data?.property_id) ??
    asString(data?.id) ??
    asString(entity?.id) ??
    asString(root.property_id) ??
    null

  const propertyCode =
    asString(property?.code) ??
    asString(property?.public_code) ??
    asString(data?.property_code) ??
    asString(root.property_code) ??
    null

  const eventId =
    asString(root.id) ??
    asString(root.event_id) ??
    asString(data?.idempotency_key) ??
    null

  return {
    eventType,
    eventId,
    externalId,
    propertyCode,
  }
}

async function resolveImportActors(): Promise<{ organizationId: string; publisherId: string }> {
  const envOrganizationId = process.env.IMPORT_ORGANIZATION_ID?.trim()
  const envPublisherId = process.env.IMPORT_PUBLISHER_ID?.trim()
  if (envOrganizationId && envPublisherId) {
    return { organizationId: envOrganizationId, publisherId: envPublisherId }
  }

  const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1)
  if (!org) {
    throw new Error("No hay organizaciones en la base de datos.")
  }
  const [membership] = await db
    .select({ userId: organizationMemberships.userId })
    .from(organizationMemberships)
    .where(eq(organizationMemberships.organizationId, org.id))
    .limit(1)
  if (!membership?.userId) {
    throw new Error("No hay usuario asociado a la organización para publicar import.")
  }
  return { organizationId: org.id, publisherId: membership.userId }
}

function normalizeMappedAddress(address: unknown): unknown {
  if (typeof address !== "string") return address
  const trimmed = address.trim()
  if (!trimmed) return address
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return address
    }
  }
  return address
}

async function replaceListingMedia(listingId: string, urls: string[]): Promise<void> {
  await db.delete(listingMedia).where(eq(listingMedia.listingId, listingId))
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    if (!url) continue
    await db.insert(listingMedia).values({
      listingId,
      type: "image",
      url,
      order: i,
      isPrimary: i === 0,
    })
  }
}

function buildPublishability(mapped: MappedListingRow) {
  const config = getListingPublishConfigFromEnv()
  return assessListingPublishability(
    listingRowToPublishabilityInput(
      {
        operationType: mapped.operationType,
        propertyType: mapped.propertyType,
        priceAmount: mapped.priceAmount,
        priceCurrency: mapped.priceCurrency,
        title: mapped.title,
        description: mapped.description,
        address: mapped.address,
      },
      mapped.imageUrls.length,
      config
    )
  )
}

function publicationStatus(now: Date, publishable: ReturnType<typeof buildPublishability>) {
  const ingestAsDraft =
    (process.env.IMPORT_INGEST_AS_DRAFT ?? "").trim().toLowerCase() === "1" ||
    (process.env.IMPORT_INGEST_AS_DRAFT ?? "").trim().toLowerCase() === "true"

  if (ingestAsDraft) {
    return {
      status: "draft" as const,
      publishedAt: null,
      lastValidatedAt: null,
      expiresAt: null,
      lastContentUpdatedAt: null,
    }
  }

  if (!publishable.ok) {
    return {
      status: "rejected" as const,
      publishedAt: null,
      lastValidatedAt: null,
      expiresAt: null,
      lastContentUpdatedAt: null,
    }
  }

  return {
    status: "active" as const,
    publishedAt: now,
    lastValidatedAt: now,
    expiresAt: new Date(now.getTime() + LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
    lastContentUpdatedAt: now,
  }
}

export async function processKitepropPropertyEvent(
  envelope: KitepropWebhookEnvelope
): Promise<KitepropWebhookProcessResult> {
  if (!SUPPORTED_KITEPROP_EVENTS.has(envelope.eventType)) {
    return { status: "ignored", reason: "unsupported_event" }
  }

  const lookupId = envelope.externalId ?? envelope.propertyCode
  if (!lookupId) {
    return { status: "ignored", reason: "missing_property_identifier" }
  }

  const upstream = await getPropertyByIdFromKiteProp(lookupId)
  if (!upstream.ok) {
    throw new Error(`KiteProp upstream error (${upstream.status}): ${upstream.message}`)
  }
  if (!upstream.data?.raw) {
    return { status: "ignored", reason: "property_not_found_upstream" }
  }

  const { organizationId, publisherId } = await resolveImportActors()
  const mapped = mapYumblinItem(upstream.data.raw, {
    organizationId,
    publisherId,
    externalId: envelope.externalId ?? undefined,
  })
  if (!mapped || !mapped.externalId) {
    return { status: "ignored", reason: "payload_not_mappable" }
  }

  const now = new Date()
  const hash = computeImportContentHash(mapped)
  const publishable = buildPublishability(mapped)
  const pub = publicationStatus(now, publishable)

  const [existing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.organizationId, organizationId), eq(listings.externalId, mapped.externalId)))
    .limit(1)

  if (existing && existing.importContentHash === hash) {
    return { status: "unchanged", listingId: existing.id }
  }

  const basePatch = {
    publisherId: mapped.publisherId,
    importContentHash: hash,
    propertyType: mapped.propertyType,
    operationType: mapped.operationType,
    source: "import" as const,
    address: normalizeMappedAddress(mapped.address),
    title: mapped.title,
    description: mapped.description,
    priceAmount: mapped.priceAmount,
    priceCurrency: mapped.priceCurrency,
    surfaceTotal: mapped.surfaceTotal,
    surfaceCovered: mapped.surfaceCovered ?? null,
    surfaceSemicovered: mapped.surfaceSemicovered ?? null,
    surfaceLand: mapped.surfaceLand ?? null,
    bedrooms: mapped.bedrooms,
    bathrooms: mapped.bathrooms,
    garages: mapped.garages ?? null,
    totalRooms: mapped.totalRooms ?? null,
    locationLat: mapped.locationLat,
    locationLng: mapped.locationLng,
    primaryImageUrl: mapped.primaryImageUrl,
    mediaCount: mapped.imageUrls.length,
    features: mapped.features ?? { amenities: mapped.amenities ?? [] },
    updatedAt: now,
  }

  if (!existing) {
    const [created] = await db
      .insert(listings)
      .values({
        organizationId,
        externalId: mapped.externalId,
        ...basePatch,
        status: pub.status,
        publishedAt: pub.publishedAt,
        lastValidatedAt: pub.lastValidatedAt,
        expiresAt: pub.expiresAt,
        lastContentUpdatedAt: pub.lastContentUpdatedAt,
      })
      .returning({ id: listings.id, status: listings.status })
    if (!created) throw new Error("No se pudo crear listing importado desde webhook.")

    await replaceListingMedia(created.id, mapped.imageUrls)
    if (created.status === "active") {
      await syncListingToSearch(db, created.id).catch((e) =>
        console.error("[kiteprop-webhook] search sync create failed", {
          listingId: created.id,
          message: e instanceof Error ? e.message : String(e),
        })
      )
    } else {
      await removeListingFromSearch(created.id).catch(() => {})
    }
    return { status: "created", listingId: created.id }
  }

  const wasLive = existing.status === "active" || existing.status === "expiring_soon"
  const updatePatch: Record<string, unknown> = { ...basePatch }
  if (wasLive && !publishable.ok) {
    updatePatch.status = "draft"
    updatePatch.publishedAt = null
    updatePatch.lastValidatedAt = null
    updatePatch.expiresAt = null
    updatePatch.lastContentUpdatedAt = null
  } else if (wasLive && publishable.ok) {
    updatePatch.lastContentUpdatedAt = now
  } else {
    updatePatch.status = pub.status
    updatePatch.publishedAt = pub.publishedAt
    updatePatch.lastValidatedAt = pub.lastValidatedAt
    updatePatch.expiresAt = pub.expiresAt
    updatePatch.lastContentUpdatedAt = pub.lastContentUpdatedAt
  }

  const [updated] = await db
    .update(listings)
    .set(updatePatch)
    .where(eq(listings.id, existing.id))
    .returning({ id: listings.id, status: listings.status })
  if (!updated) throw new Error("No se pudo actualizar listing importado desde webhook.")

  await replaceListingMedia(existing.id, mapped.imageUrls)
  if (updated.status === "active") {
    await syncListingToSearch(db, existing.id).catch((e) =>
      console.error("[kiteprop-webhook] search sync update failed", {
        listingId: existing.id,
        message: e instanceof Error ? e.message : String(e),
      })
    )
  } else {
    await removeListingFromSearch(existing.id).catch(() => {})
  }

  return { status: "updated", listingId: existing.id }
}
