import type { Currency } from '../types/common'

/**
 * Formatea un precio con moneda
 */
export function formatPrice(
  amount: number,
  currency: Currency,
  options?: {
    compact?: boolean
    showCents?: boolean
  }
): string {
  const { compact = false, showCents = false } = options ?? {}

  const locale = 'es-AR'
  const currencyCode = currency === 'USD' ? 'USD' : 'ARS'

  if (compact && amount >= 1000) {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 1,
    })
    return formatter.format(amount)
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  })

  return formatter.format(amount)
}

/**
 * Formatea superficie en m²
 */
export function formatSurface(m2: number): string {
  return `${m2.toLocaleString('es-AR')} m²`
}

/**
 * Formatea ambientes
 */
export function formatRooms(rooms: number | null, type: 'bedrooms' | 'bathrooms' | 'total'): string {
  if (rooms === null) return '-'

  const labels = {
    bedrooms: rooms === 1 ? 'dormitorio' : 'dormitorios',
    bathrooms: rooms === 1 ? 'baño' : 'baños',
    total: rooms === 1 ? 'ambiente' : 'ambientes',
  }

  return `${rooms} ${labels[type]}`
}

/**
 * Formatea una fecha relativa
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`
  }

  return d.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formatea una fecha
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'full' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  const optionsMap: Record<'short' | 'long' | 'full', Intl.DateTimeFormatOptions> = {
    short: { day: 'numeric', month: 'short' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  }

  return d.toLocaleDateString('es-AR', optionsMap[format])
}

/**
 * Trunca texto con ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Genera slug desde texto
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Pluraliza una palabra
 */
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

/**
 * Formatea un número de teléfono argentino
 */
export function formatPhoneAR(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }

  if (cleaned.length === 11 && cleaned.startsWith('9')) {
    return `+54 9 ${cleaned.slice(1, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }

  return phone
}
