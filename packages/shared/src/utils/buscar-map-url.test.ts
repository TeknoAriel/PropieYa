import { describe, expect, it } from 'vitest'

import {
  parseBuscarMapGeoFromParams,
  serializeBuscarMapGeoToParams,
} from './buscar-map-url'

describe('buscar-map-url', () => {
  it('serializa y parsea bbox', () => {
    const p = new URLSearchParams()
    serializeBuscarMapGeoToParams(p, {
      bbox: { south: -34.6, north: -34.5, west: -58.5, east: -58.4 },
    })
    const { bbox, polygon } = parseBuscarMapGeoFromParams(p)
    expect(polygon).toEqual([])
    expect(bbox).toEqual({
      south: -34.6,
      north: -34.5,
      west: -58.5,
      east: -58.4,
    })
  })

  it('prioriza poly sobre bbox', () => {
    const p = new URLSearchParams()
    p.set('bbox', '1,2,3,4')
    serializeBuscarMapGeoToParams(p, {
      bbox: { south: 0, north: 1, west: 2, east: 3 },
      polygon: [
        { lat: -34, lng: -58 },
        { lat: -34.1, lng: -58 },
        { lat: -34.05, lng: -57.9 },
      ],
    })
    const { bbox, polygon } = parseBuscarMapGeoFromParams(p)
    expect(bbox).toBeNull()
    expect(polygon).toHaveLength(3)
  })
})
