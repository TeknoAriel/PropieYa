/** Punto en WGS84 para validación de trazo en mapa (lat/lng). */
export type MapLatLng = { lat: number; lng: number }

function ccw(a: MapLatLng, b: MapLatLng, c: MapLatLng): boolean {
  return (
    (c.lat - a.lat) * (b.lng - a.lng) > (b.lat - a.lat) * (c.lng - a.lng)
  )
}

/** Intersección propia de segmentos ab y cd (excluye solape colineal largo; suficiente para UX de dibujo). */
export function segmentsIntersectOpen(
  a: MapLatLng,
  b: MapLatLng,
  c: MapLatLng,
  d: MapLatLng
): boolean {
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d)
}

/**
 * Indica si el segmento del último vértice al nuevo punto cruza algún tramo
 * ya trazado (polilínea abierta). Evita “lazos” y figuras con aristas cruzadas.
 */
export function newVertexCrossesOpenPolyline(
  ring: MapLatLng[],
  newPoint: MapLatLng
): boolean {
  if (ring.length < 2) return false
  const a = ring[ring.length - 1]!
  const b = newPoint
  const lastSegIndex = ring.length - 2
  for (let i = 0; i < ring.length - 1; i++) {
    if (i === lastSegIndex) continue
    const c = ring[i]!
    const d = ring[i + 1]!
    if (segmentsIntersectOpen(a, b, c, d)) return true
  }
  return false
}
