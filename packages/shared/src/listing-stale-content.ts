import type { ListingPublishConfig } from './listing-publish-config'

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
