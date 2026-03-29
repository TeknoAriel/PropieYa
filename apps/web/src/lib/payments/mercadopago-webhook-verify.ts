/**
 * Validación de firma HMAC de webhooks Mercado Pago (x-signature).
 * Manifest según doc oficial: solo incluir partes presentes (id, request-id, ts).
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

/** `ts` del header: segundos (10 dígitos típico) o milisegundos. */
export function mercadoPagoSignatureTsToMs(ts: string): number {
  const n = parseInt(ts, 10)
  if (!Number.isFinite(n)) return Number.NaN
  return ts.length >= 13 ? n : n * 1000
}

/**
 * Arma el string firmado por MP: orden id → request-id → ts; omitir claves ausentes.
 */
export function buildMercadoPagoSignatureManifest(opts: {
  dataId?: string | null
  xRequestId?: string | null
  ts: string
}): string {
  let m = ''
  const rawId = opts.dataId?.trim()
  if (rawId) {
    m += `id:${normalizeMercadoPagoDataId(rawId)};`
  }
  const rid = opts.xRequestId?.trim()
  if (rid) {
    m += `request-id:${rid};`
  }
  m += `ts:${opts.ts};`
  return m
}

/**
 * Comprueba HMAC-SHA256 del manifest y opcionalmente antigüedad de `ts`.
 */
export function verifyMercadoPagoWebhookSignature(opts: {
  secret: string
  xSignature: string | null
  xRequestId: string | null
  /** Si viene vacío, el manifest no incluye `id:` (caso doc MP). */
  dataId?: string | null
  /**
   * Tolerancia de reloj en ms (default 600_000). Si ≤ 0, no se valida el ts.
   */
  maxSkewMs?: number
}): boolean {
  const parsed = parseMercadoPagoXSignature(opts.xSignature)
  if (!parsed) return false

  const skewCap = opts.maxSkewMs ?? 600_000
  if (skewCap > 0) {
    const tMs = mercadoPagoSignatureTsToMs(parsed.ts)
    if (!Number.isFinite(tMs)) return false
    if (Math.abs(Date.now() - tMs) > skewCap) return false
  }

  const manifest = buildMercadoPagoSignatureManifest({
    dataId: opts.dataId,
    xRequestId: opts.xRequestId,
    ts: parsed.ts,
  })

  const expected = createHmac('sha256', opts.secret).update(manifest).digest('hex')
  if (expected.length !== parsed.v1.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(parsed.v1, 'utf8'))
  } catch {
    return false
  }
}
