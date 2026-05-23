import { describe, expect, it } from 'vitest'

import {
  getKitepropPropertyIdFromListingFeatures,
  parseKitepropNumericPropertyId,
  peekFeedKitepropNumericPropertyId,
  resolveKitepropPropertyIdForMessage,
} from './kiteprop-property-id'

describe('kiteprop-property-id', () => {
  it('parsea id numérico y public_code KP', () => {
    expect(parseKitepropNumericPropertyId(506424)).toBe(506424)
    expect(parseKitepropNumericPropertyId('506424')).toBe(506424)
    expect(parseKitepropNumericPropertyId('KP506424')).toBe(506424)
    expect(parseKitepropNumericPropertyId('')).toBeNull()
    expect(parseKitepropNumericPropertyId('KP')).toBeNull()
  })

  it('prioriza kitepropPropertyId del feed sobre externalId', () => {
    expect(
      resolveKitepropPropertyIdForMessage({
        kitepropPropertyId: 999001,
        externalId: 'KP506424',
      })
    ).toBe(999001)
  })

  it('no infiere id desde KP sin flag (evita property_id incorrecto)', () => {
    expect(
      resolveKitepropPropertyIdForMessage({
        externalId: 'KP506424',
        propertyCode: 'KP506424',
      })
    ).toBeNull()
  })

  it('lee kitepropPropertyId desde features', () => {
    expect(
      getKitepropPropertyIdFromListingFeatures({ kitepropPropertyId: 12345, amenities: [] })
    ).toBe(12345)
  })

  it('peekFeed solo usa id del ítem', () => {
    expect(
      peekFeedKitepropNumericPropertyId({ id: 506424, public_code: 'KP999' })
    ).toBe(506424)
    expect(peekFeedKitepropNumericPropertyId({ public_code: 'KP999' })).toBeNull()
  })
})
