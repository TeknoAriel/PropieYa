/**
 * Mapeo de campos XML/JSON (Zonaprop, Kiteprop, Yumblin) → Amenity.
 * Usado para import y para búsqueda por texto/asistente.
 *
 * Los valores normalizados deben alinearse con `FACETS_CATALOG` / `SEARCH_FILTER_AMENITIES`
 * (`search-facets.ts`). Tokens sin mapeo quedan en `feedRawTokens` (trazabilidad del feed).
 *
 * Referencia XML: https://static.kiteprop.com/kp/difusions/.../zonaprop.xml
 */

import { filterAmenitiesToFacetCatalog } from './search-facets'
import type { Amenity } from './types/listing'

/** Mapeo: clave en feed (lowercase) → amenity interno */
export const FEED_TO_AMENITY: Record<string, Amenity> = {
  // Español / variantes
  balcon: 'balcony',
  balcón: 'balcony',
  terraza: 'terrace',
  cochera: 'parking',
  garage: 'parking',
  garages: 'parking',
  aire_acondicionado: 'air_conditioning',
  'aire acondicionado': 'air_conditioning',
  calefaccion: 'heating',
  calefacción: 'heating',
  chimenea: 'fireplace',
  pileta: 'pool',
  piscina: 'pool',
  gimnasio: 'gym',
  seguridad_24h: 'security_24h',
  lavadero: 'laundry',
  rooftop: 'rooftop',
  sum: 'sum',
  parrilla: 'bbq',
  jardin: 'garden',
  jardín: 'garden',
  baulera: 'storage',
  ascensor: 'elevator',
  portero: 'doorman',
  amoblado: 'furnished',
  mascotas: 'pet_friendly',
  'apto mascotas': 'pet_friendly',
  accesible: 'wheelchair_accessible',
  'contra frente': 'front_facing',
  contra_frente: 'front_facing',
  frente: 'front_facing',
  apto_credito: 'credit_approved',
  'apto crédito': 'credit_approved',
  apto_credito_financiacion: 'credit_approved',
  financiacion: 'credit_approved',
  juegos_infantiles: 'playground',
  playground: 'playground',
  juegos: 'playground',
  // Inglés
  balcony: 'balcony',
  terrace: 'terrace',
  parking: 'parking',
  air_conditioning: 'air_conditioning',
  heating: 'heating',
  fireplace: 'fireplace',
  pool: 'pool',
  gym: 'gym',
  storage: 'storage',
  elevator: 'elevator',
  doorman: 'doorman',
  furnished: 'furnished',
  pet_friendly: 'pet_friendly',
  wheelchair_accessible: 'wheelchair_accessible',
  front_facing: 'front_facing',
  credit_approved: 'credit_approved',
}

const MAX_FEED_RAW_TOKENS = 150
const MAX_RAW_TOKEN_LEN = 120

function mapFeedStringToAmenity(raw: string): Amenity | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const key = trimmed.toLowerCase().replace(/\s+/g, '_')
  return FEED_TO_AMENITY[key] ?? FEED_TO_AMENITY[trimmed.toLowerCase()]
}

export type ExtractAmenitiesFromFeedResult = {
  amenities: Amenity[]
  /** Cadenas del feed (arrays) que no mapearon a `Amenity`; conserva auditoría / futuros mapeos. */
  feedRawTokens: string[]
}

/**
 * Igual que `extractAmenitiesFromFeedItem` más tokens crudos no mapeados (arrays de strings).
 */
export function extractAmenitiesFromFeedItemDetailed(
  item: Record<string, unknown>
): ExtractAmenitiesFromFeedResult {
  const seen = new Set<Amenity>()
  const rawUnmapped = new Set<string>()
  const add = (a: Amenity) => {
    seen.add(a)
  }

  const arrSources = [
    item.amenities,
    item.caracteristicas,
    item.features,
    item.características,
  ]
  for (const arr of arrSources) {
    if (!Array.isArray(arr)) continue
    for (const v of arr) {
      const s = String(v)
      const amenity = mapFeedStringToAmenity(s)
      if (amenity) add(amenity)
      else {
        const t = s.trim().slice(0, MAX_RAW_TOKEN_LEN)
        if (t) rawUnmapped.add(t)
      }
    }
  }

  const boolMap: Array<[string | string[], Amenity]> = [
    [['balcon', 'balcony'], 'balcony'],
    [['terraza', 'terrace'], 'terrace'],
    [['cochera', 'garage', 'garages', 'parking'], 'parking'],
    [['aire_acondicionado', 'air_conditioning', 'aire acondicionado'], 'air_conditioning'],
    [['calefaccion', 'heating', 'calefacción'], 'heating'],
    [['chimenea', 'fireplace'], 'fireplace'],
    [['pileta', 'piscina', 'pool'], 'pool'],
    [['gimnasio', 'gym'], 'gym'],
    [['contra_frente', 'contra frente', 'front_facing', 'frente'], 'front_facing'],
    [['apto_credito', 'apto crédito', 'credit_approved', 'financiacion'], 'credit_approved'],
  ]
  for (const [keys, amenity] of boolMap) {
    const kArr = Array.isArray(keys) ? keys : [keys]
    for (const k of kArr) {
      const v = item[k]
      if (v === true || v === '1' || v === 'true' || v === 'si' || v === 'sí') {
        add(amenity)
        break
      }
    }
  }

  const garagesVal = item.garages ?? item.cocheras ?? item.garage_count
  const garagesNum =
    typeof garagesVal === 'number' ? garagesVal : parseInt(String(garagesVal ?? 0), 10)
  if (Number.isFinite(garagesNum) && garagesNum > 0) add('parking')

  const feedRawTokens = [...rawUnmapped].slice(0, MAX_FEED_RAW_TOKENS)
  return {
    amenities: [...seen],
    feedRawTokens,
  }
}

/**
 * Extrae amenities de un item de feed (JSON/Yumblin).
 * Busca en: item.amenities[], item.caracteristicas[], item.features[],
 * y campos booleanos directos (balcon, garage, etc.).
 */
export function extractAmenitiesFromFeedItem(
  item: Record<string, unknown>
): Amenity[] {
  return extractAmenitiesFromFeedItemDetailed(item).amenities
}

/**
 * Amenities del listing acotadas al catálogo de facets (búsqueda / UI).
 * No reemplaza el array completo en DB: sirve para índices o vistas alineadas al catálogo.
 */
export function amenitiesForFacetCatalog(amenities: readonly Amenity[]): Amenity[] {
  return filterAmenitiesToFacetCatalog(amenities)
}

/**
 * Términos de búsqueda (texto/asistente) → amenity.
 * Para que "con balcón" o "quiero garage" active el filtro.
 */
export const SEARCH_TERM_TO_AMENITY: Array<{ terms: string[]; amenity: Amenity }> = [
  { terms: ['balcon', 'balcón', 'balcones'], amenity: 'balcony' },
  { terms: ['terraza', 'terrazas'], amenity: 'terrace' },
  { terms: ['garage', 'cochera', 'cocheras', 'estacionamiento'], amenity: 'parking' },
  { terms: ['aire acondicionado', 'aire', 'ac'], amenity: 'air_conditioning' },
  { terms: ['chimenea', 'chimeneas'], amenity: 'fireplace' },
  { terms: ['contra frente', 'contrafrente', 'frente a calle'], amenity: 'front_facing' },
  { terms: ['apto credito', 'apto crédito', 'financiacion', 'financiación'], amenity: 'credit_approved' },
  { terms: ['pileta', 'piscina', 'natacion', 'natación'], amenity: 'pool' },
  { terms: ['parrilla', 'asador', 'quincho', 'bbq', 'barbacoa'], amenity: 'bbq' },
  { terms: ['jardin', 'jardín', 'parque', 'parques'], amenity: 'garden' },
  { terms: ['ascensor'], amenity: 'elevator' },
  { terms: ['portero', 'conserje'], amenity: 'doorman' },
]
