/**
 * Orquestación ES: relajación progresiva y suplemento de la primera página.
 */

import type { SearchFilters } from './types'
import { searchListings, type SearchHit } from './search'
import {
  cloneSearchFilters,
  ZERO_RESULTS_RELAXATION_SEQUENCE,
  stripSecondaryDetails,
} from './search-relaxation'

export type ListingSearchTier = 'exact' | 'relaxed' | 'similar'

export type ListingSearchUX = {
  tier: ListingSearchTier
  /** Total con la query original (primera pasada ES). */
  primaryTotal: number
  /** Coincidencias que cumplen todos los filtros no preferidos de la primera pasada. */
  strictMatchCount: number
  /** Si se mezcló primera página con suplementos relajados. */
  mergedSupplement: boolean
  /** Se omitió polígono/bbox en un paso de suplemento cercano. */
  nearAreaSupplement: boolean
  messages: string[]
  relaxationStepIds: string[]
  /** Sin cursor cuando la lista mezclada no es paginable de forma estable. */
  disableDeepPagination: boolean
}

const THRESHOLD_HIGH = 20
const THRESHOLD_MID = 8

function emptyUx(): ListingSearchUX {
  return {
    tier: 'exact',
    primaryTotal: 0,
    strictMatchCount: 0,
    mergedSupplement: false,
    nearAreaSupplement: false,
    messages: [],
    relaxationStepIds: [],
    disableDeepPagination: false,
  }
}

function hasAmenityPreference(f: SearchFilters): boolean {
  return (
    (f.amenities?.length ?? 0) > 0 || (f.facets?.flags?.length ?? 0) > 0
  )
}

export async function searchListingsLayered(
  baseFilters: SearchFilters
): Promise<{
  hits: SearchHit[]
  total: number
  nextCursor: string | null
  fromEs: boolean
  ux: ListingSearchUX
  /** Filtros usados en la última query ES exitosa (para fallback SQL). */
  lastTriedFilters: SearchFilters
}> {
  const limit = Math.min(baseFilters.limit ?? 24, 50)
  const isDeepPage =
    (baseFilters.offset ?? 0) > 0 ||
    (Array.isArray(baseFilters.searchAfter) && baseFilters.searchAfter.length > 0)

  if (isDeepPage) {
    const res = await searchListings(baseFilters)
    return {
      hits: res.hits,
      total: res.total,
      nextCursor: res.nextCursor,
      fromEs: res.fromEs,
      ux: {
        tier: 'exact',
        primaryTotal: res.total,
        strictMatchCount: res.total,
        mergedSupplement: false,
        nearAreaSupplement: false,
        messages: [],
        relaxationStepIds: [],
        disableDeepPagination: false,
      },
      lastTriedFilters: baseFilters,
    }
  }

  const primary = await searchListings(baseFilters)
  let lastTried = cloneSearchFilters(baseFilters)

  if (!primary.fromEs) {
    return {
      hits: primary.hits,
      total: primary.total,
      nextCursor: primary.nextCursor,
      fromEs: false,
      ux: emptyUx(),
      lastTriedFilters: lastTried,
    }
  }

  const primaryTotal = primary.total
  const messages: string[] = []
  const relaxationStepIds: string[] = []

  if (primaryTotal >= THRESHOLD_HIGH) {
    return {
      hits: primary.hits,
      total: primary.total,
      nextCursor: primary.nextCursor,
      fromEs: true,
      ux: {
        tier: 'exact',
        primaryTotal,
        strictMatchCount: primaryTotal,
        mergedSupplement: false,
        nearAreaSupplement: false,
        messages,
        relaxationStepIds,
        disableDeepPagination: false,
      },
      lastTriedFilters: lastTried,
    }
  }

  if (primaryTotal >= THRESHOLD_MID && primaryTotal < THRESHOLD_HIGH) {
    if (
      baseFilters.amenitiesMatchMode !== 'strict' &&
      hasAmenityPreference(baseFilters)
    ) {
      messages.push(
        'Algunos criterios de amenities se usan como preferencia para no vaciar el listado.'
      )
    }
    return {
      hits: primary.hits,
      total: primary.total,
      nextCursor: primary.nextCursor,
      fromEs: true,
      ux: {
        tier: 'exact',
        primaryTotal,
        strictMatchCount: primaryTotal,
        mergedSupplement: false,
        nearAreaSupplement: false,
        messages,
        relaxationStepIds,
        disableDeepPagination: false,
      },
      lastTriedFilters: lastTried,
    }
  }

  if (primaryTotal >= 1 && primaryTotal < THRESHOLD_MID) {
    const f2 = cloneSearchFilters(baseFilters)
    stripSecondaryDetails(f2)
    lastTried = f2
    const secondary = await searchListings({ ...f2, limit: 80, offset: 0 })

    if (secondary.fromEs && secondary.total > primaryTotal) {
      const exactIds = new Set(primary.hits.map((h) => h.id))
      const extraHits = secondary.hits.filter((h) => !exactIds.has(h.id))
      const merged = [...primary.hits, ...extraHits].slice(0, limit)
      messages.push(
        `Encontramos ${primaryTotal} opciones que cumplen todos los criterios afinados.`
      )
      messages.push(
        'Te mostramos también opciones donde relajamos detalles secundarios (orientación, pisos, cubiertas, etc.).'
      )
      return {
        hits: merged,
        total: secondary.total,
        nextCursor: null,
        fromEs: true,
        ux: {
          tier: 'relaxed',
          primaryTotal,
          strictMatchCount: primaryTotal,
          mergedSupplement: true,
          nearAreaSupplement: false,
          messages,
          relaxationStepIds: ['secondary_details'],
          disableDeepPagination: true,
        },
        lastTriedFilters: f2,
      }
    }

    messages.push(
      primaryTotal === 1
        ? 'Encontramos 1 opción exacta con tus filtros.'
        : `Encontramos ${primaryTotal} opciones exactas.`
    )
    return {
      hits: primary.hits,
      total: primary.total,
      nextCursor: primary.nextCursor,
      fromEs: true,
      ux: {
        tier: 'exact',
        primaryTotal,
        strictMatchCount: primaryTotal,
        mergedSupplement: false,
        nearAreaSupplement: false,
        messages,
        relaxationStepIds,
        disableDeepPagination: false,
      },
      lastTriedFilters: lastTried,
    }
  }

  const walk = cloneSearchFilters(baseFilters)
  walk.amenitiesMatchMode = 'preferred'

  for (const step of ZERO_RESULTS_RELAXATION_SEQUENCE) {
    step.apply(walk)
    relaxationStepIds.push(step.id)
    lastTried = cloneSearchFilters(walk)
    const attempt = await searchListings({
      ...walk,
      limit,
      offset: 0,
      searchAfter: undefined,
    })
    if (!attempt.fromEs) break
    if (attempt.total > 0) {
      const nearArea =
        step.id === 'map_geo' &&
        Boolean(baseFilters.polygon?.length || baseFilters.bbox)
      messages.push(
        'No hubo coincidencias con todos los filtros; ampliamos la búsqueda manteniendo operación, tipo y ubicación principal.'
      )
      if (nearArea) {
        messages.push(
          'Quitamos el recorte estricto del mapa y sumamos opciones en la zona.'
        )
      }
      return {
        hits: attempt.hits,
        total: attempt.total,
        nextCursor: attempt.nextCursor,
        fromEs: true,
        ux: {
          tier: 'similar',
          primaryTotal,
          strictMatchCount: 0,
          mergedSupplement: false,
          nearAreaSupplement: nearArea,
          messages,
          relaxationStepIds,
          disableDeepPagination: false,
        },
        lastTriedFilters: lastTried,
      }
    }
  }

  const finalTry = cloneSearchFilters(baseFilters)
  for (const step of ZERO_RESULTS_RELAXATION_SEQUENCE) {
    step.apply(finalTry)
  }
  lastTried = finalTry

  return {
    hits: [],
    total: 0,
    nextCursor: null,
    fromEs: true,
    ux: {
      tier: 'similar',
      primaryTotal,
      strictMatchCount: 0,
      mergedSupplement: false,
      nearAreaSupplement: false,
      messages: [
        'No encontramos avisos ni siquiera relajando criterios. Probá otra zona u operación.',
      ],
      relaxationStepIds,
      disableDeepPagination: false,
    },
    lastTriedFilters: lastTried,
  }
}
