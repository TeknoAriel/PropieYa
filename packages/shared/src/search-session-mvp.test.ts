import { describe, expect, it } from 'vitest'

import {
  normalizeSearchSessionMVP,
  searchSessionHasAnchor,
} from './search-session-mvp'

describe('normalizeSearchSessionMVP + parsing en sesión', () => {
  it('depto alquiler rosario: operación, tipo y ciudad estructurados; q residual sin rosario', () => {
    const n = normalizeSearchSessionMVP({ q: 'depto alquiler rosario' })
    expect(n.operationType).toBe('rent')
    expect(n.propertyType).toBe('apartment')
    expect(n.city).toBe('Rosario')
    expect(n.neighborhood).toBeNull()
    expect(n.q === null || n.q === '').toBe(true)
  })

  it('casa funes: ciudad Funes inferida', () => {
    const n = normalizeSearchSessionMVP({ q: 'casa funes' })
    expect(n.city).toBe('Funes')
  })

  it('venta rosario: venta + ciudad', () => {
    const n = normalizeSearchSessionMVP({ q: 'venta rosario' })
    expect(n.operationType).toBe('sale')
    expect(n.city).toBe('Rosario')
  })

  it('casa con jardín funes: garden en amenityIds y ciudad', () => {
    const n = normalizeSearchSessionMVP({ q: 'casa con jardín funes' })
    expect(n.city).toBe('Funes')
    expect(n.amenityIds).toContain('garden')
  })

  it('monoambiente palermo: depto + CABA + Palermo', () => {
    const n = normalizeSearchSessionMVP({ q: 'monoambiente palermo' })
    expect(n.propertyType).toBe('apartment')
    expect(n.city).toBe('CABA')
    expect(n.neighborhood).toBe('Palermo')
  })

  it('local comercial rosario centro: tipo commercial y ciudad Rosario', () => {
    const n = normalizeSearchSessionMVP({ q: 'local comercial rosario centro' })
    expect(n.propertyType).toBe('commercial')
    expect(n.city).toBe('Rosario')
    expect(n.q?.toLowerCase()).toContain('centro')
  })

  it('no pisa ciudad explícita en sesión', () => {
    const n = normalizeSearchSessionMVP({
      q: 'depto alquiler',
      city: 'Mendoza',
    })
    expect(n.city).toBe('Mendoza')
    expect(n.operationType).toBe('rent')
    expect(n.propertyType).toBe('apartment')
  })
})

describe('searchSessionHasAnchor', () => {
  it('operación sola (p. ej. /venta) cuenta como ancla de catálogo', () => {
    expect(
      searchSessionHasAnchor(
        normalizeSearchSessionMVP({ operationType: 'sale' })
      )
    ).toBe(true)
    expect(
      searchSessionHasAnchor(
        normalizeSearchSessionMVP({ operationType: 'rent' })
      )
    ).toBe(true)
  })

  it('sin operación ni localidad ni mapa ni q: no hay ancla', () => {
    expect(searchSessionHasAnchor(normalizeSearchSessionMVP({}))).toBe(false)
  })
})
