'use client'

import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import { PORTAL_SEARCH_UX_COPY } from '@propieya/shared'
import { Button } from '@propieya/ui'

import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

export { BUSCAR_MAP_DEFAULT_CENTER } from './buscar-map-constants'

export type BuscarMapBBox = {
  south: number
  north: number
  west: number
  east: number
}

export type BuscarMapPin = {
  id: string
  title: string
  lat: number
  lng: number
}

export type BuscarMapPoint = { lat: number; lng: number }

function CurrentCenterReporter({
  onCenter,
}: {
  onCenter: (center: { lat: number; lng: number }) => void
}) {
  const map = useMap()
  useEffect(() => {
    const report = () => {
      const c = map.getCenter()
      onCenter({ lat: c.lat, lng: c.lng })
    }
    report()
    map.on('moveend', report)
    return () => {
      map.off('moveend', report)
    }
  }, [map, onCenter])
  return null
}

/**
 * Centra el mapa en los pins solo cuando aparecen por primera vez (o tras quedar
 * sin pins y volver a haber datos). Evita que cada refetch de resultados “robe”
 * el pan/zoom del usuario cuando el bbox vive actualizado por moveend.
 */
function FitBoundsOnce({ points }: { points: [number, number][] }) {
  const map = useMap()
  const didFit = useRef(false)
  useEffect(() => {
    if (points.length === 0) return
    if (didFit.current) return
    didFit.current = true
    if (points.length === 1) {
      const only = points[0]
      if (only) map.setView(only, 14)
      return
    }
    const b = L.latLngBounds(points)
    if (b.isValid()) {
      map.fitBounds(b, { padding: [32, 32], maxZoom: 15 })
    }
  }, [map, points])
  return null
}

function ViewportBboxReporter({
  onBbox,
}: {
  onBbox: (bbox: BuscarMapBBox) => void
}) {
  const map = useMap()
  useEffect(() => {
    const report = () => {
      const b = map.getBounds()
      onBbox({
        south: b.getSouth(),
        north: b.getNorth(),
        west: b.getWest(),
        east: b.getEast(),
      })
    }
    report()
    map.on('moveend', report)
    return () => {
      map.off('moveend', report)
    }
  }, [map, onBbox])
  return null
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
}

/** Sprint 37 — centrar mapa al enfocar un aviso desde la lista. */
function FlyToPinHighlight({
  lat,
  lng,
}: {
  lat: number | undefined
  lng: number | undefined
}) {
  const map = useMap()
  useEffect(() => {
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.45 })
  }, [map, lat, lng])
  return null
}

/** Agrupa marcadores en zoom bajo (doc 38 AA — clusters). */
function ClusteredPins({
  pins,
  emphasisPinId,
  onPinClickListing,
}: {
  pins: BuscarMapPin[]
  emphasisPinId?: string | null
  onPinClickListing?: (listingId: string) => void
}) {
  const map = useMap()

  useEffect(() => {
    const mcg = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 56,
      disableClusteringAtZoom: 16,
    })

    for (const p of pins) {
      const isEmphasis = emphasisPinId === p.id
      const cm = L.circleMarker([p.lat, p.lng], {
        radius: isEmphasis ? 11 : 8,
        color: isEmphasis ? '#1e40af' : '#2563eb',
        fillColor: isEmphasis ? '#1d4ed8' : '#3b82f6',
        fillOpacity: isEmphasis ? 0.95 : 0.85,
        weight: isEmphasis ? 3 : 2,
      })
      const safeTitle = escapeHtml(p.title)
      cm.bindPopup(
        `<a href="/propiedad/${escapeHtml(p.id)}" class="text-sm font-medium text-blue-600 hover:underline">${safeTitle}</a>`,
      )
      if (onPinClickListing) {
        cm.on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          onPinClickListing(p.id)
        })
      }
      mcg.addLayer(cm)
    }

    map.addLayer(mcg)
    return () => {
      mcg.clearLayers()
      map.removeLayer(mcg)
    }
  }, [map, pins, emphasisPinId, onPinClickListing])

  return null
}

function PolygonDrawClicks({
  enabled,
  onVertex,
}: {
  enabled: boolean
  onVertex: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return
      onVertex(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function PolygonDraftOverlay({ ring }: { ring: BuscarMapPoint[] }) {
  if (ring.length < 2) return null
  const positions = ring.map((p) => [p.lat, p.lng] as [number, number])
  if (ring.length >= 3) {
    return (
      <Polygon
        positions={positions}
        pathOptions={{
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
          weight: 2,
        }}
      />
    )
  }
  return (
    <Polyline positions={positions} pathOptions={{ color: '#2563eb', weight: 2 }} />
  )
}

function ZonaControls({
  onApplyZona,
}: {
  onApplyZona: (bbox: BuscarMapBBox) => void
}) {
  const map = useMap()
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-[500] flex flex-col items-end gap-2">
      <div className="pointer-events-auto">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shadow-md"
          onClick={() => {
            const b = map.getBounds()
            onApplyZona({
              south: b.getSouth(),
              north: b.getNorth(),
              west: b.getWest(),
              east: b.getEast(),
            })
          }}
        >
          {PORTAL_SEARCH_UX_COPY.searchThisArea}
        </Button>
      </div>
    </div>
  )
}

type BuscarSearchMapProps = {
  pins: BuscarMapPin[]
  onApplyZona: (bbox: BuscarMapBBox) => void
  /** Centro inicial al montar (localidad geocodificada, usuario o default). */
  initialCenter: [number, number]
  initialZoom: number
  /** Cambia al actualizar ancla: fuerza remount de Leaflet. */
  mapRemountKey: string
  onCenterChange?: (center: { lat: number; lng: number }) => void
  /** Cada pan/zoom: viewport actual (el padre suele debouncear para filtrar resultados). */
  onViewportBboxChange?: (bbox: BuscarMapBBox) => void
  /** Vértices del polígono (búsqueda por área dibujada). */
  polygonRing?: BuscarMapPoint[]
  /** Si true, cada clic en el mapa agrega un vértice. */
  polygonDrawMode?: boolean
  onPolygonVertex?: (p: BuscarMapPoint) => void
  /** Sprint 37 — hover lista / clic pin: mismo id resalta marcador y tarjeta. */
  mapPinEmphasisId?: string | null
  onPinClickListing?: (listingId: string) => void
  /** Centrar mapa (p. ej. hover en tarjeta con coordenadas). */
  flyToPinCoords?: { lat: number; lng: number } | null
}

export function BuscarSearchMap({
  pins,
  onApplyZona,
  initialCenter,
  initialZoom,
  mapRemountKey,
  onCenterChange,
  onViewportBboxChange,
  polygonRing = [],
  polygonDrawMode = false,
  onPolygonVertex,
  mapPinEmphasisId = null,
  onPinClickListing,
  flyToPinCoords = null,
}: BuscarSearchMapProps) {
  const points = useMemo(
    () => pins.map((p) => [p.lat, p.lng] as [number, number]),
    [pins]
  )

  return (
    <div className="relative overflow-hidden rounded-lg border border-border">
      <MapContainer
        key={mapRemountKey}
        center={initialCenter}
        zoom={initialZoom}
        className="h-[min(420px,55vh)] w-full min-h-[280px] z-0"
        scrollWheelZoom
        dragging
        touchZoom
        doubleClickZoom
        boxZoom
        keyboard
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBoundsOnce points={points} />
        {onViewportBboxChange ? (
          <ViewportBboxReporter onBbox={onViewportBboxChange} />
        ) : null}
        {onCenterChange ? <CurrentCenterReporter onCenter={onCenterChange} /> : null}
        {onPolygonVertex ? (
          <>
            <PolygonDrawClicks
              enabled={polygonDrawMode}
              onVertex={(lat, lng) => onPolygonVertex({ lat, lng })}
            />
            <PolygonDraftOverlay ring={polygonRing} />
          </>
        ) : null}
        <ZonaControls onApplyZona={onApplyZona} />
        <FlyToPinHighlight lat={flyToPinCoords?.lat} lng={flyToPinCoords?.lng} />
        <ClusteredPins
          pins={pins}
          emphasisPinId={mapPinEmphasisId}
          onPinClickListing={onPinClickListing}
        />
      </MapContainer>
    </div>
  )
}
