import { getDb, paymentWebhookEvents } from '@propieya/database'

import {
  normalizeMercadoPagoDataId,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/payments/mercadopago-webhook-verify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
