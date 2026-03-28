/**
 * Validación de firma HMAC de webhooks Mercado Pago (x-signature).
 * @see https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export function parseMercadoPagoXSignature(
  header: string | null
): { ts: string; v1: string } | null {
  if (!header?.trim()) return null
  let ts: string | undefined
  let v1: string | undefined
  for (const part of header.split(',')) {
    const eqIdx = part.indexOf('=')
    if (eqIdx < 0) continue
    const key = part.slice(0, eqIdx).trim()
    const value = part.slice(eqIdx + 1).trim()
    if (key === 'ts') ts = value
    if (key === 'v1') v1 = value
  }
  if (!ts || !v1) return null
  return { ts, v1 }
}

/** IDs alfanuméricos van en minúsculas según documentación MP. */
export function normalizeMercadoPagoDataId(id: string): string {
  const s = id.trim()
  if (/^[a-z0-9]+$/i.test(s)) return s.toLowerCase()
  return s
}

/**
 * Comprueba manifest `id:...;request-id:...;ts:...;` con HMAC-SHA256.
 */
export function verifyMercadoPagoWebhookSignature(opts: {
  secret: string
  xSignature: string | null
  xRequestId: string | null
  dataId: string
}): boolean {
  const parsed = parseMercadoPagoXSignature(opts.xSignature)
  if (!parsed || !opts.xRequestId?.trim()) return false
  const manifest = `id:${opts.dataId};request-id:${opts.xRequestId.trim()};ts:${parsed.ts};`
  const expected = createHmac('sha256', opts.secret).update(manifest).digest('hex')
  if (expected.length !== parsed.v1.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(parsed.v1, 'utf8'))
  } catch {
    return false
  }
}
