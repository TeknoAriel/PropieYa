import { NextResponse, type NextRequest } from 'next/server'

import {
  parseKitepropWebhookEnvelope,
  processKitepropPropertyEvent,
  SUPPORTED_KITEPROP_EVENTS,
  verifyKitepropWebhookSignature,
} from '@/lib/integrations/kiteprop-webhook-ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const secret = process.env.KITEPROP_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error('[kiteprop-webhook] missing env KITEPROP_WEBHOOK_SECRET')
    return NextResponse.json(
      {
        ok: false,
        error: 'Webhook no configurado: falta KITEPROP_WEBHOOK_SECRET',
      },
      { status: 503 }
    )
  }

  const rawBody = await req.text()
  const signature = req.headers.get('X-KiteProp-Signature')
  const hmacOk = verifyKitepropWebhookSignature({
    rawBody,
    signatureHeader: signature,
    secret,
  })
  if (!hmacOk) {
    console.warn('[kiteprop-webhook] signature validation failed', {
      hasHeader: Boolean(signature),
      bodyLength: rawBody.length,
    })
    return NextResponse.json({ ok: false, error: 'Unauthorized signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = rawBody.length > 0 ? (JSON.parse(rawBody) as unknown) : {}
  } catch {
    console.warn('[kiteprop-webhook] invalid json payload', { bodyLength: rawBody.length })
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  const envelope = parseKitepropWebhookEnvelope(payload)
  if (!envelope) {
    console.warn('[kiteprop-webhook] payload without event type', { bodyLength: rawBody.length })
    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason: 'invalid_event_envelope',
      },
      { status: 202 }
    )
  }

  const baseLog = {
    eventType: envelope.eventType,
    eventId: envelope.eventId,
    externalId: envelope.externalId,
  }
  console.info('[kiteprop-webhook] received', {
    ...baseLog,
    hmac: 'ok',
  })

  if (!SUPPORTED_KITEPROP_EVENTS.has(envelope.eventType)) {
    console.info('[kiteprop-webhook] ignored unsupported event', baseLog)
    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason: 'unsupported_event',
        ...baseLog,
      },
      { status: 202 }
    )
  }

  try {
    const result = await processKitepropPropertyEvent(envelope)
    if (result.status === 'ignored') {
      console.warn('[kiteprop-webhook] supported event ignored', {
        ...baseLog,
        reason: result.reason,
      })
      return NextResponse.json(
        {
          ok: true,
          ignored: true,
          reason: result.reason,
          ...baseLog,
        },
        { status: 202 }
      )
    }
    console.info('[kiteprop-webhook] processed', {
      ...baseLog,
      action: result.status,
      listingId: result.listingId ?? null,
    })
    return NextResponse.json({
      ok: true,
      action: result.status,
      listingId: result.listingId ?? null,
      ...baseLog,
    })
  } catch (err) {
    console.error('[kiteprop-webhook] processing error', {
      ...baseLog,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        ...baseLog,
      },
      { status: 500 }
    )
  }
}
