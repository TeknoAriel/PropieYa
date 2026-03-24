/**
 * Extrae filtros de búsqueda a partir de texto libre o consulta de asistente.
 * Referencia: campos del XML Zonaprop/Kiteprop (docs/36-MAPEO-ZONAPROP-XML-AMENITIES.md).
 *
 * Ejemplos: "piso 3", "más de 80 m2", "2 baños", "escalera B", "con garage"
 */

import { SEARCH_TERM_TO_AMENITY } from './amenity-mapping'
import type { Amenity } from './types/listing'

export interface ExtractedFilters {
  amenities?: Amenity[]
  minSurface?: number
  maxSurface?: number
  minBedrooms?: number
  minBathrooms?: number
  minGarages?: number
  floorMin?: number
  floorMax?: number
  escalera?: string
  minPrice?: number
  maxPrice?: number
}

/** Patrones para extraer valores numéricos del texto */
const NUMERIC_PATTERNS = {
  surfaceMin:
    /\b(?:m[áa]s\s+de|m[íi]n(?:imo)?|desde|al\s+menos|>\s*)\s*(\d+)\s*(?:m2|m²|mts?|metros?)\b/i,
  surfaceMax:
    /\b(?:menos\s+de|hasta|m[áa]ximo|<\s*)\s*(\d+)\s*(?:m2|m²|mts?|metros?)\b/i,
  surfaceExact: /\b(\d+)\s*(?:m2|m²|mts?|metros?)\s*(?:totales?|de\s+superficie)?\b/i,
  bedrooms: /\b(\d+)\s*(?:dormitorios?|ambientes?|habitaciones?|rec[áa]maras?)\b/i,
  bathrooms: /\b(\d+)\s*(?:ba[nñ]os?|toilettes?)\b/i,
  garages: /\b(\d+)\s*(?:cocheras?|garages?|estacionamientos?)\b/i,
  floor: /\b(?:piso|planta)\s*(\d+)\b/i,
  floorPb: /\b(?:pb|planta\s+baja)\b/i,
  escalera: /\b(?:escalera|entrada)\s*([a-zA-Z])\b/i,
  priceMin: /\b(?:desde|m[íi]nimo|>\s*)\s*\$?\s*([\d.,]+)\s*(?:k|mil|mill[oó]n)?\b/i,
  priceMax: /\b(?:hasta|m[áa]ximo|<\s*)\s*\$?\s*([\d.,]+)\s*(?:k|mil|mill[oó]n)?\b/i,
}

function parseSurfaceNum(m: RegExpMatchArray): number {
  return parseInt(m[1]!.replace(/[.,]/g, ''), 10) || 0
}

function parsePriceNum(m: RegExpMatchArray): number {
  const s = m[1]!.replace(/[.,]/g, '')
  const mult = m[0]!.toLowerCase().includes('mill') ? 1_000_000 : m[0]!.toLowerCase().includes('k') || m[0]!.toLowerCase().includes('mil') ? 1_000 : 1
  return (parseInt(s, 10) || 0) * mult
}

/**
 * Extrae filtros aplicables a partir de la query de búsqueda.
 * Usado por el asistente y por búsqueda por texto.
 */
export function extractFiltersFromQuery(q: string): ExtractedFilters {
  const filters: ExtractedFilters = {}
  const lower = q.toLowerCase().trim()
  if (!lower) return filters

  // Amenities
  const amenities: Amenity[] = []
  for (const { terms, amenity } of SEARCH_TERM_TO_AMENITY) {
    for (const t of terms) {
      if (lower.includes(t)) {
        amenities.push(amenity)
        break
      }
    }
  }
  if (amenities.length > 0) filters.amenities = [...new Set(amenities)]

  // Superficie
  const surfMin = q.match(NUMERIC_PATTERNS.surfaceMin)
  if (surfMin) filters.minSurface = parseSurfaceNum(surfMin)

  const surfMax = q.match(NUMERIC_PATTERNS.surfaceMax)
  if (surfMax) filters.maxSurface = parseSurfaceNum(surfMax)

  if (!filters.minSurface && !filters.maxSurface) {
    const surfExact = q.match(NUMERIC_PATTERNS.surfaceExact)
    if (surfExact) {
      const n = parseSurfaceNum(surfExact)
      if (n > 0) filters.minSurface = Math.floor(n * 0.9)
      filters.maxSurface = Math.ceil(n * 1.1)
    }
  }

  // Dormitorios (mínimo cuando dice "2 dormitorios" o "al menos 3 ambientes")
  const beds = q.match(NUMERIC_PATTERNS.bedrooms)
  if (beds) filters.minBedrooms = parseInt(beds[1]!, 10) || 0

  // Baños
  const baths = q.match(NUMERIC_PATTERNS.bathrooms)
  if (baths) filters.minBathrooms = parseInt(baths[1]!, 10) || 0

  // Cocheras/garages
  const gars = q.match(NUMERIC_PATTERNS.garages)
  if (gars) filters.minGarages = parseInt(gars[1]!, 10) || 0

  // Piso
  const floor = q.match(NUMERIC_PATTERNS.floor)
  if (floor) {
    const n = parseInt(floor[1]!, 10)
    if (n >= 0) filters.floorMin = n
    filters.floorMax = n
  }
  if (q.match(NUMERIC_PATTERNS.floorPb)) {
    filters.floorMin = 0
    filters.floorMax = 0
  }

  // Escalera (A, B, C, etc.)
  const esc = q.match(NUMERIC_PATTERNS.escalera)
  if (esc) filters.escalera = esc[1]!.toUpperCase()

  // Precio
  const pMin = q.match(NUMERIC_PATTERNS.priceMin)
  if (pMin) filters.minPrice = parsePriceNum(pMin)
  const pMax = q.match(NUMERIC_PATTERNS.priceMax)
  if (pMax) filters.maxPrice = parsePriceNum(pMax)

  return filters
}
