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
          'Priorizá superficie y zona en lo principal; el mapa ayuda a acotar. Si necesitás más detalle, abrí la capa 3.' +
          rentNote,
      }
    case 'apartment':
    case 'ph':
      return {
        title: propertyType === 'ph' ? 'PH' : 'Departamentos',
        body:
          'Elegí 2–3 cosas que más te importen abajo; lo fino (piso, orientación, cubierta) está en la capa 3.' +
          rentNote,
        quickFacetIds: [
          'balcony',
          'parking',
          'terrace',
          'pool',
          'bbq',
          'garden',
          'air_conditioning',
          'security_24h',
          'credit_approved',
          'gym',
          'laundry',
          'sum',
        ],
      }
    case 'house':
      return {
        title: 'Casas',
        body:
          'Jardín, pileta y cochera suelen marcar la diferencia: tocá lo que te importe; el resto del catálogo está en la capa 3.' +
          rentNote,
        quickFacetIds: [
          'garden',
          'bbq',
          'pool',
          'parking',
          'terrace',
          'balcony',
          'air_conditioning',
          'security_24h',
          'credit_approved',
          'gym',
          'laundry',
          'sum',
        ],
      }
    case 'office':
    case 'commercial':
    case 'warehouse':
      return {
        title: 'Espacios comerciales / trabajo',
        body:
          'Zona y metros suelen bastar al inicio; afiná accesos y amenities con chips o la capa 3.' + rentNote,
        quickFacetIds: [
          'parking',
          'air_conditioning',
          'security_24h',
          'elevator',
          'wheelchair_accessible',
          'storage',
        ],
      }
    case 'parking':
      return {
        title: 'Cocheras',
        body:
          'Ubicación y precio suelen bastar; si buscás cubierta o seguridad, probá amenities en «Afinar más».' +
          rentNote,
        quickFacetIds: ['security_24h', 'credit_approved', 'air_conditioning'],
      }
    case 'development_unit':
      return {
        title: 'Emprendimientos',
        body: 'Combiná zona y precio; el detalle de la unidad suele estar en título y descripción.' + rentNote,
        quickFacetIds: [
          'balcony',
          'parking',
          'terrace',
          'pool',
          'air_conditioning',
          'security_24h',
          'gym',
          'sum',
          'elevator',
          'laundry',
          'bbq',
          'garden',
        ],
      }
    default:
      return null
  }
}
