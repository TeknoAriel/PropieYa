/**
 * Sinónimos y reglas de texto → operación / tipo de propiedad (doc 38 AB).
 * Fuente única para `extractFiltersFromQuery` y fallback conversacional (web).
 */

import type { OperationType, PropertyType } from './types/listing'

/**
 * Detecta operación por texto (español regional). Orden: reglas más específicas primero.
 */
export function matchOperationTypeFromText(normalizedLower: string): OperationType | undefined {
  const s = normalizedLower
  if (
    /\balquiler\s+temporario\b/.test(s) ||
    /\balquiler\s+vacacional\b/.test(s) ||
    /\btemporari[oa]s?\b/.test(s) ||
    /\bairbnb\b/.test(s)
  ) {
    return 'temporary_rent'
  }
  if (
    /\balquiler\b/.test(s) ||
    /\balquilar\b/.test(s) ||
    /\barriendo\b/.test(s) ||
    /\barrendar\b/.test(s) ||
    /\brento\b/.test(s) ||
    /\balquilo\b/.test(s)
  ) {
    return 'rent'
  }
  if (
    /\bventa\b/.test(s) ||
    /\bvendo\b/.test(s) ||
    /\bvenden\b/.test(s) ||
    /\bcomprar\b/.test(s) ||
    /\bcompro\b/.test(s) ||
    /\bbusco\s+comprar\b/.test(s)
  ) {
    return 'sale'
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
  { phrase: 'terreno', type: 'land' },
  { phrase: 'lote', type: 'land' },
  { phrase: 'parcela', type: 'land' },
  { phrase: 'chacra', type: 'land' },
  { phrase: 'campo', type: 'land' },
  { phrase: 'oficina', type: 'office' },
  { phrase: 'galpón', type: 'warehouse' },
  { phrase: 'galpon', type: 'warehouse' },
  { phrase: 'depósito', type: 'warehouse' },
  { phrase: 'deposito', type: 'warehouse' },
  { phrase: 'cochera', type: 'parking' },
  { phrase: 'emprendimiento', type: 'development_unit' },
  { phrase: 'en pozo', type: 'development_unit' },
  { phrase: 'casa', type: 'house' },
  { phrase: 'local', type: 'commercial' },
]

const PROPERTY_SORTED = [...PROPERTY_PHRASES].sort(
  (a, b) => b.phrase.length - a.phrase.length
)

/**
 * Detecta tipo de propiedad por subcadenas; prioriza frases largas.
 */
export function matchPropertyTypeFromText(normalizedLower: string): PropertyType | undefined {
  const s = normalizedLower
  for (const { phrase, type } of PROPERTY_SORTED) {
    if (s.includes(phrase)) return type
  }
  if (/\bdepto\b/.test(s) || /\bdeptos\b/.test(s)) return 'apartment'
  if (/\bph\b/.test(s)) return 'ph'
  return undefined
}
