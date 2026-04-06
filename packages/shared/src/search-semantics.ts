/**
 * Sinónimos y reglas de texto → operación / tipo de propiedad (doc 38 AB).
 * Fuente única para `extractFiltersFromQuery` y fallback conversacional (web).
 */

import type { OperationType, PropertyType } from './types/listing'

/** Orden: más específico primero (misma prioridad que la lógica histórica). */
const OPERATION_RULES: ReadonlyArray<{ re: RegExp; op: OperationType }> = [
  { re: /\balquiler\s+temporario\b/i, op: 'temporary_rent' },
  { re: /\balquiler\s+vacacional\b/i, op: 'temporary_rent' },
  { re: /\btemporari[oa]s?\b/i, op: 'temporary_rent' },
  { re: /\bairbnb\b/i, op: 'temporary_rent' },
  { re: /\balquiler\b/i, op: 'rent' },
  { re: /\balquilar\b/i, op: 'rent' },
  { re: /\barriendo\b/i, op: 'rent' },
  { re: /\barrendar\b/i, op: 'rent' },
  { re: /\brento\b/i, op: 'rent' },
  { re: /\balquilo\b/i, op: 'rent' },
  { re: /\bpara\s+alquilar\b/i, op: 'rent' },
  { re: /\bpara\s+comprar\b/i, op: 'sale' },
  { re: /\bbusco\s+comprar\b/i, op: 'sale' },
  { re: /\bventa\b/i, op: 'sale' },
  { re: /\bvendo\b/i, op: 'sale' },
  { re: /\bvenden\b/i, op: 'sale' },
  { re: /\bcomprar\b/i, op: 'sale' },
  { re: /\bcompro\b/i, op: 'sale' },
]

/**
 * Detecta operación por texto (español regional). Orden: reglas más específicas primero.
 */
export function matchOperationTypeFromText(normalizedLower: string): OperationType | undefined {
  const s = normalizedLower
  for (const { re, op } of OPERATION_RULES) {
    if (re.test(s)) return op
  }
  return undefined
}

/**
 * Primera operación detectada con el fragmento exacto en el texto original (para quitar de `multi_match`).
 */
export function matchOperationSpanInOriginalQuery(originalQ: string):
  | { op: OperationType; span: string }
  | undefined {
  for (const { re, op } of OPERATION_RULES) {
    const m = originalQ.match(re)
    if (m?.[0]) return { op, span: m[0] }
  }
  return undefined
}

/** Frases de mayor longitud primero para no confundir "local comercial" con "local". */
const PROPERTY_PHRASES: Array<{ phrase: string; type: PropertyType }> = [
  { phrase: 'casa quinta', type: 'house' },
  { phrase: 'casa de campo', type: 'house' },
  { phrase: 'local comercial', type: 'commercial' },
  { phrase: 'unidad funcional', type: 'development_unit' },
  { phrase: 'departamento', type: 'apartment' },
  { phrase: 'monoambiente', type: 'apartment' },
  { phrase: 'duplex', type: 'house' },
  { phrase: 'dúplex', type: 'house' },
  { phrase: 'triplex', type: 'house' },
  { phrase: 'tríplex', type: 'house' },
  { phrase: 'finca rústica', type: 'land' },
  { phrase: 'finca rustica', type: 'land' },
  { phrase: 'fracción rural', type: 'land' },
  { phrase: 'fraccion rural', type: 'land' },
  { phrase: 'monte nativo', type: 'land' },
  { phrase: 'uso agrícola', type: 'land' },
  { phrase: 'zona rural', type: 'land' },
  { phrase: 'terreno', type: 'land' },
  { phrase: 'lote', type: 'land' },
  { phrase: 'loteo', type: 'land' },
  { phrase: 'parcela', type: 'land' },
  { phrase: 'chacra', type: 'land' },
  { phrase: 'estancia', type: 'land' },
  { phrase: 'finca', type: 'land' },
  { phrase: 'campo', type: 'land' },
  { phrase: 'oficina', type: 'office' },
  { phrase: 'galpón', type: 'warehouse' },
  { phrase: 'galpon', type: 'warehouse' },
  { phrase: 'depósito', type: 'warehouse' },
  { phrase: 'deposito', type: 'warehouse' },
  { phrase: 'cochera', type: 'parking' },
  { phrase: 'emprendimiento', type: 'development_unit' },
  { phrase: 'en pozo', type: 'development_unit' },
  /**
   * No mapear la palabra suelta "casa": en búsquedas tipo «casa en venta» el usuario suele
   * referirse a cualquier inmueble; forzar `house` excluye deptos y vacía el listado.
   * Siguen vigentes `casa quinta` y `casa de campo`.
   */
  { phrase: 'local', type: 'commercial' },
]

/** Exportado para extracción con spans (Sprint 22). */
export const PROPERTY_PHRASES_SORTED = [...PROPERTY_PHRASES].sort(
  (a, b) => b.phrase.length - a.phrase.length
)

/**
 * Si el texto describe una vivienda o terreno habitado, «cochera» suele ser amenity (garage), no lote de estacionamiento.
 */
export function shouldTreatCocheraAsParkingPropertyType(text: string): boolean {
  const s = text.toLowerCase()
  return !/\b(casa|casas|depto|deptos|departamento|departamentos|monoambiente|ph|dúplex|duplex|tr[ií]plex|(?:\d+\s*)?(?:dormitorios?|ambientes?)|pileta|patio|jard[ií]n|quincho|lote|terreno|chacra|barrio|zona)\b/i.test(
    s
  )
}

/**
 * Detecta tipo de propiedad por subcadenas; prioriza frases largas.
 */
export function matchPropertyTypeFromText(normalizedLower: string): PropertyType | undefined {
  const s = normalizedLower
  for (const { phrase, type } of PROPERTY_PHRASES_SORTED) {
    if (!s.includes(phrase)) continue
    if (phrase === 'cochera' && type === 'parking' && !shouldTreatCocheraAsParkingPropertyType(s)) {
      continue
    }
    return type
  }
  if (/\bdepto\b/.test(s) || /\bdeptos\b/.test(s)) return 'apartment'
  if (/\bph\b/.test(s)) return 'ph'
  return undefined
}
