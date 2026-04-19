'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { ListingSearchFlowBanner } from '@/components/property/listing-search-flow-banner'
import { ListingSearchPostBanner } from '@/components/property/listing-search-post-banner'
import { PropertyLocationMap } from '@/components/property/property-location-map'
import {
  formatPrice,
  OPERATION_TYPE_LABELS,
  PORTAL_LISTING_UX_COPY as L,
  PORTAL_SEARCH_UX_COPY as S,
  PROPERTY_TYPE_LABELS,
} from '@propieya/shared'
import type {
  Currency,
  ListingCommercialSub,
  ListingField,
  ListingMedia,
  OperationType,
  PropertyType,
} from '@propieya/shared'

import { bumpListingFichaEngagement } from '@/lib/listing-ficha-engagement'
import { trpc } from '@/lib/trpc'
import { useListingFlowReturn } from '@/lib/use-listing-flow-return'

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

function SimilarSection({
  listingId,
  basePriceAmount,
  baseSurfaceTotal,
  baseNeighborhood,
}: {
  listingId: string
  basePriceAmount: number
  baseSurfaceTotal: number
  baseNeighborhood: string
}) {
  const { returnToQuery } = useListingFlowReturn(listingId)

  const { data = [], isLoading } = trpc.listing.similar.useQuery({ id: listingId })
  const recordSearchResultClick =
    trpc.listing.recordSearchResultClick.useMutation()

  if (isLoading) {
    return (
      <Card className="space-y-4 rounded-xl border border-border/45 p-6 shadow-none">
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

  const baseNb = baseNeighborhood.trim().toLowerCase()
  const tierCardClass =
    'border-border/45 bg-surface-primary hover:border-border/70'

  return (
    <section
      id="lista-similares"
      aria-labelledby="listing-similares-heading"
      className="scroll-mt-28"
    >
      <Card className="space-y-3 rounded-xl border border-border/45 p-4 shadow-none transition-shadow duration-300 md:space-y-4 md:p-5">
        <div className="space-y-1.5 border-b border-border/30 pb-3 md:pb-4">
          <h2
            id="listing-similares-heading"
            className="text-lg font-semibold text-text-primary"
          >
            {L.listingSimilarSectionTitle}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {L.listingSimilarSectionLead}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item, index) => {
            const addr = item.address as { neighborhood?: string; city?: string } | null
            const op =
              OPERATION_TYPE_LABELS[item.operationType as OperationType] ??
              item.operationType
            const tipo =
              PROPERTY_TYPE_LABELS[item.propertyType as PropertyType] ??
              item.propertyType
            const cur = item.priceCurrency as Currency
            const nb = addr?.neighborhood?.trim()
            const cy = addr?.city?.trim()
            const locLine =
              nb && cy ? `${nb} · ${cy}` : cy || nb || '—'
            const roomsLabel =
              item.bedrooms === null || item.bedrooms === 0
                ? 'Monoambiente'
                : `${item.bedrooms} dorm.`
            const bathBit =
              item.bathrooms !== null && item.bathrooms > 0
                ? ` · ${item.bathrooms} baño${item.bathrooms > 1 ? 's' : ''}`
                : ''

            const itemNb = (nb ?? '').toLowerCase()
            const similarTags: string[] = []
            if (baseNb.length > 0 && itemNb === baseNb) {
              similarTags.push(L.similarTagBetterLocation)
            }
            if (item.priceAmount < basePriceAmount) {
              similarTags.push(L.similarTagCheaper)
            }
            if (item.surfaceTotal > baseSurfaceTotal) {
              similarTags.push(L.similarTagLargerSurface)
            }
            if (index === 0) {
              similarTags.push(L.similarTagNew)
            }
            const similarTagsUi = similarTags.slice(0, 2)

            return (
              <Link
                key={item.id}
                href={`/propiedad/${item.id}${returnToQuery}`}
                prefetch
                className="block"
                onClick={() => {
                  recordSearchResultClick.mutate({
                    listingId: item.id,
                    from: 'similar',
                    position: index,
                  })
                }}
              >
                <Card
                  className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${tierCardClass} active:scale-[0.985]`}
                >
                  <div className="relative h-36 shrink-0 overflow-hidden bg-surface-secondary md:h-40">
                    <Image
                      src={
                        item.primaryImageUrl ||
                        'https://placehold.co/600x400/e0ddd8/666660?text=Propiedad'
                      }
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-opacity duration-200 group-hover:opacity-[0.96]"
                      unoptimized
                    />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3 md:gap-2 md:p-3.5">
                    {similarTagsUi.length > 0 ? (
                      <ul
                        className="flex flex-wrap gap-x-2 gap-y-1"
                        aria-label="Relación con la propiedad que estás viendo"
                      >
                        {similarTagsUi.map((t, ti) => (
                          <li
                            key={`${item.id}-${ti}-${t}`}
                            className="max-w-full truncate rounded-md bg-surface-secondary/50 px-2 py-0.5 text-[11px] font-medium leading-tight text-text-secondary md:text-xs"
                          >
                            {t}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="text-xl font-semibold tabular-nums tracking-tight text-text-primary md:text-2xl">
                      {formatPrice(item.priceAmount, cur)}
                    </p>
                    <p className="text-sm font-medium leading-snug text-text-secondary">
                      {locLine}
                    </p>
                    <p className="text-sm leading-snug text-text-primary">
                      <span className="text-text-tertiary">{op}</span>
                      <span className="text-text-tertiary"> · </span>
                      <span>{tipo}</span>
                      <span className="text-text-tertiary"> · </span>
                      <span>{item.surfaceTotal} m²</span>
                      <span className="text-text-tertiary"> · </span>
                      <span>
                        {roomsLabel}
                        {bathBit}
                      </span>
                    </p>
                    <p className="text-sm font-medium leading-snug text-text-primary line-clamp-2">
                      {item.title}
                    </p>
                    <div className="mt-auto pt-2">
                      <span className="text-sm font-medium text-brand-primary">
                        {S.listingCardCta}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </Card>
    </section>
  )
}

type ContactSurface =
  | 'sidebar_primary'
  | 'sidebar_secondary'
  | 'sticky_primary'
  | 'sticky_secondary'
  | 'smart_suggestion'

function ContactConversionBanner({
  reason,
  onContact,
}: {
  reason: 'views' | 'return_visit' | 'compare_saved'
  onContact: () => void
}) {
  const body =
    reason === 'compare_saved'
      ? L.contactSmartBodyCompare
      : reason === 'return_visit'
        ? L.contactSmartBodyReturn
        : L.contactSmartBodyViews

  return (
    <Card className="rounded-xl border border-brand-primary/30 bg-gradient-to-br from-brand-primary/[0.07] via-brand-primary/[0.03] to-transparent p-5 shadow-none md:p-6">
      <h2 className="text-lg font-semibold text-text-primary md:text-xl">
        {L.contactSmartTitle}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary md:text-base">
        {body}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="lg"
          className="text-base font-semibold transition-transform active:scale-[0.985]"
          onClick={onContact}
        >
          {L.contactPrimaryCta}
        </Button>
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
  const engagementBumpRef = useRef(false)
  const contactPromptLoggedKeyRef = useRef<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [fichaEngagement, setFichaEngagement] = useState<{
    visitCount: number
    isReturnVisit: boolean
  } | null>(null)
  const [compareJustAdded, setCompareJustAdded] = useState(false)

  const { data, isLoading } = trpc.listing.getById.useQuery(
    { id: typeof id === 'string' ? id : ('' as string) },
    { enabled: typeof id === 'string' && id.length > 0 }
  )

  const { mutate: recordPublicViewMutate } =
    trpc.listing.recordPublicView.useMutation()
  const { mutate: recordContactCtaMutate } =
    trpc.listing.recordContactCtaClick.useMutation()
  const { mutate: recordContactPromptShownMutate } =
    trpc.listing.recordContactPromptShown.useMutation()

  const openContactFlow = (surface: ContactSurface) => {
    if (typeof id !== 'string' || !id) return
    recordContactCtaMutate({ listingId: id, surface })
    setContactOpen(true)
  }

  useEffect(() => {
    viewRecordedRef.current = false
    engagementBumpRef.current = false
    contactPromptLoggedKeyRef.current = null
    setCompareJustAdded(false)
    setFichaEngagement(null)
  }, [id])

  useEffect(() => {
    if (typeof id !== 'string' || !id || !data?.id || viewRecordedRef.current) {
      return
    }
    viewRecordedRef.current = true
    recordPublicViewMutate({ listingId: id })
  }, [id, data?.id, recordPublicViewMutate])

  useEffect(() => {
    if (typeof id !== 'string' || !id || !data?.id || engagementBumpRef.current) {
      return
    }
    engagementBumpRef.current = true
    setFichaEngagement(bumpListingFichaEngagement(id))
  }, [id, data?.id])

  const suggestionReason = useMemo(() => {
    if (compareJustAdded) return 'compare_saved' as const
    if (!fichaEngagement) return null
    if (fichaEngagement.isReturnVisit) return 'return_visit' as const
    if (fichaEngagement.visitCount >= 2) return 'views' as const
    return null
  }, [compareJustAdded, fichaEngagement])

  const showContactSuggestion = suggestionReason !== null

  useEffect(() => {
    if (typeof id !== 'string' || !id || !suggestionReason) return
    const key = `${id}:${suggestionReason}`
    if (contactPromptLoggedKeyRef.current === key) return
    contactPromptLoggedKeyRef.current = key
    recordContactPromptShownMutate({ listingId: id, reason: suggestionReason })
  }, [id, suggestionReason, recordContactPromptShownMutate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10">
          <Skeleton className="mb-4 h-8 w-2/3" />
          <Card className="space-y-4 rounded-xl border border-border/45 p-6 shadow-none">
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

  const operationLabel =
    OPERATION_TYPE_LABELS[listing.operationType] ?? listing.operationType
  const tipoLabel =
    PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType
  const nbTrim =
    addressNeighborhood !== '—' ? addressNeighborhood.trim() : ''
  const cyTrim = addressCity !== '—' ? addressCity.trim() : ''
  const locationLine =
    nbTrim && cyTrim ? `${nbTrim} · ${cyTrim}` : cyTrim || nbTrim || '—'
  const roomsLabel =
    listing.bedrooms === null || listing.bedrooms === 0
      ? 'Monoambiente'
      : `${listing.bedrooms} dorm.`
  const bathBit =
    listing.bathrooms !== null && listing.bathrooms > 0
      ? ` · ${listing.bathrooms} baño${listing.bathrooms > 1 ? 's' : ''}`
      : ''

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
      <ListingSearchFlowBanner
        listingId={listing.id}
        listingTitle={listing.title}
        fallbackCurrency={priceCurrency}
      />
      <ListingSearchPostBanner
        listingId={listing.id}
        listing={{
          operationType: listing.operationType,
          propertyType: listing.propertyType,
          priceAmount: listing.priceAmount,
          bedrooms: listing.bedrooms,
          surfaceTotal: listing.surfaceTotal,
          neighborhood: addressNeighborhood,
          city: addressCity,
          amenityIds,
        }}
      />
      <main className="flex-1 pb-36 lg:pb-10 transition-opacity duration-300 ease-out">
        <section className="border-b border-border/50 bg-surface-secondary/30">
          <div className="container mx-auto px-4 py-4 lg:py-6">
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

        <div className="container mx-auto space-y-5 px-4 py-5 md:space-y-6 md:py-6">
          {showContactSuggestion && suggestionReason ? (
            <ContactConversionBanner
              reason={suggestionReason}
              onContact={() => openContactFlow('smart_suggestion')}
            />
          ) : null}
          <Card className="rounded-xl border border-border/45 p-5 shadow-none md:p-6">
            <div className="space-y-3 md:space-y-4">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-text-primary md:text-4xl">
                {formatPrice(listing.priceAmount, priceCurrency)}
              </p>
              <p className="text-base font-medium leading-snug text-text-secondary md:text-lg">
                {locationLine}
              </p>
              <p className="text-sm leading-snug text-text-primary md:text-base">
                <span className="text-text-tertiary">{operationLabel}</span>
                <span className="text-text-tertiary"> · </span>
                <span>{tipoLabel}</span>
                <span className="text-text-tertiary"> · </span>
                <span>{listing.surfaceTotal} m²</span>
                <span className="text-text-tertiary"> · </span>
                <span>
                  {roomsLabel}
                  {bathBit}
                </span>
              </p>
              <h1 className="text-lg font-semibold leading-snug text-text-primary line-clamp-3 md:text-xl">
                {listing.title}
              </h1>
            </div>
          </Card>

          <div className="lg:hidden">
            <ListingTrustPanel listing={listing} />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="rounded-xl border border-border/45 p-6 shadow-none">
                <h2 className="text-lg font-semibold text-text-primary">Descripción</h2>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                  {listing.description}
                </p>
              </Card>

              {amenityIds.length > 0 ? (
                <Card className="rounded-xl border border-border/45 p-6 shadow-none">
                  <ListingAmenitiesGrid amenityIds={amenityIds} />
                </Card>
              ) : null}

              {listing.propertyType === 'land' ? (
                <Card className="rounded-xl border border-border/45 p-6 shadow-none">
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
                <Card className="rounded-xl border border-border/45 p-6 shadow-none">
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
              <Card
                id="ficha-contacto"
                className="scroll-mt-28 overflow-hidden rounded-xl border border-border/45 shadow-none ring-1 ring-brand-primary/10"
              >
                <div className="border-b border-border/40 bg-gradient-to-br from-brand-primary/[0.07] to-transparent px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
                    {L.listingContactEyebrow}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-text-primary">{L.sidebarTitle}</h2>
                </div>
                <div className="space-y-3 p-5">
                  <p className="text-sm leading-relaxed text-text-secondary">{L.sidebarLead}</p>
                  <p
                    className="text-xs leading-relaxed text-text-secondary border-l-2 border-brand-primary/35 pl-2.5"
                    role="note"
                  >
                    {listing.source === 'import'
                      ? L.listingContactListingOriginImport
                      : L.listingContactListingOriginManual}
                  </p>
                  <p className="text-xs leading-relaxed text-text-tertiary">{L.trustNote}</p>
                  <div className="space-y-2.5 pt-1">
                    <Button
                      size="lg"
                      className="w-full text-base font-semibold transition-transform active:scale-[0.985]"
                      onClick={() => openContactFlow('sidebar_primary')}
                    >
                      <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                      {L.contactPrimaryCta}
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full font-medium transition-transform active:scale-[0.985]"
                      type="button"
                      onClick={() => openContactFlow('sidebar_secondary')}
                    >
                      <Calendar className="mr-2 h-4 w-4 shrink-0" />
                      {L.contactScheduleCta}
                    </Button>
                  </div>
                  <div className="border-t border-border/40 pt-4">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                      {L.listingContactCompareSectionLabel}
                    </p>
                    <div className="mt-2 max-w-full">
                      <AddToCompareButton
                        listingId={listing.id}
                        onCompareAdded={() => setCompareJustAdded(true)}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <div className="hidden lg:block">
                <ListingTrustPanel listing={listing} />
              </div>

              {listing.hideExactAddress !== true &&
              listing.locationLat != null &&
              listing.locationLng != null &&
              !Number.isNaN(listing.locationLat) &&
              !Number.isNaN(listing.locationLng) ? (
                <Card className="rounded-xl border border-border/45 p-6 shadow-none">
                  <h2 className="text-lg font-semibold text-text-primary">Ubicación</h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    {L.listingLocationMapHint}
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
              <SimilarSection
                listingId={listing.id}
                basePriceAmount={listing.priceAmount}
                baseSurfaceTotal={listing.surfaceTotal}
                baseNeighborhood={nbTrim}
              />
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-[rgba(255,252,245,0.7)] p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md dark:bg-[rgba(30,30,32,0.78)] lg:hidden">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <p className="text-center text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
            {L.listingContactEyebrow}
          </p>
          <Button
            size="lg"
            className="min-h-12 w-full text-base font-semibold transition-transform active:scale-[0.985]"
            type="button"
            onClick={() => openContactFlow('sticky_primary')}
          >
            {L.contactPrimaryCta}
          </Button>
          <div className="flex items-stretch gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-10 min-w-0 flex-1 text-xs font-medium transition-transform active:scale-[0.985]"
              type="button"
              onClick={() => openContactFlow('sticky_secondary')}
            >
              {L.contactScheduleCta}
            </Button>
            <div className="flex shrink-0 flex-col items-stretch justify-center">
              <AddToCompareButton
                listingId={listing.id}
                compact
                onCompareAdded={() => setCompareJustAdded(true)}
              />
            </div>
          </div>
        </div>
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

