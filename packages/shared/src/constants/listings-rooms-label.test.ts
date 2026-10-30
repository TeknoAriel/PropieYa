import { describe, expect, it } from 'vitest'

import {
  formatListingBathsLabel,
  formatListingRoomsLabel,
  listingShowsRoomCount,
} from './listings'

describe('formatListingRoomsLabel', () => {
  it('no muestra Monoambiente en terreno/lote', () => {
    expect(listingShowsRoomCount('land')).toBe(false)
    expect(formatListingRoomsLabel('land', 0)).toBeNull()
    expect(formatListingRoomsLabel('land', null)).toBeNull()
    expect(formatListingRoomsLabel('land', 1)).toBeNull()
    expect(formatListingBathsLabel('land', 1)).toBeNull()
  })

  it('tampoco en cochera ni depósito', () => {
    expect(formatListingRoomsLabel('parking', 0)).toBeNull()
    expect(formatListingRoomsLabel('warehouse', 0)).toBeNull()
  })

  it('en depto 0 dorm. sigue siendo Monoambiente', () => {
    expect(formatListingRoomsLabel('apartment', 0)).toBe('Monoambiente')
    expect(formatListingRoomsLabel('apartment', 2)).toBe('2 dorm.')
  })
})
