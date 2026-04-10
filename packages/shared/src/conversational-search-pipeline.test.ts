import { describe, expect, it } from 'vitest'

import {
  applyConversationalPhraseRules,
  detectStrictAmenitiesFromText,
  normalizeConversationalText,
  validateConversationalPipeline,
  type ConversationalFlatIntent,
} from './conversational-search-pipeline'
import type { LocalityCatalogEntry } from './locality-catalog-resolver'
import { extractFiltersFromQuery } from './search-term-extractor'

describe('normalizeConversationalText', () => {
  it('colapsa espacios y pasa a minúsculas', () => {
    expect(normalizeConversationalText('  Casa   en   Venta  ')).toBe('casa en venta')
  })
})

describe('applyConversationalPhraseRules', () => {
  it('casa en venta → solo sale (sin forzar house)', () => {
    const intent: ConversationalFlatIntent = { q: 'casa en venta' }
    applyConversationalPhraseRules('casa en venta', intent)
    expect(intent.operationType).toBe('sale')
    expect(intent.propertyType).toBeUndefined()
  })

  it('casas en venta → sale', () => {
    const intent: ConversationalFlatIntent = {}
    applyConversationalPhraseRules('casas en venta', intent)
    expect(intent.operationType).toBe('sale')
    expect(intent.propertyType).toBeUndefined()
  })

  it('casa en alquiler → solo rent', () => {
    const intent: ConversationalFlatIntent = {}
    applyConversationalPhraseRules('quiero alquilar una casa', intent)
    expect(intent.operationType).toBe('rent')
    expect(intent.propertyType).toBeUndefined()
  })
})

describe('validateConversationalPipeline', () => {
  it('no deja venta como barrio', () => {
    const r = validateConversationalPipeline('casa en venta', {
      operationType: 'sale',
      neighborhood: 'venta',
      q: 'casa en venta',
    })
    expect(r.extracted.neighborhood).toBeUndefined()
    expect(r.extracted.operationType).toBe('sale')
    expect(r.debug.droppedLocations).toContain('venta')
  })

  it('no deja alquiler como barrio', () => {
    const r = validateConversationalPipeline('casa en alquiler', {
      neighborhood: 'alquiler',
      q: 'casa en alquiler',
    })
    expect(r.extracted.neighborhood).toBeUndefined()
    expect(r.debug.droppedLocations.join(' ')).toMatch(/alquiler/i)
  })

  it('comprar casa en Rosario: sale y ciudad; no fuerza house (frase genérica)', () => {
    const r = validateConversationalPipeline('comprar casa en Rosario', {
      q: 'comprar casa en Rosario',
      city: 'Rosario',
      propertyType: 'house',
    })
    expect(r.extracted.operationType).toBe('sale')
    expect(r.extracted.propertyType).toBeUndefined()
    expect(r.extracted.city).toBe('Rosario')
  })

  it('casa en venta en rosario: infiere ciudad; no fuerza house', () => {
    const r = validateConversationalPipeline('casa en venta en rosario', {
      operationType: 'sale',
      q: 'casa en venta en rosario',
    })
    expect(r.extracted.city).toBe('Rosario')
    expect(r.extracted.propertyType).toBeUndefined()
    expect(r.extracted.operationType).toBe('sale')
  })

  it('Casas en venta: si el LLM manda house, se quita', () => {
    const r = validateConversationalPipeline('Casas en venta', {
      q: 'Casas en venta',
      operationType: 'sale',
      propertyType: 'house',
    })
    expect(r.extracted.operationType).toBe('sale')
    expect(r.extracted.propertyType).toBeUndefined()
  })

  it('departamento en Palermo con catálogo', () => {
    const r = validateConversationalPipeline('alquilar departamento en Palermo', {
      operationType: 'rent',
      propertyType: 'apartment',
      neighborhood: 'Palermo',
    })
    expect(r.extracted.neighborhood).toBe('Palermo')
    expect(r.extracted.propertyType).toBe('apartment')
  })

  it('ph con patio: patio no es amenity catalogada → cae en q', () => {
    const r = validateConversationalPipeline('ph con patio', {
      propertyType: 'ph',
      q: 'ph con patio',
    })
    expect(r.extracted.propertyType).toBe('ph')
    expect(r.extracted.q?.toLowerCase()).toMatch(/patio/)
  })

  it('lote en venta en Funes', () => {
    const r = validateConversationalPipeline('lote en venta en Funes', {
      operationType: 'sale',
      propertyType: 'land',
      city: 'Funes',
    })
    expect(r.extracted.city).toBe('Funes')
    expect(r.extracted.operationType).toBe('sale')
  })

  it('casa en Funes: no fuerza house (deptos y otros tipos siguen en el listado)', () => {
    const r = validateConversationalPipeline('casa en funes', {
      propertyType: 'house',
      city: 'Funes',
      q: 'casa',
    })
    expect(r.extracted.propertyType).toBeUndefined()
    expect(r.extracted.city).toBe('Funes')
  })

  it('casa con pileta: pool catalogada', () => {
    const r = validateConversationalPipeline('casa con pileta', {
      propertyType: 'house',
      amenities: ['pool'],
    })
    expect(r.extracted.amenities).toEqual(['pool'])
    expect(r.amenitiesMatchMode).toBe('preferred')
  })

  it('sí o sí con pileta → strict', () => {
    const r = validateConversationalPipeline('casa sí o sí con pileta', {
      propertyType: 'house',
      amenities: ['pool'],
    })
    expect(r.amenitiesMatchMode).toStrictEqual('strict')
  })

  it('omite amenity inventada', () => {
    const r = validateConversationalPipeline('depto', {
      propertyType: 'apartment',
      amenities: ['pool', 'xyz_inventado'],
    })
    expect(r.extracted.amenities).toEqual(['pool'])
    expect(r.debug.droppedAmenities).toContain('xyz_inventado')
  })

  it('ciudad fuera de catálogo pasa a unknownTerms', () => {
    const r = validateConversationalPipeline('casa en PuebloInventado', {
      city: 'PuebloInventado',
    })
    expect(r.extracted.city).toBeUndefined()
    expect(r.debug.unknownTerms).toContain('PuebloInventado')
  })

  it('departamento barato en CABA reconoce ciudad', () => {
    const r = validateConversationalPipeline('departamento barato en CABA', {
      propertyType: 'apartment',
      city: 'CABA',
    })
    expect(r.extracted.city).toBe('CABA')
  })

  it('con catálogo dinámico sin Funes, Funes resuelve por alias estático', () => {
    const catalog: LocalityCatalogEntry[] = [
      { city: 'Rosario', neighborhood: null, count: 5 },
    ]
    const r = validateConversationalPipeline(
      'lote en Funes',
      { city: 'Funes', propertyType: 'land', operationType: 'sale' },
      { localityCatalog: catalog }
    )
    expect(r.extracted.city).toBe('Funes')
    expect(r.extracted.propertyType).toBe('land')
  })

  it('con catálogo dinámico valida barrio con hint de ciudad', () => {
    const catalog: LocalityCatalogEntry[] = [
      { city: 'CABA', neighborhood: 'Palermo', count: 10 },
      { city: 'Rosario', neighborhood: 'Palermo', count: 1 },
    ]
    const r = validateConversationalPipeline('depto en Palermo CABA', {
      city: 'CABA',
      neighborhood: 'Palermo',
      propertyType: 'apartment',
    }, { localityCatalog: catalog })
    expect(r.extracted.city).toBe('CABA')
    expect(r.extracted.neighborhood).toBe('Palermo')
  })
})

describe('extractFiltersFromQuery / presupuesto coloquial', () => {
  it('tengo 100k dolar → maxPrice', () => {
    const f = extractFiltersFromQuery('tengo 100k dolar depto 2 dormitorios')
    expect(f.maxPrice).toBe(100_000)
    expect(f.minBedrooms).toBe(2)
  })

  it('presupuesto 80 mil usd → maxPrice', () => {
    expect(extractFiltersFromQuery('presupuesto 80 mil usd').maxPrice).toBe(80_000)
  })

  it('no pisa hasta X si ya hay tope explícito', () => {
    const f = extractFiltersFromQuery('hasta 150k tengo 100k')
    expect(f.maxPrice).toBe(150_000)
  })
})

describe('extractFiltersFromQuery / cochera', () => {
  it('con casa y cochera no fuerza propertyType parking (amenity vía otro canal)', () => {
    const f = extractFiltersFromQuery(
      'casa en venta funes pileta 2 dormitorios cochera'
    )
    expect(f.propertyType).not.toBe('parking')
  })

  it('solo cochera sigue siendo parking', () => {
    const f = extractFiltersFromQuery('cochera en venta rosario')
    expect(f.propertyType).toBe('parking')
  })
})

describe('detectStrictAmenitiesFromText', () => {
  it('detecta sí o sí', () => {
    expect(detectStrictAmenitiesFromText('sí o sí con pileta')).toBe(true)
    expect(detectStrictAmenitiesFromText('si o si con pileta')).toBe(true)
  })

  it('no activa en frase normal', () => {
    expect(detectStrictAmenitiesFromText('casa con pileta')).toBe(false)
  })
})
