/**
 * Feed OpenNavent (Kiteprop / Zonaprop XML): estructura y mapeo a modelo Propieya.
 *
 * Feed completo (muy pesado, no versionar):
 * https://static.kiteprop.com/kp/difusions/13d87da051c790afaf09c7afd094f151d7d06290/zonaprop.xml
 *
 * Muestra de un solo `<Aviso>` en repo: `docs/samples/zonaprop-kiteprop-one-aviso.xml`
 */

export const ZONAPROP_KITEPROP_FEED_URL =
  'https://static.kiteprop.com/kp/difusions/13d87da051c790afaf09c7afd094f151d7d06290/zonaprop.xml'

/** Ruta relativa al root del monorepo. */
export const ZONAPROP_OPENNAVENT_ONE_AVISO_SAMPLE_PATH =
  'docs/samples/zonaprop-kiteprop-one-aviso.xml'

/** Nodos raíz típicos del XML de difusión. */
export const OPENNAVENT_XML_STRUCTURE = {
  root: 'OpenNavent',
  avisos: 'Avisos',
  aviso: 'Aviso',
  codigoAviso: 'codigoAviso',
  claveReferencia: 'claveReferencia',
  titulo: 'titulo',
  descripcion: 'descripcion',
  tipoDePropiedad: 'tipoDePropiedad',
  precios: 'precios',
  precio: 'precio',
  monto: 'monto',
  moneda: 'moneda',
  operacion: 'operacion',
  valorMantenimiento: 'valorMantenimiento',
  localizacion: 'localizacion',
  ubicacionTexto: 'Ubicacion',
  direccion: 'direccion',
  latitud: 'latitud',
  longitud: 'longitud',
  codigoPostal: 'codigoPostal',
  muestraMapa: 'muestraMapa',
  caracteristicas: 'caracteristicas',
  caracteristica: 'caracteristica',
  nombre: 'nombre',
  valor: 'valor',
  idValor: 'idValor',
} as const

/** Rol interno para interpretar `<caracteristica><nombre>CATEGORIA|CLAVE</nombre>`. */
export type OpenNaventCharacteristicRole =
  | 'bedrooms'
  | 'bathrooms'
  | 'totalRooms'
  | 'garages'
  | 'expenses_amount'
  | 'age_years'
  | 'surface_total'
  | 'surface_covered'
  | 'surface_land'
  | 'total_floors_building'
  | 'units_per_floor'
  | 'orientation_id'
  | 'disposition_id'
  | 'amenity_elevator'
  | 'amenity_wifi'
  | 'amenity_kitchen'
  | 'flag_luminoso'
  | 'flag_pets'
  | 'other'

/**
 * Valores exactos de `<nombre>` vistos en el feed → rol de normalización.
 * Los `idValor` numéricos de orientación/disposición dependen del catálogo Navent;
 * para carga manual Propieya usamos enums en `createListingSchema` (orientation, disposition).
 */
export const OPENNAVENT_CARACTERISTICA_NOMBRE_TO_ROLE: Record<
  string,
  OpenNaventCharacteristicRole
> = {
  'PRINCIPALES|DORMITORIO': 'bedrooms',
  'PRINCIPALES|BANO': 'bathrooms',
  'PRINCIPALES|AMBIENTE': 'totalRooms',
  'PRINCIPALES|COCHERA': 'garages',
  'PRINCIPALES|EXPENSAS': 'expenses_amount',
  'PRINCIPALES|ANTIGUEDAD': 'age_years',
  'MEDIDAS|SUPERFICIE_TOTAL': 'surface_total',
  'MEDIDAS|SUPERFICIE_CUBIERTA': 'surface_covered',
  'GENERALES|SUPERFICIE_DEL_TERRENO_(M2)': 'surface_land',
  'GENERALES|SUPERFICIE_DE_PLAYA_(M2)': 'surface_land',
  'GENERALES|CANTIDAD_DE_PISOS_EN_EDIFICIO': 'total_floors_building',
  'GENERALES|CANTIDAD_PISOS_EN_EDIFICIO': 'total_floors_building',
  'GENERALES|DEPARTAMENTOS_POR_PISO': 'units_per_floor',
  'GENERALES|ORIENTACION': 'orientation_id',
  'GENERALES|DISPOSICION': 'disposition_id',
  'SERVICIOS|ASCENSOR': 'amenity_elevator',
  'SERVICIOS|INTERNET/WIFI': 'amenity_wifi',
  'AMBIENTES|COCINA': 'amenity_kitchen',
  'GENERALES|LUMINOSO': 'flag_luminoso',
  'GENERALES|PERMITE_MASCOTAS': 'flag_pets',
}

export function opennaventCharacteristicRole(
  nombre: string
): OpenNaventCharacteristicRole {
  return OPENNAVENT_CARACTERISTICA_NOMBRE_TO_ROLE[nombre] ?? 'other'
}
