'use client'

import Image from 'next/image'
import Link from 'next/link'

import { trpc } from '@/lib/trpc'

import { Button, Card, Badge, Skeleton, ArrowRight } from '@propieya/ui'
import { formatPrice } from '@propieya/shared'
import type { Currency, OperationType } from '@propieya/shared'

import { getPortalPack } from '@/lib/portal-copy'

type FeaturedListingCardData = {
  id: string
  title: string
  operationType: OperationType
  priceAmount: number
  priceCurrency: Currency
  address?: { neighborhood?: string; city?: string } | null
  surfaceTotal: number
  bedrooms: number | null
  bathrooms: number | null
  primaryImageUrl: string | null
}

export function FeaturedListings() {
  const pack = getPortalPack()
  const { data: listingsRaw = [], isLoading, isError, error } =
    trpc.listing.getFeatured.useQuery({ limit: 6 })
  const listings = listingsRaw as unknown as FeaturedListingCardData[]

  return (
    <section className="border-t border-border/25 bg-surface-secondary/25 pb-12 pt-5 md:pb-16 md:pt-6">
      <div className="container mx-auto px-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between md:mb-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
              {pack.featured.title}
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-text-tertiary md:text-sm md:text-text-secondary">
              {pack.featured.subtitle}
            </p>
          </div>
          <Button variant="outline" asChild size="sm" className="hidden md:inline-flex">
            <Link href="/buscar">
              Ver todas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-text-primary">
            No pudimos cargar los avisos.{' '}
            {error?.message?.includes('DATABASE') || error?.message?.includes('required')
              ? 'Revisá que DATABASE_URL esté definida en Vercel (producción).'
              : (error?.message ?? 'Intentá de nuevo más tarde.')}
          </p>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        <div className="mt-6 text-center md:hidden">
          <Button variant="outline" size="sm" asChild>
            <Link href="/buscar">
              {pack.featured.viewAllMobile}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function ListingCard({ listing }: { listing: FeaturedListingCardData }) {
  const operationLabel = listing.operationType === 'sale' ? 'Venta' : 'Alquiler'
  const neighborhood = listing.address?.neighborhood ?? '—'
  const city = listing.address?.city ?? '—'

  return (
    <Link href={`/propiedad/${listing.id}`} className="block h-full">
      <Card className="group h-full cursor-pointer overflow-hidden rounded-xl border border-border/70 shadow-sm transition-shadow duration-200 hover:border-border hover:shadow-md">
        {/* Image */}
        <div className="relative h-52 overflow-hidden bg-surface-secondary md:h-56">
          <Image
            src={
              listing.primaryImageUrl ||
              'https://placehold.co/600x400/e0ddd8/666660?text=Propiedad'
            }
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
          <Badge className="absolute top-3 left-3" variant="secondary">
            {operationLabel}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="text-xl font-bold text-brand-primary">
            {formatPrice(
              listing.priceAmount,
              listing.priceCurrency as Currency
            )}
          </div>

          <h3 className="mt-2 font-medium text-text-primary line-clamp-2">
            {listing.title}
          </h3>

          <p className="mt-1 text-sm text-text-secondary">
            {neighborhood}, {city}
          </p>

          <div className="mt-3 flex items-center gap-4 text-sm text-text-tertiary">
            <span>{listing.surfaceTotal} m²</span>
            {listing.bedrooms !== null && listing.bedrooms > 0 && (
              <span>{listing.bedrooms} dorm.</span>
            )}
            {listing.bathrooms !== null && (
              <span>
                {listing.bathrooms} baño
                {listing.bathrooms > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
