import { describe, expect, it } from 'vitest'

import { resolvePortalVisibilityForPublicUi } from './portal-visibility'

describe('resolvePortalVisibilityForPublicUi', () => {
  it('sin portalVisibility: standard, sin tira', () => {
    const v = resolvePortalVisibilityForPublicUi({})
    expect(v.tier).toBe('standard')
    expect(v.operationalStatus).toBe('none')
    expect(v.showStrip).toBe(false)
  })

  it('tier highlight: muestra tira', () => {
    const v = resolvePortalVisibilityForPublicUi({
      portalVisibility: { tier: 'highlight' },
    })
    expect(v.tier).toBe('highlight')
    expect(v.operationalStatus).toBe('active')
    expect(v.showStrip).toBe(true)
    expect(v.stripLabel.length).toBeGreaterThan(0)
  })

  it('tier distinto a highlight|boost|premium: sin tira (fallback standard)', () => {
    const v1 = resolvePortalVisibilityForPublicUi({
      portalVisibility: { tier: 'standard' },
    })
    expect(v1.operationalStatus).toBe('none')
    expect(v1.showStrip).toBe(false)
  })

  it('tier con from futuro: no muestra tira (scheduled)', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const v = resolvePortalVisibilityForPublicUi({
      portalVisibility: { tier: 'boost', from: future },
    })
    expect(v.tier).toBe('boost')
    expect(v.operationalStatus).toBe('scheduled')
    expect(v.showStrip).toBe(false)
  })

  it('tier con until vencido: no muestra tira (expired)', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const v = resolvePortalVisibilityForPublicUi({
      portalVisibility: { tier: 'premium_ficha', until: past },
    })
    expect(v.tier).toBe('premium_ficha')
    expect(v.operationalStatus).toBe('expired')
    expect(v.showStrip).toBe(false)
  })
})
