/**
 * URLs del buscador público (`/buscar`) alineadas a `BuscarContent` (query: op, tipo, ciudad, barrio, …).
 */

export type PortalBuscarUrlFilters = {
  q?: string
  operationType?: string
  propertyType?: string
  city?: string
  neighborhood?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  minSurface?: number
}

export function buildPortalBuscarUrl(filters: PortalBuscarUrlFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.operationType) params.set('op', filters.operationType)
  if (filters.propertyType) params.set('tipo', filters.propertyType)
  if (filters.city) params.set('ciudad', filters.city)
  if (filters.neighborhood) params.set('barrio', filters.neighborhood)
  if (filters.minPrice != null) params.set('min', String(filters.minPrice))
  if (filters.maxPrice != null) params.set('max', String(filters.maxPrice))
  if (filters.minBedrooms != null) params.set('dorm', String(filters.minBedrooms))
  if (filters.minSurface != null) params.set('sup', String(filters.minSurface))
  const qs = params.toString()
  return qs ? `/buscar?${qs}` : '/buscar'
}

/** Sugerencias inductivas reutilizables (home, /buscar) — doc 43 §5 P2. */
export const PORTAL_INDUCTIVE_CHIPS: readonly {
  label: string
  filters: PortalBuscarUrlFilters
}[] = [
  { label: 'Departamentos en venta', filters: { operationType: 'sale', propertyType: 'apartment' } },
  { label: 'Casas en venta', filters: { operationType: 'sale', propertyType: 'house' } },
  { label: 'Departamentos en alquiler', filters: { operationType: 'rent', propertyType: 'apartment' } },
  { label: 'Casas en alquiler', filters: { operationType: 'rent', propertyType: 'house' } },
  { label: 'PH en venta', filters: { operationType: 'sale', propertyType: 'ph' } },
  { label: 'Terrenos en venta', filters: { operationType: 'sale', propertyType: 'land' } },
  { label: 'Locales en venta', filters: { operationType: 'sale', propertyType: 'commercial' } },
  { label: 'Oficinas en alquiler', filters: { operationType: 'rent', propertyType: 'office' } },
  { label: 'Cocheras', filters: { operationType: 'sale', propertyType: 'parking' } },
  { label: 'Galpones / depósitos', filters: { operationType: 'sale', propertyType: 'warehouse' } },
] as const
