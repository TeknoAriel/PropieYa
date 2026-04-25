/**
 * Path + query seguros para `?next=` en login/registro (mismo origen, sin open redirect).
 */
export function portalAuthNextParam(
  pathname: string | null | undefined,
  searchParamsString: string | null | undefined
): string {
  const path =
    pathname && pathname.trim().startsWith('/') && !pathname.trim().startsWith('//')
      ? pathname.trim()
      : '/'
  const raw = (searchParamsString ?? '').replace(/^\?/, '').trim()
  const full = raw ? `${path}?${raw}` : path
  if (full.startsWith('/login') || full.startsWith('/registro')) {
    return '/buscar'
  }
  if (!full.startsWith('/') || full.startsWith('//')) {
    return '/buscar'
  }
  return full
}

export function portalLoginHref(
  pathname: string | null | undefined,
  searchParamsString: string | null | undefined
): string {
  return `/login?next=${encodeURIComponent(portalAuthNextParam(pathname, searchParamsString))}`
}

export function portalRegistroHref(
  pathname: string | null | undefined,
  searchParamsString: string | null | undefined
): string {
  return `/registro?next=${encodeURIComponent(portalAuthNextParam(pathname, searchParamsString))}`
}
