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

  it('corrige apartments del feed si el título indica en pozo (emprendimiento)', () => {
    expect(
      mapFeedPropertyTypeWithListingText('apartments', {
        title: 'Departamento en venta en En Pozo Edificio Xuum Uf 200-201 2do Piso',
        description: '',
      })
    ).toBe('development_unit')
    expect(
      mapFeedPropertyTypeWithListingText('apartments', {
        title: 'Departamentos 2 dormitorios en venta, en pozo con financiacion',
        description: '',
      })
    ).toBe('development_unit')
  })

  it('no fuerza development_unit en terreno turístico con palabra emprendimiento', () => {
    expect(
      mapFeedPropertyTypeWithListingText('residential_lands', {
        title: 'TERRENO VENTA MISIONES IDEAL EMPRENDIMIENTO CABAÑAS',
        description: '',
      })
    ).toBe('land')
  })

  it('no clasifica lote/casa sueltos como emprendimiento', () => {
    expect(
      mapFeedPropertyTypeWithListingText('', {
        title: 'Lote en venta zona norte oportunidad',
        description: 'Ideal emprendimiento inmobiliario',
      })
    ).toBe('land')
    expect(
      mapFeedPropertyTypeWithListingText('', {
        title: 'Casa de dos pisos con quincho y piscina',
        description: '',
      })
    ).not.toBe('development_unit')
  })

  it('no marca dúplex/galpón por «o emprendimiento» + departamento en copy', () => {
    expect(
      mapFeedPropertyTypeWithListingText('apartments', {
        title: 'Recién remodelado! Duplex Barrio Lastarria, como nuevo',
        description:
          'Uso mixto: ideal para vivienda, oficina o emprendimiento. Departamento con vista.',
      })
    ).not.toBe('development_unit')
    expect(
      mapFeedPropertyTypeWithListingText('apartments', {
        title: 'Galpon y Vivienda en Ramos Mejía',
        description: 'Departamento de 4 ambientes en primer piso.',
      })
    ).not.toBe('development_unit')
  })

  it('sí marca emprendimiento real con proyecto/obra', () => {
    expect(
      mapFeedPropertyTypeWithListingText('apartments', {
        title: 'Amplio Loft en Barrio Devoto',
        description:
          'Emprendimiento de categoría. Este proyecto ofrece unidades con calidad constructiva.',
      })
    ).toBe('development_unit')
  })

  it('no marca depto usado solo por «unidad funcional» ni cochera en edificio', () => {
    expect(
      mapFeedPropertyTypeWithListingText('apartments', {
        title: 'Venta departamento 4amb en Almagro con cochera',
        description: 'Excelente unidad funcional con amenities.',
      })
    ).toBe('apartment')
    expect(
      mapFeedPropertyTypeWithListingText('parking', {
        title: 'Excelente Cochera en Venta - Edificio Casiopea',
        description: 'Emprendimiento con amenities en el edificio.',
      })
    ).toBe('parking')
  })

  it('marca complejo habitacional / en desarrollo y excluye lote de barrio', () => {
    expect(
      mapFeedPropertyTypeWithListingText('apartments', {
        title: 'Complejo Habitacional El Colonial',
        description: 'Este proyecto actualmente en desarrollo cuenta con 13 unidades monoambientes.',
      })
    ).toBe('development_unit')
    expect(
      mapFeedPropertyTypeWithListingText('land', {
        title: 'Costa Esmeralda - Barrio Senderos - Lote 371',
        description: 'Lote en barrio privado. Posibilidad en pozo. Unidades disponibles.',
      })
    ).toBe('land')
    expect(
      mapFeedPropertyTypeWithListingText('', {
        title: 'TERRENO EN AZAHARES DEL PARANA',
        description: 'Emprendimiento náutico. Proyecto con departamentos con amarras.',
      })
    ).toBe('land')
    expect(
      mapFeedPropertyTypeWithListingText('', {
        title: 'VENTA EN POZO - PAMPAS DE MANANTIALES - 2D/1B',
        description: 'Barrio con lotes y terrenos. Unidades en el complejo.',
      })
    ).toBe('development_unit')
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

  it('mapea slugs españoles de property_type_old (Properstar)', () => {
    expect(mapFeedPropertyType('galpones_depositos_edificios_ind')).toBe('warehouse')
    expect(mapFeedPropertyType('locales_comerciales')).toBe('commercial')
    expect(mapFeedPropertyType('negocios_o_fondos_de_comercio')).toBe('commercial')
    expect(mapFeedPropertyType('casas')).toBe('house')
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
