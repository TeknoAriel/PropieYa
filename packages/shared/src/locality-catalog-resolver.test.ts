import { describe, expect, it } from 'vitest'

import {
  foldLocalityKey,
  mergeLocalityCatalogWithStaticSupplements,
} from './locality-catalog-resolver'

describe('mergeLocalityCatalogWithStaticSupplements', () => {
  it('agrega Palermo (CABA) si el agregado de la DB no lo incluye', () => {
    const merged = mergeLocalityCatalogWithStaticSupplements([
      { city: 'Funes', neighborhood: null, count: 2 },
    ])
    const palermoRows = merged.filter((e) =>
      foldLocalityKey(`${e.city} ${e.neighborhood ?? ''}`).includes('palermo')
    )
    expect(palermoRows.length).toBeGreaterThanOrEqual(1)
    expect(palermoRows.some((e) => e.city === 'CABA')).toBe(true)
  })

  it('no duplica un par ciudad/barrio ya presente en la DB', () => {
    const merged = mergeLocalityCatalogWithStaticSupplements([
      { city: 'CABA', neighborhood: 'Palermo', count: 5 },
    ])
    const palermo = merged.filter(
      (e) => foldLocalityKey(e.neighborhood ?? '') === 'palermo'
    )
    expect(palermo).toHaveLength(1)
    expect(palermo[0]?.count).toBe(5)
  })
})
