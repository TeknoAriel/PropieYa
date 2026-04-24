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

  it('casa ibarlucea: ciudad Ibarlucea inferida por token', () => {
    const n = normalizeSearchSessionMVP({ q: 'casa ibarlucea' })
    expect(n.city).toBe('Ibarlucea')
    expect(n.propertyType).toBe('house')
  })

  it('ibarlucea: ciudad inferida', () => {
    const n = normalizeSearchSessionMVP({ q: 'ibarlucea' })
    expect(n.city).toBe('Ibarlucea')
  })

  it('KP486622: código estructurado y sin ruido en q', () => {
    const n = normalizeSearchSessionMVP({ q: 'KP486622' })
    expect(n.publicListingCode).toBe('KP486622')
    expect(n.q === null || n.q === '').toBe(true)
  })

  it('kp 486622: mismo código normalizado', () => {
    const n = normalizeSearchSessionMVP({ q: 'kp 486622' })
    expect(n.publicListingCode).toBe('KP486622')
  })

  it('depto centro rosario: barrio Centro + Rosario', () => {
    const n = normalizeSearchSessionMVP({ q: 'depto centro rosario' })
    expect(n.propertyType).toBe('apartment')
    expect(n.city).toBe('Rosario')
    expect(n.neighborhood).toBe('Centro')
  })

  it('venta rosario: venta + ciudad', () => {
    const n = normalizeSearchSessionMVP({ q: 'venta rosario' })
    expect(n.operationType).toBe('sale')
    expect(n.city).toBe('Rosario')
  })

  it('venta centro rosario: venta + barrio Centro + Rosario', () => {
    const n = normalizeSearchSessionMVP({ q: 'venta centro rosario' })
    expect(n.operationType).toBe('sale')
    expect(n.city).toBe('Rosario')
    expect(n.neighborhood).toBe('Centro')
  })

  it('alquiler rosario: alquiler + ciudad', () => {
    const n = normalizeSearchSessionMVP({ q: 'alquiler rosario' })
    expect(n.operationType).toBe('rent')
    expect(n.city).toBe('Rosario')
  })

  it('lote funes: terreno/lote + ciudad Funes', () => {
    const n = normalizeSearchSessionMVP({ q: 'lote funes' })
    expect(n.propertyType).toBe('land')
    expect(n.city).toBe('Funes')
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

  it('local comercial rosario centro: tipo commercial, Rosario y barrio Centro', () => {
    const n = normalizeSearchSessionMVP({ q: 'local comercial rosario centro' })
    expect(n.propertyType).toBe('commercial')
    expect(n.city).toBe('Rosario')
    expect(n.neighborhood).toBe('Centro')
    expect(n.q === null || n.q === '').toBe(true)
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

  it('código público cuenta como ancla', () => {
    expect(
      searchSessionHasAnchor(
        normalizeSearchSessionMVP({ publicListingCode: 'KP486622' })
      )
    ).toBe(true)
  })
})
