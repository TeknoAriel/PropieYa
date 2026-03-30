/**
 * Normaliza el tipo de propiedad que viene de feeds (Yumblin, XML, etc.)
 * hacia el enum canónico. Valores desconocidos ya no se fuerzan siempre a `apartment`
 * cuando el texto describe claramente otra categoría.
 */

import { matchPropertyTypeFromText } from './search-semantics'
import type { PropertyType } from './types/listing'

/** Coincidencia exacta tras normalizar (minúsculas, espacios, guiones bajos). */
const FEED_TYPE_EXACT: Record<string, PropertyType> = {
  departamento: 'apartment',
  departamentos: 'apartment',
  apartment: 'apartment',
  depto: 'apartment',
  deptos: 'apartment',
  dto: 'apartment',
  dpto: 'apartment',
  monoambiente: 'apartment',
  loft: 'apartment',
  piso: 'apartment',
  casa: 'house',
  house: 'house',
  ph: 'ph',
  terreno: 'land',
  land: 'land',
  lote: 'land',
  oficina: 'office',
  office: 'office',
  local: 'commercial',
  commercial: 'commercial',
  galpon: 'warehouse',
  galpón: 'warehouse',
  warehouse: 'warehouse',
  cochera: 'parking',
  parking: 'parking',
  duplex: 'house',
  dúplex: 'house',
  triplex: 'house',
  tríplex: 'house',
  emprendimiento: 'development_unit',
}

function normalizeRaw(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Mapea texto de feed a `PropertyType`. Si falta o es ambiguo, usa `apartment`
 * (comportamiento histórico para feeds que solo envían “departamento”).
 */
export function mapFeedPropertyType(raw: unknown): PropertyType {
  const s = normalizeRaw(raw)
  if (!s) return 'apartment'

  const exact = FEED_TYPE_EXACT[s]
  if (exact) return exact

  const fromSemantics = matchPropertyTypeFromText(s)
  if (fromSemantics) return fromSemantics

  return 'apartment'
}
