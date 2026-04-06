/**
 * Capa de intérprete heurístico para intención de búsqueda (sin LLM).
 * Objetivo: mayor cobertura de `operationType` y coherencia con el lenguaje natural en AR.
 */

import { foldLocalityKey } from './locality-catalog-resolver'
import { matchOperationTypeFromText } from './search-semantics'
import type { OperationType } from './types/listing'

/**
 * Señales compitiendo: si hay más indicios de alquiler que de compra (o viceversa), elegimos operación.
 * No fuerza si el texto es ambiguo (mejor dejar `undefined` y mostrar todas las operaciones).
 */
export function inferOperationTypeFromSignals(message: string): OperationType | undefined {
  const s = message.toLowerCase()
  if (
    /\balquiler\s+temporario\b|\bvacacional\b|\bairbnb\b|\btemporari[oa]s?\s+(?:de\s+)?alquiler\b/i.test(
      s
    )
  ) {
    return 'temporary_rent'
  }

  const rentPatterns: RegExp[] = [
    /\balquiler\b/,
    /\balquilar\b/,
    /\barriendo\b/,
    /\barrendar\b/,
    /\balquilo\b/,
    /\brento\b/,
    /\binquilino\b/,
    /\bcontrato\s+de\s+alquiler\b/,
    /\bdepto\s+en\s+alquiler\b/,
    /\bdepartamento\s+en\s+alquiler\b/,
    /\bcasa\s+en\s+alquiler\b/,
  ]
  const salePatterns: RegExp[] = [
    /\bcomprar\b/,
    /\bcompro\b/,
    /\bventa\b/,
    /\bvendo\b/,
    /\bvenden\b/,
    /\binversión\b/,
    /\binversion\b/,
    /\bcompra\s+venta\b/,
  ]

  let rent = 0
  let sale = 0
  for (const re of rentPatterns) {
    if (re.test(s)) rent++
  }
  for (const re of salePatterns) {
    if (re.test(s)) sale++
  }

  if (rent > sale && rent > 0) return 'rent'
  if (sale > rent && sale > 0) return 'sale'
  if (rent > 0 && sale === 0) return 'rent'
  if (sale > 0 && rent === 0) return 'sale'
  return undefined
}

/**
 * Primero reglas lexicográficas existentes; si no hay match, señales por puntuación.
 */
export function enrichOperationTypeFromMessage(message: string): OperationType | undefined {
  const normalized = foldLocalityKey(message)
  const fromLexicon = matchOperationTypeFromText(normalized)
  if (fromLexicon) return fromLexicon
  return inferOperationTypeFromSignals(message)
}
