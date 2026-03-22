'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { Badge, Button, Card, MessageSquare, Skeleton } from '@propieya/ui'

import { ContactModal } from '@/components/contact-modal'
import { formatPrice, formatSurface } from '@propieya/shared'
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
        Contactar
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
    address?: { neighborhood?: string; city?: string } | null
    surfaceTotal: number
    bedrooms: number | null
    bathrooms: number | null
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
              {listing.operationType === 'sale' ? 'Venta' : 'Alquiler'}
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
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">¿Te interesa?</h2>
            <p className="text-sm text-text-secondary">
              Consultá por esta propiedad y te responderán a la brevedad.
            </p>
            <ContactButton
              listingId={listing.id}
              listingTitle={listing.title}
            />
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
    </div>
  )
}

