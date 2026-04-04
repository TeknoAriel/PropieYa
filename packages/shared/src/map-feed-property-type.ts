/**
 * Normaliza el tipo de propiedad que viene de feeds (Yumblin, XML, etc.)
 * hacia el enum canónico. Valores desconocidos ya no se fuerzan siempre a `apartment`
 * cuando el texto describe claramente otra categoría.
 */

import { matchPropertyTypeFromText } from './search-semantics'
import type { PropertyType } from './types/listing'

/**
 * Clave estable para lookup: minúsculas, espacios → guión bajo (como Kiteprop/OpenNavent).
 */
function feedTypeKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
}

/** Coincidencia exacta por código de feed (español + inglés Kiteprop/Yumblin). */
const FEED_TYPE_EXACT: Record<string, PropertyType> = {
  departamento: 'apartment',
  departamentos: 'apartment',
  apartment: 'apartment',
  apartments: 'apartment',
  depto: 'apartment',
  deptos: 'apartment',
  dto: 'apartment',
  dpto: 'apartment',
  monoambiente: 'apartment',
  loft: 'apartment',
  piso: 'apartment',
  casa: 'house',
  house: 'house',
  houses: 'house',
  ph: 'ph',
  terreno: 'land',
  land: 'land',
  lote: 'land',
  residential_lands: 'land',
  residential_land: 'land',
  industrial_lands: 'land',
  industrial_land: 'land',
  cemetery_lots: 'land',
  cemetery_lot: 'land',
  lots: 'land',
  lot: 'land',
  agricultural_lands: 'land',
  agricultural_land: 'land',
  farms: 'land',
  farm: 'land',
  oficina: 'office',
  office: 'office',
  offices: 'office',
  local: 'commercial',
  commercial: 'commercial',
  retail_spaces: 'commercial',
  retail_space: 'commercial',
  businesses: 'commercial',
  business: 'commercial',
  medical_spaces: 'commercial',
  medical_space: 'commercial',
  galpon: 'warehouse',
  galpón: 'warehouse',
  warehouse: 'warehouse',
  warehouses: 'warehouse',
  industrial_warehouses: 'warehouse',
  industrial_warehouse: 'warehouse',
  boat_storages: 'warehouse',
  boat_storage: 'warehouse',
  cochera: 'parking',
  parking: 'parking',
  parking_spaces: 'parking',
  parking_space: 'parking',
  duplex: 'house',
  dúplex: 'house',
  triplex: 'house',
  tríplex: 'house',
  emprendimiento: 'development_unit',
}

/**
 * Mapea texto de feed a `PropertyType`. Si falta o es ambiguo, usa `apartment`
 * (comportamiento histórico para feeds que solo envían “departamento”).
 */
export function mapFeedPropertyType(raw: unknown): PropertyType {
  const key = feedTypeKey(raw)
  if (!key) return 'apartment'

  const exact = FEED_TYPE_EXACT[key]
  if (exact) return exact

  const spaced = key.replace(/_/g, ' ')
  const fromSemantics = matchPropertyTypeFromText(spaced)
  if (fromSemantics) return fromSemantics

  return 'apartment'
}
