/**
 * Mapeo XML (feeds Zonaprop / Kiteprop) → campos internos.
 *
 * Formato real del feed: **OpenNavent** (`<OpenNavent><Avisos><Aviso>…`).
 * URL del dump: ver `ZONAPROP_KITEPROP_FEED_URL` y `zonaprop-opennavent-map.ts`.
 * Muestra en repo: `docs/samples/zonaprop-kiteprop-one-aviso.xml`.
 *
 * Incluye alias genéricos para filtros de búsqueda por texto/asistente.
 */

export const XML_LISTING_FIELD_ALIASES = {
  externalId: ['id', 'codigo', 'external_id', 'id_aviso', 'public_code'] as const,
  title: ['titulo', 'title', 'nombre'] as const,
  description: ['descripcion', 'description', 'texto', 'content'] as const,
  operationType: ['operacion', 'operation', 'tipo_operacion'] as const,
  propertyType: ['tipo_propiedad', 'property_type', 'tipo'] as const,
  priceAmount: ['precio', 'price', 'valor', 'for_sale_price', 'for_rent_price'] as const,
  currency: ['moneda', 'currency'] as const,
  surfaceTotal: ['superficie_total', 'surface', 'm2_totales', 'total_meters', 'm2', 'superficie', 'exclusive_meters'] as const,
  surfaceCovered: ['superficie_cubierta', 'm2_cubiertos', 'covered_meters', 'surface_covered'] as const,
  surfaceSemicovered: ['superficie_semicubierta', 'm2_semicubiertos', 'semicovered_meters'] as const,
  surfaceLand: ['superficie_terreno', 'm2_terreno', 'land_meters'] as const,
  bedrooms: ['dormitorios', 'bedrooms', 'rooms', 'ambientes'] as const,
  bathrooms: ['banos', 'bathrooms', 'half_bathrooms'] as const,
  garages: ['cocheras', 'garages', 'garage_count', 'estacionamientos'] as const,
  totalRooms: ['ambientes_totales', 'total_rooms'] as const,
  floor: ['piso', 'floor', 'floor_number', 'planta'] as const,
  totalFloors: ['total_pisos', 'total_floors', 'pisos_edificio'] as const,
  escalera: ['escalera', 'staircase', 'entrada', 'entrance'] as const,
  unit: ['unidad', 'unit', 'depto', 'departamento', 'apt'] as const,
  city: ['ciudad', 'city', 'localidad'] as const,
  neighborhood: ['barrio', 'neighborhood', 'zona', 'zone'] as const,
  addressLine: ['direccion', 'address', 'calle', 'street'] as const,
  latitude: ['lat', 'latitud', 'latitude'] as const,
  longitude: ['lng', 'longitud', 'lon', 'longitude'] as const,
  imageUrl: ['foto', 'imagen', 'url_foto', 'image', 'imagenes', 'photos'] as const,
  orientation: ['orientacion', 'orientation', 'orientación'] as const,
  disposition: ['disposicion', 'disposition', 'disposición'] as const,
  age: ['antiguedad', 'age', 'antigüedad', 'years_old'] as const,
} as const

export type XmlListingLogicalField = keyof typeof XML_LISTING_FIELD_ALIASES

/** Placeholder para futuro `parseXmlListingNode`: devuelve claves conocidas sin I/O. */
export function listXmlFieldAliases(field: XmlListingLogicalField): readonly string[] {
  return XML_LISTING_FIELD_ALIASES[field]
}
