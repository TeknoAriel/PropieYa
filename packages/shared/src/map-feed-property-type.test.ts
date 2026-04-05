import { describe, expect, it } from 'vitest'

import {
  inferPropertyTypeFromListingNarrative,
  mapFeedPropertyType,
  mapFeedPropertyTypeWithListingText,
} from './map-feed-property-type'

describe('mapFeedPropertyTypeWithListingText', () => {
  it('usa título cuando el feed no trae tipo', () => {
    expect(
      mapFeedPropertyTypeWithListingText('', {
        title: 'Terreno en esquina Funes',
        description: '',
      })
    ).toBe('land')
  })

  it('corrige apartment del feed si el título describe PH', () => {
    expect(
      mapFeedPropertyTypeWithListingText('apartment', {
        title: 'PH reciclado 3 amb con patio',
        description: '',
      })
    ).toBe('ph')
  })

  it('respeta tipo explícito no apartment del feed', () => {
    expect(
      mapFeedPropertyTypeWithListingText('house', {
        title: 'Departamento en edificio',
        description: '',
      })
    ).toBe('house')
  })

  it('mapFeedPropertyType sin texto sigue siendo apartment por defecto', () => {
    expect(mapFeedPropertyType('')).toBe('apartment')
    expect(mapFeedPropertyType('codigo_desconocido_xyz')).toBe('apartment')
  })
})

describe('inferPropertyTypeFromListingNarrative', () => {
  it('detecta local comercial', () => {
    expect(
      inferPropertyTypeFromListingNarrative('Local comercial sobre avenida', null)
    ).toBe('commercial')
  })

  it('devuelve undefined si no hay señal', () => {
    expect(inferPropertyTypeFromListingNarrative('Vendo inmueble', '')).toBeUndefined()
  })
})
