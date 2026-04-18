'use client'

import { useMemo } from 'react'

import { Badge } from '@propieya/ui'
import {
  formatPrice,
  OPERATION_TYPE_LABELS,
  PORTAL_LISTING_UX_COPY as L,
  PROPERTY_TYPE_LABELS,
  type Currency,
  type OperationType,
  type PropertyType,
} from '@propieya/shared'

import {
  parseBuscarSearchFromReturnPath,
  type ParsedBuscarSearchContext,
} from '@/lib/parse-buscar-search-context'
import { useListingFlowReturn } from '@/lib/use-listing-flow-return'

export function formatListingSearchContextSummary(
  parsed: ParsedBuscarSearchContext | null,
  fallbackCurrency: Currency
): string | null {
  if (!parsed) return null
  return buildSummaryLine(parsed, fallbackCurrency)
}

function buildSummaryLine(
  ctx: ParsedBuscarSearchContext,
  fallbackCurrency: Currency
): string | null {
  const cur = ctx.currency ?? fallbackCurrency
  const parts: string[] = []

  if (ctx.operationType) {
    parts.push(OPERATION_TYPE_LABELS[ctx.operationType as OperationType])
  }
  if (ctx.propertyType) {
    parts.push(PROPERTY_TYPE_LABELS[ctx.propertyType as PropertyType])
  }

  const where = ctx.neighborhood || ctx.city
  if (where) {
    parts.push(`${L.searchContextSummaryLocationPrefix} ${where}`)
  }

  const { minPrice, maxPrice } = ctx
  if (minPrice != null && maxPrice != null) {
    parts.push(
      `${formatPrice(minPrice, cur, { compact: true })}–${formatPrice(maxPrice, cur, { compact: true })}`
    )
  } else if (minPrice != null) {
    parts.push(
      `${L.searchContextSummaryPriceFrom} ${formatPrice(minPrice, cur, { compact: true })}`
    )
  } else if (maxPrice != null) {
    parts.push(
      `${L.searchContextSummaryPriceUpTo} ${formatPrice(maxPrice, cur, { compact: true })}`
    )
  }

  if (ctx.minBedrooms != null) {
    const n = Math.floor(ctx.minBedrooms)
    parts.push(L.searchContextSummaryBedrooms.replace('{n}', String(n)))
  }
  if (ctx.minSurface != null) {
    const n = Math.floor(ctx.minSurface)
    parts.push(L.searchContextSummarySurface.replace('{n}', String(n)))
  }
  if (ctx.amenityIds.length > 0) {
    parts.push(L.searchContextSummaryAmenitiesHint)
  }

  if (parts.length === 0) return null
  return parts.join(L.searchContextSummarySeparator)
}

export function ListingSearchContextSummaryContent({
  summaryText,
}: {
  summaryText: string | null
}) {
  if (!summaryText) return null

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
      <Badge variant="secondary" className="w-fit shrink-0 font-medium">
        {L.searchContextSummaryBadge}
      </Badge>
      <p className="min-w-0 text-sm leading-snug text-text-secondary">
        <span className="font-medium text-text-primary">{summaryText}</span>
      </p>
    </div>
  )
}

type ListingSearchContextSummaryProps = {
  listingId: string
  fallbackCurrency: Currency
}

export function ListingSearchContextSummary({
  listingId,
  fallbackCurrency,
}: ListingSearchContextSummaryProps) {
  const { returnPath } = useListingFlowReturn(listingId)
  const ctx = useMemo(
    () => parseBuscarSearchFromReturnPath(returnPath),
    [returnPath]
  )
  const line = useMemo(
    () => formatListingSearchContextSummary(ctx, fallbackCurrency),
    [ctx, fallbackCurrency]
  )

  if (!line) return null

  return <ListingSearchContextSummaryContent summaryText={line} />
}
