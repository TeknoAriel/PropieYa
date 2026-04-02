'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { Badge, Button, Card, MessageSquare, Skeleton } from '@propieya/ui'

import { AddToCompareButton } from '@/components/compare/add-to-compare-button'
import { ContactModal } from '@/components/contact-modal'
import { ListingTrustPanel } from '@/components/property/listing-trust-panel'
import { ListingRelatedSearches } from '@/components/property/listing-related-searches'
import { PropertyLocationMap } from '@/components/property/property-location-map'
import {
  formatPrice,
  formatSurface,
  OPERATION_TYPE_LABELS,
  PORTAL_LISTING_UX_COPY as L,
} from '@propieya/shared'
import type {
  Currency,
  ListingCommercialSub,
  ListingField,
  ListingMedia,
  OperationType,
  PropertyType,
} from '@propieya/shared'

import { trpc } from '@/lib/trpc'

function FieldSummary({ field }: { field: ListingField | null | undefined }) {
  if (!field) return null

  switch (field.variant) {
    case 'agricola':
      return (
        <div className="space-y-2">
          <h3 className="font-semibold">Campo agrícola</h3>
          <p>Hectáreas: {field.hectares}</p>
          <p>Cultivo: {field.cropType}</p>
          {field.irrigation ? <p>Riego: {field.irrigation}</p> : null}
          {field.soilType ? <p>Suelo: {field.soilType}</p> : null}
        </div>
      )
    case 'ganadero':
      return (
        <div className="space-y-2">
          <h3 className="font-semibold">Campo ganadero</h3>
          <p>Hectáreas: {field.hectares}</p>
          <p>Especie: {field.animalSpecies}</p>
          <p>Cabezas: {field.headCount}</p>
          {field.housingSystem ? <p>Sistema: {field.housingSystem}</p> : null}
        </div>
      )
    case 'mixto':
      return (
        <div className="space-y-2">
          <h3 className="font-semibold">Campo mixto</h3>
          <p>Hectáreas: {field.hectares}</p>
          <p>Cultivo: {field.cropType}</p>
          <p>Especie: {field.animalSpecies}</p>
          <p>Cabezas: {field.headCount}</p>
        </div>
      )
    case 'forestal':
      return (
        <div className="space-y-2">
          <h3 className="font-semibold">Campo forestal</h3>
          <p>Hectáreas: {field.hectares}</p>
          <p>Especie: {field.treeSpecies}</p>
          {field.ageYears ? <p>Edad: {field.ageYears} años</p> : null}
        </div>
      )
    case 'otro':
      return (
        <div className="space-y-2">
          <h3 className="font-semibold">Campo (otros)</h3>
          <p>{field.description}</p>
        </div>
      )
    default:
      return null
  }
}

function ContactButton({
  listingId,
  listingTitle,
}: {
  listingId: string
  listingTitle: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">
        <MessageSquare className="h-4 w-4 mr-2" />
        {L.contactButton}
      </Button>
      <ContactModal
        listingId={listingId}
        listingTitle={listingTitle}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

function SimilarSection({ listingId }: { listingId: string }) {
  const { data = [], isLoading } = trpc.listing.similar.useQuery({ id: listingId })

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return null
  }

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">
        Propiedades similares
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => {
          const addr = item.address as { neighborhood?: string; city?: string } | null
          const op =
            OPERATION_TYPE_LABELS[item.operationType as OperationType] ??
            item.operationType
          const cur = item.priceCurrency as Currency
          return (
            <Link
              key={item.id}
              href={`/propiedad/${item.id}`}
              className="flex gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-secondary"
            >
              <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-md bg-surface-secondary">
                <Image
                  src={
                    item.primaryImageUrl ||
                    'https://placehold.co/400x300/e0ddd8/666660?text=Propiedad'
                  }
                  alt={item.title}
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text-tertiary">{op}</p>
                <p className="font-semibold text-text-primary line-clamp-2">
                  {item.title}
                </p>
                <p className="mt-1 text-sm font-medium text-brand-primary">
                  {formatPrice(item.priceAmount, cur)}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {addr?.neighborhood ?? '—'}, {addr?.city ?? '—'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

function CommercialSubSummary({
  commercialSub,
}: {
  commercialSub: ListingCommercialSub | null | undefined
}) {
  if (!commercialSub) return null

  const label = commercialSub.label ?? commercialSub.variant
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Subrubro</h3>
      <Badge variant="secondary">{label}</Badge>
    </div>
  )
}

export default function PropiedadPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const { data, isLoading } = trpc.listing.getById.useQuery(
    { id: typeof id === 'string' ? id : ('' as string) },
    { enabled: typeof id === 'string' && id.length > 0 }
  )

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-8 w-2/3 mb-4" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-3/4" />
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="p-6 space-y-4">
          <h1 className="text-2xl font-bold">Propiedad no encontrada</h1>
          <p className="text-text-secondary">
            Puede que el aviso ya no esté activo o el ID sea inválido.
          </p>
          <Button asChild>
            <Link href="/">Volver</Link>
          </Button>
        </Card>
      </div>
    )
  }

  type ListingDetails = {
    id: string
    title: string
    description: string
    operationType: OperationType
    propertyType: PropertyType
    priceAmount: number
    priceCurrency: Currency
    source: string
    publishedAt: Date | string | null
    expiresAt: Date | string | null
    qualityScore: number | null
    mediaCount: number
    primaryImageUrl: string | null
    address?: { neighborhood?: string; city?: string } | null
    surfaceTotal: number
    bedrooms: number | null
    bathrooms: number | null
    hideExactAddress?: boolean | null
    locationLat?: number | null
    locationLng?: number | null
    features?: {
      field?: ListingField | null
      commercialSub?: ListingCommercialSub | null
    } | null
    media?: ListingMedia[]
  }

  // TRPC + JSONB puede tipar `{}`. Convertimos a un shape “de UI”.
  const listing = data as unknown as ListingDetails

  const addressNeighborhood = listing.address?.neighborhood ?? '—'
  const addressCity = listing.address?.city ?? '—'
  const priceCurrency = listing.priceCurrency as Currency

  const features = listing.features ?? {}
  const field = features.field
  const commercialSub = features.commercialSub

  const images: ListingMedia[] = Array.isArray(listing.media)
    ? listing.media
        .filter((m) => m.type === 'image')
        .sort((a, b) => {
          const ap = Boolean(a.isPrimary)
          const bp = Boolean(b.isPrimary)
          if (ap !== bp) return ap ? -1 : 1
          return a.order - b.order
        })
    : []

  const mainImage = images[0]

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            {listing.title}
          </h1>
          <p className="mt-2 text-text-secondary">
            {addressNeighborhood}, {addressCity}
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-brand-primary">
            {formatPrice(listing.priceAmount, priceCurrency)}
          </div>
          <div className="mt-2">
            <Badge variant="outline">
              {OPERATION_TYPE_LABELS[listing.operationType] ?? listing.operationType}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            {images.length ? (
              <div className="space-y-3">
                <div className="relative h-[420px] w-full rounded overflow-hidden bg-surface-secondary">
                  <Image
                    src={mainImage?.url ?? ''}
                    alt={mainImage?.alt ?? listing.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                {images.length > 1 ? (
                  <div className="flex gap-3 overflow-x-auto">
                    {images.slice(1, 6).map((img, idx) => (
                      <div
                        key={img.id ?? idx}
                        className="relative h-20 w-20 rounded overflow-hidden bg-surface-secondary flex-none"
                      >
                        <Image
                          src={img.url}
                          alt={img.alt ?? listing.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="h-64 rounded bg-surface-secondary" />
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Descripción</h2>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {listing.description}
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          <ListingTrustPanel listing={listing} />

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{L.sidebarTitle}</h2>
            <p className="text-sm text-text-secondary">{L.sidebarLead}</p>
            <p className="text-xs text-text-tertiary leading-relaxed">{L.trustNote}</p>
            <ContactButton
              listingId={listing.id}
              listingTitle={listing.title}
            />
            <AddToCompareButton listingId={listing.id} />
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Datos</h2>
            <div className="space-y-2 text-sm">
              <p>
                Superficie: {formatSurface(listing.surfaceTotal)}
              </p>
              {listing.bedrooms !== null ? <p>Dormitorios: {listing.bedrooms}</p> : null}
              {listing.bathrooms !== null ? (
                <p>Baños: {listing.bathrooms}</p>
              ) : null}
            </div>
          </Card>

          {listing.hideExactAddress !== true &&
          listing.locationLat != null &&
          listing.locationLng != null &&
          !Number.isNaN(listing.locationLat) &&
          !Number.isNaN(listing.locationLng) ? (
            <Card className="p-6 space-y-3">
              <h2 className="text-lg font-semibold">Ubicación</h2>
              <p className="text-xs text-text-secondary">
                Referencia en mapa (OpenStreetMap).
              </p>
              <PropertyLocationMap
                lat={listing.locationLat}
                lng={listing.locationLng}
                title={`Ubicación: ${listing.title}`}
              />
            </Card>
          ) : null}

          {listing.propertyType === 'land' ? (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Campo</h2>
              <FieldSummary field={field} />
              {!field ? (
                <p className="text-sm text-text-secondary">
                  Aún no hay variante rural cargada.
                </p>
              ) : null}
            </Card>
          ) : null}

          {(listing.propertyType === 'commercial' ||
            listing.propertyType === 'office') && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Comercial</h2>
              <CommercialSubSummary commercialSub={commercialSub} />
              {!commercialSub ? (
                <p className="text-sm text-text-secondary">
                  Aún no hay subrubro configurado.
                </p>
              ) : null}
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ListingRelatedSearches
            operationType={listing.operationType}
            propertyType={listing.propertyType}
            city={addressCity !== '—' ? addressCity : null}
            neighborhood={
              addressNeighborhood !== '—' ? addressNeighborhood : null
            }
          />
        </div>
        <div className="lg:col-span-2">
          <SimilarSection listingId={listing.id} />
        </div>
      </div>
    </div>
  )
}

