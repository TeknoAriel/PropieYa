import { describe, expect, it } from 'vitest'

import { inferListingMatchProfile } from './listing-match-profile'

describe('inferListingMatchProfile', () => {
  it('usa explícito si viene', () => {
    expect(inferListingMatchProfile({ q: '', explicit: 'intent' })).toBe('intent')
    expect(inferListingMatchProfile({ q: 'casa', explicit: 'catalog' })).toBe('catalog')
  })

  it('con q no vacío → intent', () => {
    expect(inferListingMatchProfile({ q: '  depto palermo  ' })).toBe('intent')
  })

  it('sin q → catalog', () => {
    expect(inferListingMatchProfile({ q: undefined })).toBe('catalog')
    expect(inferListingMatchProfile({ q: '   ' })).toBe('catalog')
  })
})
