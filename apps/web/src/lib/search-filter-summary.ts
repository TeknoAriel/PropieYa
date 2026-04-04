import {
  OPERATION_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
} from '@propieya/shared'
import type { PropertyType } from '@propieya/shared'

import type { ListingSearchFiltersInput } from '../server/routers/listing-search-input'

const AMENITY_SHORT: Record<string, string> = {
  balcony: 'balcón',
  terrace: 'terraza',
  parking: 'cochera',
  air_conditioning: 'aire',
  heating: 'calefacción',
  fireplace: 'hogar',
  pool: 'pileta',
  gym: 'gimnasio',
  garden: 'jardín',
  elevator: 'ascensor',
  doorman: 'portero',
  furnished: 'amoblado',
}

/** Texto breve para `search_alerts.filters_summary` (máx. 500 en DB). */
export function buildFiltersSummary(f: ListingSearchFiltersInput): string {
  const parts: string[] = []

  if (f.q?.trim()) {
    const t = f.q.trim()
    parts.push(t.length > 48 ? `${t.slice(0, 45)}…` : t)
  }

  if (f.operationType) {
    parts.push(
      OPERATION_TYPE_LABELS[f.operationType] ?? f.operationType
    )
  }

  if (f.propertyType) {
    const pt = f.propertyType as PropertyType
    parts.push(PROPERTY_TYPE_LABELS[pt] ?? f.propertyType)
  }

  if (f.city?.trim()) parts.push(f.city.trim())
  if (f.neighborhood?.trim()) parts.push(`Barrio ${f.neighborhood.trim()}`)

  if (f.minPrice != null || f.maxPrice != null) {
    const a =
      f.minPrice != null ? `$≥${Math.round(f.minPrice).toLocaleString('es-AR')}` : ''
    const b =
      f.maxPrice != null ? `$≤${Math.round(f.maxPrice).toLocaleString('es-AR')}` : ''
    parts.push(`Precio ${[a, b].filter(Boolean).join(' ')}`.trim())
  }

  if (f.minSurface != null || f.maxSurface != null) {
    const bits: string[] = []
    if (f.minSurface != null) bits.push(`≥${f.minSurface} m²`)
    if (f.maxSurface != null) bits.push(`≤${f.maxSurface} m²`)
    parts.push(bits.join(' '))
  }

  if (f.minBedrooms != null) parts.push(`≥${f.minBedrooms} dorm.`)
  if (f.minBathrooms != null) parts.push(`≥${f.minBathrooms} baños`)
  if (f.minGarages != null) parts.push(`≥${f.minGarages} coch.`)

  if (f.floorMin != null || f.floorMax != null) {
    parts.push(
      `Piso ${f.floorMin ?? '—'}-${f.floorMax ?? '—'}`
    )
  }
  if (f.escalera?.trim()) parts.push(`Esc. ${f.escalera.trim()}`)
  if (f.orientation) parts.push(`Orient. ${f.orientation}`)
  if (f.minSurfaceCovered != null || f.maxSurfaceCovered != null) {
    const bits: string[] = []
    if (f.minSurfaceCovered != null) bits.push(`cub≥${f.minSurfaceCovered}`)
    if (f.maxSurfaceCovered != null) bits.push(`cub≤${f.maxSurfaceCovered}`)
    parts.push(bits.join(' '))
  }
  if (f.minTotalRooms != null) parts.push(`≥${f.minTotalRooms} amb.`)

  if (f.amenities?.length) {
    const labels = f.amenities
      .map((a) => AMENITY_SHORT[a] ?? a)
      .slice(0, 6)
    parts.push(labels.join(', '))
  }

  if (f.bbox) {
    parts.push('Zona del mapa')
  }

  let s = parts.filter(Boolean).join(' · ')
  if (s.length > 480) s = `${s.slice(0, 477)}…`
  if (!s) s = 'Búsqueda guardada'
  return s
}

/** Resumen para filas de `search_history` (JSON con posibles `limit`/`offset`). */
export function summarizeSearchHistoryFilters(filters: unknown): string {
  if (!filters || typeof filters !== 'object') return 'Búsqueda'
  const o = filters as Record<string, unknown>
  const { limit: _l, offset: _o, ...rest } = o
  let s = buildFiltersSummary(rest as ListingSearchFiltersInput)
  if (Array.isArray(rest.polygon) && rest.polygon.length >= 3 && !s.includes('Polígono')) {
    s = s === 'Búsqueda guardada' ? 'Polígono en mapa' : `${s} · Polígono`
  }
  return s
}
