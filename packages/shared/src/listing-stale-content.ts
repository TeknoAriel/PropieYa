import type { ListingPublishConfig } from './listing-publish-config'

/**
 * Pausa de 60 días (desde 2026-10-28) para armar volumen: no se da de baja
 * por “30 días sin modificaciones”. Después se notifica a Kiteprop y se pide vigencia.
 * Override: `LISTING_STALE_CONTENT_PAUSE_UNTIL` (ISO) o `none`/`off`/`0` para anular.
 */
export const STALE_CONTENT_VOLUME_PAUSE_UNTIL_ISO = '2026-12-27T00:00:00.000Z'

export function resolveStaleContentPauseUntil(
  env: NodeJS.ProcessEnv = process.env
): Date | null {
  const raw = (env.LISTING_STALE_CONTENT_PAUSE_UNTIL ?? '').trim()
  const folded = raw.toLowerCase()
  if (folded === '0' || folded === 'none' || folded === 'off') return null
  if (raw) {
    const parsed = new Date(raw)
    if (Number.isFinite(parsed.getTime())) return parsed
  }
  return new Date(STALE_CONTENT_VOLUME_PAUSE_UNTIL_ISO)
}

export function isStaleContentRulePaused(
  now: Date,
  pauseUntil: Date | null = resolveStaleContentPauseUntil()
): boolean {
  if (!pauseUntil) return false
  return now.getTime() < pauseUntil.getTime()
}

/** Referencia de “última actividad de contenido” para el job de vencimiento. */
export function resolveListingContentFreshnessAt(input: {
  lastContentUpdatedAt: Date | string | null | undefined
  publishedAt: Date | string | null | undefined
  createdAt: Date | string | null | undefined
}): Date | null {
  const last = toDate(input.lastContentUpdatedAt)
  if (last) return last
  const pub = toDate(input.publishedAt)
  if (pub) return pub
  return toDate(input.createdAt)
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isFinite(d.getTime()) ? d : null
}

/**
 * Avisos visibles en portal que pueden caducar por falta de actualización de contenido.
 */
export const STALE_EXPIRY_ELIGIBLE_STATUSES = ['active', 'expiring_soon'] as const

export type StaleExpiryEligibleStatus = (typeof STALE_EXPIRY_ELIGIBLE_STATUSES)[number]

export function isStaleExpiryEligibleStatus(status: string): status is StaleExpiryEligibleStatus {
  return (STALE_EXPIRY_ELIGIBLE_STATUSES as readonly string[]).includes(status)
}

/**
 * `true` si el aviso publicado superó el umbral sin renovar el contenido (idempotente: solo estados elegibles).
 */
export function shouldExpireListingForStaleContent(
  now: Date,
  row: {
    status: string
    publishedAt: Date | string | null | undefined
    lastContentUpdatedAt: Date | string | null | undefined
    createdAt: Date | string | null | undefined
  },
  config: Pick<ListingPublishConfig, 'staleContentDays'>
): boolean {
  if (!isStaleExpiryEligibleStatus(row.status)) return false
  if (!toDate(row.publishedAt)) return false
  const ref = resolveListingContentFreshnessAt(row)
  if (!ref) return false
  const ms = config.staleContentDays * 24 * 60 * 60 * 1000
  return now.getTime() - ref.getTime() >= ms
}

export type StaleValidityConfirmMarker = {
  requestedAt: string
  contentFreshnessAt: string | null
  staleDays: number
}

/** Evita re-ping diario a Kiteprop si ya se pidió vigencia para el mismo contenido. */
export function hasStaleValidityConfirmForFreshness(
  features: unknown,
  freshnessAt: Date | null
): boolean {
  if (!features || typeof features !== 'object' || Array.isArray(features)) return false
  const marker = (features as { staleValidityConfirm?: { contentFreshnessAt?: unknown } })
    .staleValidityConfirm
  if (!marker || typeof marker !== 'object') return false
  const prev =
    typeof marker.contentFreshnessAt === 'string' ? marker.contentFreshnessAt : null
  const cur = freshnessAt ? freshnessAt.toISOString() : null
  return prev === cur
}

export function nextStaleValidityConfirmMarker(
  now: Date,
  freshnessAt: Date | null,
  staleDays: number
): StaleValidityConfirmMarker {
  return {
    requestedAt: now.toISOString(),
    contentFreshnessAt: freshnessAt ? freshnessAt.toISOString() : null,
    staleDays,
  }
}
