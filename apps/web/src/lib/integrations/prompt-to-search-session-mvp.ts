import { normalizeSearchSessionMVP, type SearchSessionMVP } from '@propieya/shared'

/**
 * Interpretación liviana ES → SearchSessionMVP (complemento al buscador, no reemplazo).
 * Siempre deja `q` con el texto acotado para anclar la sesión.
 */
export function promptToSearchSessionMVP(prompt: string): SearchSessionMVP {
  const trimmed = prompt.trim().slice(0, 200)
  const p = trimmed.toLowerCase()

  const patch: Record<string, unknown> = {
    q: trimmed.length >= 2 ? trimmed : 'búsqueda',
    amenityIds: [],
  }

  if (/\bventa\b|\bvendo\b|\ben venta\b/.test(p)) {
    patch.operationType = 'sale'
  }
  if (/\balquiler\b|\balquilo\b|\ba alquilar\b/.test(p)) {
    patch.operationType = 'rent'
  }
  if (/\btemporario\b|\btemporada\b/.test(p)) {
    patch.operationType = 'temporary_rent'
  }

  const kPrice = p.match(/(?:u\$s|usd|\$)\s*(\d{1,3}(?:\.\d{3})*|\d+)\s*k\b/)
  const kCap = kPrice?.[1]
  if (kCap) {
    const n = parseInt(kCap.replace(/\./g, ''), 10)
    if (!Number.isNaN(n)) patch.maxPrice = n * 1000
  }
  const maxPrice = p.match(
    /(?:hasta|máximo|max|menos de|<)\s*(?:u\$s|usd|\$)?\s*(\d{1,3}(?:\.\d{3})+|\d{3,})\b/
  )
  const maxCap = maxPrice?.[1]
  if (maxCap && patch.maxPrice == null) {
    const n = parseInt(maxCap.replace(/\./g, ''), 10)
    if (!Number.isNaN(n)) patch.maxPrice = n
  }

  const dorm = p.match(/(\d+)\s*(?:dorm|dormitorio|dormitorios|amb|ambientes)\b/)
  const dormCap = dorm?.[1]
  if (dormCap) {
    const n = parseInt(dormCap, 10)
    if (!Number.isNaN(n)) patch.minBedrooms = n
  }

  const cityMap: [string, string][] = [
    ['funes', 'Funes'],
    ['rosario', 'Rosario'],
    ['córdoba', 'Córdoba'],
    ['cordoba', 'Córdoba'],
    ['mendoza', 'Mendoza'],
    ['palermo', 'Palermo'],
    ['puerto madero', 'Puerto Madero'],
    ['buenos aires', 'Buenos Aires'],
  ]
  for (const [needle, label] of cityMap) {
    if (p.includes(needle)) {
      patch.city = label
      break
    }
  }

  if (/\bcasa\b/.test(p)) patch.propertyType = 'house'
  if (/\bdepa(rtamento)?\b|\bdepto\b/.test(p)) patch.propertyType = 'apartment'
  if (/\blote\b/.test(p)) patch.propertyType = 'lot'

  return normalizeSearchSessionMVP(patch)
}

export function shouldRunPortalSearchWithPrompt(prompt: string): boolean {
  const s = prompt.toLowerCase()
  if (/lead|mensaje|inbox|crm|kiteprop|consultas activas/.test(s)) return false
  return true
}
