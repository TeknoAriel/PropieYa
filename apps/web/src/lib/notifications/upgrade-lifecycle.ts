import { and, desc, eq, gte } from 'drizzle-orm'

import { notifications, type Database } from '@propieya/database'
import { PORTAL_STATS_TERMINALS } from '@propieya/shared'

import { recordPortalStatsEvent } from '../analytics/record-portal-stats-event'
import { sendUpgradeLifecycleEmail } from '../email'

export type UpgradeNotificationEventType =
  | 'upgrade_order_created'
  | 'upgrade_payment_approved'
  | 'upgrade_payment_failed'
  | 'upgrade_activated'
  | 'upgrade_expiring_soon'
  | 'upgrade_expired'
  | 'upgrade_renewal_available'

type EmitUpgradeLifecycleNotificationInput = {
  db: Database
  eventType: UpgradeNotificationEventType
  userId: string
  userEmail?: string | null
  organizationId?: string | null
  listingId?: string | null
  orderRequestId: string
  productName: string
  amountLabel?: string | null
  expiresAtIso?: string | null
  actionUrl?: string | null
  actionLabel?: string | null
  dedupeKey?: string | null
}

function eventTerminal(eventType: UpgradeNotificationEventType) {
  switch (eventType) {
    case 'upgrade_order_created':
      return PORTAL_STATS_TERMINALS.UPGRADE_ORDER_CREATED
    case 'upgrade_payment_approved':
      return PORTAL_STATS_TERMINALS.UPGRADE_PAYMENT_APPROVED
    case 'upgrade_payment_failed':
      return PORTAL_STATS_TERMINALS.UPGRADE_PAYMENT_FAILED
    case 'upgrade_activated':
      return PORTAL_STATS_TERMINALS.UPGRADE_ACTIVATED
    case 'upgrade_expiring_soon':
      return PORTAL_STATS_TERMINALS.UPGRADE_EXPIRING_SOON
    case 'upgrade_expired':
      return PORTAL_STATS_TERMINALS.UPGRADE_EXPIRED
    case 'upgrade_renewal_available':
      return PORTAL_STATS_TERMINALS.UPGRADE_RENEWAL_AVAILABLE
  }
}

function messageCopy(input: EmitUpgradeLifecycleNotificationInput): {
  title: string
  body: string
  emailSubject: string
} {
  const amount = input.amountLabel ? ` (${input.amountLabel})` : ''
  switch (input.eventType) {
    case 'upgrade_order_created':
      return {
        title: 'Solicitud de upgrade registrada',
        body: `Registramos tu solicitud para "${input.productName}"${amount}. Te avisamos cuando cambie el estado.`,
        emailSubject: `Solicitud registrada: ${input.productName}`,
      }
    case 'upgrade_payment_approved':
      return {
        title: 'Pago aprobado',
        body: `Tu pago para "${input.productName}" fue aprobado. Estamos aplicando la activación.`,
        emailSubject: `Pago aprobado: ${input.productName}`,
      }
    case 'upgrade_payment_failed':
      return {
        title: 'No pudimos confirmar el pago',
        body: `El pago para "${input.productName}" no se pudo confirmar. Podés reintentar cuando quieras.`,
        emailSubject: `Pago no confirmado: ${input.productName}`,
      }
    case 'upgrade_activated':
      return {
        title: 'Tu upgrade ya está activo',
        body: `La visibilidad especial de "${input.productName}" ya está activa.`,
        emailSubject: `Upgrade activo: ${input.productName}`,
      }
    case 'upgrade_expiring_soon':
      return {
        title: 'Tu upgrade vence pronto',
        body: `La visibilidad especial de "${input.productName}" está por vencer. Podés renovarla para mantener el impulso.`,
        emailSubject: `Vence pronto: ${input.productName}`,
      }
    case 'upgrade_expired':
      return {
        title: 'Tu upgrade venció',
        body: `La visibilidad especial de "${input.productName}" venció. Podés renovarla para volver a destacarte.`,
        emailSubject: `Upgrade vencido: ${input.productName}`,
      }
    case 'upgrade_renewal_available':
      return {
        title: 'Renovación disponible',
        body: `Ya podés renovar "${input.productName}" desde tu panel en pocos pasos.`,
        emailSubject: `Renová tu upgrade: ${input.productName}`,
      }
  }
}

async function alreadySentDedupe(
  db: Database,
  userId: string,
  eventType: UpgradeNotificationEventType,
  dedupeKey: string
): Promise<boolean> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const existing = await db.query.notifications.findMany({
    where: and(
      eq(notifications.userId, userId),
      eq(notifications.type, eventType),
      gte(notifications.createdAt, since)
    ),
    orderBy: [desc(notifications.createdAt)],
    limit: 50,
  })
  return existing.some((row) => {
    const data = row.data as Record<string, unknown> | null
    return data?.dedupeKey === dedupeKey
  })
}

export async function emitUpgradeLifecycleNotification(
  input: EmitUpgradeLifecycleNotificationInput
): Promise<void> {
  const { db } = input
  if (input.dedupeKey) {
    const sent = await alreadySentDedupe(db, input.userId, input.eventType, input.dedupeKey)
    if (sent) return
  }

  const copy = messageCopy(input)
  const now = new Date()
  const payload = {
    orderRequestId: input.orderRequestId,
    productName: input.productName,
    listingId: input.listingId ?? null,
    amountLabel: input.amountLabel ?? null,
    expiresAt: input.expiresAtIso ?? null,
    dedupeKey: input.dedupeKey ?? null,
  }

  await db.insert(notifications).values({
    userId: input.userId,
    type: input.eventType,
    channel: 'in_app',
    status: 'sent',
    priority:
      input.eventType === 'upgrade_payment_failed' || input.eventType === 'upgrade_expired'
        ? 'high'
        : 'normal',
    title: copy.title,
    body: copy.body,
    data: payload,
    actionUrl: input.actionUrl ?? null,
    actionLabel: input.actionLabel ?? null,
    sentAt: now,
  })

  if (input.userEmail) {
    const emailResult = await sendUpgradeLifecycleEmail({
      to: input.userEmail,
      subject: copy.emailSubject,
      title: copy.title,
      body: copy.body,
      actionUrl: input.actionUrl ?? null,
      actionLabel: input.actionLabel ?? null,
    })
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.eventType,
      channel: 'email',
      status: emailResult.ok ? 'sent' : 'failed',
      priority:
        input.eventType === 'upgrade_payment_failed' || input.eventType === 'upgrade_expired'
          ? 'high'
          : 'normal',
      title: copy.title,
      body: copy.body,
      data: {
        ...payload,
        emailError: emailResult.ok ? null : emailResult.error ?? 'unknown',
      },
      actionUrl: input.actionUrl ?? null,
      actionLabel: input.actionLabel ?? null,
      sentAt: now,
    })
  }

  recordPortalStatsEvent(db, {
    terminalId: eventTerminal(input.eventType),
    organizationId: input.organizationId ?? null,
    userId: input.userId,
    listingId: input.listingId ?? null,
    payload: {
      orderRequestId: input.orderRequestId,
      channel: input.userEmail ? 'in_app+email' : 'in_app',
      eventType: input.eventType,
    },
  })
}
