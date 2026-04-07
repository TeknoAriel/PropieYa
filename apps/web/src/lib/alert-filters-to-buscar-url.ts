import { serializeBuscarMapGeoToParams } from '@propieya/shared'

/**
 * Construye `/buscar?…` a partir de `search_alerts.filters` (JSON) para reabrir la búsqueda con mapa y amenities.
 */
export function storedAlertFiltersToBuscarHref(filters: Record<string, unknown>): string {
  const p = new URLSearchParams()

  if (typeof filters.q === 'string' && filters.q.trim()) {
    p.set('q', filters.q.trim().slice(0, 200))
  }
  if (
    filters.operationType === 'sale' ||
    filters.operationType === 'rent' ||
    filters.operationType === 'temporary_rent'
  ) {
    p.set('op', filters.operationType)
  }
  if (typeof filters.propertyType === 'string' && filters.propertyType.trim()) {
    p.set('tipo', filters.propertyType.trim().slice(0, 50))
  }
  if (typeof filters.city === 'string' && filters.city.trim()) {
    p.set('ciudad', filters.city.trim().slice(0, 120))
  }
  if (typeof filters.neighborhood === 'string' && filters.neighborhood.trim()) {
    p.set('barrio', filters.neighborhood.trim().slice(0, 120))
  }
  if (typeof filters.minPrice === 'number' && filters.minPrice >= 0) {
    p.set('min', String(Math.round(filters.minPrice)))
  }
  if (typeof filters.maxPrice === 'number' && filters.maxPrice >= 0) {
    p.set('max', String(Math.round(filters.maxPrice)))
  }
  if (typeof filters.minBedrooms === 'number' && filters.minBedrooms >= 0) {
    p.set('dorm', String(filters.minBedrooms))
  }
  if (typeof filters.minSurface === 'number' && filters.minSurface >= 0) {
    p.set('sup', String(filters.minSurface))
  }

  const flags = new Set<string>()
  if (Array.isArray(filters.amenities)) {
    for (const a of filters.amenities) {
      if (typeof a === 'string' && a.length > 0 && a.length <= 80) flags.add(a)
    }
  }
  const facets = filters.facets as { flags?: string[] } | undefined
  if (facets && Array.isArray(facets.flags)) {
    for (const a of facets.flags) {
      if (typeof a === 'string' && a.length > 0 && a.length <= 80) flags.add(a)
    }
  }
  if (flags.size > 0) {
    p.set('amenities', [...flags].slice(0, 40).join(','))
  }
  if (filters.amenitiesMatchMode === 'strict') {
    p.set('amenities_strict', '1')
  }

  const bbox = filters.bbox as
    | { south: number; north: number; west: number; east: number }
    | undefined
  const polygon = filters.polygon as { lat: number; lng: number }[] | undefined

  serializeBuscarMapGeoToParams(p, {
    bbox:
      bbox &&
      Number.isFinite(bbox.south) &&
      Number.isFinite(bbox.north) &&
      Number.isFinite(bbox.west) &&
      Number.isFinite(bbox.east)
        ? bbox
        : null,
    polygon: Array.isArray(polygon) ? polygon : null,
  })

  const qs = p.toString()
  return qs ? `/buscar?${qs}` : '/buscar'
}
