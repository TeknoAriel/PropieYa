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
  /** Slugs típicos de `property_type_old` (Properstar / Zonaprop). */
  casas: 'house',
  terrenos_o_lotes: 'land',
  terreno_o_lote: 'land',
  locales_comerciales: 'commercial',
  consultorios: 'commercial',
  oficinas: 'office',
  galpones_depositos_edificios_ind: 'warehouse',
  galpones_depositos: 'warehouse',
  edificios_en_block: 'warehouse',
  negocios_o_fondos_de_comercio: 'commercial',
  fondos_de_comercio: 'commercial',
  cocheras: 'parking',
  estacionamientos: 'parking',
  bovedas_nichos_o_parcelas: 'land',
  parcelas_de_cementerio: 'land',
  camas_nauticas: 'warehouse',
  amarres_y_guarderias_nauticas: 'warehouse',
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
 * Mapea código de feed + título/descripción del aviso.
 * Si el feed dice `apartment` pero el texto describe otro tipo (terreno, PH, local…), se prefiere el texto.
 * Si el código de feed es desconocido, se intenta inferir solo desde el texto antes de caer en `apartment`.
 */
export function mapFeedPropertyTypeWithListingText(
  raw: unknown,
  context: { title: string; description?: string | null }
): PropertyType {
  const key = feedTypeKey(raw)
  const textBlob = `${context.title} ${context.description ?? ''}`.trim().toLowerCase()
  const fromText = textBlob ? matchPropertyTypeFromText(textBlob) : undefined

  if (!key) {
    if (fromText) return fromText
    return 'apartment'
  }

  const exact = FEED_TYPE_EXACT[key]
  if (exact != null) {
    if (exact !== 'apartment') return exact
    if (fromText && fromText !== 'apartment') return fromText
    return exact
  }

  const spaced = key.replace(/_/g, ' ')
  const fromKeySemantic = matchPropertyTypeFromText(spaced)
  if (fromKeySemantic != null) {
    if (fromKeySemantic !== 'apartment') return fromKeySemantic
    if (fromText && fromText !== 'apartment') return fromText
    return fromKeySemantic
  }

  if (fromText) return fromText
  return 'apartment'
}

/**
 * Mapea solo el código del feed (sin título). Para import usar `mapFeedPropertyTypeWithListingText`.
 */
export function mapFeedPropertyType(raw: unknown): PropertyType {
  return mapFeedPropertyTypeWithListingText(raw, { title: '', description: '' })
}

/**
 * Inferencia desde título+descripción (p. ej. reclasificación en DB sin re-leer el feed).
 */
export function inferPropertyTypeFromListingNarrative(
  title: string,
  description?: string | null
): PropertyType | undefined {
  const blob = `${title} ${description ?? ''}`.trim().toLowerCase()
  if (!blob) return undefined
  return matchPropertyTypeFromText(blob)
}
