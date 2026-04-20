/**
 * Mapeo de items del feed JSON Yumblin (Kiteprop) → valores para Listing.
 * El feed puede variar; ajustar getValue / getFirst según la estructura real.
 *
 * Uso: ver scripts/import-yumblin-json.ts
 */

import { extractAmenitiesFromFeedItemDetailed } from '../amenity-mapping'
import { mapFeedPropertyTypeWithListingText } from '../map-feed-property-type'
import type { Amenity, OperationType } from '../types/listing'

type JsonItem = Record<string, unknown>

/** Igualdad de alias: typeproperty ≈ typeProperty ≈ type_property (feed Kiteprop/Yumblin). */
function normalizeAliasKey(key: string): string {
  return key.toLowerCase().replace(/_/g, '')
}

/**
 * Lee campos del ítem JSON: primero clave exacta y rutas `a.b`, luego coincidencia
 * insensible a mayúsculas y guiones bajos solo en el primer nivel.
 */
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

  const normToActual = new Map<string, string>()
  for (const objKey of Object.keys(item)) {
    const n = normalizeAliasKey(objKey)
    if (!normToActual.has(n)) normToActual.set(n, objKey)
  }
  for (const key of keys) {
    if (key.includes('.')) continue
    const actual = normToActual.get(normalizeAliasKey(key))
    if (actual === undefined) continue
    const v = item[actual]
    if (v !== undefined && v !== null && v !== '') {
      if (typeof v === 'number') return v
      return String(v).trim() || null
    }
  }
  return undefined
}

/**
 * Busca la primera clave cuyo alias coincide (p. ej. typeproperty en objeto anidado).
 * Profundidad acotada para no recorrer árboles enormes.
 */
function findDeepValueByKeyAliases(
  obj: unknown,
  aliases: readonly string[],
  maxDepth: number,
  seen: WeakSet<object> = new WeakSet()
): string | number | null | undefined {
  if (maxDepth < 0 || obj === null || obj === undefined) return undefined
  if (typeof obj !== 'object') return undefined
  if (seen.has(obj as object)) return undefined
  seen.add(obj as object)

  const want = new Set(aliases.map((a) => normalizeAliasKey(a)))

  if (Array.isArray(obj)) {
    for (const el of obj) {
      const r = findDeepValueByKeyAliases(el, aliases, maxDepth - 1, seen)
      if (r !== undefined) return r
    }
    return undefined
  }

  const o = obj as Record<string, unknown>
  for (const [k, v] of Object.entries(o)) {
    if (want.has(normalizeAliasKey(k)) && v !== undefined && v !== null && v !== '') {
      if (typeof v === 'number') return v
      if (typeof v === 'string') {
        const t = v.trim()
        if (t) return t
      }
    }
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object') {
      const r = findDeepValueByKeyAliases(v, aliases, maxDepth - 1, seen)
      if (r !== undefined) return r
    }
  }
  return undefined
}

/**
 * Tipo en objetos anidados: solo se usa si en la raíz no hay `property_type` / `property_type_old`.
 * Antes se prefería el deep-scan y un `propertyType` dentro de agency u otro bloque podía pisar el tipo real del aviso.
 */
const TYPE_PROPERTY_STRONG_KEYS = [
  'typeproperty',
  'type_property',
  'propertyType',
] as const

const OP_MAP: Record<string, OperationType> = {
  venta: 'sale',
  sale: 'sale',
  alquiler: 'rent',
  rent: 'rent',
  temporal: 'temporary_rent',
  temporary_rent: 'temporary_rent',
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
  surfaceCovered: number | null
  surfaceSemicovered: number | null
  surfaceLand: number | null
  bedrooms: number | null
  bathrooms: number | null
  garages: number | null
  totalRooms: number | null
  locationLat: number | null
  locationLng: number | null
  primaryImageUrl: string | null
  imageUrls: string[]
  amenities: Amenity[]
  /** features para DB: floor, totalFloors, escalera, orientation */
  features: Record<string, unknown>
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
  const desc = getValue(item, 'content', 'descripcion', 'description', 'texto') as string | null
  const city = getValue(item, 'ciudad', 'city', 'localidad') as string | null
  const neighborhood = getValue(item, 'barrio', 'neighborhood', 'zona', 'zone') as string | null
  const addrVal = item.address ?? item.calle ?? item.direccion
  const street = typeof addrVal === 'string' ? addrVal : (getValue(item, 'calle', 'street') as string | null)
  const state = getValue(item, 'provincia', 'state', 'region') as string | null

  if (!title || title.length < 5) return null

  const forSale = item.for_sale === true || item.for_sale === '1'
  const forRent = item.for_rent === true || item.for_rent === '1'
  const forTemp = item.for_temp_rental === true || item.for_temp_rental === '1'
  let price: number | string | null = getValue(
    item,
    'precio',
    'price',
    'priceAmount',
    'valor',
    'sale_price',
    'salePrice',
    'forSalePrice'
  ) as number | string | null
  if (price == null || price === '' || (typeof price === 'number' && price <= 0)) {
    if (forSale) price = getValue(item, 'for_sale_price') as number | string | null
    if ((price == null || price === '') && forRent) price = getValue(item, 'for_rent_price') as number | string | null
    if ((price == null || price === '') && forTemp) {
      price = (getValue(item, 'for_temp_rental_price_month') ?? getValue(item, 'for_temp_rental_price_day')) as number | string | null
    }
  }
  const priceNum = typeof price === 'number' ? price : parseFloat(String(price ?? 0))
  if (isNaN(priceNum) || priceNum <= 0) return null

  const surface = getValue(
    item,
    'total_meters',
    'surface_total',
    'surfaceTotal',
    'superficie_total',
    'covered_meters',
    'surface',
    'm2',
    'superficie',
    'm2_totales',
    'exclusive_meters'
  ) as number | string | null
  const surfaceNum = typeof surface === 'number' ? surface : parseFloat(String(surface ?? 1))
  if (isNaN(surfaceNum) || surfaceNum <= 0) return null

  let operationType: OperationType = 'sale'
  if (forRent && !forSale) operationType = 'rent'
  else if (forTemp && !forSale && !forRent) operationType = 'temporary_rent'
  else if (!forSale && !forRent && !forTemp) {
    const opRaw = String(
      getValue(
        item,
        'typeoperation',
        'type_operation',
        'operacion',
        'operation',
        'tipo_operacion',
        'transaction_type',
        'transactionType'
      ) ?? 'venta'
    ).toLowerCase()
    operationType = OP_MAP[opRaw] ?? 'sale'
  }

  const typeRaw =
    getValue(item, 'property_type') ??
    getValue(item, 'property_type_old', 'propertytype_old') ??
    findDeepValueByKeyAliases(item, TYPE_PROPERTY_STRONG_KEYS, 5) ??
    getValue(
      item,
      'typeproperty',
      'tipo_propiedad',
      'propertyType',
      'tipo_inmueble',
      'tipo'
    )
  const typeRawOld = getValue(item, 'property_type_old', 'propertytype_old')
  const listingTypeContext = {
    title: title.slice(0, 255),
    description: desc ?? '',
  }
  let propertyType = mapFeedPropertyTypeWithListingText(typeRaw ?? '', listingTypeContext)
  if (
    typeRawOld != null &&
    String(typeRawOld).trim() !== '' &&
    propertyType === 'apartment'
  ) {
    const fromOld = mapFeedPropertyTypeWithListingText(typeRawOld, listingTypeContext)
    if (fromOld !== 'apartment') propertyType = fromOld
  }

  const lat = getValue(item, 'latitude', 'lat', 'latitud') as number | string | null
  const lng = getValue(item, 'longitude', 'lng', 'longitud', 'lon') as number | string | null
  const locationLat = lat != null ? (typeof lat === 'number' ? lat : parseFloat(String(lat))) : null
  const locationLng = lng != null ? (typeof lng === 'number' ? lng : parseFloat(String(lng))) : null

  const fotos = item.images ?? item.fotos ?? item.photos ?? item.imagenes ?? item.foto ?? item.image
  let imageUrls: string[] = []
  if (Array.isArray(fotos)) {
    imageUrls = fotos
      .map((u) => (typeof u === 'string' ? u : (u as { url?: string })?.url))
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

  const floorVal = getValue(item, 'floor_number', 'piso', 'floor', 'planta')
  const floorNum =
    floorVal != null
      ? (typeof floorVal === 'number' ? floorVal : parseInt(String(floorVal), 10))
      : null
  const floorStr =
    floorVal != null ? String(floorVal) : null

  const countryRaw = getValue(item, 'country', 'pais') as string | null
  const stateVal = (state != null && String(state).trim() !== '' ? String(state).trim() : null) ?? 'Santa Fe'

  const address: Record<string, unknown> = {
    street: (typeof addrVal === 'object' && addrVal && (addrVal as { street?: string }).street) ?? street ?? '',
    number: getValue(item, 'numero', 'number') ?? null,
    floor: floorStr,
    unit: getValue(item, 'unidad', 'unit', 'depto') ?? null,
    neighborhood: neighborhood ?? '',
    city: city ?? '',
    state: stateVal,
    country: countryRaw && String(countryRaw).trim() !== '' ? String(countryRaw).trim() : 'Argentina',
    postalCode: getValue(item, 'postcode', 'codigo_postal', 'postalCode') ?? null,
  }

  const externalId = getValue(item, 'public_code', 'id', 'codigo', 'external_id', 'id_aviso', 'uuid') as
    | string
    | null
  const bedrooms = getValue(item, 'bedrooms', 'dormitorios', 'rooms', 'ambientes') as number | string | null
  const bathrooms = getValue(item, 'bathrooms', 'banos', 'half_bathrooms') as number | string | null
  const garagesVal = getValue(item, 'garages', 'cocheras', 'garage_count', 'estacionamientos') ?? item.garages ?? item.cocheras
  const garages =
    garagesVal != null
      ? (typeof garagesVal === 'number' ? garagesVal : parseInt(String(garagesVal), 10))
      : null
  const totalRoomsVal = getValue(item, 'total_rooms', 'ambientes_totales')
  const totalRooms =
    totalRoomsVal != null
      ? (typeof totalRoomsVal === 'number' ? totalRoomsVal : parseInt(String(totalRoomsVal), 10))
      : null

  const surfaceCoveredVal = getValue(item, 'covered_meters', 'superficie_cubierta', 'm2_cubiertos', 'surface_covered')
  const surfaceCovered =
    surfaceCoveredVal != null
      ? (typeof surfaceCoveredVal === 'number' ? surfaceCoveredVal : parseFloat(String(surfaceCoveredVal)))
      : null
  const surfaceSemicoveredVal = getValue(item, 'semicovered_meters', 'superficie_semicubierta', 'm2_semicubiertos')
  const surfaceSemicovered =
    surfaceSemicoveredVal != null
      ? (typeof surfaceSemicoveredVal === 'number' ? surfaceSemicoveredVal : parseFloat(String(surfaceSemicoveredVal)))
      : null
  const surfaceLandVal = getValue(item, 'land_meters', 'superficie_terreno', 'm2_terreno')
  const surfaceLand =
    surfaceLandVal != null
      ? (typeof surfaceLandVal === 'number' ? surfaceLandVal : parseFloat(String(surfaceLandVal)))
      : null

  const totalFloorsVal = getValue(item, 'total_floors', 'total_pisos', 'pisos_edificio')
  const totalFloors =
    totalFloorsVal != null
      ? (typeof totalFloorsVal === 'number' ? totalFloorsVal : parseInt(String(totalFloorsVal), 10))
      : null

  const escaleraVal = getValue(item, 'escalera', 'staircase', 'entrada', 'entrance')
  const escalera = escaleraVal != null && String(escaleraVal).trim() !== '' ? String(escaleraVal).trim().toUpperCase().slice(0, 5) : null

  const orientationVal = getValue(item, 'orientation', 'orientacion', 'orientación')
  const orientation = orientationVal != null ? String(orientationVal).trim().slice(0, 10) : null

  const { amenities, feedRawTokens } = extractAmenitiesFromFeedItemDetailed(
    item as Record<string, unknown>
  )

  const agencyBlock =
    (item.agency ?? item.inmobiliaria ?? item.real_estate_agency ?? item.publisher_office) as
      | Record<string, unknown>
      | undefined
  let kitepropAgency: Record<string, unknown> | null = null
  if (agencyBlock && typeof agencyBlock === 'object' && !Array.isArray(agencyBlock)) {
    const aid = agencyBlock.id ?? agencyBlock.agency_id ?? agencyBlock.uuid
    const aname = agencyBlock.name ?? agencyBlock.nombre ?? agencyBlock.title
    if (aid != null || aname != null) {
      kitepropAgency = {
        ...(aid != null ? { id: String(aid) } : {}),
        ...(aname != null ? { name: String(aname) } : {}),
        ...(agencyBlock.slug != null ? { slug: String(agencyBlock.slug) } : {}),
      }
    }
  }
  if (!kitepropAgency) {
    const flatId = getValue(item, 'agency_id', 'agencyId', 'inmobiliaria_id', 'publisher_id')
    const flatName = getValue(
      item,
      'agency_name',
      'inmobiliaria_nombre',
      'publisher_name',
      'office_name'
    )
    if (flatId || flatName) {
      kitepropAgency = {
        ...(flatId ? { id: String(flatId) } : {}),
        ...(flatName ? { name: String(flatName) } : {}),
      }
    }
  }

  const features: Record<string, unknown> = {
    amenities,
    floor: Number.isFinite(floorNum) ? floorNum : null,
    totalFloors: Number.isFinite(totalFloors) ? totalFloors : null,
    orientation: orientation ?? null,
    escalera: escalera ?? null,
    ...(feedRawTokens.length > 0 ? { feedAmenityRaw: feedRawTokens } : {}),
    ...(kitepropAgency ? { kitepropAgency } : {}),
  }

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
    priceCurrency: String(getValue(item, 'currency', 'moneda') ?? 'ARS').slice(0, 3).toUpperCase(),
    surfaceTotal: surfaceNum,
    surfaceCovered: surfaceCovered != null && !Number.isNaN(surfaceCovered) ? surfaceCovered : null,
    surfaceSemicovered: surfaceSemicovered != null && !Number.isNaN(surfaceSemicovered) ? surfaceSemicovered : null,
    surfaceLand: surfaceLand != null && !Number.isNaN(surfaceLand) ? surfaceLand : null,
    bedrooms: bedrooms != null ? (typeof bedrooms === 'number' ? bedrooms : parseInt(String(bedrooms), 10)) : null,
    bathrooms: bathrooms != null ? (typeof bathrooms === 'number' ? bathrooms : parseInt(String(bathrooms), 10)) : null,
    garages: garages != null && Number.isFinite(garages) ? garages : null,
    totalRooms: totalRooms != null && Number.isFinite(totalRooms) ? totalRooms : null,
    locationLat: Number.isFinite(locationLat) ? locationLat : null,
    locationLng: Number.isFinite(locationLng) ? locationLng : null,
    primaryImageUrl: imageUrls[0] ?? null,
    imageUrls,
    amenities,
    features,
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

/**
 * ID estable en portal (misma prioridad que `mapYumblinItem`) sin mapear todo el ítem.
 * Properstar / Kiteprop: `public_code` (ej. KP499781) antes que `id` numérico.
 */
export function peekFeedExternalId(item: JsonItem): string | null {
  const v = getValue(item, 'public_code', 'id', 'codigo', 'external_id', 'id_aviso', 'uuid')
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

/**
 * Fecha de modificación en el feed (Properstar: `last_update` ISO).
 * Si falta o no parsea, devuelve null (no se aplica atajo incremental).
 */
export function parseFeedItemSourceUpdatedAt(item: JsonItem): Date | null {
  const raw = getValue(
    item,
    'last_update',
    'lastUpdate',
    'updated_at',
    'updatedAt',
    'modified_at',
    'modifiedAt'
  )
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}
