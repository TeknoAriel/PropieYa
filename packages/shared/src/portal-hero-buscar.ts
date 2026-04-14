/**
 * Copy fijo para entrada rápida home → /buscar (independiente del pack A/B).
 */
export const PORTAL_HERO_BUSCAR_UX = {
  quickSearchTitle: 'Buscá con palabras',
  quickSearchPlaceholder: 'Ej: depto alquiler Rosario, casa venta Funes…',
  quickSearchSubmit: 'Ver resultados',
  quickSearchExamples: 'Ejemplos rápidos',
} as const

/** Enlaces directos a resultados (URLs relativas). */
export const PORTAL_HERO_BUSCAR_QUICK_LINKS: readonly {
  label: string
  href: string
}[] = [
  { label: 'Depto alquiler Rosario', href: '/buscar?ciudad=Rosario&op=rent&tipo=apartment' },
  { label: 'Casa venta Funes', href: '/buscar?ciudad=Funes&op=sale&tipo=house' },
  { label: 'Monoambiente Palermo', href: '/buscar?barrio=Palermo&q=monoambiente' },
]
