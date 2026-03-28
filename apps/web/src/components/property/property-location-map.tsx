'use client'

type PropertyLocationMapProps = {
  lat: number
  lng: number
  title?: string
}

/**
 * Mapa embebido (OpenStreetMap). Sin API keys; respeta privacidad si la ficha no oculta dirección.
 */
export function PropertyLocationMap({ lat, lng, title }: PropertyLocationMapProps) {
  const delta = 0.012
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`
  const largeMapHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-surface-secondary">
        <iframe
          title={title ?? 'Ubicación en el mapa'}
          className="absolute inset-0 h-full w-full border-0"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <a
        href={largeMapHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-brand-primary hover:underline"
      >
        Abrir en OpenStreetMap
      </a>
    </div>
  )
}
