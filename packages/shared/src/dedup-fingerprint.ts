/**
 * Huella estable para agrupar avisos duplicados (base MLS-ready, Sprint 26.8).
 * Misma organización + título normalizado + precio/superficie redondeados + geo en grilla gruesa.
 *
 * Hash sin `node:crypto` para poder importarse desde bundles cliente (barrel `@propieya/shared`).
 */

export type DedupFingerprintInput = {
  organizationId: string
  title: string
  priceAmount: number
  surfaceTotal: number
  locationLat: number | null
  locationLng: number | null
}

function gridCoord(n: number | null, precision: number): number {
  if (n == null || Number.isNaN(n)) return 0
  return Math.round(n * precision) / precision
}

/** FNV-1a 32-bit → 8 hex chars */
function fnv1aHex(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * Devuelve hex de 32 chars (suficiente para agrupar sin tabla auxiliar enorme).
 */
export function computeListingDedupFingerprint(input: DedupFingerprintInput): string {
  const title = input.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  const lat = gridCoord(input.locationLat, 200)
  const lng = gridCoord(input.locationLng, 200)
  const payload = [
    input.organizationId,
    title,
    String(Math.round(input.priceAmount)),
    String(Math.round(input.surfaceTotal)),
    String(lat),
    String(lng),
  ].join('|')
  const h1 = fnv1aHex(payload)
  const h2 = fnv1aHex(`${payload}::dup`)
  return `${h1}${h2}`.slice(0, 32)
}
