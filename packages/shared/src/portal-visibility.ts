/**
 * Capa comercial — visibilidad de avisos (etapas 2+).
 * No implica cobro activo: `portalVisibility` en `features` (JSONB) lo rellenará
 * el panel o jobs cuando exista el producto.
 */

export type PortalVisibilityTier = 'standard' | 'highlight' | 'boost' | 'premium_ficha'

/** Identificadores de producto (catálogo evolutivo; sin integración de pago). */
export const PORTAL_VISIBILITY_PRODUCT_IDS = {
  /** Destacado en listados / módulos (cuando se cablee). */
  highlight: 'visibility_highlight',
  /** Impulso temporal de exposición. */
  boost: 'visibility_boost',
  /** Prioridad por zona o ciudad (criterio de negocio en ES futuro). */
  zonePriority: 'visibility_zone_priority',
  /** Bloque ficha: layout / trust ampliado (futuro). */
  premiumFicha: 'visibility_premium_ficha',
  /** Módulo emprendimientos: bloque, banner, prioridad en listado. */
  devPublish: 'developments_publish',
  devFeature: 'developments_featured',
  devBanner: 'developments_banner',
  devPriority: 'developments_priority',
} as const

export type PortalVisibilityProductId =
  (typeof PORTAL_VISIBILITY_PRODUCT_IDS)[keyof typeof PORTAL_VISIBILITY_PRODUCT_IDS]

/**
 * Shapes aceptado en `listing.features` (o payload que se mergee a `features` en panel).
 * `tier` manda para UI; `products` lista IDs activos para analítica / extensión.
 */
export interface ListingPortalVisibility {
  /** Si falta o `standard`, no se muestra tira comercial. */
  tier: PortalVisibilityTier
  /** Subconjunto de `PORTAL_VISIBILITY_PRODUCT_IDS` o strings de integración. */
  products?: string[]
  /** Fin de vigencia del pack (ISO 8601), si aplica. */
  until?: string | null
}

export const PORTAL_VISIBILITY_UX = {
  highlight: {
    title: 'Aviso destacado',
    sub: 'Refuerzo visible en la ficha del portal. El orden en el buscador sigue el criterio habitual del sitio.',
  },
  boost: {
    title: 'Impulso',
    sub: 'Mayor presencia en la ficha mientras aplica. No modifica el orden de resultados.',
  },
  premium_ficha: {
    title: 'Ficha premium',
    sub: 'Presentación ampliada en la ficha. El listado de búsqueda no cambia por este beneficio.',
  },
} as const

/** Etiqueta corta para panel y tablas (sin prometer ranking). */
export function portalVisibilityPanelStatusShort(
  tier: PortalVisibilityTier | undefined | null
): 'Normal' | 'Destacado' | 'Impulso' | 'Ficha premium' {
  if (!tier || tier === 'standard') return 'Normal'
  if (tier === 'highlight') return 'Destacado'
  if (tier === 'boost') return 'Impulso'
  if (tier === 'premium_ficha') return 'Ficha premium'
  return 'Normal'
}

/** Productos por defecto según tier (analítica / extensión futura). */
export function defaultPortalProductsForTier(tier: PortalVisibilityTier): string[] {
  switch (tier) {
    case 'highlight':
      return [PORTAL_VISIBILITY_PRODUCT_IDS.highlight]
    case 'boost':
      return [PORTAL_VISIBILITY_PRODUCT_IDS.boost]
    case 'premium_ficha':
      return [PORTAL_VISIBILITY_PRODUCT_IDS.premiumFicha]
    default:
      return []
  }
}

function isTierWithUi(t: string): t is keyof typeof PORTAL_VISIBILITY_UX {
  return t === 'highlight' || t === 'boost' || t === 'premium_ficha'
}

export function resolvePortalVisibilityForPublicUi(features: unknown): {
  tier: PortalVisibilityTier
  showStrip: boolean
  stripLabel: string
  stripSub: string
} {
  const f = features as { portalVisibility?: ListingPortalVisibility } | null | undefined
  const raw = f?.portalVisibility
  if (!raw || !raw.tier) {
    return { tier: 'standard', showStrip: false, stripLabel: '', stripSub: '' }
  }
  const t = raw.tier
  if (t === 'standard') {
    return { tier: 'standard', showStrip: false, stripLabel: '', stripSub: '' }
  }
  if (!isTierWithUi(t)) {
    return { tier: 'standard', showStrip: false, stripLabel: '', stripSub: '' }
  }
  const copy = PORTAL_VISIBILITY_UX[t]
  return {
    tier: t,
    showStrip: true,
    stripLabel: copy.title,
    stripSub: copy.sub,
  }
}
