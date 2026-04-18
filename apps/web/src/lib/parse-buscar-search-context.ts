/**
 * Parsea el path devuelto por `returnTo` (/buscar?...) para resumen de contexto en ficha.
 * Alineado a query params de `buscar-content.tsx` (op, tipo, ciudad, barrio, min, max, dorm, sup, amenities).
 */

import type { Currency, OperationType, PropertyType } from '@propieya/shared'

const PROPERTY_TYPES = [
  'apartment',
  'house',
  'ph',
  'land',
  'office',
  'commercial',
  'warehouse',
  'parking',
  'development_unit',
] as const satisfies readonly PropertyType[]

const OPERATIONS = ['sale', 'rent', 'temporary_rent'] as const satisfies readonly OperationType[]

const CURRENCIES = ['ARS', 'USD', 'CLP', 'UF', 'MXN'] as const satisfies readonly Currency[]

export type ParsedBuscarSearchContext = {
  operationType: OperationType | null
  propertyType: PropertyType | null
  city: string
  neighborhood: string
  minPrice: number | null
  maxPrice: number | null
  minBedrooms: number | null
  minSurface: number | null
  amenityIds: string[]
  currency: Currency | null
  /** Frase en /buscar (`q=`), sin sustituir filtros estructurados. */
  naturalQuery: string
  hasAnySignal: boolean
}

function parseNum(raw: string | null): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function parseBuscarSearchFromReturnPath(
  returnPath: string | null | undefined
): ParsedBuscarSearchContext | null {
  if (!returnPath || !returnPath.startsWith('/buscar')) return null
  const qIdx = returnPath.indexOf('?')
  const qs = qIdx >= 0 ? returnPath.slice(qIdx + 1) : ''
  if (!qs.trim()) return null

  const sp = new URLSearchParams(qs)
  const opRaw = sp.get('op')
  const operationType =
    opRaw && (OPERATIONS as readonly string[]).includes(opRaw)
      ? (opRaw as OperationType)
      : null

  const tipoRaw = sp.get('tipo')
  const propertyType =
    tipoRaw && (PROPERTY_TYPES as readonly string[]).includes(tipoRaw)
      ? (tipoRaw as PropertyType)
      : null

  const city = (sp.get('ciudad') ?? '').trim()
  const neighborhood = (sp.get('barrio') ?? '').trim()
  const naturalQuery = (sp.get('q') ?? '').trim()
  const minPrice = parseNum(sp.get('min'))
  const maxPrice = parseNum(sp.get('max'))
  const minBedrooms = parseNum(sp.get('dorm'))
  const minSurface = parseNum(sp.get('sup'))

  const amRaw = sp.get('amenities')
  const amenityIds = amRaw
    ? amRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const curRaw = sp.get('cur')
  const currency =
    curRaw && (CURRENCIES as readonly string[]).includes(curRaw)
      ? (curRaw as Currency)
      : null

  const hasAnySignal = Boolean(
    operationType ||
      propertyType ||
      city ||
      neighborhood ||
      minPrice != null ||
      maxPrice != null ||
      minBedrooms != null ||
      minSurface != null ||
      amenityIds.length > 0 ||
      naturalQuery.length > 0
  )

  if (!hasAnySignal) return null

  return {
    operationType,
    propertyType,
    city,
    neighborhood,
    minPrice,
    maxPrice,
    minBedrooms,
    minSurface,
    amenityIds,
    currency,
    naturalQuery,
    hasAnySignal,
  }
}
