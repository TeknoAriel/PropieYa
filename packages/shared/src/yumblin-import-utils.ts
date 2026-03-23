import { createHash } from 'crypto'

import type { MappedListingRow } from './xml/yumblin-mapper'

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}

/**
 * Hash estable del contenido importable para detectar actualizaciones sin comparar campo a campo.
 */
export function computeImportContentHash(mapped: MappedListingRow): string {
  const payload = {
    title: mapped.title,
    description: mapped.description,
    propertyType: mapped.propertyType,
    operationType: mapped.operationType,
    address: mapped.address,
    priceAmount: mapped.priceAmount,
    priceCurrency: mapped.priceCurrency,
    surfaceTotal: mapped.surfaceTotal,
    bedrooms: mapped.bedrooms,
    bathrooms: mapped.bathrooms,
    locationLat: mapped.locationLat,
    locationLng: mapped.locationLng,
    imageUrls: mapped.imageUrls,
    primaryImageUrl: mapped.primaryImageUrl,
  }
  return sha256Hex(JSON.stringify(payload))
}

export function sha256HexFromString(body: string): string {
  return sha256Hex(body)
}

export type YumblinFeedFetchResult =
  | { kind: 'not_modified' }
  | {
      kind: 'ok'
      data: unknown
      etag?: string
      lastModified?: string
      bodySha256: string
    }

/**
 * GET del feed con If-None-Match / If-Modified-Since.
 * Si el servidor responde 304, no hay body nuevo.
 */
export async function fetchYumblinFeedConditional(
  url: string,
  opts?: { etag?: string | null; lastModified?: string | null }
): Promise<YumblinFeedFetchResult> {
  const headers = new Headers()
  if (opts?.etag) headers.set('If-None-Match', opts.etag)
  if (opts?.lastModified) headers.set('If-Modified-Since', opts.lastModified)

  const res = await fetch(url, { headers })

  if (res.status === 304) {
    return { kind: 'not_modified' }
  }

  if (!res.ok) {
    throw new Error(`Feed HTTP ${res.status}: ${res.statusText}`)
  }

  const text = await res.text()
  return {
    kind: 'ok',
    data: JSON.parse(text) as unknown,
    etag: res.headers.get('etag') ?? undefined,
    lastModified: res.headers.get('last-modified') ?? undefined,
    bodySha256: sha256HexFromString(text),
  }
}
