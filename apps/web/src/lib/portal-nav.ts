/**
 * Navegación principal del portal (consistente en header / menú mobile).
 * Rutas estables; stubs de producto en rutas `app` (p. ej. emprendimientos, agentes).
 */
export type PortalNavItem = {
  href: string
  label: string
}

export const PORTAL_PRIMARY_NAV: PortalNavItem[] = [
  { href: '/buscar', label: 'Propiedades' },
  { href: '/emprendimientos', label: 'Emprendimientos' },
  { href: '/inversiones', label: 'Inversiones' },
  { href: '/oportunidades', label: 'Oportunidades' },
  { href: '/agentes', label: 'Inmobiliarias' },
]

export const PORTAL_ACCOUNT = {
  login: { href: '/login', label: 'Ingresar' },
  alerts: { href: '/mis-alertas', label: 'Mis alertas' },
  compare: { href: '/comparar', label: 'Comparar avisos' },
} as const
