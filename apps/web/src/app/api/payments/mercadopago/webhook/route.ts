import { getDb, paymentWebhookEvents } from '@propieya/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Webhook Mercado Pago (stub preparatorio).
 * Guarda el payload para auditoría e idempotencia futura.
 * Documentación: docs/39-MONETIZACION-MERCADOPAGO.md
 */
export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = payload as Record<string, unknown>
  const data = body?.data as Record<string, unknown> | undefined
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

  try {
    await getDb().insert(paymentWebhookEvents).values({
      provider: 'mercadopago',
      externalEventId: externalId ? externalId.slice(0, 128) : null,
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
