import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { portalCityPathSlugToLabel } from '@propieya/shared'

/** Evita redirigir rutas técnicas si aparecen bajo /venta o /alquiler. */
const RESERVED_PATH_SEGMENTS = new Set(
  ['buscar', 'api', '_next', 'propiedad', 'favicon.ico'].map((s) => s.toLowerCase())
)

function maybeRedirectCityLanding(
  request: NextRequest,
  basePath: '/venta' | '/alquiler'
): NextResponse | null {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith(`${basePath}/`)) return null
  const rest = pathname.slice(basePath.length + 1)
  if (!rest || rest.includes('/')) return null
  const slug = rest.trim()
  if (!slug || slug.includes('.') || RESERVED_PATH_SEGMENTS.has(slug.toLowerCase())) {
    return null
  }
  const city = portalCityPathSlugToLabel(slug)
  if (!city) return null
  const url = request.nextUrl.clone()
  url.pathname = basePath
  url.search = ''
  url.searchParams.set('ciudad', city)
  return NextResponse.redirect(url, 308)
}

export function middleware(request: NextRequest) {
  const venta = maybeRedirectCityLanding(request, '/venta')
  if (venta) return venta
  const alquiler = maybeRedirectCityLanding(request, '/alquiler')
  if (alquiler) return alquiler
  return NextResponse.next()
}

export const config = {
  matcher: ['/venta/:path+', '/alquiler/:path+'],
}
