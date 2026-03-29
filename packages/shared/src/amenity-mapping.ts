/**
 * Mapeo de campos XML/JSON (Zonaprop, Kiteprop, Yumblin) → Amenity.
 * Usado para import y para búsqueda por texto/asistente.
 *
 * Referencia XML: https://static.kiteprop.com/kp/difusions/.../zonaprop.xml
 */

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

/**
 * Extrae amenities de un item de feed (JSON/Yumblin).
 * Busca en: item.amenities[], item.caracteristicas[], item.features[],
 * y campos booleanos directos (balcon, garage, etc.).
 */
export function extractAmenitiesFromFeedItem(
  item: Record<string, unknown>
): Amenity[] {
  const seen = new Set<Amenity>()
  const add = (a: Amenity) => seen.add(a)

  // Array de strings
  const arrSources = [
    item.amenities,
    item.caracteristicas,
    item.features,
    item.características,
  ]
  for (const arr of arrSources) {
    if (!Array.isArray(arr)) continue
    for (const v of arr) {
      const key = String(v).toLowerCase().trim().replace(/\s+/g, '_')
      const amenity = FEED_TO_AMENITY[key] ?? FEED_TO_AMENITY[String(v).toLowerCase()]
      if (amenity) add(amenity)
    }
  }

  // Campos booleanos directos
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
  const garagesNum = typeof garagesVal === 'number' ? garagesVal : parseInt(String(garagesVal ?? 0), 10)
  if (Number.isFinite(garagesNum) && garagesNum > 0) add('parking')

  return [...seen]
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
  { terms: ['jardin', 'jardín'], amenity: 'garden' },
  { terms: ['ascensor'], amenity: 'elevator' },
  { terms: ['portero', 'conserje'], amenity: 'doorman' },
]
