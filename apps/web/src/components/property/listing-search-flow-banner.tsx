'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { PORTAL_LISTING_UX_COPY as L } from '@propieya/shared'
import type { Currency } from '@propieya/shared'

import { appendBuscarListingAnchor } from '@/lib/listing-flow-return-url'
import { parseBuscarSearchFromReturnPath } from '@/lib/parse-buscar-search-context'
import { useListingFlowReturn } from '@/lib/use-listing-flow-return'

import {
  formatListingSearchContextSummary,
  ListingSearchContextSummaryContent,
} from './listing-search-context-summary'

type ListingSearchFlowBannerProps = {
  listingId: string
  listingTitle: string
  fallbackCurrency: Currency
}

export function ListingSearchFlowBanner({
  listingId,
  listingTitle,
  fallbackCurrency,
}: ListingSearchFlowBannerProps) {
  const { returnPath } = useListingFlowReturn(listingId)
  const backHref = returnPath
    ? appendBuscarListingAnchor(returnPath, listingId)
    : '/buscar'

  const parsed = useMemo(
    () => parseBuscarSearchFromReturnPath(returnPath),
    [returnPath]
  )
  const summaryText = useMemo(
    () => formatListingSearchContextSummary(parsed, fallbackCurrency),
    [parsed, fallbackCurrency]
  )

  return (
    <div className="border-b border-border/45 bg-surface-secondary/30">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <nav aria-label="Navegación de ficha" className="min-w-0 text-sm text-text-secondary">
            <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
              <li>
                <Link
                  href="/"
                  className="rounded-sm transition-colors duration-200 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {L.listingFlowBreadcrumbHome}
                </Link>
              </li>
              <li aria-hidden="true" className="text-text-tertiary">
                /
              </li>
              <li>
                <Link
                  href={backHref}
                  prefetch
                  className="rounded-sm transition-colors duration-200 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {returnPath ? L.listingFlowBreadcrumbSearch : L.listingFlowBreadcrumbBuscar}
                </Link>
              </li>
              <li aria-hidden="true" className="text-text-tertiary">
                /
              </li>
              <li
                className="max-w-[min(100%,32rem)] truncate font-medium text-text-primary"
                title={listingTitle}
              >
                {listingTitle}
              </li>
            </ol>
          </nav>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href={backHref}
              prefetch
              className="group/back inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-surface-primary px-3.5 py-2 text-sm font-medium text-text-primary shadow-sm transition-all duration-200 hover:border-brand-primary/40 hover:bg-brand-primary/[0.05] active:scale-[0.985] motion-safe:hover:shadow-sm"
            >
              <span
                aria-hidden="true"
                className="text-text-tertiary transition-transform duration-200 group-hover/back:-translate-x-0.5"
              >
                ←
              </span>
              {returnPath ? L.listingFlowBackToResults : L.listingFlowBackToBuscar}
            </Link>
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-text-secondary"
              aria-label="Otras acciones en esta ficha"
            >
              <a
                href="#ficha-contacto"
                className="rounded-sm text-brand-primary underline-offset-2 transition-colors duration-200 hover:text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {L.listingFlowActionContact}
              </a>
              <span aria-hidden="true" className="text-text-tertiary">
                ·
              </span>
              <a
                href="#lista-similares"
                className="rounded-sm text-brand-primary underline-offset-2 transition-colors duration-200 hover:text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {L.listingFlowActionExploreSimilar}
              </a>
              <span aria-hidden="true" className="text-text-tertiary">
                ·
              </span>
              <Link
                href="/mis-alertas"
                prefetch={false}
                className="rounded-sm text-brand-primary underline-offset-2 transition-colors duration-200 hover:text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {L.listingFlowActionMyAlerts}
              </Link>
            </div>
          </div>
        </div>

        {summaryText ? (
          <div className="mt-2 max-w-4xl border-t border-border/35 pt-2 transition-opacity duration-300 ease-out">
            <ListingSearchContextSummaryContent summaryText={summaryText} />
          </div>
        ) : null}

        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-text-tertiary transition-opacity duration-300">
          {L.listingFlowNextStepsHint}
        </p>
      </div>
    </div>
  )
}
