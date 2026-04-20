import { describe, expect, it } from 'vitest'

import { isSearchV2ElasticsearchUnreachable } from './listing-search-v2-es-unreachable'
import {
  normalizeSearchSessionMVP,
  SEARCH_V2_BUCKET_LABELS,
} from './search-session-mvp'
import type { ListingSearchV2Result } from './search-session-mvp'

function emptyV2(
  partial: Partial<ListingSearchV2Result>
): ListingSearchV2Result {
  return {
    sessionNormalized: normalizeSearchSessionMVP({}),
    buckets: [
      {
        id: 'strong',
        label: SEARCH_V2_BUCKET_LABELS.strong,
        items: [],
        totalInBucket: 0,
      },
      {
        id: 'near',
        label: SEARCH_V2_BUCKET_LABELS.near,
        items: [],
        totalInBucket: 0,
      },
      {
        id: 'widened',
        label: SEARCH_V2_BUCKET_LABELS.widened,
        items: [],
        totalInBucket: 0,
      },
    ],
    messages: [],
    emptyExplanation: null,
    actions: [],
    totalsByBucket: { strong: 0, near: 0, widened: 0 },
    strictCatalogTotal: 0,
    orderedListingIds: [],
    ...partial,
  } as ListingSearchV2Result
}

describe('isSearchV2ElasticsearchUnreachable', () => {
  it('detecta fallo cuando el aviso del índice está solo en emptyExplanation', () => {
    expect(
      isSearchV2ElasticsearchUnreachable(
        emptyV2({
          messages: [
            'El buscador no está disponible en este momento. Probá de nuevo en unos segundos.',
          ],
          emptyExplanation:
            'No pudimos consultar el índice de búsqueda. Los resultados aparecerán cuando el servicio vuelva a responder.',
        })
      )
    ).toBe(true)
  })

  it('no dispara si ya hay resultados', () => {
    expect(
      isSearchV2ElasticsearchUnreachable(
        emptyV2({
          totalsByBucket: { strong: 3, near: 0, widened: 0 },
        })
      )
    ).toBe(false)
  })

  it('no dispara ante sesión vacía sin textos de error', () => {
    expect(isSearchV2ElasticsearchUnreachable(emptyV2({}))).toBe(false)
  })
})
