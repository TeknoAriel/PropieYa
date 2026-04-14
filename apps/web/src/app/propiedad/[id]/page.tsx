'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { Badge, Button, Calendar, Card, MessageSquare, Skeleton } from '@propieya/ui'

import { AddToCompareButton } from '@/components/compare/add-to-compare-button'
import { ContactModal } from '@/components/contact-modal'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { ListingAmenitiesGrid } from '@/components/property/listing-amenities-grid'
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

function SimilarSection({ listingId }: { listingId: string }) {
  const { data = [], isLoading } = trpc.listing.similar.useQuery({ id: listingId })
  const recordSearchResultClick =
    trpc.listing.recordSearchResultClick.useMutation()

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
        {data.map((item, index) => {
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
              onClick={() => {
                recordSearchResultClick.mutate({
                  listingId: item.id,
                  from: 'similar',
                  position: index,
                })
              }}
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
  const viewRecordedRef = useRef(false)
  const [contactOpen, setContactOpen] = useState(false)

  const { data, isLoading } = trpc.listing.getById.useQuery(
    { id: typeof id === 'string' ? id : ('' as string) },
    { enabled: typeof id === 'string' && id.length > 0 }
  )

  const { mutate: recordPublicViewMutate } =
    trpc.listing.recordPublicView.useMutation()
  const { mutate: recordContactCtaMutate } =
    trpc.listing.recordContactCtaClick.useMutation()

  const openContactFlow = () => {
    if (typeof id !== 'string' || !id) return
    recordContactCtaMutate({ listingId: id })
    setContactOpen(true)
  }

  useEffect(() => {
    viewRecordedRef.current = false
  }, [id])

  useEffect(() => {
    if (typeof id !== 'string' || !id || !data?.id || viewRecordedRef.current) {
      return
    }
    viewRecordedRef.current = true
    recordPublicViewMutate({ listingId: id })
  }, [id, data?.id, recordPublicViewMutate])


  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10">
          <Skeleton className="mb-4 h-8 w-2/3" />
          <Card className="space-y-4 p-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10">
          <Card className="space-y-4 p-6">
            <h1 className="text-2xl font-bold text-text-primary">Propiedad no encontrada</h1>
            <p className="text-text-secondary">
              Puede que el aviso ya no esté activo o el ID sea inválido.
            </p>
            <Button asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </Card>
        </main>
        <Footer />
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
    externalId?: string | null
    showPrice?: boolean
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
      amenities?: string[]
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
  const featureRecord = features as {
    amenities?: unknown
  }
  const amenityIds = Array.isArray(featureRecord.amenities)
    ? featureRecord.amenities.filter((x): x is string => typeof x === 'string')
    : []

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
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="flex-1 pb-28 lg:pb-10">
        <section className="border-b border-border/50 bg-surface-secondary/30">
          <div className="container mx-auto px-4 py-6 lg:py-8">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface-primary shadow-sm">
              {images.length ? (
                <div className="space-y-0">
                  <div className="relative aspect-[16/10] w-full max-h-[min(72vh,560px)] min-h-[220px] bg-surface-secondary sm:aspect-[21/9]">
                    <Image
                      src={mainImage?.url ?? ''}
                      alt={mainImage?.alt ?? listing.title}
                      fill
                      priority
                      sizes="100vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  {images.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto border-t border-border/40 bg-surface-primary px-3 py-3">
                      {images.slice(1, 8).map((img, idx) => (
                        <div
                          key={img.id ?? idx}
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-surface-secondary sm:h-20 sm:w-20"
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
                <div className="aspect-[16/10] min-h-[200px] bg-surface-secondary" />
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto space-y-8 px-4 py-8">
          <Card className="rounded-xl border border-border/70 p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <Badge variant="outline" className="w-fit font-normal">
                  {OPERATION_TYPE_LABELS[listing.operationType] ??
                    listing.operationType}
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
                  {listing.title}
                </h1>
                <p className="text-base text-text-secondary md:text-lg">
                  {addressNeighborhood}, {addressCity}
                </p>
              </div>
              <div className="shrink-0">
                <p className="text-3xl font-bold text-brand-primary md:text-4xl">
                  {formatPrice(listing.priceAmount, priceCurrency)}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-6 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Superficie</dt>
                <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                  {formatSurface(listing.surfaceTotal)}
                </dd>
              </div>
              {listing.bedrooms !== null ? (
                <div>
                  <dt className="text-xs font-medium text-text-tertiary">Dormitorios</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                    {listing.bedrooms}
                  </dd>
                </div>
              ) : null}
              {listing.bathrooms !== null ? (
                <div>
                  <dt className="text-xs font-medium text-text-tertiary">Baños</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                    {listing.bathrooms}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Publicación</dt>
                <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                  {listing.publishedAt
                    ? new Date(listing.publishedAt).toLocaleDateString('es-AR')
                    : '—'}
                </dd>
              </div>
            </dl>
          </Card>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="rounded-xl border border-border/70 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text-primary">Descripción</h2>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                  {listing.description}
                </p>
              </Card>

              {amenityIds.length > 0 ? (
                <Card className="rounded-xl border border-border/70 p-6 shadow-sm">
                  <ListingAmenitiesGrid amenityIds={amenityIds} />
                </Card>
              ) : null}

              {listing.propertyType === 'land' ? (
                <Card className="rounded-xl border border-border/70 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-text-primary">Campo</h2>
                  <div className="mt-3">
                    <FieldSummary field={field} />
                    {!field ? (
                      <p className="text-sm text-text-secondary">
                        Aún no hay variante rural cargada.
                      </p>
                    ) : null}
                  </div>
                </Card>
              ) : null}

              {(listing.propertyType === 'commercial' ||
                listing.propertyType === 'office') && (
                <Card className="rounded-xl border border-border/70 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-text-primary">Comercial</h2>
                  <div className="mt-3">
                    <CommercialSubSummary commercialSub={commercialSub} />
                    {!commercialSub ? (
                      <p className="text-sm text-text-secondary">
                        Aún no hay subrubro configurado.
                      </p>
                    ) : null}
                  </div>
                </Card>
              )}
            </div>

            <aside className="space-y-4 lg:col-span-1">
              <div className="hidden lg:block">
                <ListingTrustPanel listing={listing} />
              </div>

              <Card className="rounded-xl border border-border/70 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text-primary">{L.sidebarTitle}</h2>
                <p className="mt-2 text-sm text-text-secondary">{L.sidebarLead}</p>
                <p className="mt-2 text-xs leading-relaxed text-text-tertiary">{L.trustNote}</p>
                <div className="mt-4 space-y-2">
                  <Button className="w-full" onClick={openContactFlow}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {L.contactButton}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    type="button"
                    onClick={openContactFlow}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Agendar visita
                  </Button>
                  <AddToCompareButton listingId={listing.id} />
                </div>
              </Card>

              <Card className="rounded-xl border border-border/70 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text-primary">Datos</h2>
                <div className="mt-3 space-y-2 text-sm text-text-secondary">
                  <p>Superficie: {formatSurface(listing.surfaceTotal)}</p>
                  {listing.bedrooms !== null ? <p>Dormitorios: {listing.bedrooms}</p> : null}
                  {listing.bathrooms !== null ? <p>Baños: {listing.bathrooms}</p> : null}
                </div>
              </Card>

              {listing.hideExactAddress !== true &&
              listing.locationLat != null &&
              listing.locationLng != null &&
              !Number.isNaN(listing.locationLat) &&
              !Number.isNaN(listing.locationLng) ? (
                <Card className="rounded-xl border border-border/70 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-text-primary">Ubicación</h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    Referencia en mapa (OpenStreetMap).
                  </p>
                  <div className="mt-3 overflow-hidden rounded-lg border border-border/40">
                    <PropertyLocationMap
                      lat={listing.locationLat}
                      lng={listing.locationLng}
                      title={`Ubicación: ${listing.title}`}
                    />
                  </div>
                </Card>
              ) : null}
            </aside>
          </div>

          <div className="lg:hidden">
            <ListingTrustPanel listing={listing} />
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
                showPrice={listing.showPrice}
                priceAmount={listing.priceAmount}
              />
            </div>
            <div className="lg:col-span-2">
              <SimilarSection listingId={listing.id} />
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-surface-primary/95 p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden">
        <Button className="min-h-11 flex-1" type="button" onClick={openContactFlow}>
          {L.contactButton}
        </Button>
        <Button
          variant="outline"
          className="min-h-11 flex-1"
          type="button"
          onClick={openContactFlow}
        >
          Visita
        </Button>
      </div>

      <ContactModal
        listingId={listing.id}
        listingTitle={listing.title}
        open={contactOpen}
        onOpenChange={setContactOpen}
      />

      <Footer />
    </div>
  )
}

