const PROPERTY_TYPES = new Set([
  'apartment',
  'house',
  'ph',
  'land',
  'office',
  'commercial',
  'warehouse',
  'parking',
  'development_unit',
])

const OPERATION_TYPES = new Set(['sale', 'rent', 'temporary_rent'])

export interface ListingPublishConfig {
  minImages: number
  minTitleLength: number
  minDescriptionLength: number
  staleContentDays: number
  /** Valores de precio (en unidad numérica del aviso) considerados placeholder / no soportados. */
  unsupportedPriceAmounts: number[]
}

export const DEFAULT_LISTING_PUBLISH_CONFIG: ListingPublishConfig = {
  minImages: 1,
  minTitleLength: 10,
  minDescriptionLength: 50,
  staleContentDays: 30,
  unsupportedPriceAmounts: [1, 10, 100, 9999],
}

function parseIntEnv(raw: string | undefined, fallback: number): number {
  const n = parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function parseFloatList(raw: string | undefined, fallback: number[]): number[] {
  if (raw == null || String(raw).trim() === '') return [...fallback]
  const parts = String(raw)
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const nums = parts
    .map((p) => Number(p.replace(',', '.')))
    .filter((n) => Number.isFinite(n))
  return nums.length > 0 ? nums : [...fallback]
}

/**
 * Lectura central de política desde env (portal / cron / scripts Node).
 * Sin acceso a `process.env` en tests: pasar objeto parcial o usar DEFAULT_LISTING_PUBLISH_CONFIG.
 */
export function getListingPublishConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): ListingPublishConfig {
  return {
    minImages: parseIntEnv(env.LISTING_MIN_PHOTOS, DEFAULT_LISTING_PUBLISH_CONFIG.minImages),
    minTitleLength: parseIntEnv(
      env.LISTING_MIN_TITLE_LENGTH,
      DEFAULT_LISTING_PUBLISH_CONFIG.minTitleLength
    ),
    minDescriptionLength: parseIntEnv(
      env.LISTING_MIN_DESCRIPTION_LENGTH,
      DEFAULT_LISTING_PUBLISH_CONFIG.minDescriptionLength
    ),
    staleContentDays: parseIntEnv(
      env.LISTING_STALE_CONTENT_DAYS,
      DEFAULT_LISTING_PUBLISH_CONFIG.staleContentDays
    ),
    unsupportedPriceAmounts: parseFloatList(
      env.LISTING_UNSUPPORTED_PRICE_AMOUNTS,
      [...DEFAULT_LISTING_PUBLISH_CONFIG.unsupportedPriceAmounts]
    ),
  }
}

export function isKnownPropertyType(value: string): boolean {
  return PROPERTY_TYPES.has(value)
}

export function isKnownOperationType(value: string): boolean {
  return OPERATION_TYPES.has(value)
}

/**
 * Normaliza monto para comparación con lista de placeholders (coma decimal, espacios).
 */
export function normalizeListingPriceAmount(raw: number): number {
  if (!Number.isFinite(raw)) return NaN
  return Math.round(raw * 1000) / 1000
}

export function isUnsupportedPlaceholderPrice(
  amount: number,
  unsupported: readonly number[]
): boolean {
  const n = normalizeListingPriceAmount(amount)
  if (!Number.isFinite(n) || n <= 0) return true
  for (const u of unsupported) {
    if (Math.abs(n - u) < 1e-6) return true
  }
  return false
}
