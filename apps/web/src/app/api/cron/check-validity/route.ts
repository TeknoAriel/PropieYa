/**
 * Cron: revisa vigencia de avisos (active → expiring_soon → suspended).
 * Vercel Cron: vercel.json "crons"
 *
 * Requiere: CRON_SECRET en env (header Authorization: Bearer <secret>)
 */

import { NextResponse, type NextRequest } from 'next/server'

import { and, eq, gt, inArray, lt, lte } from 'drizzle-orm'

import {
  db,
  listings,
  organizations,
  recordListingTransitionForKiteprop,
  users,
} from '@propieya/database'
import {
  LISTING_REASON_MESSAGES_ES,
  LISTING_VALIDITY,
  portalUpgradeOrderRequestSchema,
  portalUpgradePaymentRecordSchema,
  portalUpgradeRecordSchema,
  resolveTemporalUpgradeStatus,
  type ListingStatus,
} from '@propieya/shared'

import { sendExpiringSoonEmail } from '@/lib/email'
import { flushPendingListingLifecycleWebhooks } from '@/lib/integrations/kiteprop-listing-lifecycle-webhook'
import { emitUpgradeLifecycleNotification } from '@/lib/notifications/upgrade-lifecycle'
import { removeListingFromSearch } from '@/lib/search/sync'

export const runtime = 'nodejs'
export const maxDuration = 60

const EXPIRING_SOON_MS =
  LISTING_VALIDITY.EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000

function panelUpgradesUrl(): string {
  const base = (process.env.NEXT_PUBLIC_PANEL_URL ?? 'http://localhost:3011').replace(/\/$/, '')
  return `${base}/upgrades`
}

function parseOrders(settings: unknown) {
  const list = (settings as { portalUpgradeOrderRequests?: unknown } | null | undefined)
    ?.portalUpgradeOrderRequests
  if (!Array.isArray(list)) return []
  return list
    .map((item) => portalUpgradeOrderRequestSchema.safeParse(item))
    .filter((r): r is { success: true; data: ReturnType<typeof portalUpgradeOrderRequestSchema.parse> } => r.success)
    .map((r) => r.data)
}

function parsePayments(settings: unknown) {
  const list = (settings as { portalUpgradePayments?: unknown } | null | undefined)
    ?.portalUpgradePayments
  if (!Array.isArray(list)) return []
  return list
    .map((item) => portalUpgradePaymentRecordSchema.safeParse(item))
    .filter((r): r is { success: true; data: ReturnType<typeof portalUpgradePaymentRecordSchema.parse> } => r.success)
    .map((r) => r.data)
}

function parseListingUpgrades(features: unknown) {
  const list = (features as { visibilityUpgrades?: unknown } | null | undefined)?.visibilityUpgrades
  if (!Array.isArray(list)) return []
  return list
    .map((item) => portalUpgradeRecordSchema.safeParse(item))
    .filter((r): r is { success: true; data: ReturnType<typeof portalUpgradeRecordSchema.parse> } => r.success)
    .map((r) => r.data)
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const expiringSoonThreshold = new Date(now.getTime() + EXPIRING_SOON_MS)

    // 1. Suspender: expiring_soon o active con expiresAt < now
    const toSuspend = await db
      .select({
        id: listings.id,
        status: listings.status,
        externalId: listings.externalId,
      })
      .from(listings)
      .where(
        and(
          inArray(listings.status, ['active', 'expiring_soon']),
          lt(listings.expiresAt, now)
        )
      )

    let suspended = 0
    for (const row of toSuspend) {
      const [updated] = await db
        .update(listings)
        .set({
          status: 'suspended' as ListingStatus,
          updatedAt: now,
        })
        .where(
          and(eq(listings.id, row.id), inArray(listings.status, ['active', 'expiring_soon']))
        )
        .returning({ id: listings.id })
      if (updated) {
        suspended++
        await removeListingFromSearch(row.id)
        await recordListingTransitionForKiteprop({
          listingId: row.id,
          externalId: row.externalId,
          previousStatus: row.status,
          newStatus: 'suspended',
          source: 'expiration_job',
          reasonCode: 'LISTING_VALIDITY_EXPIRED',
          reasonMessage: LISTING_REASON_MESSAGES_ES.LISTING_VALIDITY_EXPIRED,
          details: { rule: 'expiresAt < now' },
        })
      }
    }

    // 2. Marcar expiring_soon: active con expiresAt dentro de X días
    const panelUrl =
      process.env.NEXT_PUBLIC_PANEL_URL ?? 'http://localhost:3011'

    const toExpiringSoon = await db
      .select({
        id: listings.id,
        title: listings.title,
        publisherEmail: users.email,
      })
      .from(listings)
      .innerJoin(users, eq(listings.publisherId, users.id))
      .where(
        and(
          eq(listings.status, 'active'),
          lte(listings.expiresAt, expiringSoonThreshold),
          gt(listings.expiresAt, now)
        )
      )

    let expiringSoon = 0
    for (const row of toExpiringSoon) {
      const [updated] = await db
        .update(listings)
        .set({
          status: 'expiring_soon' as ListingStatus,
          updatedAt: now,
        })
        .where(eq(listings.id, row.id))
        .returning({ id: listings.id })
      if (updated) {
        expiringSoon++
        if (row.publisherEmail) {
          const renewUrl = `${panelUrl}/propiedades/${row.id}`
          await sendExpiringSoonEmail({
            to: row.publisherEmail,
            listingTitle: row.title,
            renewUrl,
          })
        }
      }
    }

    const webhookFlush = await flushPendingListingLifecycleWebhooks(db, 50)

    // 3. Recordatorios de upgrades comerciales (expira, venció, renovación y pago pendiente viejo)
    const orgRows = await db
      .select({
        id: organizations.id,
        settings: organizations.settings,
      })
      .from(organizations)
      .where(eq(organizations.status, 'active'))
      .limit(400)

    let upgradeReminders = 0
    for (const orgRow of orgRows) {
      const orders = parseOrders(orgRow.settings)
      if (orders.length === 0) continue
      const payments = parsePayments(orgRow.settings)
      const buyerIds = Array.from(
        new Set(
          orders
            .map((order) => order.buyerUserId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      )
      const buyers =
        buyerIds.length === 0
          ? []
          : await db.query.users.findMany({
              where: inArray(users.id, buyerIds),
              columns: { id: true, email: true },
            })
      const buyerById = new Map(buyers.map((buyer) => [buyer.id, buyer]))

      const listingIds = Array.from(
        new Set(
          orders
            .map((order) => order.listingId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      )
      const listingRows =
        listingIds.length === 0
          ? []
          : await db
              .select({
                id: listings.id,
                features: listings.features,
              })
              .from(listings)
              .where(inArray(listings.id, listingIds))
      const listingById = new Map(listingRows.map((row) => [row.id, row]))

      for (const order of orders) {
        const buyer = buyerById.get(order.buyerUserId)
        if (!buyer) continue
        const amountLabel =
          order.finalPriceAmount != null ? `${order.currency} ${order.finalPriceAmount}` : null

        const orderPayments = payments.filter((p) => p.orderRequestId === order.id)
        const hasPaid = orderPayments.some((p) => p.status === 'paid')
        if (order.status === 'pending_payment' && !hasPaid) {
          const ageMs = now.getTime() - new Date(order.createdAt).getTime()
          if (ageMs > 24 * 60 * 60 * 1000) {
            await emitUpgradeLifecycleNotification({
              db,
              eventType: 'upgrade_payment_failed',
              userId: buyer.id,
              userEmail: buyer.email,
              organizationId: orgRow.id,
              listingId: order.listingId ?? null,
              orderRequestId: order.id,
              productName: order.productName,
              amountLabel,
              actionUrl: panelUpgradesUrl(),
              actionLabel: 'Reintentar pago',
              dedupeKey: `${order.id}:pending_payment_old:${new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()}`,
            })
            upgradeReminders += 1
          }
        }

        if (order.purchaseType !== 'listing' || !order.relatedUpgradeId || !order.listingId) continue
        const listing = listingById.get(order.listingId)
        if (!listing) continue
        const upgrade = parseListingUpgrades(listing.features).find((u) => u.id === order.relatedUpgradeId)
        if (!upgrade || !upgrade.endsAt) continue
        const status = resolveTemporalUpgradeStatus(upgrade.status, upgrade.startsAt ?? null, upgrade.endsAt)
        const endAt = new Date(upgrade.endsAt)
        if (Number.isNaN(endAt.getTime())) continue
        const diffMs = endAt.getTime() - now.getTime()
        const diffHours = diffMs / (60 * 60 * 1000)

        if (status === 'active' && diffHours <= 72 && diffHours > 24) {
          await emitUpgradeLifecycleNotification({
            db,
            eventType: 'upgrade_expiring_soon',
            userId: buyer.id,
            userEmail: buyer.email,
            organizationId: orgRow.id,
            listingId: order.listingId,
            orderRequestId: order.id,
            productName: order.productName,
            amountLabel,
            expiresAtIso: upgrade.endsAt,
            actionUrl: panelUpgradesUrl(),
            actionLabel: 'Renovar upgrade',
            dedupeKey: `${order.id}:expiring_72h`,
          })
          upgradeReminders += 1
        }
        if (status === 'active' && diffHours <= 24 && diffHours > 0) {
          await emitUpgradeLifecycleNotification({
            db,
            eventType: 'upgrade_expiring_soon',
            userId: buyer.id,
            userEmail: buyer.email,
            organizationId: orgRow.id,
            listingId: order.listingId,
            orderRequestId: order.id,
            productName: order.productName,
            amountLabel,
            expiresAtIso: upgrade.endsAt,
            actionUrl: panelUpgradesUrl(),
            actionLabel: 'Renovar upgrade',
            dedupeKey: `${order.id}:expiring_24h`,
          })
          upgradeReminders += 1
        }
        if (status === 'expired') {
          await emitUpgradeLifecycleNotification({
            db,
            eventType: 'upgrade_expired',
            userId: buyer.id,
            userEmail: buyer.email,
            organizationId: orgRow.id,
            listingId: order.listingId,
            orderRequestId: order.id,
            productName: order.productName,
            amountLabel,
            expiresAtIso: upgrade.endsAt,
            actionUrl: panelUpgradesUrl(),
            actionLabel: 'Ver opciones',
            dedupeKey: `${order.id}:expired`,
          })
          await emitUpgradeLifecycleNotification({
            db,
            eventType: 'upgrade_renewal_available',
            userId: buyer.id,
            userEmail: buyer.email,
            organizationId: orgRow.id,
            listingId: order.listingId,
            orderRequestId: order.id,
            productName: order.productName,
            amountLabel,
            actionUrl: panelUpgradesUrl(),
            actionLabel: 'Renovar ahora',
            dedupeKey: `${order.id}:renewal_available`,
          })
          upgradeReminders += 2
        }
      }
    }

    return NextResponse.json({
      suspended,
      expiringSoon,
      lifecycleWebhookFlush: webhookFlush,
      upgradeReminders,
    })
  } catch (err) {
    console.error('Cron check-validity:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
