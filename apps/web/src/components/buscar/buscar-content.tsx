'use client'

import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Badge, Button, Card, Input, Skeleton } from '@propieya/ui'
import type { BuscarMapBBox } from '@/components/buscar/buscar-search-map'

const BuscarSearchMap = dynamic(
  () => import('./buscar-search-map').then((mod) => mod.BuscarSearchMap),
  {
    ssr: false,
    loading: () => <Skeleton className="min-h-[280px] w-full rounded-lg" />,
  }
)
import {
  AMENITY_LABELS,
  formatPrice,
  OPERATION_TYPE_LABELS,
  SEARCH_FILTER_AMENITIES,
} from '@propieya/shared'
import type { Currency, OperationType, PropertyType } from '@propieya/shared'

import { getAccessToken } from '@/lib/auth-storage'
import { trpc } from '@/lib/trpc'

export type BuscarContentProps = {
  /** Si se define, la búsqueda queda filtrada a esa operación (páginas /venta y /alquiler). */
  forcedOperation?: 'sale' | 'rent'
  pageTitle: string
  pageSubtitle: string
}

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
  matchReasons?: string[]
  locationLat?: number | null
  locationLng?: number | null
  location?: { lat?: number; lon?: number }
}

function pinsFromListings(list: BuscarListingCardData[]) {
  const out: { id: string; title: string; lat: number; lng: number }[] = []
  for (const l of list) {
    let lat: number | undefined
    let lng: number | undefined
    if (l.location?.lat != null && l.location?.lon != null) {
      lat = l.location.lat
      lng = l.location.lon
    }
    if (l.locationLat != null && l.locationLng != null) {
      lat = Number(l.locationLat)
      lng = Number(l.locationLng)
    }
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      out.push({ id: l.id, title: l.title, lat, lng })
    }
  }
  return out
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

          {listing.matchReasons && listing.matchReasons.length > 0 ? (
            <div className="mt-3 rounded-md border border-border/60 bg-surface-secondary/80 px-3 py-2 text-xs text-text-secondary">
              <p className="mb-1 font-medium text-text-primary">Por qué coincide</p>
              <ul className="list-inside list-disc space-y-0.5">
                {listing.matchReasons.slice(0, 5).map((r, i) => (
                  <li key={`${listing.id}-reason-${i}`}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
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

export function BuscarContent({
  forcedOperation,
  pageTitle,
  pageSubtitle,
}: BuscarContentProps) {
  const searchParams = useSearchParams()

  const utils = trpc.useUtils()
  const [canAuth, setCanAuth] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [alertSaved, setAlertSaved] = useState(false)

  useEffect(() => {
    setCanAuth(!!getAccessToken())
  }, [])

  const { data: me } = trpc.auth.me.useQuery(undefined, {
    enabled: canAuth,
    retry: false,
  })

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [operationType, setOperationType] = useState<OperationType | ''>(() => {
    if (forcedOperation) return forcedOperation
    return (searchParams.get('op') as OperationType) ?? ''
  })

  useEffect(() => {
    if (forcedOperation) setOperationType(forcedOperation)
  }, [forcedOperation])

  const [propertyType, setPropertyType] = useState<PropertyType | ''>(
    (searchParams.get('tipo') as PropertyType) ?? ''
  )
  const [city, setCity] = useState(searchParams.get('ciudad') ?? '')
  const [neighborhood, setNeighborhood] = useState(searchParams.get('barrio') ?? '')
  const [minPrice, setMinPrice] = useState(searchParams.get('min') ?? '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') ?? '')
  const [minBedrooms, setMinBedrooms] = useState(searchParams.get('dorm') ?? '')
  const [minSurface, setMinSurface] = useState(searchParams.get('sup') ?? '')
  const [maxSurface, setMaxSurface] = useState('')
  const [minBathrooms, setMinBathrooms] = useState('')
  const [minGarages, setMinGarages] = useState('')
  const [floorMin, setFloorMin] = useState('')
  const [floorMax, setFloorMax] = useState('')
  const [escalera, setEscalera] = useState('')
  const [minSurfaceCovered, setMinSurfaceCovered] = useState('')
  const [maxSurfaceCovered, setMaxSurfaceCovered] = useState('')
  const [minTotalRooms, setMinTotalRooms] = useState('')
  const [orientation, setOrientation] = useState<
    '' | 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW'
  >('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mapBbox, setMapBbox] = useState<BuscarMapBBox | null>(null)
  const [showMap, setShowMap] = useState(false)

  const toggleAmenity = (key: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    )
  }

  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      operationType: (forcedOperation ?? operationType) || undefined,
      propertyType: propertyType || undefined,
      city: city.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
      minSurface: minSurface ? Number(minSurface) : undefined,
      maxSurface: maxSurface ? Number(maxSurface) : undefined,
      minBathrooms: minBathrooms ? Number(minBathrooms) : undefined,
      minGarages: minGarages ? Number(minGarages) : undefined,
      floorMin: floorMin ? Number(floorMin) : undefined,
      floorMax: floorMax ? Number(floorMax) : undefined,
      escalera: escalera.trim() || undefined,
      orientation: orientation || undefined,
      minSurfaceCovered: minSurfaceCovered
        ? Number(minSurfaceCovered)
        : undefined,
      maxSurfaceCovered: maxSurfaceCovered
        ? Number(maxSurfaceCovered)
        : undefined,
      minTotalRooms: minTotalRooms ? Number(minTotalRooms) : undefined,
      amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
      bbox: mapBbox ?? undefined,
      limit: 24,
      offset: 0,
    }),
    [
      q,
      forcedOperation,
      operationType,
      propertyType,
      city,
      neighborhood,
      minPrice,
      maxPrice,
      minBedrooms,
      minSurface,
      maxSurface,
      minBathrooms,
      minGarages,
      floorMin,
      floorMax,
      escalera,
      orientation,
      minSurfaceCovered,
      maxSurfaceCovered,
      minTotalRooms,
      selectedAmenities,
      mapBbox,
    ]
  )

  const { data: listingsRaw = [], isLoading, isError, error } =
    trpc.listing.search.useQuery(filters)

  const listings = listingsRaw as unknown as BuscarListingCardData[]

  const mapPins = useMemo(() => pinsFromListings(listings), [listings])

  const demandPayload = useMemo(() => {
    const { limit: _l, offset: _o, ...rest } = filters
    return rest
  }, [filters])

  const alertPayload = useMemo(() => {
    const { limit: _l, offset: _o, ...rest } = filters
    return rest
  }, [filters])

  const saveProfile = trpc.demand.upsertFromSearchFilters.useMutation({
    onSuccess: () => {
      setProfileSaved(true)
      void utils.demand.getMyProfile.invalidate()
      window.setTimeout(() => setProfileSaved(false), 4000)
    },
  })

  const createAlert = trpc.searchAlert.create.useMutation({
    onSuccess: () => {
      setAlertSaved(true)
      void utils.searchAlert.getMyFeed.invalidate()
      window.setTimeout(() => setAlertSaved(false), 4000)
    },
  })

  const opLocked = Boolean(forcedOperation)

  return (
    <div className="container mx-auto space-y-6 px-4 py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{pageTitle}</h1>
            <p className="mt-2 text-text-secondary">{pageSubtitle}</p>
            <p className="mt-2 text-sm text-text-tertiary">
              Novedad: tocá <span className="font-medium text-text-secondary">Más filtros</span>{' '}
              debajo del formulario para barrio, amenities, superficie y piso.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {me ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saveProfile.isPending}
                  onClick={() => saveProfile.mutate(demandPayload)}
                >
                  {saveProfile.isPending
                    ? 'Guardando…'
                    : 'Guardar filtros en mi perfil'}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  disabled={createAlert.isPending}
                  onClick={() => createAlert.mutate(alertPayload)}
                >
                  {createAlert.isPending
                    ? 'Creando…'
                    : 'Crear alerta con estos filtros'}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/perfil-demanda">Perfil de demanda</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/mis-alertas">Mis alertas</Link>
                  </Button>
                </div>
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {opLocked ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/buscar">Todas las operaciones</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm">
                <Link href="/">Inicio</Link>
              </Button>
            </div>
          </div>
        </div>
        {profileSaved ? (
          <p className="text-sm text-semantic-success">
            Perfil actualizado con estos filtros.
          </p>
        ) : null}
        {alertSaved ? (
          <p className="text-sm text-semantic-success">
            Alerta creada. Podés verla en Mis alertas.
          </p>
        ) : null}

        <Card className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Palabras clave (título, descripción)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {opLocked ? (
              <div className="flex items-center rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm">
                <span className="text-text-secondary">
                  Operación:{' '}
                  <span className="font-medium text-text-primary">
                    {forcedOperation === 'sale' ? 'Venta' : 'Alquiler'}
                  </span>
                </span>
              </div>
            ) : (
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
            )}
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
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {!showMap ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mr-auto"
                onClick={() => setShowMap(true)}
              >
                Ver mapa
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? 'Ocultar filtros avanzados' : 'Más filtros'}
            </Button>
          </div>
          {showAdvanced ? (
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <p className="text-sm font-medium text-text-primary">
                Ubicación y superficie
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Input
                  placeholder="Barrio"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Dorm. mín."
                  value={minBedrooms}
                  onChange={(e) => setMinBedrooms(e.target.value)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Baños mín."
                  value={minBathrooms}
                  onChange={(e) => setMinBathrooms(e.target.value)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Cocheras mín."
                  value={minGarages}
                  onChange={(e) => setMinGarages(e.target.value)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Superficie mín. (m²)"
                  value={minSurface}
                  onChange={(e) => setMinSurface(e.target.value)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Superficie máx. (m²)"
                  value={maxSurface}
                  onChange={(e) => setMaxSurface(e.target.value)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Piso desde"
                  value={floorMin}
                  onChange={(e) => setFloorMin(e.target.value)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Piso hasta"
                  value={floorMax}
                  onChange={(e) => setFloorMax(e.target.value)}
                  min={0}
                />
                <Input
                  placeholder="Escalera (ej. A, B)"
                  value={escalera}
                  onChange={(e) => setEscalera(e.target.value)}
                  maxLength={10}
                />
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={orientation}
                  onChange={(e) =>
                    setOrientation(
                      e.target.value as typeof orientation
                    )
                  }
                >
                  <option value="">Orientación (cualquiera)</option>
                  <option value="N">Norte</option>
                  <option value="S">Sur</option>
                  <option value="E">Este</option>
                  <option value="W">Oeste</option>
                  <option value="NE">Noreste</option>
                  <option value="NW">Noroeste</option>
                  <option value="SE">Sureste</option>
                  <option value="SW">Suroeste</option>
                </select>
                <Input
                  type="number"
                  placeholder="Sup. cubierta mín. (m²)"
                  value={minSurfaceCovered}
                  onChange={(e) => setMinSurfaceCovered(e.target.value)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Sup. cubierta máx. (m²)"
                  value={maxSurfaceCovered}
                  onChange={(e) => setMaxSurfaceCovered(e.target.value)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Ambientes mín."
                  value={minTotalRooms}
                  onChange={(e) => setMinTotalRooms(e.target.value)}
                  min={0}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">
                  Amenities
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {SEARCH_FILTER_AMENITIES.map((key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={selectedAmenities.includes(key)}
                        onChange={() => toggleAmenity(key)}
                      />
                      {AMENITY_LABELS[key]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        {showMap ? (
          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-text-primary">Mapa</p>
              <div className="flex flex-wrap gap-2">
                {mapBbox ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMapBbox(null)}
                  >
                    Quitar filtro de zona
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowMap(false)
                    setMapBbox(null)
                  }}
                >
                  Ocultar mapa
                </Button>
              </div>
            </div>
            <BuscarSearchMap pins={mapPins} onApplyZona={setMapBbox} />
            <p className="text-xs text-text-tertiary">
              Solo se marcan avisos con ubicación. Mové el mapa y tocá «Buscar en esta zona» para
              filtrar por el rectángulo visible.
            </p>
            {mapPins.length === 0 && !isLoading ? (
              <p className="text-sm text-text-secondary">
                No hay resultados con pin en este momento (falta geolocalización en los avisos o
                los filtros no devolvieron coincidencias con coordenadas).
              </p>
            ) : null}
          </Card>
        ) : null}
      </div>

      {isError ? (
        <Card className="p-6">
          <p className="text-sm text-text-primary">
            No pudimos cargar resultados.{' '}
            {error?.message?.includes('DATABASE') ||
            error?.message?.includes('required')
              ? 'Revisá que DATABASE_URL esté definida en Vercel (proyecto web, Production).'
              : (error?.message ?? 'Intentá de nuevo más tarde.')}
          </p>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="space-y-3 p-4">
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
            No hay resultados. Probá con otros filtros o ampliá la búsqueda.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
