'use client'

import { useMemo } from 'react'

import type { Currency } from '@propieya/shared'

import { parseBuscarSearchFromReturnPath } from '@/lib/parse-buscar-search-context'
import { useListingFlowReturn } from '@/lib/use-listing-flow-return'

import {
  formatListingSearchContextSummary,
  ListingSearchContextSummaryContent,
} from './listing-search-context-summary'
import {
  formatListingFitInsight,
  ListingFitInsightContent,
  type ListingFitInsightListing,
} from './listing-fit-insight'

type ListingSearchPostBannerProps = {
  listingId: string
  fallbackCurrency: Currency
  listing: ListingFitInsightListing
}

/**
 * Un solo `returnTo` + franja única: resumen de búsqueda + insight de encaje.
 * Los módulos `listing-search-context-summary` y `listing-fit-insight` concentran copy y heurística.
 */
export function ListingSearchPostBanner({
  listingId,
  fallbackCurrency,
  listing,
}: ListingSearchPostBannerProps) {
  const { returnPath } = useListingFlowReturn(listingId)
  const parsed = useMemo(
    () => parseBuscarSearchFromReturnPath(returnPath),
    [returnPath]
  )
  const summaryText = useMemo(
    () => formatListingSearchContextSummary(parsed, fallbackCurrency),
    [parsed, fallbackCurrency]
  )
  const insightText = useMemo(
    () => formatListingFitInsight(parsed, listing),
    [parsed, listing]
  )

  if (!summaryText && !insightText) return null

  return (
    <div className="border-b border-border/40 bg-surface-secondary/25">
      <div className="container mx-auto px-4 py-2.5">
        <ListingSearchContextSummaryContent summaryText={summaryText} />
        <ListingFitInsightContent insightText={insightText} />
      </div>
    </div>
  )
}
