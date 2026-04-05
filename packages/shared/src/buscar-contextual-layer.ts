import type { OperationType, PropertyType } from './types/listing'

export type BuscarContextualBlock = {
  title: string
  body: string
  /** IDs de flags del catálogo de facets (amenities) para atajos. */
  quickFacetIds?: readonly string[]
}

/**
 * Capa 4 — filtros contextuales (doc 38 §Z): copy y atajos según tipo y operación,
 * sin duplicar el formulario completo.
 */
export function getBuscarContextualBlock(
  propertyType: PropertyType | '',
  operationType: OperationType | ''
): BuscarContextualBlock | null {
  if (!propertyType) return null

  const rentNote =
    operationType === 'rent' || operationType === 'temporary_rent'
      ? ' En alquiler, el precio mensual y la zona suelen ser el eje principal.'
      : ''

  switch (propertyType) {
    case 'land':
      return {
        title: 'Terrenos y lotes',
        body:
          'La superficie del lote y la ubicación suelen ser lo más importante. Usá superficie mín./máx. en «Más filtros» y el mapa para acotar la zona.' +
          rentNote,
      }
    case 'apartment':
    case 'ph':
      return {
        title: propertyType === 'ph' ? 'PH' : 'Departamentos',
        body:
          'Piso, orientación y superficie cubierta suelen afinar mucho el listado. Están en «Más filtros».' + rentNote,
      }
    case 'house':
      return {
        title: 'Casas',
        body:
          'Jardín, parrilla, pileta y cochera suelen ser clave. Podés marcarlos acá o en «Afinar más».' + rentNote,
        quickFacetIds: ['garden', 'bbq', 'pool', 'parking'],
      }
    case 'office':
    case 'commercial':
    case 'warehouse':
      return {
        title: 'Espacios comerciales / trabajo',
        body:
          'Superficie, zona y accesos definen buena parte del match. Refiná con mapa y filtros avanzados.' + rentNote,
      }
    case 'parking':
      return {
        title: 'Cocheras',
        body:
          'Ubicación y precio suelen bastar; si buscás cubierta o seguridad, probá amenities en «Afinar más».' +
          rentNote,
      }
    case 'development_unit':
      return {
        title: 'Emprendimientos',
        body: 'Combiná zona y precio; el detalle de la unidad suele estar en título y descripción.' + rentNote,
      }
    default:
      return null
  }
}
