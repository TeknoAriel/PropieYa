import { describe, expect, it } from 'vitest'

import { buildKitepropListingLifecyclePayloadV1 } from './listing-kiteprop-lifecycle-payload'
import { DEFAULT_LISTING_PUBLISH_CONFIG } from './listing-publish-config'
import { assessListingPublishability } from './listing-publishability'
import { shouldExpireListingForStaleContent } from './listing-stale-content'

const base = {
  operationType: 'sale',
  propertyType: 'apartment',
  priceAmount: 125000,
  priceCurrency: 'USD',
  title: 'Departamento luminoso en Palermo',
  description:
    'Muy lindo departamento con buena luz natural y ubicación privilegiada en el barrio.',
  address: {
    city: 'CABA',
    state: 'Buenos Aires',
    neighborhood: 'Palermo',
    street: 'Fake 123',
  },
  config: DEFAULT_LISTING_PUBLISH_CONFIG,
}

describe('assessListingPublishability', () => {
  it('rechaza sin fotos', () => {
    const r = assessListingPublishability({ ...base, mediaCount: 0 })
    expect(r.ok).toBe(false)
    expect(r.primaryIssue?.code).toBe('MIN_IMAGES_NOT_MET')
  })

  it('rechaza precio placeholder', () => {
    const r = assessListingPublishability({ ...base, mediaCount: 2, priceAmount: 9999 })
    expect(r.ok).toBe(false)
    expect(r.issues.some((i) => i.code === 'UNSUPPORTED_PRICE')).toBe(true)
  })

  it('acepta datos mínimos válidos', () => {
    const r = assessListingPublishability({ ...base, mediaCount: 2 })
    expect(r.ok).toBe(true)
    expect(r.issues).toHaveLength(0)
  })

  it('rechaza ubicación incompleta', () => {
    const r = assessListingPublishability({
      ...base,
      mediaCount: 2,
      address: { ...base.address, city: '' },
    })
    expect(r.ok).toBe(false)
    expect(r.primaryIssue?.code).toBe('INVALID_LOCATION')
  })
})

describe('shouldExpireListingForStaleContent', () => {
  const cfg = { staleContentDays: 30 }

  it('expira active tras 30 días sin contenido nuevo', () => {
    const publishedAt = new Date('2026-01-01T12:00:00Z')
    const now = new Date('2026-02-01T12:00:01Z')
    const row = {
      status: 'active' as const,
      publishedAt,
      lastContentUpdatedAt: null as Date | null,
      createdAt: publishedAt,
    }
    expect(shouldExpireListingForStaleContent(now, row, cfg)).toBe(true)
  })

  it('no reprocesa si el contenido se renovó', () => {
    const publishedAt = new Date('2026-01-01T12:00:00Z')
    const lastContent = new Date('2026-01-20T12:00:00Z')
    const now = new Date('2026-02-01T12:00:00Z')
    expect(
      shouldExpireListingForStaleContent(now, {
        status: 'active',
        publishedAt,
        lastContentUpdatedAt: lastContent,
        createdAt: publishedAt,
      }, cfg)
    ).toBe(false)
  })

  it('no aplica a draft', () => {
    const now = new Date('2026-06-01T12:00:00Z')
    expect(
      shouldExpireListingForStaleContent(now, {
        status: 'draft',
        publishedAt: new Date('2026-01-01T12:00:00Z'),
        lastContentUpdatedAt: null,
        createdAt: new Date('2026-01-01T12:00:00Z'),
      }, cfg)
    ).toBe(false)
  })

  it('no aplica sin publishedAt', () => {
    expect(
      shouldExpireListingForStaleContent(new Date(), {
        status: 'active',
        publishedAt: null,
        lastContentUpdatedAt: null,
        createdAt: new Date(),
      }, cfg)
    ).toBe(false)
  })
})

describe('buildKitepropListingLifecyclePayloadV1 (import)', () => {
  it('payload incluye published flags', () => {
    const p = buildKitepropListingLifecyclePayloadV1({
      source: 'validation',
      listingId: '00000000-0000-4000-8000-000000000001',
      externalId: 'EXT-1',
      statePrevious: 'active',
      stateNew: 'draft',
      reasonCode: 'VALIDATION_FAILED',
      reasonMessage: 'test',
      details: { foo: 1 },
    })
    expect(p.version).toBe(1)
    expect(p.kitepropIntegration?.publishedBefore).toBe(true)
    expect(p.kitepropIntegration?.publishedAfter).toBe(false)
    expect(p.externalId).toBe('EXT-1')
  })
})
