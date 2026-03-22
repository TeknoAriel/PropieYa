/**
 * Stub de mapeo XML (feeds tipo Zonaprop / Kiteprop) → campos internos.
 * Ver `docs/19-referencia-xml-ficha-propiedad.md` y el feed de referencia.
 *
 * Cuando exista ingest real, reemplazar o ampliar con parsers por proveedor.
 */

export const XML_LISTING_FIELD_ALIASES = {
  externalId: ['id', 'codigo', 'external_id', 'id_aviso'] as const,
  title: ['titulo', 'title'] as const,
  description: ['descripcion', 'description', 'texto'] as const,
  operationType: ['operacion', 'operation', 'tipo_operacion'] as const,
  propertyType: ['tipo_propiedad', 'property_type', 'tipo'] as const,
  priceAmount: ['precio', 'price', 'valor'] as const,
  currency: ['moneda', 'currency'] as const,
  surfaceTotal: ['superficie_total', 'surface', 'm2_totales'] as const,
  bedrooms: ['dormitorios', 'bedrooms', 'ambientes'] as const,
  bathrooms: ['banos', 'bathrooms'] as const,
  city: ['ciudad', 'city', 'localidad'] as const,
  neighborhood: ['barrio', 'neighborhood', 'zona'] as const,
  addressLine: ['direccion', 'address', 'calle'] as const,
  latitude: ['lat', 'latitud'] as const,
  longitude: ['lng', 'longitud', 'lon'] as const,
  imageUrl: ['foto', 'imagen', 'url_foto', 'image'] as const,
} as const

export type XmlListingLogicalField = keyof typeof XML_LISTING_FIELD_ALIASES

/** Placeholder para futuro `parseXmlListingNode`: devuelve claves conocidas sin I/O. */
export function listXmlFieldAliases(field: XmlListingLogicalField): readonly string[] {
  return XML_LISTING_FIELD_ALIASES[field]
}
