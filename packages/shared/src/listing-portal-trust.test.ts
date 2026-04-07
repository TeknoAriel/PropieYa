import { describe, expect, it } from 'vitest'

import { formatListingInventoryRefForPortal } from './listing-portal-trust'

describe('formatListingInventoryRefForPortal', () => {
  it('returns null for empty input', () => {
    expect(formatListingInventoryRefForPortal(null)).toBeNull()
    expect(formatListingInventoryRefForPortal(undefined)).toBeNull()
    expect(formatListingInventoryRefForPortal('')).toBeNull()
    expect(formatListingInventoryRefForPortal('   ')).toBeNull()
  })

  it('shows ellipsis plus full id when short', () => {
    expect(formatListingInventoryRefForPortal('abc')).toBe('…abc')
    expect(formatListingInventoryRefForPortal('12345678')).toBe('…12345678')
  })

  it('shows ellipsis plus last six when long', () => {
    expect(formatListingInventoryRefForPortal('properstar-xyz-991122')).toBe('…991122')
  })
})
