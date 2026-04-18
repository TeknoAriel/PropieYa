/**
 * Continuidad ficha ↔ /buscar: query `returnTo` con path interno (solo `/buscar`).
 * Evita open-redirect: no se aceptan hosts ni rutas fuera de búsqueda.
 */

export const LISTING_RETURN_TO_PARAM = 'returnTo' as const

function isAllowedBuscarReturnPath(pathWithQuery: string): boolean {
  if (pathWithQuery.startsWith('//') || pathWithQuery.includes('://')) return false
  if (pathWithQuery === '/buscar') return true
  return pathWithQuery.startsWith('/buscar?') || pathWithQuery.startsWith('/buscar/')
}

export function encodeBuscarReturnPath(pathname: string, searchParamsString: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  const qs = searchParamsString.trim()
  const full = qs ? `${path}?${qs}` : path
  if (!isAllowedBuscarReturnPath(full)) return ''
  return encodeURIComponent(full)
}

export function buildListingHrefWithReturn(
  listingId: string,
  encodedReturnPath: string
): string {
  const base = `/propiedad/${listingId}`
  if (!encodedReturnPath) return base
  return `${base}?${LISTING_RETURN_TO_PARAM}=${encodedReturnPath}`
}

export function sanitizeListingReturnTo(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null
  try {
    const decoded = decodeURIComponent(raw.trim())
    if (!isAllowedBuscarReturnPath(decoded)) return null
    return decoded
  } catch {
    return null
  }
}

/** Para volver al listado y posicionar la tarjeta que el usuario había abierto. */
export function appendBuscarListingAnchor(returnPath: string, listingId: string): string {
  const [beforeHash] = returnPath.split('#')
  return `${beforeHash}#buscar-listing-${listingId}`
}

export function listingReturnToQuery(decodedReturnPath: string | null): string {
  if (!decodedReturnPath) return ''
  return `?${LISTING_RETURN_TO_PARAM}=${encodeURIComponent(decodedReturnPath)}`
}
