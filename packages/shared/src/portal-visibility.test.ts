import { describe, expect, it } from 'vitest'

import { resolvePortalVisibilityForPublicUi } from './portal-visibility'

describe('resolvePortalVisibilityForPublicUi', () => {
  it('sin portalVisibility: standard, sin tira', () => {
    const v = resolvePortalVisibilityForPublicUi({})
    expect(v.tier).toBe('standard')
    expect(v.showStrip).toBe(false)
  })

  it('tier highlight: muestra tira', () => {
    const v = resolvePortalVisibilityForPublicUi({
      portalVisibility: { tier: 'highlight' },
    })
    expect(v.tier).toBe('highlight')
    expect(v.showStrip).toBe(true)
    expect(v.stripLabel.length).toBeGreaterThan(0)
  })

  it('tier distinto a highlight|boost|premium: sin tira (fallback standard)', () => {
    const v1 = resolvePortalVisibilityForPublicUi({
      portalVisibility: { tier: 'standard' },
    })
    expect(v1.showStrip).toBe(false)
  })
})
