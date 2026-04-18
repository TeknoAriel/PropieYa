'use client'

import { useMemo } from 'react'

import { PORTAL_LISTING_UX_COPY as L } from '@propieya/shared'
import type { OperationType, PropertyType } from '@propieya/shared'

import { parseBuscarSearchFromReturnPath } from '@/lib/parse-buscar-search-context'
import type { ParsedBuscarSearchContext } from '@/lib/parse-buscar-search-context'
import { useListingFlowReturn } from '@/lib/use-listing-flow-return'

const OUTDOOR_AMENITY_IDS = new Set([
  'balcony',
  'terrace',
  'garden',
  'pool',
  'bbq',
  'rooftop',
])

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export type ListingFitInsightListing = {
  operationType: OperationType
  propertyType: PropertyType
  priceAmount: number
  bedrooms: number | null
  surfaceTotal: number
  neighborhood: string
  city: string
  amenityIds: readonly string[]
}

export function formatListingFitInsight(
  parsed: ParsedBuscarSearchContext | null,
  listing: ListingFitInsightListing
): string | null {
  if (!parsed) return null
  return pickInsight(parsed, listing)
}

function pickInsight(
  ctx: ParsedBuscarSearchContext,
  listing: ListingFitInsightListing
): string | null {
  const nbListing = norm(listing.neighborhood === '—' ? '' : listing.neighborhood)
  const cyListing = norm(listing.city === '—' ? '' : listing.city)
  const nbSearch = norm(ctx.neighborhood)
  const cySearch = norm(ctx.city)

  const locationStrong =
    (nbSearch.length > 0 && nbListing.length > 0 && nbListing === nbSearch) ||
    (nbSearch.length === 0 &&
      cySearch.length > 0 &&
      cyListing.length > 0 &&
      cyListing === cySearch)

  const typeMatch =
    ctx.propertyType != null && ctx.propertyType === listing.propertyType

  const opMatch =
    ctx.operationType != null && ctx.operationType === listing.operationType

  let priceMatch: boolean | null = null
  if (ctx.minPrice != null || ctx.maxPrice != null) {
    const p = listing.priceAmount
    const okMin = ctx.minPrice == null || p >= ctx.minPrice
    const okMax = ctx.maxPrice == null || p <= ctx.maxPrice
    priceMatch = okMin && okMax
  }

  const bedsMatch =
    ctx.minBedrooms != null &&
    listing.bedrooms != null &&
    listing.bedrooms >= Math.floor(ctx.minBedrooms)

  const surfaceMatch =
    ctx.minSurface != null &&
    listing.surfaceTotal >= Math.floor(ctx.minSurface)

  const wantedOutdoor = ctx.amenityIds.some((id) => OUTDOOR_AMENITY_IDS.has(id))
  const hasOutdoorOverlap = listing.amenityIds.some((id) =>
    OUTDOOR_AMENITY_IDS.has(id)
  )
  const amenityOverlap = ctx.amenityIds.filter((id) =>
    listing.amenityIds.includes(id)
  ).length

  let score = 0
  if (typeMatch) score += 1
  if (opMatch) score += 1
  if (priceMatch === true) score += 1
  if (bedsMatch) score += 1
  if (surfaceMatch) score += 1
  if (amenityOverlap >= 1) score += 1

  if (wantedOutdoor && hasOutdoorOverlap && (surfaceMatch || listing.surfaceTotal >= 85)) {
    return L.fitInsightOutdoorAmplitude
  }
  if (locationStrong && (typeMatch || priceMatch === true || bedsMatch)) {
    return L.fitInsightLocationWithinSearch
  }
  if (score >= 3) {
    return L.fitInsightMultiMainCriteria
  }
  if (amenityOverlap >= 2) {
    return L.fitInsightAmenitiesOverlap
  }
  if (priceMatch === true && (typeMatch || bedsMatch || surfaceMatch)) {
    return L.fitInsightPriceBand
  }
  if (score >= 2) {
    return L.fitInsightPairCriteria
  }

  return null
}

export function ListingFitInsightContent({
  insightText,
}: {
  insightText: string | null
}) {
  if (!insightText) return null

  return (
    <p className="mt-2 max-w-3xl border-l-2 border-brand-primary/35 pl-3 text-sm leading-snug text-text-secondary transition-opacity duration-300">
      {insightText}
    </p>
  )
}

type ListingFitInsightProps = {
  listingId: string
  listing: ListingFitInsightListing
}

export function ListingFitInsight({ listingId, listing }: ListingFitInsightProps) {
  const { returnPath } = useListingFlowReturn(listingId)
  const ctx = useMemo(
    () => parseBuscarSearchFromReturnPath(returnPath),
    [returnPath]
  )
  const line = useMemo(
    () => formatListingFitInsight(ctx, listing),
    [ctx, listing]
  )

  return <ListingFitInsightContent insightText={line} />
}
