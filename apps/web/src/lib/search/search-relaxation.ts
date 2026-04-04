/**
 * Reglas de relajación progresiva del buscador (portal).
 * @see docs/50-BUSQUEDA-NIVELES-Y-RELAX.md
 */

import type { SearchFilters } from './types'

/** Flags que en UI viven en “filtros avanzados” y se relajan como secundarios. */
export const SECONDARY_AMENITY_FLAG_IDS = new Set([
  'credit_approved',
  'front_facing',
  'pet_friendly',
  'furnished',
  'wheelchair_accessible',
])

export function cloneSearchFilters(f: SearchFilters): SearchFilters {
  return JSON.parse(JSON.stringify(f)) as SearchFilters
}

function pruneEmptyFacets(f: SearchFilters): void {
  const fac = f.facets
  if (!fac) return
  if (!fac.flags?.length) delete fac.flags
  if (!fac.excludeFlags?.length) delete fac.excludeFlags
  if (!fac.enums || Object.keys(fac.enums).length === 0) delete fac.enums
  if (!fac.ranges || Object.keys(fac.ranges).length === 0) delete fac.ranges
  if (!fac.flags && !fac.excludeFlags && !fac.enums && !fac.ranges) {
    delete f.facets
  }
}

/** Detalles secundarios (grupo C) + flags de confort en facets. */
export function stripSecondaryDetails(f: SearchFilters): void {
  delete f.orientation
  delete f.floorMin
  delete f.floorMax
  delete f.escalera
  delete f.minSurfaceCovered
  delete f.maxSurfaceCovered

  if (f.facets?.flags?.length) {
    f.facets.flags = f.facets.flags.filter((id) => !SECONDARY_AMENITY_FLAG_IDS.has(id))
  }
  if (f.amenities?.length) {
    f.amenities = f.amenities.filter((id) => !SECONDARY_AMENITY_FLAG_IDS.has(id))
    if (f.amenities.length === 0) delete f.amenities
  }
  pruneEmptyFacets(f)
}

export function stripMapGeo(f: SearchFilters): void {
  delete f.bbox
  delete f.polygon
}

export function stripMinGarages(f: SearchFilters): void {
  delete f.minGarages
}

export function stripMinBathrooms(f: SearchFilters): void {
  delete f.minBathrooms
}

export function stripSurface(f: SearchFilters): void {
  delete f.minSurface
  delete f.maxSurface
}

export function stripPrice(f: SearchFilters): void {
  delete f.minPrice
  delete f.maxPrice
}

export function stripBedroomsAndRooms(f: SearchFilters): void {
  delete f.minBedrooms
  delete f.minTotalRooms
}

/** Cercanía secundaria: barrio (mantiene ciudad). */
export function stripNeighborhood(f: SearchFilters): void {
  delete f.neighborhood
}

/**
 * Quita amenities/facets positivos para modo “similar” manteniendo excludes.
 * `amenitiesMatchMode` se fuerza a preferred en el caller si aplica.
 */
export function stripPreferredAmenities(f: SearchFilters): void {
  delete f.amenities
  if (f.facets?.flags?.length) {
    delete f.facets.flags
  }
  pruneEmptyFacets(f)
}

export type RelaxationStepId =
  | 'secondary_details'
  | 'map_geo'
  | 'garages'
  | 'bathrooms'
  | 'surface'
  | 'price'
  | 'bedrooms_rooms'
  | 'neighborhood'
  | 'amenities_flags'

/** Orden de relajación cuando la búsqueda estricta devuelve 0 resultados. */
export const ZERO_RESULTS_RELAXATION_SEQUENCE: readonly {
  id: RelaxationStepId
  apply: (f: SearchFilters) => void
}[] = [
  { id: 'secondary_details', apply: stripSecondaryDetails },
  { id: 'garages', apply: stripMinGarages },
  { id: 'bathrooms', apply: stripMinBathrooms },
  { id: 'surface', apply: stripSurface },
  { id: 'price', apply: stripPrice },
  { id: 'map_geo', apply: stripMapGeo },
  { id: 'bedrooms_rooms', apply: stripBedroomsAndRooms },
  { id: 'neighborhood', apply: stripNeighborhood },
  { id: 'amenities_flags', apply: stripPreferredAmenities },
]
