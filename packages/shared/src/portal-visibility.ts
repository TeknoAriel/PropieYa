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
  /** Inicio de vigencia (ISO 8601), para programación operativa opcional. */
  from?: string | null
  /** Fin de vigencia del pack (ISO 8601), si aplica. */
  until?: string | null
}

export type PortalCommercialPackageId =
  | 'none'
  | 'destacado_simple'
  | 'impulso'
  | 'ficha_premium'
  | 'prioridad_zona'
  | 'combo_impulso_zona'
  | 'combo_premium_zona'

export type PortalCommercialSurface = 'ficha_publica' | 'resultados_exactos' | 'modulo_zona'

export interface PortalCommercialPackageDefinition {
  id: PortalCommercialPackageId
  commercialName: string
  tier: PortalVisibilityTier
  defaultDurationDays: number | null
  surfaces: PortalCommercialSurface[]
  visibleScope: string
  operationalSummary: string
  products: string[]
}

export const PORTAL_COMMERCIAL_PACKAGES: PortalCommercialPackageDefinition[] = [
  {
    id: 'none',
    commercialName: 'Sin visibilidad especial',
    tier: 'standard',
    defaultDurationDays: null,
    surfaces: [],
    visibleScope: 'Aviso normal.',
    operationalSummary: 'No aplica destaque comercial.',
    products: [],
  },
  {
    id: 'destacado_simple',
    commercialName: 'Destacado simple',
    tier: 'highlight',
    defaultDurationDays: 15,
    surfaces: ['ficha_publica', 'resultados_exactos'],
    visibleScope: 'Aviso destacado visualmente en ficha y bloques exactos.',
    operationalSummary: 'Para ganar visibilidad sin cambiar ranking core.',
    products: [PORTAL_VISIBILITY_PRODUCT_IDS.highlight],
  },
  {
    id: 'impulso',
    commercialName: 'Impulso',
    tier: 'boost',
    defaultDurationDays: 15,
    surfaces: ['ficha_publica', 'resultados_exactos'],
    visibleScope: 'Mayor presencia operativa durante la vigencia.',
    operationalSummary: 'Pensado para acelerar exposición por tiempo acotado.',
    products: [PORTAL_VISIBILITY_PRODUCT_IDS.boost],
  },
  {
    id: 'ficha_premium',
    commercialName: 'Ficha premium',
    tier: 'premium_ficha',
    defaultDurationDays: 30,
    surfaces: ['ficha_publica'],
    visibleScope: 'Tratamiento premium en ficha pública.',
    operationalSummary: 'Mejora de presentación sin alterar buscador core.',
    products: [PORTAL_VISIBILITY_PRODUCT_IDS.premiumFicha],
  },
  {
    id: 'prioridad_zona',
    commercialName: 'Prioridad por zona',
    tier: 'highlight',
    defaultDurationDays: 30,
    surfaces: ['modulo_zona'],
    visibleScope: 'Prioridad comercial para módulos por zona/ciudad.',
    operationalSummary: 'Producto preparado para superficies comerciales por zona.',
    products: [PORTAL_VISIBILITY_PRODUCT_IDS.highlight, PORTAL_VISIBILITY_PRODUCT_IDS.zonePriority],
  },
  {
    id: 'combo_impulso_zona',
    commercialName: 'Impulso + zona',
    tier: 'boost',
    defaultDurationDays: 30,
    surfaces: ['ficha_publica', 'resultados_exactos', 'modulo_zona'],
    visibleScope: 'Impulso con prioridad por zona.',
    operationalSummary: 'Combo comercial para tracción y foco territorial.',
    products: [PORTAL_VISIBILITY_PRODUCT_IDS.boost, PORTAL_VISIBILITY_PRODUCT_IDS.zonePriority],
  },
  {
    id: 'combo_premium_zona',
    commercialName: 'Ficha premium + zona',
    tier: 'premium_ficha',
    defaultDurationDays: 30,
    surfaces: ['ficha_publica', 'modulo_zona'],
    visibleScope: 'Ficha premium con prioridad comercial por zona.',
    operationalSummary: 'Combo premium pensado para activos de alto valor.',
    products: [PORTAL_VISIBILITY_PRODUCT_IDS.premiumFicha, PORTAL_VISIBILITY_PRODUCT_IDS.zonePriority],
  },
]

export const PORTAL_DEVELOPMENTS_COMMERCIAL_PRODUCTS = [
  {
    id: PORTAL_VISIBILITY_PRODUCT_IDS.devPublish,
    commercialName: 'Publicación de emprendimiento',
    operationalSummary: 'Publicación base de unidades y ficha de emprendimiento.',
  },
  {
    id: PORTAL_VISIBILITY_PRODUCT_IDS.devFeature,
    commercialName: 'Destaque de emprendimiento',
    operationalSummary: 'Mayor visibilidad comercial para el bloque del emprendimiento.',
  },
  {
    id: PORTAL_VISIBILITY_PRODUCT_IDS.devBanner,
    commercialName: 'Banner de emprendimiento',
    operationalSummary: 'Presencia en superficies de banner comercial del portal.',
  },
  {
    id: PORTAL_VISIBILITY_PRODUCT_IDS.devPriority,
    commercialName: 'Prioridad de emprendimiento',
    operationalSummary: 'Prioridad comercial para módulos de emprendimientos por zona.',
  },
] as const

export function portalCommercialPackageById(
  id: PortalCommercialPackageId
): PortalCommercialPackageDefinition {
  return (
    PORTAL_COMMERCIAL_PACKAGES.find((pkg) => pkg.id === id) ??
    PORTAL_COMMERCIAL_PACKAGES[0]!
  )
}

export function resolvePortalCommercialPackageId(
  visibility: ListingPortalVisibility | null | undefined
): PortalCommercialPackageId {
  if (!visibility || !visibility.tier || visibility.tier === 'standard') return 'none'
  const products = Array.isArray(visibility.products) ? visibility.products : []
  const hasZone = products.includes(PORTAL_VISIBILITY_PRODUCT_IDS.zonePriority)
  if (visibility.tier === 'premium_ficha') {
    return hasZone ? 'combo_premium_zona' : 'ficha_premium'
  }
  if (visibility.tier === 'boost') {
    return hasZone ? 'combo_impulso_zona' : 'impulso'
  }
  if (visibility.tier === 'highlight') {
    return hasZone ? 'prioridad_zona' : 'destacado_simple'
  }
  return 'none'
}

export type PortalVisibilityOperationalStatus =
  | 'none'
  | 'active'
  | 'scheduled'
  | 'expired'

export function resolvePortalVisibilityOperationalStatus(
  visibility: ListingPortalVisibility | null | undefined,
  nowInput?: Date
): PortalVisibilityOperationalStatus {
  if (!visibility || visibility.tier === 'standard') return 'none'
  const now = nowInput ?? new Date()
  const from = visibility.from ? new Date(visibility.from) : null
  const until = visibility.until ? new Date(visibility.until) : null
  if (from && !Number.isNaN(from.getTime()) && from.getTime() > now.getTime()) {
    return 'scheduled'
  }
  if (until && !Number.isNaN(until.getTime()) && until.getTime() < now.getTime()) {
    return 'expired'
  }
  return 'active'
}

export function portalVisibilityOperationalLabel(
  status: PortalVisibilityOperationalStatus
): string {
  if (status === 'none') return 'Sin visibilidad especial'
  if (status === 'active') return 'Activo'
  if (status === 'scheduled') return 'Programado'
  return 'Vencido'
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

export function portalVisibilitySurfacesLabel(
  surfaces: PortalCommercialSurface[]
): string {
  if (surfaces.length === 0) return 'Sin impacto comercial'
  const map: Record<PortalCommercialSurface, string> = {
    ficha_publica: 'Ficha pública',
    resultados_exactos: 'Bloques de resultados exactos',
    modulo_zona: 'Módulos comerciales por zona',
  }
  return surfaces.map((s) => map[s]).join(' + ')
}

function isTierWithUi(t: string): t is keyof typeof PORTAL_VISIBILITY_UX {
  return t === 'highlight' || t === 'boost' || t === 'premium_ficha'
}

export function resolvePortalVisibilityForPublicUi(features: unknown): {
  tier: PortalVisibilityTier
  operationalStatus: PortalVisibilityOperationalStatus
  showStrip: boolean
  stripLabel: string
  stripSub: string
} {
  const f = features as { portalVisibility?: ListingPortalVisibility } | null | undefined
  const raw = f?.portalVisibility
  if (!raw || !raw.tier) {
    return {
      tier: 'standard',
      operationalStatus: 'none',
      showStrip: false,
      stripLabel: '',
      stripSub: '',
    }
  }
  const t = raw.tier
  if (t === 'standard') {
    return {
      tier: 'standard',
      operationalStatus: 'none',
      showStrip: false,
      stripLabel: '',
      stripSub: '',
    }
  }
  if (!isTierWithUi(t)) {
    return {
      tier: 'standard',
      operationalStatus: 'none',
      showStrip: false,
      stripLabel: '',
      stripSub: '',
    }
  }
  const operationalStatus = resolvePortalVisibilityOperationalStatus(raw)
  if (operationalStatus !== 'active') {
    return {
      tier: t,
      operationalStatus,
      showStrip: false,
      stripLabel: '',
      stripSub: '',
    }
  }
  const copy = PORTAL_VISIBILITY_UX[t]
  return {
    tier: t,
    operationalStatus,
    showStrip: true,
    stripLabel: copy.title,
    stripSub: copy.sub,
  }
}
