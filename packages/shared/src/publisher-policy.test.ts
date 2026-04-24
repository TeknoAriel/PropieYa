import { describe, expect, it } from 'vitest'

import {
  DEFAULT_INDIVIDUAL_OWNER_LISTING_CAP,
  effectiveListingLimit,
  nearListingQuota,
} from './publisher-policy'

describe('effectiveListingLimit', () => {
  it('usa listingLimit de DB si está definido', () => {
    expect(
      effectiveListingLimit({
        orgType: 'individual_owner',
        listingLimit: 10,
      })
    ).toBe(10)
  })

  it('particular sin tope en DB: default 3', () => {
    expect(
      effectiveListingLimit({
        orgType: 'individual_owner',
        listingLimit: null,
      })
    ).toBe(DEFAULT_INDIVIDUAL_OWNER_LISTING_CAP)
  })

  it('inmobiliaria sin tope: null (sin cap duro por defecto)', () => {
    expect(
      effectiveListingLimit({
        orgType: 'real_estate_agency',
        listingLimit: null,
      })
    ).toBeNull()
  })
})

describe('nearListingQuota', () => {
  it('cap 3, used 2: cerca', () => {
    expect(nearListingQuota(2, 3)).toBe(true)
  })

  it('cap 10, used 8: cerca (80%)', () => {
    expect(nearListingQuota(8, 10)).toBe(true)
  })

  it('al límite: no "cerca" (mensaje de at limit)', () => {
    expect(nearListingQuota(3, 3)).toBe(false)
  })
})
