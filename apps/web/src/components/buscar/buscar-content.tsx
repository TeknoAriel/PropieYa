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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Filter,
  Input,
  Map as MapIcon,
  Search,
  Skeleton,
  Sparkles,
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
  getBuscarContextualBlock,
  getFacetFlagDefinitions,
  parseBuscarMapGeoFromParams,
  getFacetFlagsForBuscarRefineLayer,
  OPERATION_TYPE_LABELS,
  PORTAL_SEARCH_UX_COPY as S,
  summarizeSearchFilters,
  type Currency,
  type ExplainMatchFilters,
  type FacetFlagDefinition,
  type OperationType,
  type PortalSearchPage,
  type PropertyType,
} from '@propieya/shared'

import { AddToCompareButton } from '@/components/compare/add-to-compare-button'
import { BuscarLocalityModal } from '@/components/buscar/buscar-locality-modal'
import { BuscarRecentSearches } from '@/components/buscar/buscar-recent-searches'
import { ConversationalSearchBlock } from '@/components/portal/conversational-search-block'
import { InductiveSearchChips } from '@/components/portal/inductive-search-chips'
import { getAccessToken } from '@/lib/auth-storage'
import { sanitizeListingCoordinates } from '@/lib/map-geo'
import { canAppendPolygonVertex } from '@/lib/map-polygon'
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

function ListingCard({
  listing,
  mapSelectedListingId,
  onMapSyncHover,
  onResultLinkClick,
}: {
  listing: BuscarListingCardData
  mapSelectedListingId: string | null
  onMapSyncHover?: (listingId: string | null) => void
  /** Telemetría embudo: clic hacia ficha desde la lista (el padre suele capturar `position`). */
  onResultLinkClick?: (listingId: string) => void
}) {
  const operationLabel = OPERATION_TYPE_LABELS[listing.operationType] ?? listing.operationType
  const neighborhood = listing.address?.neighborhood ?? '—'
  const city = listing.address?.city ?? '—'
  const pinCoords = getListingPinCoords(listing)
  const emphasizeFromMap = mapSelectedListingId === listing.id

  return (
    <div id={`buscar-listing-${listing.id}`} className="scroll-mt-24 rounded-lg">
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
          className={`group cursor-pointer overflow-hidden rounded-xl border border-border/70 shadow-sm transition-shadow duration-200 hover:border-border hover:shadow-md ${
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

          {listing.matchReasons && listing.matchReasons.length > 0 ? (
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

const FLOW_GUIDE_STORAGE_KEY = 'propieya.buscar.flowGuide.dismissed'
const SEARCH_PAGE_LIMIT = 24

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
  const [flowDialogOpen, setFlowDialogOpen] = useState(false)
  const [localityModalOpen, setLocalityModalOpen] = useState(false)
  const [flowGuideDontShowAgain, setFlowGuideDontShowAgain] = useState(false)
  const [polygonDrawHint, setPolygonDrawHint] = useState<string | null>(null)
  const [mapSyncHoverId, setMapSyncHoverId] = useState<string | null>(null)
  const [mapSyncSelectedId, setMapSyncSelectedId] = useState<string | null>(null)
  const [searchPage, setSearchPage] = useState<{
    cursor?: string
    offset: number
  }>({ offset: 0 })
  const [accumulatedListings, setAccumulatedListings] = useState<
    BuscarListingCardData[]
  >([])
  const appendNextPageRef = useRef(false)
  /** Misma huella que `filterFingerprint`: si no cambió, permitimos placeholder entre páginas (cursor/offset). */
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

  const contextualBlock = useMemo(
    () =>
      getBuscarContextualBlock(
        propertyType,
        (forcedOperation ?? operationType) || ''
      ),
    [propertyType, forcedOperation, operationType]
  )

  const facetFlagCatalog = useMemo(() => getFacetFlagDefinitions(), [])

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
        showMap && mapPolygonRing.length < 3 ? (mapBbox ?? undefined) : undefined,
      polygon:
        showMap && mapPolygonRing.length >= 3 ? mapPolygonRing : undefined,
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
      showMap,
      mapBbox,
      mapPolygonRing,
      localityGeocode,
    ]
  )

  const filterFingerprint = JSON.stringify(coreSearchFilters)

  useEffect(() => {
    setSearchPage({ offset: 0 })
    setAccumulatedListings([])
  }, [filterFingerprint])

  const filters = useMemo(
    () => ({
      ...coreSearchFilters,
      limit: SEARCH_PAGE_LIMIT,
      offset: searchPage.cursor ? 0 : searchPage.offset,
      cursor: searchPage.cursor,
    }),
    [coreSearchFilters, searchPage]
  )

  const { data, isLoading, isFetching, isError } = trpc.listing.search.useQuery(filters, {
      placeholderData: (previousData) => {
        if (searchFilterFpRef.current !== filterFingerprint) {
          searchFilterFpRef.current = filterFingerprint
          return undefined
        }
        return previousData
      },
    })

  useEffect(() => {
    if (!data) return
    const page = data.items as BuscarListingCardData[]
    if (appendNextPageRef.current) {
      setAccumulatedListings((prev) => [...prev, ...page])
      appendNextPageRef.current = false
    } else {
      setAccumulatedListings(page)
    }
  }, [data])

  const listings = accumulatedListings

  const loadMoreResults = useCallback(() => {
    if (isFetching) return
    if (!data) return
    if (data.nextCursor) {
      appendNextPageRef.current = true
      setSearchPage({ offset: 0, cursor: data.nextCursor })
      return
    }
    if (
      data.items.length >= SEARCH_PAGE_LIMIT &&
      accumulatedListings.length < data.total
    ) {
      appendNextPageRef.current = true
      setSearchPage({
        offset: accumulatedListings.length,
        cursor: undefined,
      })
    }
  }, [data, accumulatedListings.length, isFetching])

  const canLoadMore =
    !isFetching &&
    data != null &&
    data.total > 0 &&
    (data.nextCursor != null ||
      (accumulatedListings.length < data.total &&
        data.items.length === SEARCH_PAGE_LIMIT))

  const mapPins = useMemo(() => pinsFromListings(listings), [listings])

  useEffect(() => {
    if (mapSyncSelectedId && !listings.some((l) => l.id === mapSyncSelectedId)) {
      setMapSyncSelectedId(null)
    }
  }, [listings, mapSyncSelectedId])

  const mapPinEmphasisId = mapSyncHoverId ?? mapSyncSelectedId

  const mapSyncFlyCoords = useMemo(() => {
    if (!mapSyncHoverId) return null
    const l = listings.find((x) => x.id === mapSyncHoverId)
    return l ? getListingPinCoords(l) : null
  }, [mapSyncHoverId, listings])

  const onMapSyncHover = useCallback((id: string | null) => {
    setMapSyncHoverId(id)
  }, [])

  const demandPayload = useMemo(() => {
    const { limit: _l, offset: _o, cursor: _c, ...rest } = filters
    return rest
  }, [filters])

  const alertPayload = useMemo(() => {
    const { limit: _l, offset: _o, cursor: _c, ...rest } = filters
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

  const searchPathPage: PortalSearchPage = useMemo(
    () =>
      forcedOperation === 'sale'
        ? 'venta'
        : forcedOperation === 'rent'
          ? 'alquiler'
          : 'buscar',
    [forcedOperation]
  )

  const [assistantHint, setAssistantHint] = useState<{
    summary: string
    total: number
    messages?: string[]
    primaryTotal?: number
  } | null>(null)

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

  const displayActiveSummary =
    activeSummaryRaw === 'Perfil de búsqueda sin criterios guardados.'
      ? S.buscarActiveSummaryEmpty
      : activeSummaryRaw

  const hasActiveSearchCriteria =
    activeSummaryRaw !== 'Perfil de búsqueda sin criterios guardados.'

  useEffect(() => {
    if (hasActiveSearchCriteria) setGuidedLayerExpanded(true)
  }, [hasActiveSearchCriteria])

  const clearBuscarSearch = useCallback(() => {
    setShowMap(false)
    setMapLiveViewport(false)
    setAssistantHint(null)
    router.replace(pathname)
  }, [router, pathname])

  const searchParamsKey = searchParams.toString()

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
    setPolygonDrawMode(false)
    setMapLiveViewport(false)
  }, [searchParamsKey, forcedOperation])

  useEffect(() => {
    if (flowDialogOpen) setFlowGuideDontShowAgain(false)
  }, [flowDialogOpen])

  const confirmFlowGuideDialog = useCallback(() => {
    if (flowGuideDontShowAgain) {
      try {
        localStorage.setItem(FLOW_GUIDE_STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
    }
    setFlowDialogOpen(false)
  }, [flowGuideDontShowAgain])

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

  const openRefineFromAssistant = useCallback(() => {
    setClassicFiltersOpen(true)
    setGuidedLayerExpanded(true)
    scrollToElementId('buscar-capa-2')
  }, [scrollToElementId])

  const quickFacetIds = contextualBlock?.quickFacetIds
  const showQuickAmenityChips = (quickFacetIds?.length ?? 0) > 0

  return (
    <div className="container mx-auto space-y-4 px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/12 text-brand-primary shadow-sm ring-1 ring-brand-primary/10"
                  aria-hidden
                >
                  <Search className="h-5 w-5" strokeWidth={2} />
                </span>
                <h1 className="text-xl font-bold tracking-tight text-text-primary md:text-2xl">
                  {pageTitle}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto gap-1 p-0 text-sm font-medium text-brand-primary"
                  onClick={() => setFlowDialogOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  {S.buscarFlowLinkInline}
                </Button>
                <Button
                  type="button"
                  variant={classicFiltersOpen ? 'outline' : 'default'}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setClassicFiltersOpen((v) => !v)}
                >
                  <Filter className="h-3.5 w-3.5" aria-hidden />
                  {classicFiltersOpen
                    ? S.filtersOptionalCollapse
                    : S.filtersOptionalExpand}
                </Button>
              </div>
            </div>
            <p className="max-w-2xl text-xs leading-snug text-text-tertiary md:text-sm">
              {pageSubtitle}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 lg:shrink-0 lg:items-end">
            {me ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saveProfile.isPending}
                  onClick={() => saveProfile.mutate(demandPayload)}
                >
                  {saveProfile.isPending
                    ? S.saveProfilePending
                    : S.saveProfile}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  disabled={createAlert.isPending}
                  onClick={() => createAlert.mutate(alertPayload)}
                >
                  {createAlert.isPending
                    ? S.createAlertPending
                    : S.createAlert}
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
                  <Link href="/buscar">{S.allOperations}</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm">
                <Link href="/">{S.homeLink}</Link>
              </Button>
            </div>
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

        {me ? <BuscarRecentSearches /> : null}

        {hasActiveSearchCriteria ? (
          <Card className="border-brand-primary/15 bg-gradient-to-r from-surface-elevated to-brand-primary/[0.06] p-2.5 shadow-sm sm:p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary/90">
                  <Search className="h-3 w-3" aria-hidden />
                  {S.buscarActiveSummaryLabel}
                </p>
                <p className="text-xs leading-snug text-text-primary md:text-sm">
                  {displayActiveSummary}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 self-start sm:self-center"
                onClick={clearBuscarSearch}
              >
                {S.buscarClearSearch}
              </Button>
            </div>
          </Card>
        ) : null}

        <div
          id="buscar-asistente"
          className="scroll-mt-24 relative overflow-hidden rounded-2xl border border-brand-primary/20 bg-gradient-to-br from-surface-elevated via-brand-primary/[0.05] to-brand-secondary/25 p-4 shadow-md ring-1 ring-border/40 md:p-5"
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-primary/10 blur-2xl"
            aria-hidden
          />
          <div className="relative">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/25 bg-brand-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {S.buscarAssistantBadge}
              </span>
            </div>
          <ConversationalSearchBlock
            variant="buscar"
            routerMode="replace"
            searchPathPage={searchPathPage}
            forcedOperation={forcedOperation}
            onAfterNavigate={setAssistantHint}
            compact
            buscarSearchParamsKey={searchParamsKey}
          />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-9 gap-1.5"
              onClick={openMapFromAssistant}
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden />
              {S.buscarOpenMapCta}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setClassicFiltersOpen(true)}
            >
              <Filter className="h-3.5 w-3.5" aria-hidden />
              {S.filtersOptionalExpand}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={openRefineFromAssistant}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {S.moreRefineLayer}
            </Button>
          </div>
          {!classicFiltersOpen ? (
            <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
              {contextualBlock ? (
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {contextualBlock.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-text-secondary">
                    {contextualBlock.body}
                  </p>
                </div>
              ) : null}
              {showQuickAmenityChips ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {S.facetChipsTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {S.facetChipsHintRefine}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickFacetIds!.map((fid) => {
                      const def = facetFlagCatalog.find((f) => f.id === fid)
                      if (!def) return null
                      const on = selectedAmenityFacets.includes(fid)
                      return (
                        <Button
                          key={`asistente-facet-${fid}`}
                          type="button"
                          size="sm"
                          variant={on ? 'default' : 'outline'}
                          className="h-8 text-xs"
                          onClick={() =>
                            setSelectedAmenityFacets((prev) =>
                              on ? prev.filter((x) => x !== fid) : [...prev, fid]
                            )
                          }
                        >
                          {def.label}
                        </Button>
                      )
                    })}
                  </div>
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
              ) : (
                <InductiveSearchChips variant="embedded" showSubtitle={false} />
              )}
            </div>
          ) : null}
          </div>
        </div>

        {assistantHint ? (
          <Card className="space-y-2 border-brand-primary/25 bg-brand-primary/5 p-3 md:space-y-3 md:p-4">
            <p className="text-sm font-semibold text-text-primary">
              {S.conversationalInterpretedTitle}
            </p>
            <p className="text-sm text-text-secondary leading-snug">
              {assistantHint.summary}
            </p>
            {assistantHint.messages && assistantHint.messages.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-xs text-text-secondary md:text-sm">
                {assistantHint.messages.map((m, i) => (
                  <li key={`hint-msg-${i}`}>{m}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-sm text-text-primary">
              {assistantHint.total > 0 ? (
                <>
                  {S.conversationalResultsPrefix}:{' '}
                  <strong>{assistantHint.total}</strong>
                  {assistantHint.primaryTotal !== undefined &&
                  assistantHint.primaryTotal === 0 &&
                  assistantHint.total > 0 ? (
                    <span className="mt-1 block text-xs font-normal text-text-secondary">
                      {S.conversationalRelaxedCountNote}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-text-secondary">{S.conversationalResultsZero}</span>
              )}
            </p>
            <p className="text-xs font-medium text-text-secondary">
              {S.conversationalNextTitle}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openMapFromAssistant}
              >
                {S.conversationalNextMap}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setClassicFiltersOpen(true)
                  setShowDeepFilters(true)
                  window.requestAnimationFrame(() =>
                    document
                      .getElementById('buscar-capa-3')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  )
                }}
              >
                {S.conversationalNextFilters}
              </Button>
              <Button type="button" variant="ghost" size="sm" asChild>
                <a href="#buscar-resultados">{S.conversationalScrollResults}</a>
              </Button>
            </div>
            <p className="text-xs text-text-secondary">{S.conversationalNextAgain}</p>
          </Card>
        ) : null}

        <div id="buscar-esenciales" className="scroll-mt-24 space-y-4">
          {classicFiltersOpen ? (
            <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {S.mainFiltersTitle}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {S.mainFiltersSubtitle}
            </p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
            {S.buscarLayer1Kicker}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            {S.locationBlockTitle}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            className="scroll-mt-24 space-y-2 rounded-lg border border-border/60 bg-surface-primary/80 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="text-xs font-semibold text-text-primary">
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
                      onClick={() => setMapBbox(null)}
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
            <div className="md:col-span-2 lg:col-span-4">
              <BuscarLabeledField id="buscar-q" label={S.buscarFieldKeywords}>
                <Input
                  id="buscar-q"
                  placeholder={S.keywordPlaceholder}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </BuscarLabeledField>
            </div>
          </div>

          {!showQuickAmenityChips ? (
            <div className="pt-1">
              <InductiveSearchChips variant="embedded" showSubtitle={false} />
            </div>
          ) : null}

          <section
            id="buscar-capa-2"
            className="scroll-mt-24 rounded-xl border border-border/80 bg-surface-secondary/40 p-3 md:p-4"
            aria-label={S.buscarLayer2Title}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setGuidedLayerExpanded((v) => !v)}
            >
              <span className="text-sm font-semibold text-text-primary">
                {S.buscarLayer2Title}
              </span>
              <span className="shrink-0 text-xs font-semibold text-brand-primary">
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
                <p className="text-xs leading-relaxed text-text-secondary">
                  {S.buscarLayer2Subtitle}
                </p>
                {contextualBlock ? (
                  <div
                    className="space-y-3 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3"
                    role="region"
                  >
                    <h3 className="text-sm font-semibold text-text-primary">
                      {contextualBlock.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-text-secondary">
                      {contextualBlock.body}
                    </p>
                    {(contextualBlock.quickFacetIds ?? []).length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-text-tertiary">
                          {S.buscarLayer2QuickChipsHint}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(contextualBlock.quickFacetIds ?? [])
                            .slice(0, 6)
                            .map((fid) => {
                              const def = facetFlagCatalog.find((f) => f.id === fid)
                              if (!def) return null
                              const on = selectedAmenityFacets.includes(fid)
                              return (
                                <Button
                                  key={`guided-facet-${fid}`}
                                  type="button"
                                  size="sm"
                                  variant={on ? 'default' : 'outline'}
                                  className="h-8 text-xs"
                                  onClick={() =>
                                    setSelectedAmenityFacets((prev) =>
                                      on
                                        ? prev.filter((x) => x !== fid)
                                        : [...prev, fid]
                                    )
                                  }
                                >
                                  {def.label}
                                </Button>
                              )
                            })}
                        </div>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs"
                      onClick={() => {
                        setShowDeepFilters(true)
                        scrollToElementId('buscar-capa-3')
                      }}
                    >
                      {S.buscarOpenLayer3Cta}
                    </Button>
                  </div>
                ) : null}
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

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mr-auto text-text-secondary hover:text-text-primary"
              onClick={() => setClassicFiltersOpen(false)}
            >
              {S.filtersOptionalCollapse}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeepFilters((v) => !v)}
            >
              {showDeepFilters ? S.buscarCloseLayer3Cta : S.buscarOpenLayer3Cta}
            </Button>
          </div>

          {showDeepFilters ? (
            <div
              id="buscar-capa-3"
              className="scroll-mt-24 space-y-4 border-t border-border pt-4"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {S.buscarLayer3Title}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {S.buscarLayer3Subtitle}
                </p>
              </div>
              <p className="text-sm font-medium text-text-primary">
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

        <div id="buscar-resultados" className="scroll-mt-24 space-y-6">
          {data?.searchUX?.messages && data.searchUX.messages.length > 0 ? (
            <div className="space-y-2" role="status" aria-live="polite">
              {data.searchUX.messages.map((msg, i) => (
                <Card
                  key={`search-ux-${i}`}
                  className="border-brand-primary/20 bg-brand-primary/5 p-3 text-sm leading-relaxed text-text-primary"
                >
                  {msg}
                </Card>
              ))}
            </div>
          ) : null}
          {isError ? (
            <Card className="space-y-2 p-6">
              <p className="text-sm font-medium text-text-primary">{S.searchLoadErrorSoftTitle}</p>
              <p className="text-sm text-text-secondary">{S.searchLoadErrorSoftBody}</p>
            </Card>
          ) : isLoading && !data && accumulatedListings.length === 0 ? (
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
                {S.emptyResults}
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-text-primary">Resultados</p>
                <div
                  className="inline-flex w-full max-w-xs rounded-lg border border-border/80 bg-surface-secondary/60 p-0.5 sm:w-auto"
                  role="group"
                  aria-label="Vista de resultados"
                >
                  <Button
                    type="button"
                    variant={!showMap ? 'default' : 'ghost'}
                    size="sm"
                    className="h-9 flex-1 rounded-md px-3 text-xs sm:flex-none sm:text-sm"
                    onClick={() => setShowMap(false)}
                  >
                    Lista
                  </Button>
                  <Button
                    type="button"
                    variant={showMap ? 'default' : 'ghost'}
                    size="sm"
                    className="h-9 flex-1 rounded-md px-3 text-xs sm:flex-none sm:text-sm"
                    onClick={() => {
                      setShowMap(true)
                      scrollToElementId('buscar-mapa')
                    }}
                  >
                    <MapIcon className="mr-1.5 hidden h-3.5 w-3.5 sm:inline" aria-hidden />
                    Mapa
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing, index) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    mapSelectedListingId={mapSyncSelectedId}
                    onMapSyncHover={
                      showMap && mapPins.length > 0 ? onMapSyncHover : undefined
                    }
                    onResultLinkClick={(listingId) =>
                      onSearchResultNavigate(listingId, 'list', index)
                    }
                  />
                ))}
              </div>
              {data && data.total > 0 ? (
                <p className="text-center text-sm text-text-secondary">
                  {S.buscarShowingCount
                    .replace('{shown}', String(listings.length))
                    .replace('{total}', String(data.total))}
                </p>
              ) : null}
              {canLoadMore ? (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isFetching}
                    onClick={loadMoreResults}
                  >
                    {isFetching ? S.buscarLoadingMore : S.buscarLoadMore}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
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

      <Dialog open={flowDialogOpen} onOpenChange={setFlowDialogOpen}>
        <DialogContent className="max-w-md gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{S.buscarFlowDialogOpen}</DialogTitle>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-text-secondary">
            <li>{S.buscarFlowStep1}</li>
            <li>{S.buscarFlowStep2}</li>
            <li>{S.buscarFlowStep3}</li>
            <li>{S.buscarFlowStep4}</li>
          </ol>
          <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:justify-stretch sm:space-x-0">
            <label
              htmlFor="propieya-flow-guide-dismiss"
              className="flex cursor-pointer items-start gap-2 text-left text-sm text-text-secondary"
            >
              <input
                id="propieya-flow-guide-dismiss"
                type="checkbox"
                className="mt-0.5 shrink-0 rounded border-border"
                checked={flowGuideDontShowAgain}
                onChange={(e) => setFlowGuideDontShowAgain(e.target.checked)}
              />
              <span>{S.buscarFlowDialogDontShowAgain}</span>
            </label>
            <Button
              type="button"
              className="w-full"
              onClick={confirmFlowGuideDialog}
            >
              {S.buscarFlowDialogConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
