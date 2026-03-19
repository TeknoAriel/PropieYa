import type { SearchFilters } from '../types/search'
import type { PropertyType, OperationType } from '../types/listing'
import { slugify } from './format'

/**
 * Genera URL para una propiedad
 */
export function getListingUrl(listing: {
  id: string
  propertyType: PropertyType
  operationType: OperationType
  address: { neighborhood: string; city: string }
  title: string
}): string {
  const operation = listing.operationType === 'sale' ? 'venta' : 'alquiler'
  const type = getPropertyTypeSlug(listing.propertyType)
  const location = slugify(`${listing.address.neighborhood}-${listing.address.city}`)
  const title = slugify(listing.title).slice(0, 50)

  return `/${operation}/${type}/${location}/${title}-${listing.id}`
}

/**
 * Genera URL para búsqueda con filtros
 */
export function getSearchUrl(filters: Partial<SearchFilters>): string {
  const params = new URLSearchParams()

  if (filters.operationTypes?.length === 1) {
    params.set('operacion', filters.operationTypes[0] === 'sale' ? 'venta' : 'alquiler')
  }

  if (filters.propertyTypes?.length) {
    params.set('tipo', filters.propertyTypes.map(getPropertyTypeSlug).join(','))
  }

  if (filters.neighborhoods?.length) {
    params.set('barrios', filters.neighborhoods.map(slugify).join(','))
  }

  if (filters.cities?.length) {
    params.set('ciudades', filters.cities.map(slugify).join(','))
  }

  if (filters.price?.min) {
    params.set('precio_min', String(filters.price.min))
  }

  if (filters.price?.max) {
    params.set('precio_max', String(filters.price.max))
  }

  if (filters.price?.currency) {
    params.set('moneda', filters.price.currency)
  }

  if (filters.bedroomsMin) {
    params.set('dormitorios_min', String(filters.bedroomsMin))
  }

  if (filters.totalSurface?.min) {
    params.set('superficie_min', String(filters.totalSurface.min))
  }

  if (filters.amenities?.length) {
    params.set('amenities', filters.amenities.join(','))
  }

  const queryString = params.toString()
  return queryString ? `/buscar?${queryString}` : '/buscar'
}

/**
 * Parsea filtros desde URL
 */
export function parseFiltersFromUrl(searchParams: URLSearchParams): Partial<SearchFilters> {
  const filters: Partial<SearchFilters> = {}

  const operacion = searchParams.get('operacion')
  if (operacion) {
    filters.operationTypes = [operacion === 'venta' ? 'sale' : 'rent']
  }

  const tipo = searchParams.get('tipo')
  if (tipo) {
    filters.propertyTypes = tipo.split(',').map(parsePropertyTypeSlug).filter(Boolean) as PropertyType[]
  }

  const barrios = searchParams.get('barrios')
  if (barrios) {
    filters.neighborhoods = barrios.split(',')
  }

  const precioMin = searchParams.get('precio_min')
  const precioMax = searchParams.get('precio_max')
  const moneda = searchParams.get('moneda') as 'USD' | 'ARS' | null

  if (precioMin || precioMax) {
    filters.price = {
      min: precioMin ? Number(precioMin) : null,
      max: precioMax ? Number(precioMax) : null,
      currency: moneda || 'USD',
    }
  }

  const dormitoriosMin = searchParams.get('dormitorios_min')
  if (dormitoriosMin) {
    filters.bedroomsMin = Number(dormitoriosMin)
  }

  const superficieMin = searchParams.get('superficie_min')
  if (superficieMin) {
    filters.totalSurface = {
      min: Number(superficieMin),
      max: null,
      unit: 'm2',
    }
  }

  return filters
}

/**
 * Convierte tipo de propiedad a slug
 */
function getPropertyTypeSlug(type: PropertyType): string {
  const slugs: Record<PropertyType, string> = {
    apartment: 'departamento',
    house: 'casa',
    ph: 'ph',
    land: 'terreno',
    office: 'oficina',
    commercial: 'local',
    warehouse: 'deposito',
    parking: 'cochera',
    development_unit: 'emprendimiento',
  }
  return slugs[type]
}

/**
 * Parsea slug a tipo de propiedad
 */
function parsePropertyTypeSlug(slug: string): PropertyType | null {
  const types: Record<string, PropertyType> = {
    departamento: 'apartment',
    depto: 'apartment',
    casa: 'house',
    ph: 'ph',
    terreno: 'land',
    oficina: 'office',
    local: 'commercial',
    deposito: 'warehouse',
    cochera: 'parking',
    emprendimiento: 'development_unit',
  }
  return types[slug] || null
}
