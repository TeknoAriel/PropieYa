'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'

import { Badge, Button, Card, Input, Skeleton } from '@propieya/ui'
import { formatPrice, OPERATION_TYPE_LABELS } from '@propieya/shared'
import type { Currency, OperationType, PropertyType } from '@propieya/shared'

import { trpc } from '@/lib/trpc'

type BuscarListingCardData = {
  id: string
  title: string
  operationType: OperationType
  propertyType: PropertyType
  priceAmount: number
  priceCurrency: Currency
  address?: { neighborhood?: string; city?: string } | null
  surfaceTotal: number
  bedrooms: number | null
  bathrooms: number | null
  primaryImageUrl: string | null
}

function ListingCard({ listing }: { listing: BuscarListingCardData }) {
  const operationLabel = OPERATION_TYPE_LABELS[listing.operationType] ?? listing.operationType
  const neighborhood = listing.address?.neighborhood ?? '—'
  const city = listing.address?.city ?? '—'

  return (
    <Link href={`/propiedad/${listing.id}`}>
      <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
        <div className="relative h-48 overflow-hidden bg-surface-secondary">
          <Image
            src={
              listing.primaryImageUrl ||
              'https://placehold.co/600x400/e0ddd8/666660?text=Propiedad'
            }
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
          <Badge className="absolute top-3 left-3" variant="secondary">
            {operationLabel}
          </Badge>
        </div>

        <div className="p-4">
          <div className="text-xl font-bold text-brand-primary">
            {formatPrice(listing.priceAmount, listing.priceCurrency as Currency)}
          </div>

          <h3 className="mt-2 font-medium text-text-primary line-clamp-2">
            {listing.title}
          </h3>

          <p className="mt-1 text-sm text-text-secondary">
            {neighborhood}, {city}
          </p>

          <div className="mt-3 flex items-center gap-4 text-sm text-text-tertiary">
            <span>{listing.surfaceTotal} m²</span>
            {listing.bedrooms !== null && listing.bedrooms > 0 ? (
              <span>{listing.bedrooms} dorm.</span>
            ) : null}
            {listing.bathrooms !== null ? (
              <span>
                {listing.bathrooms} baño
                {listing.bathrooms > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  )
}

const PROPERTY_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Departamento' },
  { value: 'house', label: 'Casa' },
  { value: 'ph', label: 'PH' },
  { value: 'land', label: 'Terreno' },
  { value: 'office', label: 'Oficina' },
  { value: 'commercial', label: 'Local' },
  { value: 'warehouse', label: 'Galpón' },
  { value: 'parking', label: 'Cochera' },
]

function BuscarContent() {
  const searchParams = useSearchParams()

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [operationType, setOperationType] = useState<
    OperationType | ''
  >((searchParams.get('op') as OperationType) ?? '')
  const [propertyType, setPropertyType] = useState<
    PropertyType | ''
  >((searchParams.get('tipo') as PropertyType) ?? '')
  const [city, setCity] = useState(searchParams.get('ciudad') ?? '')
  const [minPrice, setMinPrice] = useState(searchParams.get('min') ?? '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') ?? '')

  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      operationType: operationType || undefined,
      propertyType: propertyType || undefined,
      city: city.trim() || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      limit: 24,
      offset: 0,
    }),
    [q, operationType, propertyType, city, minPrice, maxPrice]
  )

  const { data: listingsRaw = [], isLoading } =
    trpc.listing.search.useQuery(filters)

  const listings = listingsRaw as unknown as BuscarListingCardData[]

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Buscar propiedades
            </h1>
            <p className="mt-2 text-text-secondary">
              Filtrá por operación, tipo, ciudad y precio.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Palabras clave (título, descripción)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={operationType}
              onChange={(e) =>
                setOperationType(e.target.value as OperationType | '')
              }
            >
              <option value="">Todas las operaciones</option>
              <option value="sale">Venta</option>
              <option value="rent">Alquiler</option>
              <option value="temporary_rent">Alquiler temporal</option>
            </select>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={propertyType}
              onChange={(e) =>
                setPropertyType(e.target.value as PropertyType | '')
              }
            >
              <option value="">Todos los tipos</option>
              {PROPERTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Ciudad"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Precio mín."
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Precio máx."
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
      ) : listings.length === 0 ? (
        <Card className="p-6">
          <p className="text-text-secondary">
            No hay resultados. Probá con otros filtros.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-10">
          <Skeleton className="h-10 w-48" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      }
    >
      <BuscarContent />
    </Suspense>
  )
}
