/**
 * Configuración de búsqueda
 */
export const SEARCH_CONFIG = {
  /** Resultados por página por defecto */
  DEFAULT_PAGE_SIZE: 20,
  /** Máximo de resultados por página */
  MAX_PAGE_SIZE: 100,
  /** Radio por defecto para geo-búsqueda (metros) */
  DEFAULT_GEO_RADIUS: 5000,
  /** Radio máximo para geo-búsqueda (metros) */
  MAX_GEO_RADIUS: 50000,
  /** Máximo de facets a retornar por categoría */
  MAX_FACETS_PER_CATEGORY: 50,
} as const

/**
 * Rangos de precio predefinidos para facets
 */
export const PRICE_RANGES_USD = [
  { min: 0, max: 50000, label: 'Hasta USD 50K' },
  { min: 50000, max: 100000, label: 'USD 50K - 100K' },
  { min: 100000, max: 150000, label: 'USD 100K - 150K' },
  { min: 150000, max: 200000, label: 'USD 150K - 200K' },
  { min: 200000, max: 300000, label: 'USD 200K - 300K' },
  { min: 300000, max: 500000, label: 'USD 300K - 500K' },
  { min: 500000, max: null, label: 'Más de USD 500K' },
] as const

/**
 * Rangos de superficie predefinidos
 */
export const SURFACE_RANGES = [
  { min: 0, max: 40, label: 'Hasta 40 m²' },
  { min: 40, max: 60, label: '40 - 60 m²' },
  { min: 60, max: 80, label: '60 - 80 m²' },
  { min: 80, max: 100, label: '80 - 100 m²' },
  { min: 100, max: 150, label: '100 - 150 m²' },
  { min: 150, max: 200, label: '150 - 200 m²' },
  { min: 200, max: null, label: 'Más de 200 m²' },
] as const

/**
 * Opciones de ordenamiento
 */
export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Más relevantes' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'price_per_m2_asc', label: 'Menor precio/m²' },
  { value: 'price_per_m2_desc', label: 'Mayor precio/m²' },
  { value: 'date_desc', label: 'Más recientes' },
  { value: 'surface_desc', label: 'Mayor superficie' },
] as const
