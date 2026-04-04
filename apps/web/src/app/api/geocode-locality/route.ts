import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UA = 'PropieyaWeb/1.0 (https://propieyaweb.vercel.app/contacto)'

/**
 * Geocodifica ciudad/barrio (Argentina) vía Nominatim; uso acotado para centro del mapa y orden por cercanía.
 */
export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get('city')?.trim() ?? ''
  const neighborhood = request.nextUrl.searchParams.get('neighborhood')?.trim() ?? ''
  if (!city && !neighborhood) {
    return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 })
  }
  if (city.length > 120 || neighborhood.length > 120) {
    return NextResponse.json({ ok: false, reason: 'too_long' }, { status: 400 })
  }

  const q = [neighborhood, city, 'Argentina'].filter(Boolean).join(', ')
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 86_400 },
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: 'upstream' }, { status: 502 })
    }

    const data = (await res.json()) as { lat?: string; lon?: string }[]
    const first = Array.isArray(data) ? data[0] : undefined
    const lat = first?.lat != null ? Number.parseFloat(first.lat) : NaN
    const lng = first?.lon != null ? Number.parseFloat(first.lon) : NaN
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ ok: false, reason: 'not_found' })
    }

    return NextResponse.json({
      ok: true,
      lat,
      lng,
      attribution: '© OpenStreetMap contributors (Nominatim)',
    })
  } catch {
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 502 })
  }
}
