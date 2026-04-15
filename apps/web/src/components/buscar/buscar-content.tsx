'use client'

import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Filter,
  Input,
  Map as MapIcon,
  Menu,
  Mic,
  Skeleton,
} from '@propieya/ui'
import type { BuscarMapBBox, BuscarMapPoint } from '@/components/buscar/buscar-search-map'
import { BUSCAR_MAP_DEFAULT_CENTER } from '@/components/buscar/buscar-map-constants'

const BuscarSearchMap = dynamic(
  () => import('./buscar-search-map').then((mod) => mod.BuscarSearchMap),
  {
    ssr: false,
    loading: () => <Skeleton className="min-h-[280px] w-full rounded-lg" />,
  }
)
import {
  formatPrice,
  getFacetFlagDefinitions,
  parseBuscarMapGeoFromParams,
  serializeBuscarMapGeoToParams,
  getFacetFlagsForBuscarRefineLayer,
  normalizeSearchSessionMVP,
  OPERATION_TYPE_LABELS,
  PORTAL_SEARCH_UX_COPY as S,
  PROPERTY_TYPE_LABELS,
  summarizeSearchFilters,
  type Currency,
  type ExplainMatchFilters,
  type FacetFlagDefinition,
  type OperationType,
  type PropertyType,
  type SearchSessionMVP,
} from '@propieya/shared'

import { AddToCompareButton } from '@/components/compare/add-to-compare-button'
import { BuscarLocalityModal } from '@/components/buscar/buscar-locality-modal'
import { BuscarSessionBar } from '@/components/buscar/buscar-session-bar'
import { getAccessToken } from '@/lib/auth-storage'
import { sanitizeListingCoordinates } from '@/lib/map-geo'
import { canAppendPolygonVertex } from '@/lib/map-polygon'
import { trpc } from '@/lib/trpc'

function getSpeechRecognitionCtor(): (new () => {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((ev: Event) => void) | null
  onerror: ((ev: Event) => void) | null
  onend: (() => void) | null
}) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => never
    webkitSpeechRecognition?: new () => never
  }
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as never
}

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
      const ok = sanitizeListingCoordinates(lat, lng)
      if (ok) {
        out.push({ id: l.id, title: l.title, lat: ok.lat, lng: ok.lng })
      }
    }
  }
  return out
}

function getListingPinCoords(
  l: BuscarListingCardData
): { lat: number; lng: number } | null {
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
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null
  const ok = sanitizeListingCoordinates(lat, lng)
  return ok ? { lat: ok.lat, lng: ok.lng } : null
}

function appendAmenityToUrlParams(p: URLSearchParams, amenityId: string) {
  const set = new Set(
    (p.get('amenities') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((x) => x.length > 0)
  )
  set.add(amenityId)
  p.set('amenities', [...set].sort().join(','))
}

function cardWhyLine(
  listing: BuscarListingCardData,
  bucketId: 'strong' | 'near' | 'widened'
): string {
  const tipo =
    PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType
  const op =
    OPERATION_TYPE_LABELS[listing.operationType] ?? listing.operationType
  const nb = listing.address?.neighborhood?.trim()
  const cy = listing.address?.city?.trim()
  const zona = nb && cy ? `${nb}, ${cy}` : cy || nb || 'esta zona'
  const precio = formatPrice(
    listing.priceAmount,
    listing.priceCurrency as Currency
  )
  if (bucketId === 'strong') {
    return `${tipo} en ${zona} por ${precio}: encaja con tu búsqueda (${op.toLowerCase()}).`
  }
  if (bucketId === 'near') {
    return `${tipo} por ${precio} en ${zona}: ampliamos la zona para no perderte nada útil.`
  }
  return `${tipo} por ${precio} en ${zona}: mismo tipo y operación, con un criterio un poco más flexible.`
}

function buildBucketSessionDigestLine(
  bucketId: 'strong' | 'near' | 'widened',
  opts: {
    forcedOperation?: 'sale' | 'rent'
    operationType: OperationType | ''
    city: string
    neighborhood: string
    propertyType: PropertyType | ''
    minPrice: string
    maxPrice: string
  }
): string {
  const opRaw = opts.forcedOperation ?? opts.operationType
  const opLabel = opRaw ? OPERATION_TYPE_LABELS[opRaw] : 'lo que buscás'
  const tipo = opts.propertyType
    ? PROPERTY_TYPE_LABELS[opts.propertyType]
    : 'el tipo que elegiste'
  const c = opts.city.trim()
  const n = opts.neighborhood.trim()
  const zona =
    n && c ? `${n} (${c})` : c ? `en ${c}` : n ? `en ${n}` : 'la zona que marcaste'

  const tMax = opts.maxPrice.trim()
  const tMin = opts.minPrice.trim()
  const nMax = Number(tMax)
  const nMin = Number(tMin)
  let precioBit = ''
  if (tMax !== '' && Number.isFinite(nMax)) {
    precioBit = `, hasta ${formatPrice(nMax, 'ARS')}`
  } else if (tMin !== '' && Number.isFinite(nMin)) {
    precioBit = `, desde ${formatPrice(nMin, 'ARS')}`
  }

  if (bucketId === 'strong') {
    return `Buscamos ${opLabel.toLowerCase()} de ${tipo} ${zona}${precioBit}.`
  }
  if (bucketId === 'near') {
    if (n) {
      return `Abrimos la ciudad: seguís con ${tipo}${precioBit}, sin quedarte solo en un barrio.`
    }
    return `Más opciones en ${c || 'tu ciudad'} con ${tipo}${precioBit}.`
  }
  return `Si aflojás un detalle, aparecen avisos con el mismo tipo y operación${precioBit}.`
}

function displayBucketTitle(bucketId: string, serverLabel: string): string {
  if (bucketId === 'strong') return S.searchV2BucketTitleStrong
  if (bucketId === 'near') return S.searchV2BucketTitleNear
  if (bucketId === 'widened') return S.searchV2BucketTitleWidened
  return serverLabel
}

function bucketCountLabel(bucketId: string, n: number): string {
  const s = String(n)
  if (bucketId === 'strong') return S.searchV2BucketCountStrong.replace('{n}', s)
  if (bucketId === 'near') return S.searchV2BucketCountNear.replace('{n}', s)
  if (bucketId === 'widened') return S.searchV2BucketCountWidened.replace('{n}', s)
  return `${s} en este grupo`
}

function bucketStrongNearSectionClass(bucketId: string): string {
  if (bucketId === 'strong') {
    return 'space-y-3 rounded-xl border border-brand-primary/18 bg-brand-primary/[0.035] p-3 md:space-y-4 md:p-5'
  }
  if (bucketId === 'near') {
    return 'space-y-3 rounded-lg border border-border/50 bg-surface-secondary/30 p-3 md:p-4'
  }
  return 'space-y-3'
}

function bucketHeadingClass(bucketId: string): string {
  if (bucketId === 'strong') return 'text-base font-semibold text-text-primary md:text-lg'
  if (bucketId === 'near') return 'text-sm font-semibold text-text-primary md:text-base'
  return 'text-sm font-semibold text-text-primary md:text-base'
}

function ListingCard({
  listing,
  mapSelectedListingId,
  onMapSyncHover,
  onResultLinkClick,
  compactMatchReason,
  whyBucketId,
}: {
  listing: BuscarListingCardData
  mapSelectedListingId: string | null
  onMapSyncHover?: (listingId: string | null) => void
  /** Telemetría embudo: clic hacia ficha desde la lista (el padre suele capturar `position`). */
  onResultLinkClick?: (listingId: string) => void
  /** Buscador v2: una sola línea de encaje en lugar de lista larga. */
  compactMatchReason?: boolean
  whyBucketId?: 'strong' | 'near' | 'widened'
}) {
  const operationLabel = OPERATION_TYPE_LABELS[listing.operationType] ?? listing.operationType
  const neighborhood = listing.address?.neighborhood ?? '—'
  const city = listing.address?.city ?? '—'
  const pinCoords = getListingPinCoords(listing)
  const emphasizeFromMap = mapSelectedListingId === listing.id

  const firstReason = listing.matchReasons?.[0]
  const matchOneLine =
    firstReason && firstReason.length > 140
      ? `${firstReason.slice(0, 137)}…`
      : (firstReason ?? '')
  const compactWhyText =
    compactMatchReason && whyBucketId
      ? cardWhyLine(listing, whyBucketId)
      : matchOneLine

  return (
    <div
      id={`buscar-listing-${listing.id}`}
      className="scroll-mt-16 rounded-lg transition-transform duration-200 hover:-translate-y-0.5"
    >
      <Link
        href={`/propiedad/${listing.id}`}
        className="block"
        onClick={() => {
          onResultLinkClick?.(listing.id)
        }}
        onMouseEnter={() => {
          if (pinCoords && onMapSyncHover) onMapSyncHover(listing.id)
        }}
        onMouseLeave={() => {
          if (onMapSyncHover) onMapSyncHover(null)
        }}
      >
        <Card
          className={`group cursor-pointer overflow-hidden rounded-xl border border-border/70 shadow-sm transition-all duration-200 hover:border-brand-primary/30 hover:shadow-md ${
            emphasizeFromMap
              ? 'ring-2 ring-brand-primary ring-offset-2 ring-offset-surface-primary'
              : ''
          }`}
        >
        <div className="relative h-52 overflow-hidden bg-surface-secondary md:h-56">
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

          <div className="mt-3 flex items-center gap-4 text-sm text-text-secondary">
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

          {compactMatchReason && compactWhyText ? (
            <div className="mt-3 rounded-md border border-border/60 bg-surface-secondary/80 px-3 py-2 text-xs text-text-secondary">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1">
                  <span className="font-medium text-brand-primary">
                    {S.searchV2WhySee}
                  </span>
                  <span className="mt-0.5 block text-text-secondary">
                    {compactWhyText}
                  </span>
                </p>
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <AddToCompareButton
                    listingId={listing.id}
                    compact
                    stopNavigation
                  />
                </div>
              </div>
            </div>
          ) : !compactMatchReason &&
            listing.matchReasons &&
            listing.matchReasons.length > 0 ? (
            <div className="mt-3 rounded-md border border-border/60 bg-surface-secondary/80 px-3 py-2 text-xs text-text-secondary">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 font-medium text-text-primary">
                  {S.matchWhyTitle}
                </p>
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <AddToCompareButton
                    listingId={listing.id}
                    compact
                    stopNavigation
                  />
                </div>
              </div>
              <ul className="list-inside list-disc space-y-0.5">
                {listing.matchReasons.slice(0, 5).map((r, i) => (
                  <li key={`${listing.id}-reason-${i}`}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-3 flex justify-end">
              <AddToCompareButton
                listingId={listing.id}
                compact
                stopNavigation
              />
            </div>
          )}
        </div>
      </Card>
    </Link>
    </div>
  )
}

/** Selects nativos alineados al tema (evita `bg-background` indefinido y fondo blanco en dark). */
const BUSCAR_SELECT_CLASS =
  'w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary'

function BuscarLabeledField({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium text-text-primary"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const ADVANCED_AMENITY_FLAG_ORDER = [
  'credit_approved',
  'front_facing',
  'pet_friendly',
  'furnished',
  'wheelchair_accessible',
] as const

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
  const pathname = usePathname() ?? '/buscar'
  const router = useRouter()

  const utils = trpc.useUtils()
  const recordSearchResultClick =
    trpc.listing.recordSearchResultClick.useMutation()
  const onSearchResultNavigate = useCallback(
    (
      listingId: string,
      from: 'list' | 'map' | 'similar',
      position?: number
    ) => {
      recordSearchResultClick.mutate({
        listingId,
        from,
        ...(position !== undefined ? { position } : {}),
      })
    },
    [recordSearchResultClick]
  )
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
  const [selectedAmenityFacets, setSelectedAmenityFacets] = useState<string[]>([])
  const [amenitiesStrict, setAmenitiesStrict] = useState(false)
  /** Capa 3: un solo panel con técnica + catálogo único de amenities (sin triplicar chips). */
  const [showDeepFilters, setShowDeepFilters] = useState(false)
  /** Capa 2: afinado guiado (chips contextuales + números medios). */
  const [guidedLayerExpanded, setGuidedLayerExpanded] = useState(false)
  const [mapBbox, setMapBbox] = useState<BuscarMapBBox | null>(null)
  const [mapPolygonRing, setMapPolygonRing] = useState<BuscarMapPoint[]>([])
  /** Buscador v2: geo congelada que filtra (solo si el usuario confirmó con «Buscar en esta zona»). */
  const [committedBbox, setCommittedBbox] = useState<BuscarMapBBox | null>(null)
  const [committedPolygon, setCommittedPolygon] = useState<BuscarMapPoint[]>([])
  const [mapCommitted, setMapCommitted] = useState(false)
  /** Buscador v2: bucket «ampliadas» colapsado por defecto (pins = solo lo visible). */
  const [searchV2WidenedOpen, setSearchV2WidenedOpen] = useState(false)
  const [polygonDrawMode, setPolygonDrawMode] = useState(false)
  /** Sprint 40 — rectángulo del mapa se aplica al listado al panear (debounce). */
  const [mapLiveViewport, setMapLiveViewport] = useState(false)
  const liveViewportDebounceRef = useRef<number | null>(null)
  const [showMap, setShowMap] = useState(false)
  /** Centro de ciudad/barrio (Nominatim) para mapa y orden por cercanía. */
  const [localityGeocode, setLocalityGeocode] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [userGeo, setUserGeo] = useState<{ lat: number; lng: number } | null>(null)
  const userGeoRequestRef = useRef(false)
  /** Filtros clásicos colapsados por defecto; solo se abren si el usuario toca «Mostrar filtros». */
  const [classicFiltersOpen, setClassicFiltersOpen] = useState(false)
  const [localityModalOpen, setLocalityModalOpen] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const queryBeforeVoiceRef = useRef('')
  const qRef = useRef(q)
  qRef.current = q
  const [polygonDrawHint, setPolygonDrawHint] = useState<string | null>(null)
  const [mapSyncHoverId, setMapSyncHoverId] = useState<string | null>(null)
  const [mapSyncSelectedId, setMapSyncSelectedId] = useState<string | null>(null)
  /** Huella de sesión v2 para placeholder estable en tRPC. */
  const searchFilterFpRef = useRef<string | null>(null)

  const facetFlagDefinitions = useMemo(() => getFacetFlagDefinitions(), [])
  const refineFacetDefinitions = useMemo(
    () => getFacetFlagsForBuscarRefineLayer(),
    []
  )
  const advancedAmenityFields = useMemo(() => {
    const byId = new Map(facetFlagDefinitions.map((f) => [f.id, f]))
    return ADVANCED_AMENITY_FLAG_ORDER.map((id) => byId.get(id)).filter(
      (f): f is NonNullable<typeof f> => Boolean(f)
    )
  }, [facetFlagDefinitions])
  /** Lista única para capa 3: nicho + resto del catálogo, sin duplicar IDs. */
  const deepFacetCheckboxList = useMemo(() => {
    const seen = new Set<string>()
    const out: FacetFlagDefinition[] = []
    for (const f of [...advancedAmenityFields, ...refineFacetDefinitions]) {
      if (seen.has(f.id)) continue
      seen.add(f.id)
      out.push(f)
    }
    return out
  }, [advancedAmenityFields, refineFacetDefinitions])

  const toggleAmenityFacet = (key: string) => {
    setSelectedAmenityFacets((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    )
  }

  useEffect(() => {
    const c = city.trim()
    const n = neighborhood.trim()
    if (!c && !n) {
      setLocalityGeocode(null)
      return
    }
    const ac = new AbortController()
    const debounce = window.setTimeout(() => {
      void (async () => {
        try {
          const u = new URL('/api/geocode-locality', window.location.origin)
          if (c) u.searchParams.set('city', c)
          if (n) u.searchParams.set('neighborhood', n)
          const r = await fetch(u.toString(), { signal: ac.signal })
          const j = (await r.json()) as {
            ok?: boolean
            lat?: number
            lng?: number
          }
          if (
            j.ok === true &&
            typeof j.lat === 'number' &&
            typeof j.lng === 'number'
          ) {
            setLocalityGeocode({ lat: j.lat, lng: j.lng })
          } else {
            setLocalityGeocode(null)
          }
        } catch {
          if (!ac.signal.aborted) setLocalityGeocode(null)
        }
      })()
    }, 400)
    return () => {
      ac.abort()
      window.clearTimeout(debounce)
    }
  }, [city, neighborhood])

  useEffect(() => {
    if (!showMap) return
    if (city.trim() || neighborhood.trim()) return
    if (userGeo != null) return
    if (userGeoRequestRef.current) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    userGeoRequestRef.current = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => {
        /* denegado o error: queda el default del mapa */
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 }
    )
  }, [showMap, city, neighborhood, userGeo])

  const mapInitialCenter = useMemo((): [number, number] => {
    if (city.trim() || neighborhood.trim()) {
      if (localityGeocode) return [localityGeocode.lat, localityGeocode.lng]
      return BUSCAR_MAP_DEFAULT_CENTER
    }
    if (userGeo) return [userGeo.lat, userGeo.lng]
    return BUSCAR_MAP_DEFAULT_CENTER
  }, [city, neighborhood, localityGeocode, userGeo])

  const mapInitialZoom = useMemo(() => {
    if (city.trim() || neighborhood.trim()) {
      return localityGeocode ? 13 : 11
    }
    if (userGeo) return 12
    return 11
  }, [city, neighborhood, localityGeocode, userGeo])

  const mapRemountKey = useMemo(
    () =>
      `${mapInitialCenter[0].toFixed(5)}-${mapInitialCenter[1].toFixed(5)}-${mapInitialZoom}`,
    [mapInitialCenter, mapInitialZoom]
  )

  useEffect(() => {
    return () => {
      if (liveViewportDebounceRef.current != null) {
        window.clearTimeout(liveViewportDebounceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (polygonDrawMode || mapPolygonRing.length > 0) {
      setMapLiveViewport(false)
    }
  }, [polygonDrawMode, mapPolygonRing.length])

  const onViewportBboxChange = useCallback((bbox: BuscarMapBBox) => {
    if (liveViewportDebounceRef.current != null) {
      window.clearTimeout(liveViewportDebounceRef.current)
    }
    liveViewportDebounceRef.current = window.setTimeout(() => {
      setMapBbox(bbox)
      liveViewportDebounceRef.current = null
    }, 450)
  }, [])

  const mapViewportReporterActive =
    showMap &&
    mapLiveViewport &&
    !polygonDrawMode &&
    mapPolygonRing.length === 0

  const coreSearchFilters = useMemo(
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
      amenities:
        selectedAmenityFacets.length > 0 ? selectedAmenityFacets : undefined,
      facets:
        selectedAmenityFacets.length > 0
          ? { flags: selectedAmenityFacets }
          : undefined,
      amenitiesMatchMode: amenitiesStrict ? ('strict' as const) : ('preferred' as const),
      bbox:
        mapCommitted &&
        committedBbox != null &&
        committedPolygon.length < 3
          ? committedBbox
          : undefined,
      polygon:
        mapCommitted && committedPolygon.length >= 3
          ? committedPolygon
          : undefined,
      ...((city.trim() || neighborhood.trim()) && localityGeocode
        ? {
            sortNearLat: localityGeocode.lat,
            sortNearLng: localityGeocode.lng,
          }
        : {}),
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
      selectedAmenityFacets,
      amenitiesStrict,
      mapCommitted,
      committedBbox,
      committedPolygon,
      localityGeocode,
    ]
  )

  const searchSessionMVP = useMemo((): SearchSessionMVP => {
    const num = (s: string) => {
      const x = Number(s)
      return s !== '' && Number.isFinite(x) ? x : undefined
    }
    const dormRaw = num(minBedrooms)
    const op = (forcedOperation ?? operationType) || null
    return {
      operationType: op ? (op as NonNullable<SearchSessionMVP['operationType']>) : null,
      propertyType: propertyType || null,
      city: city.trim() || null,
      neighborhood: neighborhood.trim() || null,
      q: q.trim() || null,
      minPrice: num(minPrice) ?? null,
      maxPrice: num(maxPrice) ?? null,
      minBedrooms: dormRaw !== undefined ? Math.floor(dormRaw) : null,
      minSurface: num(minSurface) ?? null,
      maxSurface: num(maxSurface) ?? null,
      amenityIds: selectedAmenityFacets,
      strictAmenities: amenitiesStrict,
      fixedBudget: false,
      fixedPropertyType: false,
      mapMode:
        mapCommitted && committedPolygon.length >= 3
          ? 'polygon'
          : mapCommitted && committedBbox
            ? 'bbox'
            : 'off',
      bbox: mapCommitted ? committedBbox : null,
      polygon: mapCommitted ? committedPolygon : null,
      mapCommitted,
    }
  }, [
    forcedOperation,
    operationType,
    propertyType,
    city,
    neighborhood,
    q,
    minPrice,
    maxPrice,
    minBedrooms,
    minSurface,
    maxSurface,
    selectedAmenityFacets,
    amenitiesStrict,
    mapCommitted,
    committedBbox,
    committedPolygon,
  ])

  const v2SessionFingerprint = JSON.stringify(searchSessionMVP)

  const { data: dataV2, isLoading, isError } =
    trpc.listing.searchV2.useQuery(
      {
        session: normalizeSearchSessionMVP(searchSessionMVP),
        limitPerBucket: 20,
      },
      {
        placeholderData: (previousData) => {
          if (searchFilterFpRef.current !== v2SessionFingerprint) {
            searchFilterFpRef.current = v2SessionFingerprint
            return undefined
          }
          return previousData
        },
      }
    )

  const listingsAll = useMemo(() => {
    if (!dataV2?.buckets) return []
    const out: BuscarListingCardData[] = []
    for (const b of dataV2.buckets) {
      for (const row of b.items) {
        out.push(row as BuscarListingCardData)
      }
    }
    return out
  }, [dataV2])

  const listingsForMap = useMemo(() => {
    if (!dataV2?.buckets || searchV2WidenedOpen) return listingsAll
    const widened = dataV2.buckets.find((b) => b.id === 'widened')
    const widenedIds = new Set(
      (widened?.items ?? []).map(
        (row) => (row as BuscarListingCardData).id
      )
    )
    return listingsAll.filter((l) => !widenedIds.has(l.id))
  }, [dataV2, listingsAll, searchV2WidenedOpen])

  const shortSearchUxMessages = useMemo(
    () =>
      (dataV2?.messages ?? []).filter(
        (m) => typeof m === 'string' && m.length <= 220
      ).slice(0, 1),
    [dataV2?.messages]
  )

  const data =
    dataV2 != null
      ? {
          total:
            dataV2.totalsByBucket.strong +
            dataV2.totalsByBucket.near +
            dataV2.totalsByBucket.widened,
          items: listingsAll,
          searchUX: { messages: dataV2.messages as string[] },
          nextCursor: null as string | null,
        }
      : null

  const mapPins = useMemo(
    () => pinsFromListings(listingsForMap),
    [listingsForMap]
  )

  useEffect(() => {
    setSearchV2WidenedOpen(false)
  }, [v2SessionFingerprint])

  useEffect(() => {
    if (mapSyncSelectedId && !listingsForMap.some((l) => l.id === mapSyncSelectedId)) {
      setMapSyncSelectedId(null)
    }
  }, [listingsForMap, mapSyncSelectedId])

  const mapPinEmphasisId = mapSyncHoverId ?? mapSyncSelectedId

  const mapSyncFlyCoords = useMemo(() => {
    if (!mapSyncHoverId) return null
    const l = listingsForMap.find((x) => x.id === mapSyncHoverId)
    return l ? getListingPinCoords(l) : null
  }, [mapSyncHoverId, listingsForMap])

  const onMapSyncHover = useCallback((id: string | null) => {
    setMapSyncHoverId(id)
  }, [])

  const demandPayload = useMemo(() => coreSearchFilters, [coreSearchFilters])

  const alertPayload = useMemo(() => coreSearchFilters, [coreSearchFilters])

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

  const explainForSummary = useMemo((): ExplainMatchFilters => {
    const n = (s: string) => {
      const x = Number(s)
      return s !== '' && Number.isFinite(x) ? x : undefined
    }
    return {
      q: q.trim() || undefined,
      operationType: (forcedOperation ?? operationType) || undefined,
      propertyType: propertyType || undefined,
      city: city.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      minPrice: n(minPrice),
      maxPrice: n(maxPrice),
      minBedrooms: n(minBedrooms),
      minBathrooms: n(minBathrooms),
      minGarages: n(minGarages),
      minSurface: n(minSurface),
      maxSurface: n(maxSurface),
      floorMin: n(floorMin),
      floorMax: n(floorMax),
      escalera: escalera.trim() || undefined,
      orientation: orientation || undefined,
      minSurfaceCovered: n(minSurfaceCovered),
      maxSurfaceCovered: n(maxSurfaceCovered),
      minTotalRooms: n(minTotalRooms),
      amenities:
        selectedAmenityFacets.length > 0 ? selectedAmenityFacets : undefined,
      bbox: showMap && mapBbox ? mapBbox : undefined,
      mapPolygonActive: showMap && mapPolygonRing.length >= 3,
    }
  }, [
    q,
    forcedOperation,
    operationType,
    propertyType,
    city,
    neighborhood,
    minPrice,
    maxPrice,
    minBedrooms,
    minBathrooms,
    minGarages,
    minSurface,
    maxSurface,
    floorMin,
    floorMax,
    escalera,
    orientation,
    minSurfaceCovered,
    maxSurfaceCovered,
    minTotalRooms,
    selectedAmenityFacets,
    showMap,
    mapBbox,
    mapPolygonRing.length,
  ])

  const activeSummaryRaw = useMemo(
    () => summarizeSearchFilters(explainForSummary),
    [explainForSummary]
  )

  const hasActiveSearchCriteria =
    activeSummaryRaw !== 'Perfil de búsqueda sin criterios guardados.'

  const clearBuscarSearch = useCallback(() => {
    setShowMap(false)
    setMapLiveViewport(false)
    setCommittedBbox(null)
    setCommittedPolygon([])
    setMapCommitted(false)
    router.replace(pathname)
  }, [router, pathname])

  const searchParamsKey = searchParams.toString()

  const pushBuscarQueryParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString())
      mutate(p)
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const commitMapSearchArea = useCallback(() => {
    if (mapPolygonRing.length >= 3) {
      setCommittedPolygon([...mapPolygonRing])
      setCommittedBbox(null)
      setMapCommitted(true)
      pushBuscarQueryParams((p) => {
        serializeBuscarMapGeoToParams(p, {
          bbox: null,
          polygon: mapPolygonRing,
        })
        p.set('mz', '1')
      })
      return
    }
    if (mapBbox) {
      setCommittedBbox({ ...mapBbox })
      setCommittedPolygon([])
      setMapCommitted(true)
      pushBuscarQueryParams((p) => {
        serializeBuscarMapGeoToParams(p, {
          bbox: mapBbox,
          polygon: null,
        })
        p.set('mz', '1')
      })
    }
  }, [mapPolygonRing, mapBbox, pushBuscarQueryParams])

  const releaseMapFilter = useCallback(() => {
    setMapCommitted(false)
    setCommittedBbox(null)
    setCommittedPolygon([])
    pushBuscarQueryParams((p) => {
      p.delete('mz')
    })
  }, [pushBuscarQueryParams])

  const applySearchV2Action = useCallback(
    (patch: Record<string, unknown> | undefined) => {
      if (!patch) return
      if (patch.neighborhood === null || patch.neighborhood === '') {
        setNeighborhood('')
      }
      if (patch.strictAmenities === false) setAmenitiesStrict(false)
      if (patch.mapCommitted === false) {
        releaseMapFilter()
      }
      if (patch.minPrice === null && patch.maxPrice === null) {
        setMinPrice('')
        setMaxPrice('')
      }
    },
    [releaseMapFilter]
  )

  useEffect(() => {
    const sp = new URLSearchParams(searchParamsKey)
    setQ(sp.get('q') ?? '')
    if (!forcedOperation) {
      setOperationType((sp.get('op') as OperationType) ?? '')
    }
    setPropertyType((sp.get('tipo') as PropertyType) ?? '')
    setCity(sp.get('ciudad') ?? '')
    setNeighborhood(sp.get('barrio') ?? '')
    setMinPrice(sp.get('min') ?? '')
    setMaxPrice(sp.get('max') ?? '')
    setMinBedrooms(sp.get('dorm') ?? '')
    setMinSurface(sp.get('sup') ?? '')
    setMaxSurface('')
    setMinBathrooms('')
    setMinGarages('')
    setFloorMin('')
    setFloorMax('')
    setEscalera('')
    setMinSurfaceCovered('')
    setMaxSurfaceCovered('')
    setMinTotalRooms('')
    setOrientation('')
    const amRaw = sp.get('amenities')
    if (amRaw && amRaw.length > 0) {
      setSelectedAmenityFacets(
        amRaw
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length <= 80)
          .slice(0, 40)
      )
    } else {
      setSelectedAmenityFacets([])
    }
    setAmenitiesStrict(sp.get('amenities_strict') === '1')

    const geo = parseBuscarMapGeoFromParams(sp)
    if (geo.polygon.length >= 3) {
      setMapPolygonRing(geo.polygon)
      setMapBbox(null)
      setShowMap(true)
    } else if (geo.bbox) {
      setMapBbox(geo.bbox)
      setMapPolygonRing([])
      setShowMap(true)
    } else {
      setMapBbox(null)
      setMapPolygonRing([])
    }
    const mz = sp.get('mz') === '1'
    if (mz) {
      if (geo.polygon.length >= 3) {
        setCommittedPolygon(geo.polygon)
        setCommittedBbox(null)
        setMapCommitted(true)
      } else if (geo.bbox) {
        setCommittedBbox(geo.bbox)
        setCommittedPolygon([])
        setMapCommitted(true)
      } else {
        setCommittedBbox(null)
        setCommittedPolygon([])
        setMapCommitted(false)
      }
    } else {
      setCommittedBbox(null)
      setCommittedPolygon([])
      setMapCommitted(false)
    }
    setPolygonDrawMode(false)
    setMapLiveViewport(false)
  }, [searchParamsKey, forcedOperation])

  const addPolygonVertexSafe = useCallback((p: BuscarMapPoint) => {
    setMapPolygonRing((prev) => {
      if (!canAppendPolygonVertex(prev, p)) {
        setPolygonDrawHint(S.polygonSelfIntersectHint)
        window.setTimeout(() => setPolygonDrawHint(null), 5000)
        return prev
      }
      setPolygonDrawHint(null)
      return [...prev, p]
    })
  }, [])

  const scrollToElementId = useCallback((id: string) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    })
  }, [])

  const widenPriceRange = useCallback(() => {
    const tMin = minPrice.trim()
    const tMax = maxPrice.trim()
    const nMax = Number(tMax)
    const nMin = Number(tMin)
    pushBuscarQueryParams((p) => {
      if (tMax !== '' && Number.isFinite(nMax)) {
        p.set('max', String(Math.max(0, Math.round(nMax * 1.2))))
      } else if (tMin !== '' && Number.isFinite(nMin)) {
        p.set('min', String(Math.max(0, Math.round(nMin * 0.85))))
      }
    })
  }, [maxPrice, minPrice, pushBuscarQueryParams])

  const searchWholeCity = useCallback(() => {
    pushBuscarQueryParams((p) => {
      p.delete('barrio')
    })
  }, [pushBuscarQueryParams])

  const openAllFilters = useCallback(() => {
    setClassicFiltersOpen(true)
    scrollToElementId('buscar-esenciales')
  }, [scrollToElementId])

  const smartSuggestionIds = useMemo(() => {
    if (!hasActiveSearchCriteria) return []
    const ids: string[] = []
    if (!selectedAmenityFacets.includes('pool')) ids.push('pool')
    if (neighborhood.trim()) ids.push('widen-zone')
    const tMax = maxPrice.trim()
    const tMin = minPrice.trim()
    const hasMax = tMax !== '' && Number.isFinite(Number(tMax))
    const hasMin = tMin !== '' && Number.isFinite(Number(tMin))
    if (hasMax) ids.push('price-more')
    else if (hasMin) ids.push('price-less')
    if (ids.length < 3 && !selectedAmenityFacets.includes('parking')) {
      ids.push('parking')
    }
    return ids.slice(0, 3)
  }, [
    hasActiveSearchCriteria,
    selectedAmenityFacets,
    neighborhood,
    maxPrice,
    minPrice,
  ])

  const applySmartSuggestion = useCallback(
    (id: string) => {
      if (id === 'pool') {
        pushBuscarQueryParams((p) => appendAmenityToUrlParams(p, 'pool'))
        return
      }
      if (id === 'parking') {
        pushBuscarQueryParams((p) => appendAmenityToUrlParams(p, 'parking'))
        return
      }
      if (id === 'widen-zone') {
        searchWholeCity()
        return
      }
      if (id === 'price-more' || id === 'price-less') {
        widenPriceRange()
      }
    },
    [pushBuscarQueryParams, searchWholeCity, widenPriceRange]
  )

  function smartSuggestionLabel(id: string): string {
    switch (id) {
      case 'pool':
        return S.searchV2SmartPool
      case 'widen-zone':
        return S.searchV2SmartWiderZone
      case 'price-more':
        return S.searchV2SmartPayMore
      case 'price-less':
        return S.searchV2SmartPayLess
      case 'parking':
        return S.searchV2SmartGarage
      default:
        return ''
    }
  }

  const onMapPinSelect = useCallback(
    (id: string) => {
      setMapSyncSelectedId(id)
      scrollToElementId(`buscar-listing-${id}`)
    },
    [scrollToElementId]
  )

  const openMapFromAssistant = useCallback(() => {
    setClassicFiltersOpen(true)
    setShowMap(true)
    scrollToElementId('buscar-mapa')
  }, [scrollToElementId])

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    setListening(false)
  }, [])

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor || listening) return
    queryBeforeVoiceRef.current = qRef.current.trimEnd()
    const rec = new Ctor()
    rec.lang = 'es-AR'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev: Event) => {
      const e = ev as unknown as {
        results: Array<{ 0: { transcript: string }; isFinal: boolean }>
      }
      let piece = ''
      for (let i = 0; i < e.results.length; i++) {
        piece += e.results[i]?.[0]?.transcript ?? ''
      }
      const spoken = piece.replace(/\s+/g, ' ').trim()
      const prefix = queryBeforeVoiceRef.current
      const combined =
        prefix && spoken
          ? `${prefix} ${spoken}`.trim()
          : spoken || prefix
      setQ(combined)
    }
    rec.onerror = () => {
      stopListening()
    }
    rec.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
      recognitionRef.current = null
    }
  }, [listening, stopListening, setQ])

  useEffect(() => {
    setVoiceSupported(getSpeechRecognitionCtor() != null)
  }, [])

  useEffect(() => {
    return () => stopListening()
  }, [stopListening])

  const commitRefineToUrl = useCallback(() => {
    pushBuscarQueryParams((p) => {
      const t = q.trim()
      if (t) p.set('q', t)
      else p.delete('q')
    })
  }, [q, pushBuscarQueryParams])

  return (
    <div className="container mx-auto px-4 py-3 md:py-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5 border-b border-border/30 pb-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <div className="min-w-0 space-y-0">
            <h1 className="text-base font-medium tracking-tight text-text-primary md:text-lg">
              {pageTitle}
            </h1>
            {pageSubtitle.trim() ? (
              <p className="text-[11px] leading-snug text-text-tertiary md:text-xs md:text-text-secondary">
                {pageSubtitle}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {opLocked ? (
              <Button asChild variant="outline" size="sm" className="h-8">
                <Link href="/buscar">{S.allOperations}</Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href="/">{S.homeLink}</Link>
            </Button>
            {me ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                  >
                    <Menu className="h-3.5 w-3.5" aria-hidden />
                    Más
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Tu cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={saveProfile.isPending}
                    onClick={() => saveProfile.mutate(demandPayload)}
                  >
                    {saveProfile.isPending ? S.saveProfilePending : S.saveProfile}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={createAlert.isPending}
                    onClick={() => createAlert.mutate(alertPayload)}
                  >
                    {createAlert.isPending ? S.createAlertPending : S.createAlert}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/perfil-demanda">Perfil de demanda</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/mis-alertas">Mis alertas</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        {profileSaved ? (
          <p className="text-sm text-semantic-success">
            {S.profileSaved}
          </p>
        ) : null}
        {alertSaved ? (
          <p className="text-sm text-semantic-success">
            {S.alertSaved}
          </p>
        ) : null}

        <BuscarSessionBar
          opLocked={opLocked}
          forcedOperation={forcedOperation}
          operationType={operationType}
          city={city}
          neighborhood={neighborhood}
          propertyType={propertyType}
          propertyOptions={PROPERTY_OPTIONS}
          minPrice={minPrice}
          maxPrice={maxPrice}
          minBedrooms={minBedrooms}
          applyUrlParams={pushBuscarQueryParams}
          onOpenLocalityModal={() => setLocalityModalOpen(true)}
          onClearSearch={clearBuscarSearch}
        />

        <form
          className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault()
            commitRefineToUrl()
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Input
              className="h-10 pr-[6.25rem] text-[15px] md:pr-[6.5rem]"
              placeholder={S.buscarRefinePlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={S.buscarRefinePlaceholder}
            />
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              {voiceSupported ? (
                <Button
                  type="button"
                  size="icon"
                  variant={listening ? 'default' : 'outline'}
                  className="h-8 w-8 shrink-0"
                  onClick={() => (listening ? stopListening() : startListening())}
                  aria-label={listening ? 'Detener dictado' : 'Dictar'}
                  title={listening ? 'Detener' : 'Dictar'}
                >
                  <Mic className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              <Button type="submit" size="sm" className="h-8 shrink-0 px-2.5 text-xs">
                Buscar
              </Button>
            </div>
          </div>
        </form>
        {listening ? (
          <p className="text-[11px] text-text-tertiary">Escuchando…</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/25 pb-2">
          <Button
            type="button"
            variant={classicFiltersOpen ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setClassicFiltersOpen((v) => !v)}
          >
            <Filter className="h-3 w-3" aria-hidden />
            {classicFiltersOpen ? S.filtersOptionalCollapse : S.filtersOptionalExpand}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={openMapFromAssistant}
          >
            <MapIcon className="h-3 w-3" aria-hidden />
            {S.buscarOpenMapCta}
          </Button>
          <div
            className="ml-auto inline-flex rounded-md border border-border/40 bg-surface-secondary/30 p-px"
            role="group"
            aria-label="Vista de resultados"
          >
            <Button
              type="button"
              variant={!showMap ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-[5px] px-2.5 text-[11px]"
              onClick={() => setShowMap(false)}
            >
              Lista
            </Button>
            <Button
              type="button"
              variant={showMap ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-[5px] px-2.5 text-[11px]"
              onClick={() => {
                setClassicFiltersOpen(true)
                setShowMap(true)
                scrollToElementId('buscar-mapa')
              }}
            >
              <MapIcon className="mr-1 hidden h-3 w-3 sm:inline" aria-hidden />
              Mapa
            </Button>
          </div>
        </div>

        <div id="buscar-resultados" className="scroll-mt-14 space-y-4">
          {!isLoading &&
          dataV2 &&
          data &&
          data.total === 0 &&
          hasActiveSearchCriteria ? (
            <div className="rounded-md border border-border/60 px-4 py-3">
              <p className="text-sm font-medium text-text-primary">
                {S.searchV2EmptyTitle}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{S.searchV2EmptyLine1}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {((minPrice.trim() !== '' &&
                  Number.isFinite(Number(minPrice.trim()))) ||
                  (maxPrice.trim() !== '' &&
                    Number.isFinite(Number(maxPrice.trim())))) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="transition-transform active:scale-[0.98]"
                    onClick={widenPriceRange}
                  >
                    {S.searchV2CtaWiderPrice}
                  </Button>
                ) : null}
                {neighborhood.trim() !== '' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="transition-transform active:scale-[0.98]"
                    onClick={searchWholeCity}
                  >
                    {S.searchV2CtaWholeCity}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="transition-transform active:scale-[0.98]"
                  onClick={openAllFilters}
                >
                  {S.searchV2CtaOpenFilters}
                </Button>
              </div>
            </div>
          ) : null}
          {shortSearchUxMessages.length > 0 ? (
            <div className="space-y-1" role="status" aria-live="polite">
              {shortSearchUxMessages.map((msg, i) => (
                <p
                  key={`search-ux-${i}`}
                  className="text-sm leading-snug text-text-secondary"
                >
                  {msg}
                </p>
              ))}
            </div>
          ) : null}
          {dataV2?.emptyExplanation ? (
            <p className="text-sm text-text-secondary">{dataV2.emptyExplanation}</p>
          ) : null}
          {dataV2?.actions && dataV2.actions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                {S.searchV2SuggestedActions}
              </p>
              <div className="flex flex-wrap gap-2">
                {dataV2.actions.map((a) => (
                  <Button
                    key={a.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      applySearchV2Action(
                        a.patch as Record<string, unknown> | undefined
                      )
                    }
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          {isError ? (
            <div className="rounded-md border border-border/60 px-4 py-3">
              <p className="text-sm font-medium text-text-primary">{S.searchLoadErrorSoftTitle}</p>
              <p className="mt-1 text-xs text-text-secondary">{S.searchLoadErrorSoftBody}</p>
            </div>
          ) : isLoading && !dataV2 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
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
          ) : dataV2?.buckets ? (
            <div className="space-y-6">
              <p className="text-sm font-semibold text-text-primary">
                {S.searchV2ResultsHeading}
              </p>
              {!isLoading &&
              data &&
              data.total > 0 &&
              smartSuggestionIds.length > 0 ? (
                <div className="rounded-md border border-border/50 bg-surface-secondary/25 px-3 py-2">
                  <p className="text-xs font-medium text-text-secondary">
                    {S.searchV2SmartSuggestionsTitle}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {smartSuggestionIds.map((sid) => (
                      <Button
                        key={sid}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 max-w-full whitespace-normal text-left text-xs leading-snug transition-transform active:scale-[0.98] sm:text-sm"
                        onClick={() => applySmartSuggestion(sid)}
                      >
                        {smartSuggestionLabel(sid)}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              {(() => {
                let globalIndex = 0
                const widenedCount =
                  dataV2.buckets.find((b) => b.id === 'widened')?.totalInBucket ??
                  0

                const digestOpts = {
                  forcedOperation,
                  operationType,
                  city,
                  neighborhood,
                  propertyType,
                  minPrice,
                  maxPrice,
                }

                return (
                  <>
                    {dataV2.buckets.map((bucket) => {
                      if (bucket.id === 'near' && bucket.items.length === 0) {
                        return null
                      }
                      if (bucket.id === 'widened') {
                        if (bucket.items.length === 0) return null
                        return (
                          <section
                            key={bucket.id}
                            className="space-y-3 rounded-xl border border-dashed border-border/50 bg-surface-secondary/15 p-3 md:p-4"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                  <h2 className="text-sm font-medium text-text-secondary">
                                    {displayBucketTitle(bucket.id, bucket.label)}
                                  </h2>
                                  <span className="text-xs text-text-tertiary">
                                    {bucketCountLabel(
                                      bucket.id,
                                      bucket.totalInBucket
                                    )}
                                  </span>
                                </div>
                                {!searchV2WidenedOpen && widenedCount > 0 ? (
                                  <p
                                    className="text-sm font-medium text-text-primary"
                                    role="status"
                                  >
                                    {widenedCount === 1
                                      ? S.searchV2WidenedTeaserOne
                                      : S.searchV2WidenedTeaser.replace(
                                          '{n}',
                                          String(widenedCount)
                                        )}
                                  </p>
                                ) : null}
                                {searchV2WidenedOpen ? (
                                  <p className="text-xs leading-snug text-text-tertiary">
                                    {buildBucketSessionDigestLine(
                                      'widened',
                                      digestOpts
                                    )}
                                  </p>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-9 shrink-0 text-xs transition-transform active:scale-[0.98]"
                                aria-expanded={searchV2WidenedOpen}
                                onClick={() =>
                                  setSearchV2WidenedOpen((v) => !v)
                                }
                              >
                                {searchV2WidenedOpen
                                  ? S.searchV2WidenedToggleHide
                                  : S.searchV2WidenedToggleShow}
                              </Button>
                            </div>
                            {!searchV2WidenedOpen && widenedCount > 0 ? (
                              <p className="text-xs text-text-tertiary/90" role="status">
                                {S.searchV2WidenedMapHint}
                              </p>
                            ) : null}
                            {searchV2WidenedOpen ? (
                              <div className="grid grid-cols-1 gap-6 border-t border-border/40 pt-4 md:grid-cols-2 lg:grid-cols-3">
                                {bucket.items.map((row) => {
                                  const listing = row as BuscarListingCardData
                                  const index = globalIndex++
                                  return (
                                    <ListingCard
                                      key={`${bucket.id}-${listing.id}`}
                                      listing={listing}
                                      mapSelectedListingId={mapSyncSelectedId}
                                      compactMatchReason
                                      whyBucketId="widened"
                                      onMapSyncHover={
                                        showMap && mapPins.length > 0
                                          ? onMapSyncHover
                                          : undefined
                                      }
                                      onResultLinkClick={(listingId) =>
                                        onSearchResultNavigate(
                                          listingId,
                                          'list',
                                          index
                                        )
                                      }
                                    />
                                  )
                                })}
                              </div>
                            ) : null}
                          </section>
                        )
                      }

                      const bid = bucket.id
                      if (bid !== 'strong' && bid !== 'near') return null

                      return (
                        <section
                          key={bucket.id}
                          className={bucketStrongNearSectionClass(bid)}
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                            <h2 className={bucketHeadingClass(bid)}>
                              {displayBucketTitle(bucket.id, bucket.label)}
                            </h2>
                            <span className="text-xs text-text-tertiary">
                              {bucketCountLabel(
                                bucket.id,
                                bucket.totalInBucket
                              )}
                            </span>
                          </div>
                          <p className="text-sm leading-snug text-text-secondary">
                            {buildBucketSessionDigestLine(bid, digestOpts)}
                          </p>
                          {bucket.items.length === 0 ? (
                            <p className="text-sm text-text-secondary">
                              {S.searchV2BucketEmpty}
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                              {bucket.items.map((row) => {
                                const listing = row as BuscarListingCardData
                                const index = globalIndex++
                                return (
                                  <ListingCard
                                    key={`${bucket.id}-${listing.id}`}
                                    listing={listing}
                                    mapSelectedListingId={mapSyncSelectedId}
                                    compactMatchReason
                                    whyBucketId={bid}
                                    onMapSyncHover={
                                      showMap && mapPins.length > 0
                                        ? onMapSyncHover
                                        : undefined
                                    }
                                    onResultLinkClick={(listingId) =>
                                      onSearchResultNavigate(
                                        listingId,
                                        'list',
                                        index
                                      )
                                    }
                                  />
                                )
                              })}
                            </div>
                          )}
                        </section>
                      )
                    })}
                  </>
                )
              })()}
              {data && data.total > 0 ? (
                <p className="text-center text-sm text-text-secondary">
                  {S.searchV2TotalSummary.replace('{n}', String(data.total))}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div id="buscar-esenciales" className="scroll-mt-16 space-y-3 border-t border-border/20 pt-3">
          {classicFiltersOpen ? (
            <Card className="space-y-3 rounded-lg border border-dashed border-border/35 bg-surface-secondary/[0.12] p-3 shadow-none md:space-y-3.5 md:p-4">
          <div className="border-b border-border/25 pb-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {S.mainFiltersTitle}
            </h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-text-tertiary">
              {S.mainFiltersSubtitle}
            </p>
          </div>

          <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary/90">
            {S.buscarLayer1Kicker}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
            {S.locationBlockTitle}
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {opLocked ? (
              <BuscarLabeledField id="buscar-op-locked" label={S.buscarFieldOperation}>
                <div
                  id="buscar-op-locked"
                  className="flex min-h-[42px] items-center rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm"
                  role="status"
                >
                  <span className="font-medium text-text-primary">
                    {forcedOperation === 'sale' ? 'Venta' : 'Alquiler'}
                  </span>
                </div>
              </BuscarLabeledField>
            ) : (
              <BuscarLabeledField id="buscar-operation" label={S.buscarFieldOperation}>
                <select
                  id="buscar-operation"
                  className={BUSCAR_SELECT_CLASS}
                  value={operationType}
                  onChange={(e) =>
                    setOperationType(e.target.value as OperationType | '')
                  }
                >
                  <option value="">{S.allOperations}</option>
                  <option value="sale">Venta</option>
                  <option value="rent">Alquiler</option>
                  <option value="temporary_rent">Alquiler temporal</option>
                </select>
              </BuscarLabeledField>
            )}
            <BuscarLabeledField id="buscar-tipo" label={S.buscarFieldPropertyType}>
              <select
                id="buscar-tipo"
                className={BUSCAR_SELECT_CLASS}
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
            </BuscarLabeledField>
            <BuscarLabeledField id="buscar-ciudad" label={S.buscarFieldCity}>
              <Input
                id="buscar-ciudad"
                placeholder="Ej. Córdoba, Rosario…"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </BuscarLabeledField>
            <BuscarLabeledField id="buscar-barrio" label={S.buscarFieldNeighborhood}>
              <Input
                id="buscar-barrio"
                placeholder="Ej. Palermo, Centro…"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
              />
            </BuscarLabeledField>
            <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setLocalityModalOpen(true)}
              >
                {S.buscarLocalityCatalogButton}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9"
                onClick={() => {
                  setShowMap(true)
                  scrollToElementId('buscar-mapa')
                }}
              >
                {S.buscarPreferMapCta}
              </Button>
            </div>
          </div>

          <div
            id="buscar-mapa"
            className="scroll-mt-16 space-y-2 rounded-md border border-border/35 bg-surface-primary/55 p-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="text-[11px] font-medium text-text-secondary">
                {S.mapIntegratedTitle}
              </p>
              {showMap ? (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {mapBbox ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setMapBbox(null)
                        releaseMapFilter()
                      }}
                    >
                      {S.clearBboxFilter}
                    </Button>
                  ) : null}
                  {mapPolygonRing.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setMapPolygonRing([])
                        setPolygonDrawMode(false)
                        releaseMapFilter()
                      }}
                    >
                      {S.polygonRemove}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setShowMap(false)
                      setMapLiveViewport(false)
                      setMapBbox(null)
                      setMapPolygonRing([])
                      setPolygonDrawMode(false)
                      releaseMapFilter()
                    }}
                  >
                    {S.hideMap}
                  </Button>
                </div>
              ) : null}
            </div>
            {!showMap ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  setShowMap(true)
                  scrollToElementId('buscar-mapa')
                }}
              >
                {S.showMap}
              </Button>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-text-primary">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={polygonDrawMode}
                      onChange={(e) => setPolygonDrawMode(e.target.checked)}
                    />
                    {S.polygonDrawLabel}
                  </label>
                  <span className="text-xs text-text-tertiary">
                    {mapPolygonRing.length}{' '}
                    {mapPolygonRing.length === 1
                      ? S.polygonVertexSingular
                      : S.polygonVertexPlural}
                    {mapPolygonRing.length >= 3
                      ? ` ${S.polygonFilterActive}`
                      : ` ${S.polygonMinVertices}`}
                  </span>
                </div>
                {polygonDrawHint ? (
                  <p className="text-sm text-semantic-warning" role="status">
                    {polygonDrawHint}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 border-t border-border pt-2">
                  <label
                    className={`flex cursor-pointer items-start gap-2 text-xs text-text-primary ${
                      polygonDrawMode || mapPolygonRing.length > 0
                        ? 'opacity-60'
                        : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                      checked={mapLiveViewport}
                      disabled={polygonDrawMode || mapPolygonRing.length > 0}
                      onChange={(e) => setMapLiveViewport(e.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{S.mapLiveViewportLabel}</span>
                      <span className="mt-0.5 block text-text-tertiary">
                        {S.mapLiveViewportHint}
                      </span>
                    </span>
                  </label>
                  {polygonDrawMode || mapPolygonRing.length > 0 ? (
                    <p className="text-xs text-text-tertiary" role="status">
                      {S.mapLiveViewportDisabledHint}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 border-t border-border pt-2">
                  {(mapBbox != null || mapPolygonRing.length >= 3) &&
                  !mapCommitted ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="h-9 w-fit"
                      onClick={commitMapSearchArea}
                    >
                      {S.buscarMapCommitCta}
                    </Button>
                  ) : null}
                  {mapCommitted ? (
                    <p className="text-xs text-text-secondary">
                      {S.buscarMapCommittedHint}
                    </p>
                  ) : null}
                  {mapCommitted ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-fit"
                      onClick={releaseMapFilter}
                    >
                      {S.buscarMapReleaseFilter}
                    </Button>
                  ) : null}
                </div>
                <BuscarSearchMap
                  pins={mapPins}
                  onApplyZona={(bbox) => {
                    setMapBbox(bbox)
                    scrollToElementId('buscar-resultados')
                  }}
                  initialCenter={mapInitialCenter}
                  initialZoom={mapInitialZoom}
                  mapRemountKey={mapRemountKey}
                  onViewportBboxChange={
                    mapViewportReporterActive ? onViewportBboxChange : undefined
                  }
                  polygonRing={mapPolygonRing}
                  polygonDrawMode={polygonDrawMode}
                  onPolygonVertex={addPolygonVertexSafe}
                  mapPinEmphasisId={mapPinEmphasisId}
                  onPinClickListing={mapPins.length > 0 ? onMapPinSelect : undefined}
                  onListingNavigateFromMap={(listingId) =>
                    onSearchResultNavigate(listingId, 'map')
                  }
                  flyToPinCoords={
                    mapPins.length > 0 ? mapSyncFlyCoords : null
                  }
                />
                <div className="mt-2 space-y-2">
                  {mapBbox || mapPolygonRing.length >= 3 ? (
                    <p className="text-xs text-text-secondary">{S.buscarMapFilterActiveHint}</p>
                  ) : (
                    <div
                      className="rounded-md border border-brand-primary/25 bg-brand-primary/5 px-3 py-2 text-xs"
                      role="status"
                    >
                      <span className="font-medium text-text-primary">{S.buscarMapFilterHintTitle}</span>
                      <p className="mt-1 text-text-secondary">{S.buscarMapFilterHintBody}</p>
                    </div>
                  )}
                  <p className="text-xs text-text-tertiary">{S.mapHelp}</p>
                  {mapPins.length > 0 ? (
                    <p className="text-xs text-text-tertiary">{S.buscarMapListSyncHint}</p>
                  ) : null}
                </div>
                {mapPins.length === 0 && !isLoading ? (
                  <p className="text-sm text-text-secondary">{S.mapNoPins}</p>
                ) : null}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <BuscarLabeledField id="buscar-precio-min" label={S.buscarFieldMinPrice}>
              <Input
                id="buscar-precio-min"
                type="number"
                placeholder="Ej. 50000"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </BuscarLabeledField>
            <BuscarLabeledField id="buscar-precio-max" label={S.buscarFieldMaxPrice}>
              <Input
                id="buscar-precio-max"
                type="number"
                placeholder="Ej. 200000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </BuscarLabeledField>
            {propertyType === 'land' ? (
              <>
                <BuscarLabeledField id="buscar-sup-l1" label={S.buscarFieldMinSurface}>
                  <Input
                    id="buscar-sup-l1"
                    type="number"
                    placeholder="Ej. 300"
                    value={minSurface}
                    onChange={(e) => setMinSurface(e.target.value)}
                    min={0}
                  />
                </BuscarLabeledField>
                <BuscarLabeledField id="buscar-sup-max-l1" label={S.buscarFieldMaxSurface}>
                  <Input
                    id="buscar-sup-max-l1"
                    type="number"
                    placeholder="Ej. 2000"
                    value={maxSurface}
                    onChange={(e) => setMaxSurface(e.target.value)}
                    min={0}
                  />
                </BuscarLabeledField>
              </>
            ) : (
              <>
                <BuscarLabeledField id="buscar-dorm" label={S.buscarFieldMinBedrooms}>
                  <Input
                    id="buscar-dorm"
                    type="number"
                    placeholder="Ej. 2"
                    value={minBedrooms}
                    onChange={(e) => setMinBedrooms(e.target.value)}
                    min={0}
                  />
                </BuscarLabeledField>
                <BuscarLabeledField id="buscar-ambientes" label={S.buscarFieldMinTotalRooms}>
                  <Input
                    id="buscar-ambientes"
                    type="number"
                    placeholder="Ej. 3"
                    value={minTotalRooms}
                    onChange={(e) => setMinTotalRooms(e.target.value)}
                    min={0}
                  />
                </BuscarLabeledField>
              </>
            )}
          </div>

          <section
            id="buscar-capa-2"
            className="scroll-mt-16 rounded-lg border border-border/40 bg-surface-secondary/20 p-2.5 md:p-3"
            aria-label={S.buscarLayer2Title}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setGuidedLayerExpanded((v) => !v)}
            >
              <span className="text-xs font-medium text-text-secondary md:text-sm">
                {S.buscarLayer2Title}
              </span>
              <span className="shrink-0 text-[11px] font-medium text-text-tertiary">
                {guidedLayerExpanded
                  ? S.buscarLayer2CollapseCta
                  : S.buscarLayer2ExpandCta}
              </span>
            </button>
            {!guidedLayerExpanded ? (
              <p className="mt-2 text-xs leading-relaxed text-text-tertiary">
                {S.buscarLayer2Teaser}
              </p>
            ) : (
              <div className="mt-3 space-y-4 border-t border-border/60 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {S.essentialsFriendlyTitle}
                </p>
                {propertyType === 'land' ? (
                  <p className="text-xs text-text-secondary">
                    {S.buscarLayer2LandHint}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <BuscarLabeledField id="buscar-banos" label={S.buscarFieldMinBathrooms}>
                      <Input
                        id="buscar-banos"
                        type="number"
                        placeholder="Ej. 1"
                        value={minBathrooms}
                        onChange={(e) => setMinBathrooms(e.target.value)}
                        min={0}
                      />
                    </BuscarLabeledField>
                    <BuscarLabeledField id="buscar-cocheras" label={S.buscarFieldMinGarages}>
                      <Input
                        id="buscar-cocheras"
                        type="number"
                        placeholder="Ej. 1"
                        value={minGarages}
                        onChange={(e) => setMinGarages(e.target.value)}
                        min={0}
                      />
                    </BuscarLabeledField>
                    <BuscarLabeledField id="buscar-sup-min" label={S.buscarFieldMinSurface}>
                      <Input
                        id="buscar-sup-min"
                        type="number"
                        placeholder="Ej. 40"
                        value={minSurface}
                        onChange={(e) => setMinSurface(e.target.value)}
                        min={0}
                      />
                    </BuscarLabeledField>
                    <BuscarLabeledField id="buscar-sup-max" label={S.buscarFieldMaxSurface}>
                      <Input
                        id="buscar-sup-max"
                        type="number"
                        placeholder="Ej. 120"
                        value={maxSurface}
                        onChange={(e) => setMaxSurface(e.target.value)}
                        min={0}
                      />
                    </BuscarLabeledField>
                  </div>
                )}
                <label className="flex cursor-pointer items-start gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-border"
                    checked={amenitiesStrict}
                    onChange={(e) => setAmenitiesStrict(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium">{S.strictAmenitiesLabel}</span>
                    <span className="block text-xs text-text-secondary">
                      {S.strictAmenitiesHint}
                    </span>
                  </span>
                </label>
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-border/25 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mr-auto h-8 text-xs text-text-tertiary hover:text-text-primary"
              onClick={() => setClassicFiltersOpen(false)}
            >
              {S.filtersOptionalCollapse}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowDeepFilters((v) => !v)}
            >
              {showDeepFilters ? S.buscarCloseLayer3Cta : S.buscarOpenLayer3Cta}
            </Button>
          </div>

          {showDeepFilters ? (
            <div
              id="buscar-capa-3"
              className="scroll-mt-16 space-y-3 border-t border-border/25 pt-3"
            >
              <div>
                <p className="text-xs font-medium text-text-secondary">
                  {S.buscarLayer3Title}
                </p>
                <p className="mt-0.5 text-[11px] text-text-tertiary">
                  {S.buscarLayer3Subtitle}
                </p>
              </div>
              <p className="text-xs font-medium text-text-secondary">
                {S.buscarLayer3TechnicalTitle}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <BuscarLabeledField
                  id="buscar-cub-min"
                  label={S.buscarFieldMinSurfaceCovered}
                >
                  <Input
                    id="buscar-cub-min"
                    type="number"
                    placeholder="Ej. 30"
                    value={minSurfaceCovered}
                    onChange={(e) => setMinSurfaceCovered(e.target.value)}
                    min={0}
                  />
                </BuscarLabeledField>
                <BuscarLabeledField
                  id="buscar-cub-max"
                  label={S.buscarFieldMaxSurfaceCovered}
                >
                  <Input
                    id="buscar-cub-max"
                    type="number"
                    placeholder="Ej. 90"
                    value={maxSurfaceCovered}
                    onChange={(e) => setMaxSurfaceCovered(e.target.value)}
                    min={0}
                  />
                </BuscarLabeledField>
                <BuscarLabeledField id="buscar-piso-min" label={S.buscarFieldFloorMin}>
                  <Input
                    id="buscar-piso-min"
                    type="number"
                    placeholder="Ej. 1"
                    value={floorMin}
                    onChange={(e) => setFloorMin(e.target.value)}
                    min={0}
                  />
                </BuscarLabeledField>
                <BuscarLabeledField id="buscar-piso-max" label={S.buscarFieldFloorMax}>
                  <Input
                    id="buscar-piso-max"
                    type="number"
                    placeholder="Ej. 12"
                    value={floorMax}
                    onChange={(e) => setFloorMax(e.target.value)}
                    min={0}
                  />
                </BuscarLabeledField>
                <BuscarLabeledField id="buscar-orientacion" label={S.buscarFieldOrientation}>
                  <select
                    id="buscar-orientacion"
                    className={BUSCAR_SELECT_CLASS}
                    value={orientation}
                    onChange={(e) =>
                      setOrientation(e.target.value as typeof orientation)
                    }
                  >
                    <option value="">Cualquiera</option>
                    <option value="N">Norte</option>
                    <option value="S">Sur</option>
                    <option value="E">Este</option>
                    <option value="W">Oeste</option>
                    <option value="NE">Noreste</option>
                    <option value="NW">Noroeste</option>
                    <option value="SE">Sureste</option>
                    <option value="SW">Suroeste</option>
                  </select>
                </BuscarLabeledField>
                <BuscarLabeledField id="buscar-escalera" label={S.buscarFieldEscalera}>
                  <Input
                    id="buscar-escalera"
                    placeholder="Ej. A, B"
                    value={escalera}
                    onChange={(e) => setEscalera(e.target.value)}
                    maxLength={10}
                  />
                </BuscarLabeledField>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {S.buscarLayer3AmenitiesTitle}
                </p>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {S.facetChipsHintRefine}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                  {deepFacetCheckboxList.map((facet) => (
                    <label
                      key={facet.id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-text-primary"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={selectedAmenityFacets.includes(facet.id)}
                        onChange={() => toggleAmenityFacet(facet.id)}
                      />
                      {facet.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          </Card>
          ) : null}
        </div>

        
      </div>

      <BuscarLocalityModal
        open={localityModalOpen}
        onOpenChange={setLocalityModalOpen}
        onPick={({ city: nextCity, neighborhood: nextNb }) => {
          setCity(nextCity)
          setNeighborhood(nextNb)
        }}
      />

    </div>
  )
}
