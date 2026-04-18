'use client'

import Link from 'next/link'

import { PORTAL_LISTING_UX_COPY as L } from '@propieya/shared'

import { appendBuscarListingAnchor } from '@/lib/listing-flow-return-url'
import { useListingFlowReturn } from '@/lib/use-listing-flow-return'

type ListingSearchFlowBannerProps = {
  listingId: string
  listingTitle: string
}

export function ListingSearchFlowBanner({
  listingId,
  listingTitle,
}: ListingSearchFlowBannerProps) {
  const { returnPath } = useListingFlowReturn(listingId)
  const backHref = returnPath
    ? appendBuscarListingAnchor(returnPath, listingId)
    : '/buscar'

  return (
    <div className="border-b border-border/45 bg-surface-secondary/30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <nav aria-label="Navegación de ficha" className="min-w-0 text-sm text-text-secondary">
            <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
              <li>
                <Link
                  href="/"
                  className="rounded-sm transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
                  className="rounded-sm transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
          <Link
            href={backHref}
            prefetch
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-surface-primary px-3.5 py-2 text-sm font-medium text-text-primary shadow-sm transition-all hover:border-brand-primary/40 hover:bg-brand-primary/[0.05] active:scale-[0.99]"
          >
            <span aria-hidden="true" className="text-text-tertiary">
              ←
            </span>
            {returnPath ? L.listingFlowBackToResults : L.listingFlowBackToBuscar}
          </Link>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-text-tertiary">
          {L.listingFlowNextStepsHint}
        </p>
      </div>
    </div>
  )
}
