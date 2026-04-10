/**
 * Extrae filtros de búsqueda a partir de texto libre o consulta de asistente.
 * Referencia: campos del XML Zonaprop/Kiteprop (docs/36-MAPEO-ZONAPROP-XML-AMENITIES.md).
 *
 * Ejemplos: "piso 3", "más de 80 m2", "2 baños", "escalera B", "con garage"
 */

import { SEARCH_TERM_TO_AMENITY } from './amenity-mapping'
import {
  matchOperationSpanInOriginalQuery,
  PROPERTY_PHRASES_SORTED,
  shouldTreatCocheraAsParkingPropertyType,
} from './search-semantics'
import type { Amenity, OperationType, PropertyType } from './types/listing'

export interface ExtractedFilters {
  operationType?: OperationType
  propertyType?: PropertyType
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

/** Superficie mínima heurística ante "grande", "amplio", etc. (sin número explícito). */
export const MIN_SURFACE_FROM_SIZE_WORD = 100

export interface ExtractFiltersFromQueryDetail {
  filters: ExtractedFilters
  /** Fragmentos del texto original interpretados como filtros (para no repetirlos en full-text). */
  consumedParts: string[]
}

/** Palabras sueltas que suelen quedar al quitar filtros y no aportan a título/ubicación. */
const RESIDUAL_STOPWORDS = new Set([
  'para',
  'con',
  'sin',
  'y',
  'o',
  'de',
  'del',
  'en',
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'que',
  'por',
  'al',
  'es',
  'son',
])

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Quita de `q` las partes ya usadas como filtros y stopwords triviales.
 * El resultado es lo que debe ir a `multi_match` / ILIKE (p. ej. barrio libre).
 */
export function stripConsumedPartsFromQuery(q: string, parts: string[]): string {
  let out = q
  const unique = [...new Set(parts.filter((p) => p.trim().length >= 2))].sort(
    (a, b) => b.length - a.length
  )
  for (const p of unique) {
    out = out.replace(new RegExp(escapeRegExp(p), 'gi'), ' ')
  }
  out = out.replace(/\s+/g, ' ').trim()
  const words = out
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !RESIDUAL_STOPWORDS.has(w.toLowerCase()))
  return words.join(' ').trim()
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
  /** Techo coloquial: «tengo 100k dólares», «presupuesto 80 mil usd». */
  priceBudgetMax:
    /\b(?:tengo|dispongo\s+de|presupuesto(?:\s+(?:de|máximo|maximo))?|puedo\s+(?:gastar|invertir)|me\s+alcanza(?:\s+para)?)\s*:?\s*\$?\s*([\d.,]+)\s*(?:k|mil|mill(?:ones|ón)?)?(?:\s*(?:usd|u\$s|u\$d|pesos?|d[óo]lar(?:es)?))?\b/i,
  sizeWord:
    /\b(grandes?|amplio|amplia|amplías|amplí[oa]s?|espacios[oa]s?)\b/i,
}

function parseSurfaceNum(m: RegExpMatchArray): number {
  return parseInt(m[1]!.replace(/[.,]/g, ''), 10) || 0
}

function parsePriceNum(m: RegExpMatchArray): number {
  const s = m[1]!.replace(/[.,]/g, '')
  const mult = m[0]!.toLowerCase().includes('mill')
    ? 1_000_000
    : m[0]!.toLowerCase().includes('k') || m[0]!.toLowerCase().includes('mil')
      ? 1_000
      : 1
  return (parseInt(s, 10) || 0) * mult
}

/**
 * Igual que `extractFiltersFromQuery` pero devuelve fragmentos consumidos (Sprint 22).
 */
export function extractFiltersFromQueryDetailed(q: string): ExtractFiltersFromQueryDetail {
  const filters: ExtractedFilters = {}
  const consumedParts: string[] = []
  const lower = q.toLowerCase().trim()
  if (!lower) return { filters, consumedParts }

  const opMatch = matchOperationSpanInOriginalQuery(q)
  if (opMatch) {
    filters.operationType = opMatch.op
    consumedParts.push(opMatch.span)
  }

  let propertySet = false
  for (const { phrase, type } of PROPERTY_PHRASES_SORTED) {
    const idx = lower.indexOf(phrase)
    if (idx < 0) continue
    if (
      phrase === 'cochera' &&
      type === 'parking' &&
      !shouldTreatCocheraAsParkingPropertyType(lower)
    ) {
      continue
    }
    filters.propertyType = type
    consumedParts.push(q.slice(idx, idx + phrase.length))
    propertySet = true
    break
  }
  if (!propertySet) {
    const depto = q.match(/\bdeptos?\b/i)
    if (depto) {
      filters.propertyType = 'apartment'
      consumedParts.push(depto[0])
    } else {
      const ph = q.match(/\bph\b/i)
      if (ph) {
        filters.propertyType = 'ph'
        consumedParts.push(ph[0])
      }
    }
  }

  const amenities: Amenity[] = []
  for (const { terms, amenity } of SEARCH_TERM_TO_AMENITY) {
    for (const t of terms) {
      if (lower.includes(t)) {
        amenities.push(amenity)
        const idx = lower.indexOf(t)
        if (idx >= 0) consumedParts.push(q.slice(idx, idx + t.length))
        break
      }
    }
  }
  if (amenities.length > 0) filters.amenities = [...new Set(amenities)]

  const surfMin = q.match(NUMERIC_PATTERNS.surfaceMin)
  if (surfMin) {
    filters.minSurface = parseSurfaceNum(surfMin)
    consumedParts.push(surfMin[0])
  }

  const surfMax = q.match(NUMERIC_PATTERNS.surfaceMax)
  if (surfMax) {
    filters.maxSurface = parseSurfaceNum(surfMax)
    consumedParts.push(surfMax[0])
  }

  if (!filters.minSurface && !filters.maxSurface) {
    const surfExact = q.match(NUMERIC_PATTERNS.surfaceExact)
    if (surfExact) {
      const n = parseSurfaceNum(surfExact)
      if (n > 0) filters.minSurface = Math.floor(n * 0.9)
      filters.maxSurface = Math.ceil(n * 1.1)
      consumedParts.push(surfExact[0])
    }
  }

  if (!filters.minSurface) {
    const sw = q.match(NUMERIC_PATTERNS.sizeWord)
    if (sw) {
      filters.minSurface = MIN_SURFACE_FROM_SIZE_WORD
      consumedParts.push(sw[0])
    }
  }

  const beds = q.match(NUMERIC_PATTERNS.bedrooms)
  if (beds) {
    filters.minBedrooms = parseInt(beds[1]!, 10) || 0
    consumedParts.push(beds[0])
  }

  const baths = q.match(NUMERIC_PATTERNS.bathrooms)
  if (baths) {
    filters.minBathrooms = parseInt(baths[1]!, 10) || 0
    consumedParts.push(baths[0])
  }

  const gars = q.match(NUMERIC_PATTERNS.garages)
  if (gars) {
    filters.minGarages = parseInt(gars[1]!, 10) || 0
    consumedParts.push(gars[0])
  }

  const floor = q.match(NUMERIC_PATTERNS.floor)
  if (floor) {
    const n = parseInt(floor[1]!, 10)
    if (n >= 0) filters.floorMin = n
    filters.floorMax = n
    consumedParts.push(floor[0])
  }
  const floorPb = q.match(NUMERIC_PATTERNS.floorPb)
  if (floorPb) {
    filters.floorMin = 0
    filters.floorMax = 0
    consumedParts.push(floorPb[0])
  }

  const esc = q.match(NUMERIC_PATTERNS.escalera)
  if (esc) {
    filters.escalera = esc[1]!.toUpperCase()
    consumedParts.push(esc[0])
  }

  const pMin = q.match(NUMERIC_PATTERNS.priceMin)
  if (pMin) {
    filters.minPrice = parsePriceNum(pMin)
    consumedParts.push(pMin[0])
  }
  const pMax = q.match(NUMERIC_PATTERNS.priceMax)
  if (pMax) {
    filters.maxPrice = parsePriceNum(pMax)
    consumedParts.push(pMax[0])
  }

  if (filters.maxPrice == null) {
    const bud = q.match(NUMERIC_PATTERNS.priceBudgetMax)
    if (bud) {
      filters.maxPrice = parsePriceNum(bud)
      consumedParts.push(bud[0])
    }
  }

  return { filters, consumedParts }
}

/**
 * Extrae filtros aplicables a partir de la query de búsqueda.
 * Usado por el asistente y por búsqueda por texto.
 */
export function extractFiltersFromQuery(q: string): ExtractedFilters {
  return extractFiltersFromQueryDetailed(q).filters
}
