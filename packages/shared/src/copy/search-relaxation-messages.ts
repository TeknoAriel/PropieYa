/**
 * Textos para explicar al usuario qué se flexibilizó en la búsqueda (orden: menor valor → mayor).
 * Claves alineadas con `RelaxationStepId` en apps/web `search-relaxation.ts`.
 */

export const SEARCH_RELAXATION_STEP_LABELS_ES: Record<string, string> = {
  property_type:
    'el tipo de propiedad (casa, depto, PH, etc.) para mostrar todos los avisos que encajan con el resto de criterios',
  amenities_leisure:
    'preferencias de ocio y clima (pileta, parrilla, chimenea, aire acondicionado, calefacción, gimnasio, SUM, juegos o rooftop)',
  amenities_outdoor: 'terraza, jardín y lavadero',
  amenities_building: 'ascensor, portero y baulera',
  amenities_balcony: 'balcón',
  secondary_details:
    'orientación, piso, superficie cubierta y otros detalles finos del aviso',
  amenities_parking_security: 'cochera y seguridad 24 h como preferencia',
  garages: 'cantidad mínima de cocheras',
  bathrooms: 'cantidad mínima de baños',
  surface: 'superficie mínima o máxima',
  price: 'rango de precio',
  map_geo: 'el recorte del mapa (zona dibujada o rectángulo)',
  bedrooms_rooms: 'dormitorios o ambientes mínimos',
  neighborhood: 'el barrio (manteniendo la ciudad si la habías elegido)',
  amenities_flags: 'el resto de amenities y preferencias del catálogo',
}

/** Une etiquetas en prosa respetuosa (español). */
export function describeSearchRelaxationSteps(stepIds: readonly string[]): string {
  const parts = stepIds
    .map((id) => SEARCH_RELAXATION_STEP_LABELS_ES[id])
    .filter((s): s is string => Boolean(s?.trim()))
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`
  return `${parts.slice(0, -1).join('; ')}; y ${parts.at(-1)}`
}
