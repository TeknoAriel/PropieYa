import { describe, expect, it } from 'vitest'

import { residualPublicSearchText } from './search-query-merge'

describe('residualPublicSearchText', () => {
  it('no deja «casa» suelta en el residual si el tipo ya es casa', () => {
    const r = residualPublicSearchText({
      q: 'casa',
      propertyType: 'house',
      city: 'Funes',
    })
    expect(r.toLowerCase()).not.toMatch(/\bcasa\b/)
  })

  it('conserva texto que no es sinónimo del tipo (p. ej. zona o matiz)', () => {
    const r = residualPublicSearchText({
      q: 'casa zona norte',
      propertyType: 'house',
    })
    expect(r.toLowerCase()).toMatch(/norte/)
  })
})
