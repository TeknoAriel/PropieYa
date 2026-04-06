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

/** Amenities de menor “peso” para el usuario: ocio, clima, espacios comunes. */
const AMENITY_TIER_LEISURE = new Set([
  'pool',
  'bbq',
  'gym',
  'sum',
  'playground',
  'rooftop',
  'fireplace',
  'air_conditioning',
  'heating',
])

const AMENITY_TIER_OUTDOOR = new Set(['terrace', 'garden', 'laundry'])
const AMENITY_TIER_BUILDING = new Set(['elevator', 'doorman', 'storage'])
const AMENITY_TIER_BALCONY = new Set(['balcony'])
const AMENITY_TIER_PARKING_SECURITY = new Set(['parking', 'security_24h'])

function stripAmenityTier(f: SearchFilters, tier: ReadonlySet<string>): void {
  if (f.amenities?.length) {
    f.amenities = f.amenities.filter((a) => !tier.has(a))
    if (f.amenities.length === 0) delete f.amenities
  }
  if (f.facets?.flags?.length) {
    f.facets.flags = f.facets.flags.filter((id) => !tier.has(id))
  }
  pruneEmptyFacets(f)
}

export function stripAmenitiesLeisure(f: SearchFilters): void {
  stripAmenityTier(f, AMENITY_TIER_LEISURE)
}
export function stripAmenitiesOutdoor(f: SearchFilters): void {
  stripAmenityTier(f, AMENITY_TIER_OUTDOOR)
}
export function stripAmenitiesBuilding(f: SearchFilters): void {
  stripAmenityTier(f, AMENITY_TIER_BUILDING)
}
export function stripAmenitiesBalcony(f: SearchFilters): void {
  stripAmenityTier(f, AMENITY_TIER_BALCONY)
}
export function stripAmenitiesParkingSecurity(f: SearchFilters): void {
  stripAmenityTier(f, AMENITY_TIER_PARKING_SECURITY)
}

export type RelaxationStepId =
  | 'amenities_leisure'
  | 'amenities_outdoor'
  | 'amenities_building'
  | 'amenities_balcony'
  | 'secondary_details'
  | 'amenities_parking_security'
  | 'garages'
  | 'bathrooms'
  | 'surface'
  | 'price'
  | 'map_geo'
  | 'bedrooms_rooms'
  | 'neighborhood'
  | 'amenities_flags'

/**
 * Orden cuando la primera pasada da 0 resultados: primero preferencias de menor valor,
 * luego detalles finos, números duros y ubicación; al final quitar todo amenity residual.
 */
export const ZERO_RESULTS_RELAXATION_SEQUENCE: readonly {
  id: RelaxationStepId
  apply: (f: SearchFilters) => void
}[] = [
  { id: 'amenities_leisure', apply: stripAmenitiesLeisure },
  { id: 'amenities_outdoor', apply: stripAmenitiesOutdoor },
  { id: 'amenities_building', apply: stripAmenitiesBuilding },
  { id: 'amenities_balcony', apply: stripAmenitiesBalcony },
  { id: 'secondary_details', apply: stripSecondaryDetails },
  { id: 'amenities_parking_security', apply: stripAmenitiesParkingSecurity },
  { id: 'garages', apply: stripMinGarages },
  { id: 'bathrooms', apply: stripMinBathrooms },
  { id: 'surface', apply: stripSurface },
  { id: 'price', apply: stripPrice },
  { id: 'map_geo', apply: stripMapGeo },
  { id: 'bedrooms_rooms', apply: stripBedroomsAndRooms },
  { id: 'neighborhood', apply: stripNeighborhood },
  { id: 'amenities_flags', apply: stripPreferredAmenities },
]
