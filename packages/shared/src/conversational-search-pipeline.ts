/**
 * Pipeline conversacional: normalización → reglas de frases → validación por catálogo → salida para el motor.
 * Complementa el intérprete LLM/heurístico sin ejecutar consultas (eso queda en apps/web).
 *
 * Prioridad semántica: operación > tipo > ubicación (catálogo) > numéricos > preferencias (amenities).
 */

import { FACET_FLAG_IDS_SET } from './search-facets'
import {
  matchOperationTypeFromText,
  matchPropertyTypeFromText,
} from './search-semantics'

export type CriterionMode = 'required' | 'flexible' | 'preferred'

export type ConversationalAmenitiesMatchMode = 'preferred' | 'strict'

/** Filtros planos alineados con `listing.search` / ExplainMatchFilters. */
export type ConversationalFlatIntent = {
  operationType?: 'sale' | 'rent' | 'temporary_rent'
  propertyType?: string
  city?: string
  neighborhood?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  minSurface?: number
  amenities?: string[]
  q?: string
}

export type ConversationalStructuredSnapshot = {
  intent: 'property_search'
  operation?: { value: string; mode: CriterionMode; confidence: number }
  propertyType?: { value: string; mode: CriterionMode; confidence: number }
  location: Array<{
    value: string
    kind: 'city' | 'neighborhood'
    mode: CriterionMode
    confidence: number
  }>
  constraints: {
    priceMin: number | null
    priceMax: number | null
    bedroomsMin: number | null
    surfaceMin: number | null
  }
  preferences: Array<{ value: string; mode: 'preferred'; confidence: number }>
  unknownTerms: string[]
  rawText: string
  normalizedText: string
}

export type ConversationalPipelineDebug = {
  normalizedText: string
  validationNotes: string[]
  unknownTerms: string[]
  droppedLocations: string[]
  droppedAmenities: string[]
  amenitiesMatchMode: ConversationalAmenitiesMatchMode
  structuredSnapshot: ConversationalStructuredSnapshot
}

const OPERATION_ENUM = new Set(['sale', 'rent', 'temporary_rent'])

const PROPERTY_ENUM = new Set([
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

/** Ubicaciones reconocidas (expandir con datos reales / geocoder en prod). */
const PLACE_ENTRIES: ReadonlyArray<{
  aliases: readonly string[]
  kind: 'city' | 'neighborhood'
  canonical: string
}> = [
  { aliases: ['rosario'], kind: 'city', canonical: 'Rosario' },
  { aliases: ['cordoba', 'córdoba'], kind: 'city', canonical: 'Córdoba' },
  { aliases: ['buenos aires', 'bs as', 'bsas'], kind: 'city', canonical: 'Buenos Aires' },
  { aliases: ['caba', 'capital federal', 'ciudad autonoma'], kind: 'city', canonical: 'CABA' },
  { aliases: ['funes'], kind: 'city', canonical: 'Funes' },
  { aliases: ['santa fe', 'santa fé'], kind: 'city', canonical: 'Santa Fe' },
  { aliases: ['mendoza'], kind: 'city', canonical: 'Mendoza' },
  { aliases: ['palermo'], kind: 'neighborhood', canonical: 'Palermo' },
  { aliases: ['belgrano'], kind: 'neighborhood', canonical: 'Belgrano' },
  { aliases: ['nueva cordoba', 'nueva córdoba'], kind: 'neighborhood', canonical: 'Nueva Córdoba' },
  { aliases: ['villa crespo'], kind: 'neighborhood', canonical: 'Villa Crespo' },
  { aliases: ['almagro'], kind: 'neighborhood', canonical: 'Almagro' },
  { aliases: ['caballito'], kind: 'neighborhood', canonical: 'Caballito' },
  { aliases: ['nuñez', 'nunez'], kind: 'neighborhood', canonical: 'Núñez' },
  { aliases: ['recoleta'], kind: 'neighborhood', canonical: 'Recoleta' },
  { aliases: ['san telmo'], kind: 'neighborhood', canonical: 'San Telmo' },
  { aliases: ['puerto madero'], kind: 'neighborhood', canonical: 'Puerto Madero' },
]

function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

export function normalizeConversationalText(raw: string): string {
  return fold(raw)
}

function resolveCatalogLocation(raw: string | undefined): {
  kind: 'city' | 'neighborhood'
  canonical: string
} | null {
  if (!raw?.trim()) return null
  const key = fold(raw)
  for (const e of PLACE_ENTRIES) {
    for (const a of e.aliases) {
      if (fold(a) === key) {
        return { kind: e.kind, canonical: e.canonical }
      }
    }
  }
  return null
}

function isDeniedAsLocation(token: string): boolean {
  const f = fold(token)
  if (f.length < 2) return true
  if (matchOperationTypeFromText(f) != null) return true
  if (matchPropertyTypeFromText(f) != null) return true
  return false
}

/**
 * Equivalencias explícitas (prioridad 1–2 antes de ubicación).
 * Convergen a la misma intención operación + tipo cuando faltan en el pre-parse.
 */
export function applyConversationalPhraseRules(
  normalizedText: string,
  intent: ConversationalFlatIntent
): void {
  const s = normalizedText

  const houseSale =
    /\b(casa en venta|casa venta|comprar casa|busco casa para comprar|quiero comprar una casa|quiero comprar casa|casa para comprar)\b/.test(
      s
    ) || /^(casa en venta|casa venta)$/i.test(s.trim())

  const houseRent =
    /\b(casa en alquiler|casa alquiler|alquilar casa|busco casa para alquilar|quiero alquilar una casa|quiero alquilar casa|arriendo casa|casa para alquilar)\b/.test(
      s
    ) || /^(casa en alquiler|casa alquiler)$/i.test(s.trim())

  if (houseSale) {
    if (!intent.operationType) intent.operationType = 'sale'
    if (!intent.propertyType) intent.propertyType = 'house'
  }
  if (houseRent) {
    if (!intent.operationType) intent.operationType = 'rent'
    if (!intent.propertyType) intent.propertyType = 'house'
  }
}

function filterAmenitiesToCatalog(raw: string[] | undefined): {
  kept: string[]
  dropped: string[]
} {
  if (!raw?.length) return { kept: [], dropped: [] }
  const kept: string[] = []
  const dropped: string[] = []
  for (const a of raw) {
    const id = String(a).trim()
    if (FACET_FLAG_IDS_SET.has(id)) kept.push(id)
    else dropped.push(id)
  }
  return { kept, dropped: [...new Set(dropped)] }
}

export function detectStrictAmenitiesFromText(message: string): boolean {
  return (
    /(s[ií]|si)\s+o\s+(s[ií]|si)/i.test(message) ||
    /\b(obligatorio|tiene que tener|sin falta|forzosamente)\b/i.test(message)
  )
}

function buildStructuredSnapshot(
  out: ConversationalFlatIntent,
  unknownTerms: string[],
  normalizedText: string,
  rawText: string,
  amenitiesMode: ConversationalAmenitiesMatchMode
): ConversationalStructuredSnapshot {
  const location: ConversationalStructuredSnapshot['location'] = []
  if (out.city) {
    location.push({
      value: out.city,
      kind: 'city',
      mode: 'required',
      confidence: 0.9,
    })
  }
  if (out.neighborhood) {
    location.push({
      value: out.neighborhood,
      kind: 'neighborhood',
      mode: 'required',
      confidence: 0.9,
    })
  }

  const preferences: ConversationalStructuredSnapshot['preferences'] = []
  for (const a of out.amenities ?? []) {
    preferences.push({
      value: a,
      mode: 'preferred',
      confidence: amenitiesMode === 'strict' ? 0.95 : 0.75,
    })
  }

  return {
    intent: 'property_search',
    operation: out.operationType
      ? { value: out.operationType, mode: 'required', confidence: 0.95 }
      : undefined,
    propertyType: out.propertyType
      ? { value: out.propertyType, mode: 'required', confidence: 0.9 }
      : undefined,
    location,
    constraints: {
      priceMin: out.minPrice ?? null,
      priceMax: out.maxPrice ?? null,
      bedroomsMin: out.minBedrooms ?? null,
      surfaceMin: out.minSurface ?? null,
    },
    preferences,
    unknownTerms,
    rawText,
    normalizedText,
  }
}

/**
 * Valida y normaliza la salida del intérprete (LLM + heurísticas) antes del motor.
 * - Ubicación solo si está en catálogo (si no → unknownTerms y opcionalmente refuerzo en q).
 * - Amenities solo ids del catálogo FACETS.
 * - Modo strict de amenities si el texto exige “sí o sí”, etc.
 */
export function validateConversationalPipeline(
  rawMessage: string,
  preliminary: ConversationalFlatIntent
): {
  extracted: ConversationalFlatIntent
  amenitiesMatchMode: ConversationalAmenitiesMatchMode
  debug: ConversationalPipelineDebug
} {
  const validationNotes: string[] = []
  const unknownTerms: string[] = []
  const droppedLocations: string[] = []
  const droppedAmenities: string[] = []

  const normalizedText = normalizeConversationalText(rawMessage)
  const out: ConversationalFlatIntent = { ...preliminary }

  applyConversationalPhraseRules(normalizedText, out)

  if (out.operationType && !OPERATION_ENUM.has(out.operationType)) {
    validationNotes.push(`operationType inválido omitido: ${out.operationType}`)
    delete out.operationType
  }
  if (out.propertyType && !PROPERTY_ENUM.has(out.propertyType)) {
    validationNotes.push(`propertyType inválido omitido: ${out.propertyType}`)
    delete out.propertyType
  }

  if (out.city?.trim()) {
    const c = out.city.trim()
    if (isDeniedAsLocation(c)) {
      droppedLocations.push(c)
      unknownTerms.push(c)
      delete out.city
      validationNotes.push(`city rechazada (no es topónimo): ${c}`)
    } else {
      const hit = resolveCatalogLocation(c)
      if (hit) {
        if (hit.kind === 'city') out.city = hit.canonical
        else {
          out.neighborhood = out.neighborhood ?? hit.canonical
          delete out.city
          validationNotes.push(`city reinterpretada como barrio: ${hit.canonical}`)
        }
      } else {
        droppedLocations.push(c)
        unknownTerms.push(c)
        delete out.city
        validationNotes.push(`city no catalogada → texto libre: ${c}`)
      }
    }
  }

  if (out.neighborhood?.trim()) {
    const n = out.neighborhood.trim()
    if (isDeniedAsLocation(n)) {
      droppedLocations.push(n)
      unknownTerms.push(n)
      delete out.neighborhood
      validationNotes.push(`neighborhood rechazada (token de negocio): ${n}`)
    } else {
      const hit = resolveCatalogLocation(n)
      if (hit) {
        if (hit.kind === 'neighborhood') out.neighborhood = hit.canonical
        else {
          out.city = hit.canonical
          delete out.neighborhood
          validationNotes.push(`neighborhood reinterpretada como ciudad: ${hit.canonical}`)
        }
      } else {
        droppedLocations.push(n)
        unknownTerms.push(n)
        delete out.neighborhood
        validationNotes.push(`neighborhood no catalogada → texto libre: ${n}`)
      }
    }
  }

  const { kept, dropped } = filterAmenitiesToCatalog(out.amenities)
  out.amenities = kept.length > 0 ? kept : undefined
  droppedAmenities.push(...dropped)
  if (dropped.length) {
    validationNotes.push(`amenities no catalogadas omitidas: ${dropped.join(', ')}`)
  }

  let amenitiesMatchMode: ConversationalAmenitiesMatchMode = 'preferred'
  if (detectStrictAmenitiesFromText(rawMessage) && (out.amenities?.length ?? 0) > 0) {
    amenitiesMatchMode = 'strict'
    validationNotes.push('amenitiesMatchMode=strict (lenguaje excluyente)')
  }

  const qParts = [out.q?.trim(), ...unknownTerms].filter(Boolean) as string[]
  const mergedQ = qParts.join(' ').trim().slice(0, 200)
  out.q = mergedQ.length > 0 ? mergedQ : undefined

  const structuredSnapshot = buildStructuredSnapshot(
    out,
    [...new Set(unknownTerms)],
    normalizedText,
    rawMessage.trim(),
    amenitiesMatchMode
  )

  return {
    extracted: out,
    amenitiesMatchMode,
    debug: {
      normalizedText,
      validationNotes,
      unknownTerms: [...new Set(unknownTerms)],
      droppedLocations,
      droppedAmenities,
      amenitiesMatchMode,
      structuredSnapshot,
    },
  }
}
