/**
 * Mapeo de items del feed JSON Yumblin (Kiteprop) → valores para Listing.
 * El feed puede variar; ajustar getValue / getFirst según la estructura real.
 *
 * Uso: ver scripts/import-yumblin-json.ts
 */

import type { OperationType, PropertyType } from '../types/listing'

type JsonItem = Record<string, unknown>

function getValue(item: JsonItem, ...keys: string[]): string | number | null | undefined {
  for (const key of keys) {
    const v = item[key]
    if (v !== undefined && v !== null && v !== '') {
      if (typeof v === 'number') return v
      return String(v).trim() || null
    }
    // Rutas anidadas ej: "address.city"
    const parts = key.split('.')
    let cur: unknown = item
    for (const p of parts) {
      cur = (cur as Record<string, unknown>)?.[p]
      if (cur === undefined || cur === null) break
    }
    if (cur !== undefined && cur !== null && cur !== '') {
      return typeof cur === 'number' ? cur : String(cur).trim()
    }
  }
  return undefined
}

const OP_MAP: Record<string, OperationType> = {
  venta: 'sale',
  sale: 'sale',
  alquiler: 'rent',
  rent: 'rent',
  temporal: 'temporary_rent',
  temporary_rent: 'temporary_rent',
}

const TYPE_MAP: Record<string, PropertyType> = {
  departamento: 'apartment',
  apartment: 'apartment',
  casa: 'house',
  house: 'house',
  ph: 'ph',
  terreno: 'land',
  land: 'land',
  oficina: 'office',
  office: 'office',
  local: 'commercial',
  commercial: 'commercial',
  galpon: 'warehouse',
  warehouse: 'warehouse',
  cochera: 'parking',
  parking: 'parking',
}

export interface YumblinListingInput {
  organizationId: string
  publisherId: string
  externalId?: string
}

export interface MappedListingRow {
  organizationId: string
  publisherId: string
  externalId: string | null
  propertyType: string
  operationType: string
  address: Record<string, unknown>
  title: string
  description: string
  priceAmount: number
  priceCurrency: string
  surfaceTotal: number
  bedrooms: number | null
  bathrooms: number | null
  locationLat: number | null
  locationLng: number | null
  primaryImageUrl: string | null
  imageUrls: string[]
}

/**
 * Mapea un item del JSON Yumblin a la forma esperada para insert en DB.
 * Ajustar keys según la estructura real del feed.
 */
export function mapYumblinItem(
  item: JsonItem,
  input: YumblinListingInput
): MappedListingRow | null {
  const title = getValue(item, 'titulo', 'title', 'nombre') as string | null
  const desc = getValue(item, 'descripcion', 'description', 'texto') as string | null
  const price = getValue(item, 'precio', 'price', 'valor') as number | string | null
  const surface = getValue(item, 'superficie_total', 'surface', 'm2', 'superficie', 'm2_totales') as number | string | null
  const city = getValue(item, 'ciudad', 'city', 'localidad') as string | null
  const neighborhood = getValue(item, 'barrio', 'neighborhood', 'zona') as string | null
  const street = getValue(item, 'calle', 'direccion', 'address', 'street') as string | null
  const state = getValue(item, 'provincia', 'state') as string | null

  if (!title || title.length < 5) return null

  const priceNum = typeof price === 'number' ? price : parseFloat(String(price ?? 0))
  const surfaceNum = typeof surface === 'number' ? surface : parseFloat(String(surface ?? 1))
  if (isNaN(priceNum) || priceNum <= 0 || isNaN(surfaceNum) || surfaceNum <= 0) return null

  const opRaw = String(getValue(item, 'operacion', 'operation', 'tipo_operacion') ?? 'venta').toLowerCase()
  const typeRaw = String(getValue(item, 'tipo_propiedad', 'property_type', 'tipo') ?? 'departamento').toLowerCase()

  const operationType = OP_MAP[opRaw] ?? 'sale'
  const propertyType = TYPE_MAP[typeRaw] ?? 'apartment'

  const lat = getValue(item, 'lat', 'latitud', 'latitude') as number | string | null
  const lng = getValue(item, 'lng', 'longitud', 'longitude', 'lon') as number | string | null
  const locationLat = lat != null ? (typeof lat === 'number' ? lat : parseFloat(String(lat))) : null
  const locationLng = lng != null ? (typeof lng === 'number' ? lng : parseFloat(String(lng))) : null

  const fotos = item.fotos ?? item.photos ?? item.images ?? item.imagenes ?? item.foto ?? item.image
  let imageUrls: string[] = []
  if (Array.isArray(fotos)) {
    imageUrls = fotos
      .filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
      .slice(0, 20)
  } else if (typeof fotos === 'string' && fotos.startsWith('http')) {
    imageUrls = [fotos]
  } else if (typeof fotos === 'object' && fotos !== null) {
    const arr = (fotos as Record<string, unknown>).url
      ?? (fotos as Record<string, unknown>).src
      ?? (fotos as { url?: string }[])?.[0]?.url
    if (typeof arr === 'string') imageUrls = [arr]
    else if (Array.isArray(arr)) imageUrls = arr.filter((u): u is string => typeof u === 'string').slice(0, 20)
  }

  const address: Record<string, unknown> = {
    street: street ?? '',
    number: getValue(item, 'numero', 'number') ?? null,
    floor: getValue(item, 'piso', 'floor') ?? null,
    unit: getValue(item, 'unidad', 'unit', 'depto') ?? null,
    neighborhood: neighborhood ?? '',
    city: city ?? '',
    state: state ?? 'Santa Fe',
    country: 'Argentina',
    postalCode: getValue(item, 'codigo_postal', 'postalCode') ?? null,
  }

  const externalId = getValue(item, 'id', 'codigo', 'external_id', 'id_aviso') as string | null
  const bedrooms = getValue(item, 'dormitorios', 'bedrooms', 'ambientes') as number | string | null
  const bathrooms = getValue(item, 'banos', 'bathrooms') as number | string | null

  return {
    organizationId: input.organizationId,
    publisherId: input.publisherId,
    externalId: externalId ? String(externalId) : null,
    propertyType,
    operationType,
    address,
    title: title.slice(0, 255),
    description: (desc ?? title).slice(0, 5000),
    priceAmount: priceNum,
    priceCurrency: String(getValue(item, 'moneda', 'currency') ?? 'ARS').slice(0, 3).toUpperCase(),
    surfaceTotal: surfaceNum,
    bedrooms: bedrooms != null ? (typeof bedrooms === 'number' ? bedrooms : parseInt(String(bedrooms), 10)) : null,
    bathrooms: bathrooms != null ? (typeof bathrooms === 'number' ? bathrooms : parseInt(String(bathrooms), 10)) : null,
    locationLat: Number.isFinite(locationLat) ? locationLat : null,
    locationLng: Number.isFinite(locationLng) ? locationLng : null,
    primaryImageUrl: imageUrls[0] ?? null,
    imageUrls,
  }
}

/**
 * Extrae el array de propiedades del JSON raíz.
 * El feed puede ser { propiedades: [...] }, { data: [...] }, { items: [...] } o un array directo.
 */
export function extractListingsFromFeed(data: unknown): JsonItem[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const arr = obj.propiedades ?? obj.properties ?? obj.data ?? obj.items ?? obj.avisos ?? obj.listings
    return Array.isArray(arr) ? arr : []
  }
  return []
}
