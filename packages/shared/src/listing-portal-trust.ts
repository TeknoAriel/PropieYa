import { LISTING_VALIDITY } from './constants/listings'

export type ListingTrustCompletenessInput = {
  title: string
  description: string
  primaryImageUrl: string | null
  mediaCount: number
  address: unknown
  locationLat: number | null
  locationLng: number | null
  surfaceTotal: number
  bedrooms: number | null
  bathrooms: number | null
  features: unknown
}

/**
 * Heurística 0–100 cuando `quality_score` en DB es null.
 * Misma idea de “completitud” para el buscador (doc 43): campos y medios presentes.
 */
export function computeListingCompletenessScore(input: ListingTrustCompletenessInput): number {
  let pts = 0

  if (input.title.trim().length >= 10) pts += 12
  if (input.description.trim().length >= 80) pts += 18
  else if (input.description.trim().length >= 30) pts += 10

  const img =
    input.mediaCount > 0 ? input.mediaCount : input.primaryImageUrl ? 1 : 0
  if (img >= 3) pts += 18
  else if (img >= 1) pts += 12

  const addr = input.address as Record<string, unknown> | null | undefined
  const city = typeof addr?.city === 'string' ? addr.city.trim() : ''
  const neighborhood = typeof addr?.neighborhood === 'string' ? addr.neighborhood.trim() : ''
  const street = typeof addr?.street === 'string' ? addr.street.trim() : ''
  if (city.length >= 2) pts += 10
  if (neighborhood.length >= 2) pts += 6
  if (street.length >= 3) pts += 6

  if (
    input.locationLat != null &&
    input.locationLng != null &&
    !Number.isNaN(input.locationLat) &&
    !Number.isNaN(input.locationLng)
  ) {
    pts += 12
  }

  if (input.surfaceTotal > 0) pts += 8
  if (input.bedrooms != null && input.bedrooms >= 0) pts += 5
  if (input.bathrooms != null && input.bathrooms >= 0) pts += 5

  const feats = input.features as { amenities?: unknown } | null | undefined
  const am = feats?.amenities
  if (Array.isArray(am) && am.length >= 3) pts += 6
  else if (Array.isArray(am) && am.length > 0) pts += 3

  return Math.min(100, Math.round(pts))
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Días hasta vencimiento (puede ser negativo). */
export function daysUntilExpiry(expiresAt: Date | string | null | undefined): number | null {
  const d = toDate(expiresAt)
  if (!d) return null
  const now = new Date()
  const ms = d.getTime() - now.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

export type FreshnessUi = {
  publishedLine: string | null
  expiresLine: string | null
  isExpiringSoon: boolean
}

/**
 * Textos para ficha (es-AR); fechas cortas.
 */
export function buildListingFreshnessUi(
  publishedAt: Date | string | null | undefined,
  expiresAt: Date | string | null | undefined,
  locale = 'es-AR'
): FreshnessUi {
  const pub = toDate(publishedAt)
  const exp = toDate(expiresAt)

  const df = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  let publishedLine: string | null = null
  if (pub) {
    const days = Math.floor((Date.now() - pub.getTime()) / (24 * 60 * 60 * 1000))
    if (days <= 0) {
      publishedLine = `Publicado hoy (${df.format(pub)})`
    } else if (days === 1) {
      publishedLine = `Publicado ayer (${df.format(pub)})`
    } else {
      publishedLine = `Publicado hace ${days} días (${df.format(pub)})`
    }
  }

  let expiresLine: string | null = null
  let isExpiringSoon = false
  const left = daysUntilExpiry(exp)
  if (exp && left !== null) {
    if (left < 0) {
      expiresLine = `Vigencia: venció el ${df.format(exp)}`
    } else if (left === 0) {
      expiresLine = `Vigencia: vence hoy (${df.format(exp)})`
      isExpiringSoon = true
    } else if (left === 1) {
      expiresLine = `Vigencia: vence mañana (${df.format(exp)})`
      isExpiringSoon = true
    } else {
      expiresLine = `Vigencia: hasta el ${df.format(exp)} (${left} días)`
      if (left <= LISTING_VALIDITY.EXPIRING_SOON_DAYS) {
        isExpiringSoon = true
      }
    }
  }

  return { publishedLine, expiresLine, isExpiringSoon }
}

export function resolveListingCompletenessForPortal(
  qualityScore: number | null | undefined,
  input: ListingTrustCompletenessInput
): number {
  if (qualityScore != null && Number.isFinite(qualityScore)) {
    const q = Math.round(qualityScore)
    return Math.min(100, Math.max(0, q))
  }
  return computeListingCompletenessScore(input)
}

/**
 * Referencia corta para ficha pública: no muestra el `external_id` completo.
 * Hasta 8 caracteres: prefijo … + texto; más largo: … + últimos 6.
 */
export function formatListingInventoryRefForPortal(
  externalId: string | null | undefined
): string | null {
  if (externalId == null) return null
  const t = String(externalId).trim()
  if (t.length === 0) return null
  if (t.length <= 8) return `…${t}`
  return `…${t.slice(-6)}`
}
