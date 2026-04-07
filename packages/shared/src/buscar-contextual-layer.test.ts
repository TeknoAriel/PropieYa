import { describe, expect, it } from 'vitest'

import { getBuscarContextualBlock } from './buscar-contextual-layer'

describe('getBuscarContextualBlock', () => {
  it('devuelve null sin tipo', () => {
    expect(getBuscarContextualBlock('', 'sale')).toBeNull()
  })

  it('terreno incluye copy de superficie', () => {
    const b = getBuscarContextualBlock('land', 'sale')
    expect(b?.title).toMatch(/Terreno/i)
    expect(b?.body).toMatch(/superficie/i)
  })

  it('alquiler añade nota de precio mensual', () => {
    const sale = getBuscarContextualBlock('apartment', 'sale')
    const rent = getBuscarContextualBlock('apartment', 'rent')
    expect(sale?.body).not.toMatch(/mensual/)
    expect(rent?.body).toMatch(/mensual/)
  })

  it('casa expone quick facets alineados al buscador', () => {
    const b = getBuscarContextualBlock('house', 'sale')
    expect(b?.quickFacetIds?.slice(0, 4)).toEqual([
      'garden',
      'bbq',
      'pool',
      'parking',
    ])
    expect(b?.quickFacetIds).toContain('terrace')
  })

  it('departamento expone atajos de amenities frecuentes', () => {
    const b = getBuscarContextualBlock('apartment', 'sale')
    expect(b?.quickFacetIds).toContain('balcony')
    expect(b?.quickFacetIds).toContain('parking')
    expect(b?.quickFacetIds?.length).toBeGreaterThanOrEqual(10)
  })
})
