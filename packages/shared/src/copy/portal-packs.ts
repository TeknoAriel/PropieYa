/**
 * Packs de copy del portal para pruebas A/B y reglas de lenguaje.
 * Activar con NEXT_PUBLIC_PORTAL_COPY_PACK=<id> (ver PORTAL_COPY_PACK_IDS).
 */

export const PORTAL_COPY_PACK_IDS = ['regla_portal_v1', 'variante_b_cercano'] as const
export type PortalCopyPackId = (typeof PORTAL_COPY_PACK_IDS)[number]

export type PortalHowStep = {
  title: string
  description: string
}

export type PortalCopyPack = {
  /** id técnico */
  id: PortalCopyPackId
  /** Título legible para pruebas de uso / aceptación (A/B) */
  title: string
  /** Regla de lenguaje resumida (auditoría) */
  ruleSummary: string
  hero: {
    line1: string
    line2Accent: string
    subtitle: string
    placeholder: string
    filterLink: string
  }
  heroExamples: string[]
  nav: { buscar: string; venta: string; alquiler: string }
  cta: { login: string; publish: string }
  featured: { title: string; subtitle: string; viewAll: string; viewAllMobile: string }
  howItWorks: {
    sectionTitle: string
    sectionSubtitle: string
    steps: PortalHowStep[]
  }
}

/** Regla portal oficial — diferenciación emocional + claridad funcional */
const reglaPortalV1: PortalCopyPack = {
  id: 'regla_portal_v1',
  title:
    'Regla portal v1 — Diferenciación emocional + claridad funcional (baseline)',
  ruleSummary:
    'Titulares humanos y cálidos; navegación y CTAs con términos de mercado reconocibles. Sin reemplazar lo funcional por poesía.',
  hero: {
    line1: 'Encontrá tu próximo lugar',
    line2Accent: 'Te guiamos paso a paso',
    subtitle:
      'Descubrí oportunidades para vivir o invertir. Tu búsqueda, más clara: hablá en natural y nosotros ordenamos las opciones.',
    placeholder:
      'Ej: 3 ambientes luminosos en Palermo, hasta tanto en venta o alquiler…',
    filterLink: 'Prefiero buscar con filtros tradicionales',
  },
  heroExamples: [
    '3 ambientes en Palermo con balcón',
    'Casa con jardín en zona norte',
    'Departamento luminoso hasta 200K USD',
    'Alquiler en Belgrano cerca del subte',
  ],
  nav: { buscar: 'Buscar', venta: 'Venta', alquiler: 'Alquiler' },
  cta: { login: 'Iniciar sesión', publish: 'Publicar' },
  featured: {
    title: 'Propiedades destacadas',
    subtitle: 'Las últimas publicaciones de nuestra plataforma',
    viewAll: 'Ver todas',
    viewAllMobile: 'Ver todas las propiedades',
  },
  howItWorks: {
    sectionTitle: '¿Cómo funciona?',
    sectionSubtitle:
      'Una forma más natural de buscar, con la seriedad que necesitás para decidir.',
    steps: [
      {
        title: 'Contanos qué buscás',
        description:
          'Escribí en lenguaje natural. Los técnicos los dejamos para cuando elijas categoría o ficha.',
      },
      {
        title: 'Te entendemos',
        description:
          'Interpretamos tu búsqueda y te mostramos opciones relevantes, sin perder claridad.',
      },
      {
        title: 'Refiná tu búsqueda',
        description:
          'Ajustá con conversación o filtros: departamento, casa, local, oficina, campo…',
      },
      {
        title: 'Encontrá tu lugar',
        description:
          'Te ayudamos a ver por qué cada propiedad puede encajar con vos.',
      },
    ],
  },
}

/** Variante B — más inductivo en hero; nav igual de funcional */
const varianteBCercano: PortalCopyPack = {
  id: 'variante_b_cercano',
  title: 'Variante B — Hero más cercano (misma navegación funcional)',
  ruleSummary:
    'Mismo principio que v1 con tono más cercano en titulares; menús y categorías sin cambios poéticos.',
  hero: {
    line1: 'Tu próximo hogar o inversión',
    line2Accent: 'empieza con una conversación simple',
    subtitle:
      'Sin formularios eternos: decinos qué buscás y te mostramos caminos claros, de compra, alquiler o inversión.',
    placeholder: 'Contanos qué imaginas: zona, ambientes, presupuesto…',
    filterLink: 'Ir a búsqueda con filtros clásicos',
  },
  heroExamples: [
    'Quiero algo luminoso para familia, 3 dormitorios',
    'Inversión en departamento en CABA',
    'Local comercial en esquina',
    'Campo mixto en provincia de Buenos Aires',
  ],
  nav: { buscar: 'Buscar', venta: 'Venta', alquiler: 'Alquiler' },
  cta: { login: 'Iniciar sesión', publish: 'Publicar' },
  featured: {
    title: 'Oportunidades destacadas',
    subtitle: 'Publicaciones recientes para explorar',
    viewAll: 'Ver todas',
    viewAllMobile: 'Ver todas las propiedades',
  },
  howItWorks: {
    sectionTitle: 'Tu búsqueda, en simple',
    sectionSubtitle:
      'Innovador y amable, pero con etiquetas que conocés: comprar, alquilar, tipología.',
    steps: reglaPortalV1.howItWorks.steps,
  },
}

export const PORTAL_COPY_PACKS: Record<PortalCopyPackId, PortalCopyPack> = {
  regla_portal_v1: reglaPortalV1,
  variante_b_cercano: varianteBCercano,
}

export function resolvePortalCopyPack(
  id: string | undefined
): PortalCopyPack {
  const key = id?.trim() as PortalCopyPackId
  if (key && key in PORTAL_COPY_PACKS) {
    return PORTAL_COPY_PACKS[key]
  }
  return PORTAL_COPY_PACKS.regla_portal_v1
}
