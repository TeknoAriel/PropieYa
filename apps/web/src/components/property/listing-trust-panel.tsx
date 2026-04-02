'use client'

import { Badge, Card } from '@propieya/ui'
import {
  PORTAL_LISTING_UX_COPY as L,
  buildListingFreshnessUi,
  resolveListingCompletenessForPortal,
  type ListingTrustCompletenessInput,
} from '@propieya/shared'

type ListingTrustSource = {
  publishedAt: Date | string | null | undefined
  expiresAt: Date | string | null | undefined
  source: string
  qualityScore: number | null | undefined
  title: string
  description: string
  primaryImageUrl?: string | null
  mediaCount: number
  address?: unknown
  locationLat?: number | null
  locationLng?: number | null
  surfaceTotal: number
  bedrooms: number | null
  bathrooms: number | null
  features?: unknown
}

export function ListingTrustPanel({ listing }: { listing: ListingTrustSource }) {
  const freshness = buildListingFreshnessUi(listing.publishedAt, listing.expiresAt)

  const completenessInput: ListingTrustCompletenessInput = {
    title: listing.title,
    description: listing.description,
    primaryImageUrl: listing.primaryImageUrl ?? null,
    mediaCount: listing.mediaCount,
    address: listing.address ?? {},
    locationLat: listing.locationLat ?? null,
    locationLng: listing.locationLng ?? null,
    surfaceTotal: listing.surfaceTotal,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    features: listing.features ?? {},
  }
  const completeness = resolveListingCompletenessForPortal(
    listing.qualityScore,
    completenessInput
  )

  const src = listing.source ?? 'manual'
  const originLine = src === 'import' ? L.sourceImport : L.sourceManual

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-text-primary">{L.trustCardTitle}</h2>
        {freshness.isExpiringSoon ? (
          <Badge variant="secondary">{L.expiringSoonBadge}</Badge>
        ) : null}
      </div>

      <ul className="space-y-2 text-sm text-text-secondary">
        {freshness.publishedLine ? <li>{freshness.publishedLine}</li> : null}
        {freshness.expiresLine ? <li>{freshness.expiresLine}</li> : null}
        <li className="text-text-tertiary">{originLine}</li>
      </ul>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-text-primary">{L.completenessLabel}</span>
          <span className="text-sm tabular-nums text-brand-primary">{completeness}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-brand-primary transition-[width] duration-300"
            style={{ width: `${completeness}%` }}
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="text-xs text-text-tertiary leading-relaxed">{L.completenessHint}</p>
      </div>
    </Card>
  )
}
