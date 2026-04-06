import { describe, expect, it } from 'vitest'

import { summarizeSearchFilters } from './explain-match'

describe('summarizeSearchFilters', () => {
  it('no antepone la frase completa en comillas si ya está cubierta por filtros', () => {
    const s = summarizeSearchFilters({
      q: 'casa en venta en funes 2 dormitorios',
      operationType: 'sale',
      propertyType: 'house',
      city: 'Funes',
      minBedrooms: 2,
    })
    expect(s).not.toMatch(/«casa en venta en funes 2 dormitorios»/i)
    expect(s).toContain('Venta')
    expect(s).toContain('Casa')
    expect(s).toMatch(/Funes/i)
    expect(s).toMatch(/2.*dormitorios/i)
  })
})
