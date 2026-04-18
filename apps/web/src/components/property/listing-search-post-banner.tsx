'use client'

import { useMemo } from 'react'

import { parseBuscarSearchFromReturnPath } from '@/lib/parse-buscar-search-context'
import { useListingFlowReturn } from '@/lib/use-listing-flow-return'

import {
  formatListingFitInsight,
  ListingFitInsightContent,
  type ListingFitInsightListing,
} from './listing-fit-insight'

type ListingSearchPostBannerProps = {
  listingId: string
  listing: ListingFitInsightListing
}

/** Franja opcional bajo el banner: insight de encaje (criterios resumidos arriba, en `ListingSearchFlowBanner`). */
export function ListingSearchPostBanner({
  listingId,
  listing,
}: ListingSearchPostBannerProps) {
  const { returnPath } = useListingFlowReturn(listingId)
  const parsed = useMemo(
    () => parseBuscarSearchFromReturnPath(returnPath),
    [returnPath]
  )
  const insightText = useMemo(
    () => formatListingFitInsight(parsed, listing),
    [parsed, listing]
  )

  if (!insightText) return null

  return (
    <div className="border-b border-border/40 bg-surface-secondary/25">
      <div className="container mx-auto px-4 py-2.5">
        <ListingFitInsightContent insightText={insightText} />
      </div>
    </div>
  )
}
