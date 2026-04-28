import { and, eq } from 'drizzle-orm'

import { getDb, listings, organizations, paymentWebhookEvents } from '@propieya/database'
import {
  defaultPortalCommercialCatalog,
  portalCommercialCatalogItemSchema,
  portalPackagePurchaseSchema,
  portalUpgradeOrderRequestSchema,
  portalUpgradePaymentRecordSchema,
  portalUpgradeRecordSchema,
  resolveTemporalUpgradeStatus,
  type PortalCommercialCatalogItem,
  type PortalPackagePurchase,
  type PortalUpgradeOrderRequest,
  type PortalUpgradePaymentRecord,
  type PortalUpgradeRecord,
} from '@propieya/shared'

import {
  normalizeMercadoPagoDataId,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/payments/mercadopago-webhook-verify'
import { fetchMercadoPagoPaymentById } from '@/lib/payments/mercadopago-upgrade-checkout'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseCatalog(settings: unknown): PortalCommercialCatalogItem[] {
  const list = (settings as { portalCommercialCatalog?: unknown } | null | undefined)
    ?.portalCommercialCatalog
  if (!Array.isArray(list)) return []
  return list
    .map((item) => portalCommercialCatalogItemSchema.safeParse(item))
    .filter((r): r is { success: true; data: PortalCommercialCatalogItem } => r.success)
    .map((r) => r.data)
}

function effectiveCatalog(settings: unknown): PortalCommercialCatalogItem[] {
  const defaults = defaultPortalCommercialCatalog()
  const overrides = parseCatalog(settings)
  if (overrides.length === 0) return defaults
  const byId = new Map(defaults.map((item) => [item.id, item]))
  for (const item of overrides) byId.set(item.id, item)
  return Array.from(byId.values())
}

function parseOrders(settings: unknown): PortalUpgradeOrderRequest[] {
  const list = (settings as { portalUpgradeOrderRequests?: unknown } | null | undefined)
    ?.portalUpgradeOrderRequests
  if (!Array.isArray(list)) return []
  return list
    .map((item) => portalUpgradeOrderRequestSchema.safeParse(item))
    .filter((r): r is { success: true; data: PortalUpgradeOrderRequest } => r.success)
    .map((r) => r.data)
}

function parsePayments(settings: unknown): PortalUpgradePaymentRecord[] {
  const list = (settings as { portalUpgradePayments?: unknown } | null | undefined)
    ?.portalUpgradePayments
  if (!Array.isArray(list)) return []
  return list
    .map((item) => portalUpgradePaymentRecordSchema.safeParse(item))
    .filter((r): r is { success: true; data: PortalUpgradePaymentRecord } => r.success)
    .map((r) => r.data)
}

function parsePackages(settings: unknown) {
  const list = (settings as { portalUpgradePackages?: unknown } | null | undefined)
    ?.portalUpgradePackages
  if (!Array.isArray(list)) return []
  return list
    .map((item) => portalPackagePurchaseSchema.safeParse(item))
    .filter((r): r is { success: true; data: PortalPackagePurchase } => r.success)
    .map((r) => r.data)
}

function parseListingUpgrades(features: unknown) {
  const list = (features as { visibilityUpgrades?: unknown } | null | undefined)?.visibilityUpgrades
  if (!Array.isArray(list)) return []
  return list
    .map((item) => portalUpgradeRecordSchema.safeParse(item))
    .filter((r): r is { success: true; data: PortalUpgradeRecord } => r.success)
    .map((r) => r.data)
}

function mapMercadoPagoStatus(status: string): PortalUpgradePaymentRecord['status'] {
  if (status === 'approved') return 'paid'
  if (status === 'rejected') return 'payment_failed'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'refunded' || status === 'charged_back') return 'refunded'
  if (status === 'in_process' || status === 'authorized') return 'payment_processing'
  return 'pending_payment'
}

function readWebhookTsSkewMs(): number {
  const raw = process.env.MERCADOPAGO_WEBHOOK_TS_SKEW_MS?.trim()
  if (raw === '0') return 0
  if (raw === undefined || raw === '') return 600_000
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 600_000
}

/**
 * Webhook Mercado Pago: auditoría + idempotencia por `externalEventId` (índice único parcial en DB).
 * Si `MERCADOPAGO_WEBHOOK_SECRET` está definido, valida `x-signature` (HMAC-SHA256).
 * Manifest alineado a MP: puede omitir `id` y/o `request-id` si no aplican.
 * Documentación: docs/39-MONETIZACION-MERCADOPAGO.md
 */
export async function POST(request: Request) {
  const raw = await request.text()
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = payload as Record<string, unknown>
  const data = body?.data as Record<string, unknown> | undefined
  const fromBody =
    data?.id != null && (typeof data.id === 'string' || typeof data.id === 'number')
      ? String(data.id)
      : ''
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get('data.id') ?? ''
  const dataIdRaw = fromQuery || fromBody
  const dataIdNorm = dataIdRaw ? normalizeMercadoPagoDataId(dataIdRaw) : ''

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  if (secret) {
    const ok = verifyMercadoPagoWebhookSignature({
      secret,
      xSignature: request.headers.get('x-signature'),
      xRequestId: request.headers.get('x-request-id'),
      dataId: dataIdNorm || undefined,
      maxSkewMs: readWebhookTsSkewMs(),
    })
    if (!ok) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const externalId =
    (typeof data?.id === 'string' || typeof data?.id === 'number'
      ? String(data.id)
      : null) ??
    (typeof body?.id === 'string' ? body.id : null)

  const eventType =
    typeof body?.type === 'string'
      ? body.type
      : typeof body?.action === 'string'
        ? body.action
        : 'unknown'

  const db = getDb()
  const extSlice = externalId ? externalId.slice(0, 128) : null

  try {
    const inserted = await db
      .insert(paymentWebhookEvents)
      .values({
        provider: 'mercadopago',
        externalEventId: extSlice,
        eventType: eventType.slice(0, 64),
        payload: body as object,
      })
      .onConflictDoNothing({
        target: [paymentWebhookEvents.provider, paymentWebhookEvents.externalEventId],
      })
      .returning({ id: paymentWebhookEvents.id })

    if (extSlice && inserted.length === 0) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch (err) {
    console.error('[mercadopago webhook] persist error', err)
  }

  try {
    const resourceDataId =
      (typeof data?.id === 'string' || typeof data?.id === 'number'
        ? String(data.id)
        : null) ?? null
    if (!resourceDataId) {
      return new Response(JSON.stringify({ ok: true, ignored: 'missing_data_id' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const payment = await fetchMercadoPagoPaymentById(resourceDataId)
    const metadata = payment.metadata ?? {}
    const orderRequestId =
      typeof metadata.orderRequestId === 'string' ? metadata.orderRequestId : null
    const organizationId =
      typeof metadata.organizationId === 'string' ? metadata.organizationId : null
    const paymentRecordId =
      typeof metadata.paymentRecordId === 'string' ? metadata.paymentRecordId : null
    if (!orderRequestId || !organizationId || !paymentRecordId) {
      return new Response(JSON.stringify({ ok: true, ignored: 'missing_upgrade_metadata' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    })
    if (!org) {
      return new Response(JSON.stringify({ ok: true, ignored: 'organization_not_found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const nowIso = new Date().toISOString()
    const orders = parseOrders(org.settings)
    const payments = parsePayments(org.settings)
    const order = orders.find((item) => item.id === orderRequestId)
    if (!order) {
      return new Response(JSON.stringify({ ok: true, ignored: 'order_not_found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const paymentStatus = mapMercadoPagoStatus(payment.status)
    const paymentIndex = payments.findIndex((item) => item.id === paymentRecordId)
    if (paymentIndex < 0) {
      return new Response(JSON.stringify({ ok: true, ignored: 'payment_record_not_found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const currentPayment = payments[paymentIndex]!
    const nextPayment: PortalUpgradePaymentRecord = {
      ...currentPayment,
      providerPaymentId: payment.id,
      status: paymentStatus,
      statusDetail: payment.statusDetail ?? null,
      rawProviderPayload: payment.raw,
      paidAt: paymentStatus === 'paid' ? payment.dateApproved ?? nowIso : currentPayment.paidAt ?? null,
      failedAt: paymentStatus === 'payment_failed' ? nowIso : currentPayment.failedAt ?? null,
      cancelledAt: paymentStatus === 'cancelled' ? nowIso : currentPayment.cancelledAt ?? null,
      refundedAt: paymentStatus === 'refunded' ? nowIso : currentPayment.refundedAt ?? null,
      updatedAt: nowIso,
    }
    const nextPayments = payments.slice()
    nextPayments[paymentIndex] = nextPayment
    const nextOrders = orders.map((item) =>
      item.id === orderRequestId
        ? {
            ...item,
            status:
              paymentStatus === 'paid'
                ? 'active'
                : paymentStatus === 'cancelled'
                  ? 'cancelled'
                  : item.status,
            latestPaymentId: paymentRecordId,
            updatedAt: nowIso,
          }
        : item
    )
    const settingsObj =
      org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
        ? { ...(org.settings as Record<string, unknown>) }
        : {}
    settingsObj.portalUpgradePayments = nextPayments
    settingsObj.portalUpgradeOrderRequests = nextOrders

    if (paymentStatus === 'paid') {
      if (order.purchaseType === 'package' && order.relatedPackagePurchaseId) {
        const packages = parsePackages(org.settings)
        settingsObj.portalUpgradePackages = packages.map((pkg) =>
          pkg.id === order.relatedPackagePurchaseId
            ? {
                ...pkg,
                status: 'active',
                startsAt: pkg.startsAt ?? nowIso,
                updatedAt: nowIso,
              }
            : pkg
        )
      }
      if (order.purchaseType === 'listing' && order.relatedUpgradeId && order.listingId) {
        const listing = await db.query.listings.findFirst({
          where: and(
            eq(listings.id, order.listingId),
            eq(listings.organizationId, org.id)
          ),
        })
        if (listing) {
          const upgrades = parseListingUpgrades(listing.features)
          const updatedUpgrades = upgrades.map((upgrade) =>
            upgrade.id === order.relatedUpgradeId
              ? {
                  ...upgrade,
                  status: resolveTemporalUpgradeStatus(
                    'active',
                    upgrade.startsAt ?? nowIso,
                    upgrade.endsAt ?? null
                  ),
                  updatedAt: nowIso,
                }
              : upgrade
          )
          const featuresObj =
            listing.features && typeof listing.features === 'object' && !Array.isArray(listing.features)
              ? { ...(listing.features as Record<string, unknown>) }
              : {}
          featuresObj.visibilityUpgrades = updatedUpgrades
          const selected = effectiveCatalog(org.settings).find((item) => item.id === order.productId)
          const targetUpgrade = updatedUpgrades.find((item) => item.id === order.relatedUpgradeId)
          if (selected && targetUpgrade && targetUpgrade.startsAt && targetUpgrade.endsAt) {
            featuresObj.portalVisibility = {
              tier: selected.tier,
              products: selected.technicalProducts,
              from: targetUpgrade.startsAt,
              until: targetUpgrade.endsAt,
            }
          }
          await db
            .update(listings)
            .set({
              features: featuresObj,
              updatedAt: new Date(),
            })
            .where(eq(listings.id, listing.id))
        }
      }
    }

    await db
      .update(organizations)
      .set({
        settings: settingsObj,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id))
  } catch (err) {
    console.error('[mercadopago webhook] upgrade processing error', err)
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
