/**
 * Serialización de bbox / polígono del mapa en query de `/buscar` (alertas, enlaces compartibles).
 */

export type BuscarMapBBoxUrl = {
  south: number
  north: number
  west: number
  east: number
}

export type BuscarMapPointUrl = { lat: number; lng: number }

const ROUND = 5

function n(x: number): string {
  return Number(x.toFixed(ROUND)).toString()
}

/**
 * Escribe `poly` (prioridad) o `bbox` en `URLSearchParams`; borra ambas si no hay geo válido.
 */
export function serializeBuscarMapGeoToParams(
  params: URLSearchParams,
  opts: { bbox?: BuscarMapBBoxUrl | null; polygon?: BuscarMapPointUrl[] | null }
): void {
  params.delete('bbox')
  params.delete('poly')
  const ring = opts.polygon
  if (ring && ring.length >= 3) {
    params.set(
      'poly',
      ring.map((p) => `${n(p.lat)},${n(p.lng)}`).join('|')
    )
    return
  }
  const b = opts.bbox
  if (
    b &&
    Number.isFinite(b.south) &&
    Number.isFinite(b.north) &&
    Number.isFinite(b.west) &&
    Number.isFinite(b.east)
  ) {
    params.set('bbox', `${n(b.south)},${n(b.north)},${n(b.west)},${n(b.east)}`)
  }
}

function parsePoint(part: string): BuscarMapPointUrl | null {
  const [a, b] = part.split(',')
  const lat = Number(a)
  const lng = Number(b)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

/**
 * Lee `poly` (si hay ≥3 vértices válidos) o `bbox` (4 números: south,north,west,east).
 */
export function parseBuscarMapGeoFromParams(sp: URLSearchParams): {
  bbox: BuscarMapBBoxUrl | null
  polygon: BuscarMapPointUrl[]
} {
  const polyRaw = sp.get('poly')
  if (polyRaw && polyRaw.length > 0) {
    const ring: BuscarMapPointUrl[] = []
    for (const part of polyRaw.split('|')) {
      const p = parsePoint(part.trim())
      if (p) ring.push(p)
    }
    if (ring.length >= 3) {
      return { bbox: null, polygon: ring }
    }
  }

  const bboxRaw = sp.get('bbox')
  if (bboxRaw) {
    const bits = bboxRaw.split(',').map((x) => Number(x.trim()))
    if (bits.length === 4 && bits.every((x) => Number.isFinite(x))) {
      const south = bits[0]!
      const north = bits[1]!
      const west = bits[2]!
      const east = bits[3]!
      if (south <= north && west <= east) {
        return {
          bbox: { south, north, west, east },
          polygon: [],
        }
      }
    }
  }

  return { bbox: null, polygon: [] }
}
