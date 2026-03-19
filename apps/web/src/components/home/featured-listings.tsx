'use client'

import Link from 'next/link'

import { Button, Card, Badge, Skeleton, ArrowRight } from '@propieya/ui'
import { formatPrice } from '@propieya/shared'

// Mock data for now
const MOCK_LISTINGS = [
  {
    id: '1',
    title: 'Departamento 3 amb con balcón en Palermo',
    propertyType: 'apartment',
    operationType: 'sale',
    price: { amount: 185000, currency: 'USD' as const },
    surface: { total: 75, covered: 70 },
    rooms: { bedrooms: 2, bathrooms: 1 },
    address: { neighborhood: 'Palermo', city: 'Buenos Aires' },
    primaryImageUrl: 'https://placehold.co/600x400/e0ddd8/666660?text=Depto+Palermo',
  },
  {
    id: '2',
    title: 'Casa con jardín en Olivos',
    propertyType: 'house',
    operationType: 'sale',
    price: { amount: 320000, currency: 'USD' as const },
    surface: { total: 180, covered: 150 },
    rooms: { bedrooms: 4, bathrooms: 3 },
    address: { neighborhood: 'Olivos', city: 'Vicente López' },
    primaryImageUrl: 'https://placehold.co/600x400/e0ddd8/666660?text=Casa+Olivos',
  },
  {
    id: '3',
    title: 'Monoambiente moderno en Belgrano',
    propertyType: 'apartment',
    operationType: 'rent',
    price: { amount: 450000, currency: 'ARS' as const },
    surface: { total: 35, covered: 35 },
    rooms: { bedrooms: 0, bathrooms: 1 },
    address: { neighborhood: 'Belgrano', city: 'Buenos Aires' },
    primaryImageUrl: 'https://placehold.co/600x400/e0ddd8/666660?text=Mono+Belgrano',
  },
]

export function FeaturedListings() {
  // const { data: listings, isLoading } = trpc.listing.getFeatured.useQuery({ limit: 6 })
  const listings = MOCK_LISTINGS
  const isLoading = false

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
              Propiedades destacadas
            </h2>
            <p className="mt-2 text-text-secondary">
              Las últimas publicaciones de nuestra plataforma
            </p>
          </div>
          <Button variant="outline" asChild className="hidden md:flex">
            <Link href="/buscar">
              Ver todas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        <div className="mt-8 text-center md:hidden">
          <Button variant="outline" asChild>
            <Link href="/buscar">
              Ver todas las propiedades
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function ListingCard({ listing }: { listing: typeof MOCK_LISTINGS[0] }) {
  const operationLabel = listing.operationType === 'sale' ? 'Venta' : 'Alquiler'

  return (
    <Link href={`/propiedad/${listing.id}`}>
      <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-surface-secondary">
          <img
            src={listing.primaryImageUrl || ''}
            alt={listing.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <Badge className="absolute top-3 left-3" variant="secondary">
            {operationLabel}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="text-xl font-bold text-brand-primary">
            {formatPrice(listing.price.amount, listing.price.currency)}
          </div>

          <h3 className="mt-2 font-medium text-text-primary line-clamp-2">
            {listing.title}
          </h3>

          <p className="mt-1 text-sm text-text-secondary">
            {listing.address.neighborhood}, {listing.address.city}
          </p>

          <div className="mt-3 flex items-center gap-4 text-sm text-text-tertiary">
            <span>{listing.surface.total} m²</span>
            {listing.rooms.bedrooms !== null && listing.rooms.bedrooms > 0 && (
              <span>{listing.rooms.bedrooms} dorm.</span>
            )}
            {listing.rooms.bathrooms !== null && (
              <span>{listing.rooms.bathrooms} baño{listing.rooms.bathrooms > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
