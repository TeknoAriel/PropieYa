/** Punto en WGS84 para validación de trazo en mapa (lat/lng). */
export type MapLatLng = { lat: number; lng: number }

const EPS = 1e-10

/** Producto cruzado orientado en plano (lng ≈ x, lat ≈ y) para áreas chicas. */
function orient(a: MapLatLng, b: MapLatLng, c: MapLatLng): number {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)
}

function onSegment(a: MapLatLng, b: MapLatLng, p: MapLatLng): boolean {
  return (
    p.lng <= Math.max(a.lng, b.lng) + EPS &&
    p.lng >= Math.min(a.lng, b.lng) - EPS &&
    p.lat <= Math.max(a.lat, b.lat) + EPS &&
    p.lat >= Math.min(a.lat, b.lat) - EPS
  )
}

/**
 * Los segmentos ab y cd se cruzan en el interior (o tocan en forma inválida para un polígono simple).
 */
export function segmentsIntersectOpen(
  a: MapLatLng,
  b: MapLatLng,
  c: MapLatLng,
  d: MapLatLng
): boolean {
  const o1 = orient(a, b, c)
  const o2 = orient(a, b, d)
  const o3 = orient(c, d, a)
  const o4 = orient(c, d, b)

  if (o1 * o2 < -EPS && o3 * o4 < -EPS) return true
  if (Math.abs(o1) < EPS && onSegment(a, b, c)) return true
  if (Math.abs(o2) < EPS && onSegment(a, b, d)) return true
  if (Math.abs(o3) < EPS && onSegment(c, d, a)) return true
  if (Math.abs(o4) < EPS && onSegment(c, d, b)) return true
  return false
}

function samePoint(p: MapLatLng, q: MapLatLng): boolean {
  return Math.abs(p.lat - q.lat) < EPS && Math.abs(p.lng - q.lng) < EPS
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

/**
 * Al cerrar el polígono, Leaflet une el último vértice con el primero.
 * Hay que rechazar el nuevo punto si esa arista de cierre cruza la cadena abierta.
 */
export function closingEdgeWouldCrossOpenChain(
  ring: MapLatLng[],
  newPoint: MapLatLng
): boolean {
  const n = ring.length
  if (n < 2) return false
  const first = ring[0]!
  const a = newPoint
  const b = first
  for (let i = 0; i < n - 1; i++) {
    const c = ring[i]!
    const d = ring[i + 1]!
    // Adyacente al cierre en el primer vértice
    if (i === 0) continue
    if (segmentsIntersectOpen(a, b, c, d)) return true
  }
  return false
}

function polygonEdgesAdjacent(n: number, i: number, j: number): boolean {
  const i2 = (i + 1) % n
  const j2 = (j + 1) % n
  return i === j || i === j2 || i2 === j || i2 === j2
}

/**
 * Polígono cerrado (orden V0..Vn-1, arista implícita Vn-1→V0) con auto-intersección.
 */
export function simplePolygonHasSelfIntersection(ring: MapLatLng[]): boolean {
  const n = ring.length
  if (n < 4) return false
  for (let i = 0; i < n; i++) {
    const a = ring[i]!
    const b = ring[(i + 1) % n]!
    for (let j = i + 1; j < n; j++) {
      if (polygonEdgesAdjacent(n, i, j)) continue
      const c = ring[j]!
      const d = ring[(j + 1) % n]!
      if (segmentsIntersectOpen(a, b, c, d)) return true
    }
  }
  return false
}

/**
 * ¿Se puede añadir `p` manteniendo un polígono simple al cerrarlo visualmente?
 */
export function canAppendPolygonVertex(ring: MapLatLng[], p: MapLatLng): boolean {
  if (ring.length > 0) {
    const last = ring[ring.length - 1]!
    if (samePoint(last, p)) return false
  }
  if (ring.length >= 2) {
    if (newVertexCrossesOpenPolyline(ring, p)) return false
    if (closingEdgeWouldCrossOpenChain(ring, p)) return false
  }
  const candidate = [...ring, p]
  if (candidate.length >= 4 && simplePolygonHasSelfIntersection(candidate)) {
    return false
  }
  return true
}
