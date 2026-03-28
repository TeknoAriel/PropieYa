import { and, eq } from 'drizzle-orm'

import { getDb, paymentWebhookEvents } from '@propieya/database'

import {
  normalizeMercadoPagoDataId,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/payments/mercadopago-webhook-verify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Webhook Mercado Pago: auditoría + idempotencia por `externalEventId`.
 * Si `MERCADOPAGO_WEBHOOK_SECRET` está definido, valida `x-signature` (HMAC-SHA256).
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
      dataId: dataIdNorm,
    })
    if (!dataIdNorm || !ok) {
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

  if (extSlice) {
    const existing = await db.query.paymentWebhookEvents.findFirst({
      where: and(
        eq(paymentWebhookEvents.provider, 'mercadopago'),
        eq(paymentWebhookEvents.externalEventId, extSlice)
      ),
    })
    if (existing) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    await db.insert(paymentWebhookEvents).values({
      provider: 'mercadopago',
      externalEventId: extSlice,
      eventType: eventType.slice(0, 64),
      payload: body as object,
    })
  } catch (err) {
    console.error('[mercadopago webhook] persist error', err)
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
