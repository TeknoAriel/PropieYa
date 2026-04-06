/**
 * Pipeline conversacional: normalización → reglas de frases → validación por catálogo → salida para el motor.
 * Complementa el intérprete LLM/heurístico sin ejecutar consultas (eso queda en apps/web).
 *
 * Prioridad semántica: operación > tipo > ubicación (catálogo) > numéricos > preferencias (amenities).
 */

import {
  createLocalityResolver,
  foldLocalityKey,
  inferLocalityFromUserMessage,
  type LocalityCatalogEntry,
} from './locality-catalog-resolver'
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

export type ValidateConversationalPipelineOptions = {
  /** Ciudad/barrio reales (avisos activos). Vacío → aliases estáticos mínimos. */
  localityCatalog?: readonly LocalityCatalogEntry[]
}

export function normalizeConversationalText(raw: string): string {
  return foldLocalityKey(raw)
}

function isDeniedAsLocation(token: string): boolean {
  const f = foldLocalityKey(token)
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

  /**
   * Solo operación: forzar `propertyType: house` en «casa(s) en venta» vacía el listado
   * cuando la oferta es mixta (deptos); alineado a `search-semantics.ts` (no mapear casa suelta).
   */
  const houseSale =
    /\b(casas?\s+en\s+venta|casa\s+venta|comprar\s+casas?|busco\s+casas?\s+para\s+comprar|quiero\s+comprar\s+(una\s+)?casas?|quiero\s+comprar\s+casas?|casas?\s+para\s+comprar)\b/.test(
      s
    ) || /^(casas?\s+en\s+venta|casa\s+venta)$/i.test(s.trim())

  const houseRent =
    /\b(casas?\s+en\s+alquiler|casa\s+alquiler|alquilar\s+casas?|busco\s+casas?\s+para\s+alquilar|quiero\s+alquilar\s+(una\s+)?casas?|quiero\s+alquilar\s+casas?|arriendo\s+casas?|casas?\s+para\s+alquilar)\b/.test(
      s
    ) || /^(casas?\s+en\s+alquiler|casa\s+alquiler)$/i.test(s.trim())

  if (houseSale) {
    if (!intent.operationType) intent.operationType = 'sale'
  }
  if (houseRent) {
    if (!intent.operationType) intent.operationType = 'rent'
  }
}

/**
 * Quitar `house` cuando el texto es genérico «casa(s) en venta/alquiler» (u homólogos),
 * p. ej. lo que devuelve el LLM, para no filtrar solo `house` y quedar en cero.
 */
export function shouldOmitHouseForGenericCasaPhrase(normalizedText: string): boolean {
  const s = normalizedText
  if (/^\s*casas?\s*$/i.test(s.trim())) return true
  if (/\bcasa\s+quinta|\bcasa\s+de\s+campo|\bd[uú]plex|\btriplex|\btr[ií]plex\b/.test(s)) {
    return false
  }
  if (/\bcasas?\s+en\s+venta\b|\bcasa\s+venta\b/.test(s)) return true
  if (/\bcasas?\s+en\s+alquiler\b|\bcasa\s+alquiler\b/.test(s)) return true
  if (/\b(comprar|busco|quiero)\s+casas?\b/.test(s)) return true
  if (/\bcasas?\s+para\s+comprar\b/.test(s)) return true
  if (/\balquilar\s+casas?\b|\bcasas?\s+para\s+alquilar\b/.test(s)) return true
  if (/\barriendo\s+casas?\b/.test(s)) return true
  return false
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
  preliminary: ConversationalFlatIntent,
  options?: ValidateConversationalPipelineOptions
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
  const localityResolver = createLocalityResolver(options?.localityCatalog)

  applyConversationalPhraseRules(normalizedText, out)

  if (!(out.city?.trim() || out.neighborhood?.trim())) {
    const inferred = inferLocalityFromUserMessage(rawMessage)
    if (inferred) {
      if (inferred.kind === 'city') {
        out.city = inferred.canonical
      } else {
        out.neighborhood = inferred.canonical
      }
      validationNotes.push(
        `localidad inferida del texto: ${inferred.canonical} (${inferred.kind})`
      )
    }
  }

  const hasLocality = Boolean(out.city?.trim() || out.neighborhood?.trim())
  if (
    !out.propertyType &&
    hasLocality &&
    /\bcasas?\b/.test(normalizedText) &&
    !/\bcasa\s+quinta\b|\bcasa\s+de\s+campo\b/.test(normalizedText)
  ) {
    out.propertyType = 'house'
    validationNotes.push('propertyType house inferido: casa + localidad en el mensaje')
  }

  if (
    out.propertyType === 'house' &&
    shouldOmitHouseForGenericCasaPhrase(normalizedText) &&
    !(out.city?.trim() || out.neighborhood?.trim())
  ) {
    delete out.propertyType
    validationNotes.push(
      'propertyType house omitido: frase genérica casa(s) sin localidad (oferta mixta; ver search-semantics)'
    )
  }

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
      const hit = localityResolver.resolveForCityField(c)
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
      const hit = localityResolver.resolveForNeighborhoodField(n, out.city)
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
