'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'

import { Button } from '@propieya/ui'

import 'leaflet/dist/leaflet.css'

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

const BA_DEFAULT: [number, number] = [-34.6037, -58.3816]

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
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
          Buscar en esta zona
        </Button>
      </div>
    </div>
  )
}

type BuscarSearchMapProps = {
  pins: BuscarMapPin[]
  onApplyZona: (bbox: BuscarMapBBox) => void
}

export function BuscarSearchMap({ pins, onApplyZona }: BuscarSearchMapProps) {
  const first = pins[0]
  const center: [number, number] = first
    ? [first.lat, first.lng]
    : BA_DEFAULT
  const points: [number, number][] = pins.map((p) => [p.lat, p.lng])

  return (
    <div className="relative overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={center}
        zoom={pins.length > 0 ? 13 : 11}
        className="h-[min(420px,55vh)] w-full min-h-[280px] z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <ZonaControls onApplyZona={onApplyZona} />
        {pins.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={8}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#3b82f6',
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <a
                href={`/propiedad/${p.id}`}
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                {p.title}
              </a>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
