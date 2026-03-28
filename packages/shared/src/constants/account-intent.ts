/**
 * Intención de cuenta al registrarse en el portal.
 * - seeker: busca propiedad (demanda).
 * - owner_publisher: dueño que publica en nombre propio.
 * - agency_publisher: inmobiliaria / cuenta con equipo (organización).
 */
export const ACCOUNT_INTENT_VALUES = [
  'seeker',
  'owner_publisher',
  'agency_publisher',
] as const

export type AccountIntent = (typeof ACCOUNT_INTENT_VALUES)[number]

export const ACCOUNT_INTENT_LABELS: Record<
  AccountIntent,
  { title: string; description: string }
> = {
  seeker: {
    title: 'Busco propiedad',
    description: 'Búsqueda, alertas y perfil de demanda. Sin publicar avisos.',
  },
  owner_publisher: {
    title: 'Dueño que vende o alquila',
    description: 'Publicá tus propiedades desde el panel con tu cuenta personal.',
  },
  agency_publisher: {
    title: 'Inmobiliaria o equipo',
    description: 'Gestioná inventario y leads con el nombre de tu empresa.',
  },
}
