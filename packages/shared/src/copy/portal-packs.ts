/**
 * Packs de copy del portal para pruebas A/B y reglas de lenguaje.
 * Activar con NEXT_PUBLIC_PORTAL_COPY_PACK=<id> (ver PORTAL_COPY_PACK_IDS).
 *
 * Voz canónica: voseo rioplatense, propuesta conversacional-first + mapa/filtros,
 * transparencia técnica cuando aporta confianza (mismo motor SQL/Elasticsearch).
 */

export const PORTAL_VOICE_CTA = {
  login: 'Iniciá sesión',
  loginSubmit: 'Ingresá',
  loginSubmitPending: 'Ingresando…',
  publish: 'Publicá',
} as const

/** Pie de portal: misma promesa que la home (frase o filtros, mismo motor). */
export const PORTAL_BRAND_FOOTER_TAGLINE =
  'Podés arrancar con una frase o ir al mapa y los filtros avanzados: es el mismo motor de avisos.'

/** Meta description y referencias SEO del sitio público. */
export const PORTAL_SITE_DESCRIPTION =
  'Contale a Propieya qué buscás o usá mapa y filtros; tu intención se traduce al mismo motor SQL/Elasticsearch.'

export const PORTAL_COPY_PACK_IDS = [
  'regla_portal_v1',
  'variante_b_cercano',
  'conversacion_primero',
] as const
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
    /** Marca visual del asistente (Sprint 23). */
    assistantBadge?: string
    /** Microcopy bajo el badge: propuesta conversacional-first. */
    assistantPitch?: string
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

const HOW_IT_WORKS_PROPOSAL_STEPS: PortalHowStep[] = [
  {
    title: 'Contale a Propieya',
    description:
      'Una frase concreta resume operación, zona, tamaño y prioridades — sin recorrer filtro por filtro.',
  },
  {
    title: 'Traducimos a búsqueda',
    description:
      'Tu intención se convierte en filtros y texto residual sobre el mismo motor SQL/Elasticsearch.',
  },
  {
    title: 'Refiná como prefieras',
    description:
      'Seguí en conversación o pasá al mapa y a los filtros avanzados sin perder contexto.',
  },
  {
    title: 'Por qué encaja cada aviso',
    description:
      'Matching explicado: sabés qué cumple y qué no antes de escribir al publicador.',
  },
]

function howItWorksProposal(): PortalCopyPack['howItWorks'] {
  return {
    sectionTitle: 'Una forma distinta de buscar propiedades',
    sectionSubtitle:
      'Innovación con los pies en el mercado: comprar, alquilar y tipologías siguen siendo los anclas; el cambio es cómo empezás.',
    steps: HOW_IT_WORKS_PROPOSAL_STEPS,
  }
}

/** Regla portal oficial — diferenciación emocional + claridad funcional */
const reglaPortalV1: PortalCopyPack = {
  id: 'regla_portal_v1',
  title:
    'Regla portal v1 — Diferenciación emocional + claridad funcional (baseline)',
  ruleSummary:
    'Voseo + propuesta de los 4 pasos (home); hero puede variar en matiz emocional; CTAs y “cómo funciona” alineados a la propuesta única.',
  hero: {
    line1: 'Encontrá tu próximo lugar',
    line2Accent: 'contando lo que buscás',
    subtitle:
      'Una frase ordena operación, zona y prioridades. Es el mismo criterio que detrás del mapa y los filtros, con otro punto de partida.',
    placeholder:
      'Ej: 3 ambientes luminosos en Palermo, hasta tanto en venta o alquiler…',
    filterLink: 'Modo clásico: mapa y filtros',
  },
  heroExamples: [
    '3 ambientes en Palermo con balcón',
    'Casa con jardín en zona norte',
    'Departamento luminoso hasta 200K USD',
    'Alquiler en Belgrano cerca del subte',
  ],
  nav: { buscar: 'Buscar', venta: 'Venta', alquiler: 'Alquiler' },
  cta: {
    login: PORTAL_VOICE_CTA.login,
    publish: PORTAL_VOICE_CTA.publish,
  },
  featured: {
    title: 'Propiedades destacadas',
    subtitle: 'Los últimos avisos activos para explorar.',
    viewAll: 'Ver todas',
    viewAllMobile: 'Ver todas las propiedades',
  },
  howItWorks: howItWorksProposal(),
}

/** Variante B — más inductivo en hero; nav igual de funcional */
/**
 * Pack por defecto (Sprint 23): alinea tono con docs/00 — conversacional-first,
 * lenguaje rioplatense claro, propuesta distinta al “portal con chat”.
 */
const conversacionPrimero: PortalCopyPack = {
  id: 'conversacion_primero',
  title: 'Conversación primero — Propuesta disruptiva baseline',
  ruleSummary:
    'Hero conversacional-first; “Cómo funciona” y CTAs compartidos con el resto de packs (misma propuesta de 4 pasos y voseo).',
  hero: {
    line1: 'No es solo un buscador de filtros.',
    line2Accent: 'Expresá tu intención. Propieya interpreta.',
    subtitle:
      'Una conversación clara traduce lo que buscás en criterios precisos — la misma potencia que los filtros avanzados, con otro punto de partida.',
    placeholder:
      'Describí en una frase: operación, zona, tipología y prioridades…',
    filterLink: 'Modo clásico: mapa y filtros',
    assistantBadge: 'Asistente Propieya',
    assistantPitch:
      'Analizamos tu consulta (con IA si está disponible, o con reglas locales) y te orientamos a resultados con el mismo motor que /buscar.',
  },
  heroExamples: [
    'Casa en venta, 2 dormitorios, grande, con pileta y quincho',
    'Alquiler temporario cerca del mar, 4 personas',
    'PH a refaccionar en CABA, presupuesto ajustado',
    'Local a la calle, inversión, zona comercial fuerte',
  ],
  nav: { buscar: 'Buscar', venta: 'Venta', alquiler: 'Alquiler' },
  cta: {
    login: PORTAL_VOICE_CTA.login,
    publish: PORTAL_VOICE_CTA.publish,
  },
  featured: {
    title: 'Elegí por intuición o por dato',
    subtitle:
      'Avisos activos para explorar: el asistente y los filtros comparten el mismo índice.',
    viewAll: 'Ver todas',
    viewAllMobile: 'Ver todas las propiedades',
  },
  howItWorks: howItWorksProposal(),
}

/** Variante B — más inductivo en hero; nav igual de funcional */
const varianteBCercano: PortalCopyPack = {
  id: 'variante_b_cercano',
  title: 'Variante B — Hero más cercano (misma navegación funcional)',
  ruleSummary:
    'Hero más cercano en titulares; misma sección “Cómo funciona” y CTAs voseados que el resto de packs.',
  hero: {
    line1: 'Tu próximo hogar o inversión',
    line2Accent: 'empieza con una conversación simple',
    subtitle:
      'Decinos qué buscás y te mostramos caminos claros; podés seguir en conversación o pasar al mapa y los filtros sin perder contexto.',
    placeholder: 'Contanos qué imaginas: zona, ambientes, presupuesto…',
    filterLink: 'Modo clásico: mapa y filtros',
  },
  heroExamples: [
    'Quiero algo luminoso para familia, 3 dormitorios',
    'Inversión en departamento en CABA',
    'Local comercial en esquina',
    'Campo mixto en provincia de Buenos Aires',
  ],
  nav: { buscar: 'Buscar', venta: 'Venta', alquiler: 'Alquiler' },
  cta: {
    login: PORTAL_VOICE_CTA.login,
    publish: PORTAL_VOICE_CTA.publish,
  },
  featured: {
    title: 'Oportunidades destacadas',
    subtitle: 'Avisos recientes para explorar.',
    viewAll: 'Ver todas',
    viewAllMobile: 'Ver todas las propiedades',
  },
  howItWorks: howItWorksProposal(),
}

/**
 * Copy de /buscar (y variantes venta/alquiler): alineado a docs/41-PROPUESTA-VALOR-PORTAL.md
 * (descubrimiento, decisión, confianza; mismo motor).
 */
export const PORTAL_SEARCH_UX_COPY = {
  buscarTitle: 'Buscá propiedades',
  buscarSubtitle:
    'Descubrimiento y decisión con el mismo motor que la home: mapa, filtros y criterios claros en cada aviso.',
  ventaTitle: 'Propiedades en venta',
  ventaSubtitle:
    'Avisos activos en venta. Refiná con mapa y filtros para decidir con más contexto.',
  alquilerTitle: 'Propiedades en alquiler',
  alquilerSubtitle:
    'Alquiler tradicional o temporal. Misma búsqueda y matching explicado que en el resto del portal.',

  hintAdvancedLead: 'Podés tocar',
  hintAdvancedStrong: 'Más filtros',
  hintAdvancedTail:
    'debajo del formulario para barrio, amenities, superficie y piso.',

  saveProfile: 'Guardar filtros en mi perfil',
  saveProfilePending: 'Guardando…',
  createAlert: 'Crear alerta con estos filtros',
  createAlertPending: 'Creando…',

  allOperations: 'Todas las operaciones',
  homeLink: 'Inicio',

  profileSaved: 'Perfil actualizado con estos filtros.',
  alertSaved: 'Alerta creada. Podés verla en Mis alertas.',

  keywordPlaceholder: 'Palabras clave (título, descripción)',

  showMap: 'Ver mapa',
  moreFilters: 'Más filtros',
  hideAdvanced: 'Ocultar filtros avanzados',

  advancedSectionLocation: 'Ubicación y superficie',

  matchWhyTitle: 'Por qué encaja',

  loadError: 'No pudimos cargar los resultados.',
  loadErrorDbHint:
    'Revisá que DATABASE_URL esté definida en Vercel (proyecto web, Production).',
  loadErrorRetry: 'Intentá de nuevo más tarde.',

  emptyResults: 'No hay resultados. Probá con otros filtros o ampliá la búsqueda.',

  mapHelp:
    'Solo se marcan avisos con ubicación. Mové el mapa y tocá «Buscar en esta zona» para filtrar por el rectángulo visible. Con 3+ vértices en polígono se filtra por el área dibujada.',

  mapNoPins:
    'No hay resultados con pin en este momento (falta geolocalización en los avisos o los filtros no devolvieron coincidencias con coordenadas).',

  polygonRemove: 'Quitar polígono',
  polygonDrawLabel: 'Dibujar polígono (clics en el mapa)',
  polygonVertexSingular: 'vértice',
  polygonVertexPlural: 'vértices',
  polygonFilterActive: '· filtro activo',
  polygonMinVertices: '· mín. 3 para filtrar',

  searchThisArea: 'Buscar en esta zona',

  mapSectionTitle: 'Mapa',
  clearBboxFilter: 'Quitar filtro de zona',
  clearRadius: 'Quitar radio',
  hideMap: 'Ocultar mapa',
  searchAround: 'Buscar alrededor',
  searchAroundHint:
    'Centro del mapa al moverlo; tocá «Buscar alrededor» para filtrar por radio.',
  amenitiesSectionTitle: 'Más opciones (amenities)',

  /** Sprint 26.6 — búsqueda progresiva */
  essentialsSectionTitle: 'Esenciales',
  essentialsSectionSubtitle:
    'Zona, operación y números clave. El mapa y los filtros avanzados usan el mismo motor.',
  facetChipsTitle: 'Sugerencias rápidas',
  facetChipsHint: 'Del catálogo de amenities; podés afinar la lista completa en «Más filtros».',

  /** Sprint 28.9 — historial (usuarios logueados) */
  recentSearchesTitle: 'Tus búsquedas recientes',
  recentSearchesEmpty:
    'Cuando ejecutes búsquedas con la sesión iniciada, van a aparecer acá (mismo motor que /buscar).',
  recentSearchesHint:
    'Solo vos ves esta lista; cada fila resume filtros y cantidad de resultados en ese momento.',

  /** Sprint 32 — descubrimiento inductivo (mismos params que /buscar). */
  inductiveExploreTitle: 'Búsquedas para arrancar',
  inductiveExploreSubtitle:
    'Atajos con el mismo motor que el buscador; después refinás con mapa o filtros.',

  /** Bloque conversacional (home + /buscar): intención sin formulario. */
  conversationalBlockTitle: 'Contanos qué buscás',
  conversationalBlockSubtitle:
    'Escribí o dictá: armamos los criterios con el mismo motor que el mapa y los filtros. Después podés afinar o pedir otra idea.',
  /** Versión más corta (bloque compacto en /buscar). */
  conversationalBlockSubtitleCompact:
    'Escribí o dictá: mismo motor que mapa y filtros; después afinás cuando quieras.',
  conversationalVoiceStart: 'Dictar',
  conversationalVoiceStop: 'Detener',
  conversationalVoiceListening: 'Escuchando…',
  conversationalVoiceUnsupported:
    'Este navegador no permite dictado por voz; podés escribir en el campo.',
  conversationalInterpretedTitle: 'Lo que entendimos',
  conversationalResultsPrefix: 'Avisos que encajan ahora',
  conversationalNextTitle: 'Siguiente paso',
  conversationalNextMap: 'Afinar en el mapa',
  conversationalNextFilters: 'Abrir más filtros',
  conversationalNextAgain: 'Pedir otra búsqueda arriba',
  conversationalScrollResults: 'Ver resultados',

  /** /buscar — alineado al “Cómo funciona” de la home (versión compacta). */
  buscarFlowTitle: 'Cómo buscás en Propieya',
  buscarFlowStep1: 'Contanos en una frase qué imaginás.',
  buscarFlowStep2: 'Lo pasamos al mismo motor de búsqueda.',
  buscarFlowStep3: 'Si querés, mapa o filtros — sin perder contexto.',
  buscarFlowStep4: 'En cada aviso te decimos por qué encaja.',

  /** Filtros clásicos: ocultos por defecto para no abrumar. */
  filtersOptionalExpand: 'Mostrar filtros para afinar',
  filtersOptionalCollapse: 'Ocultar filtros',
  filtersCollapsedHint:
    'No hace falta completar todo: podés buscar arriba con una frase o tocá un atajo. Abrí los filtros solo cuando quieras afinar operación, zona o números.',
  essentialsFriendlyTitle: 'Afinar con criterios',
  essentialsFriendlySubtitle:
    'Opcional — mismo motor que la búsqueda por frase. Tocá «Más filtros» para ir más al detalle.',
  buscarPageGentleHint:
    'Explorá con calma: los resultados se actualizan solos cuando cambiás criterios.',
  buscarLoadMore: 'Cargar más resultados',
  buscarLoadingMore: 'Cargando…',
  buscarShowingCount: 'Mostrando {shown} de {total}',

  buscarFlowDialogOpen: 'Cómo buscar en Propieya',
  buscarFlowLinkInline: '¿Cómo funciona la búsqueda?',
  buscarFlowBannerTeaser:
    'Podés arrancar con una frase; mapa y filtros son opcionales cuando quieras afinar.',
  buscarFlowBannerSeeSteps: 'Ver pasos',
  buscarFlowBannerDismiss: 'No volver a mostrar',
  mapViewportUpdatesResults:
    'Los resultados se actualizan según la zona visible del mapa (pan y zoom).',
  polygonSelfIntersectHint:
    'Así el área quedaría cruzada o partida (no es una sola figura cerrada). Tocá otro lugar o borrá el trazo y empezá de nuevo.',
} as const

/** Ficha de propiedad: contacto y confianza (Sprint 28.8, voseo). */
export const PORTAL_LISTING_UX_COPY = {
  contactButton: 'Escribinos',
  sidebarTitle: '¿Te interesa?',
  sidebarLead:
    'Escribinos: el publicador te responde por el canal habitual. No compartimos tu email con terceros.',
  trustNote:
    'Los avisos pasan por el mismo motor de búsqueda que el resto del portal; si ves algo raro, avisanos.',
  modalTitle: 'Consultá por esta propiedad',
  modalDescriptionIdle:
    'Completá el formulario: te responden a la brevedad. Referencia del aviso:',
  modalSuccessTitle: 'Listo',
  modalSuccessBody: 'Gracias. Si no ves respuesta en tu casilla, revisá spam o la carpeta de promociones.',
  modalNameLabel: 'Nombre',
  modalNamePlaceholder: 'Cómo te llamamos',
  modalEmailLabel: 'Email',
  modalEmailPlaceholder: 'tu@email.com',
  modalMessageLabel: 'Mensaje',
  modalMessagePlaceholder: 'Contanos qué necesitás saber…',
  modalCancel: 'Cancelar',
  modalSubmit: 'Enviar',
  modalSubmitPending: 'Enviando…',
  modalSentOk: 'Mensaje enviado',

  /** P1 confianza — ficha (vigencia, completitud, origen) */
  trustCardTitle: 'Transparencia del aviso',
  completenessLabel: 'Completitud del aviso',
  completenessHint:
    'Indica qué tan completos están texto, fotos y datos. Si falta algo, podés preguntarle al publicador.',
  sourceImport:
    'Origen: sincronizado desde el feed de socios (mismo inventario que usa la inmobiliaria).',
  sourceManual: 'Origen: publicación gestionada en Propieya.',
  expiringSoonBadge: 'Por vencer',

  /** Sprint 32 — ampliar zona / mismo criterio en el buscador */
  relatedSearchesTitle: 'Búsquedas relacionadas',
} as const

/** Comparador de avisos (Sprint 33 — centro de decisión v0). */
export const PORTAL_COMPARE_COPY = {
  pageTitle: 'Comparar avisos',
  pageSubtitle:
    'Hasta tres propiedades activas. Los datos son los mismos que en cada ficha pública.',
  addToCompare: 'Comparar',
  removeFromCompare: 'Quitar',
  inCompareShort: 'En lista',
  compareOpen: 'Ver comparación',
  compareBarTitle: 'Comparación',
  compareClear: 'Vaciar',
  compareNeedTwo:
    'Elegí al menos dos avisos. Podés agregarlos desde el buscador o la ficha.',
  compareTooFewLoaded:
    'Algunos avisos ya no están activos. Agregá otros o volvé al buscador.',
  compareMaxReached: 'Ya tenés 3 avisos. Quitá uno para agregar otro.',
  tableProperty: 'Propiedad',
  tablePrice: 'Precio',
  tableSurface: 'Superficie',
  tableRooms: 'Dorm.',
  tableBaths: 'Baños',
  tableZone: 'Zona',
  tableAction: 'Ficha',
  viewListing: 'Ver aviso',
} as const

export const PORTAL_COPY_PACKS: Record<PortalCopyPackId, PortalCopyPack> = {
  regla_portal_v1: reglaPortalV1,
  variante_b_cercano: varianteBCercano,
  conversacion_primero: conversacionPrimero,
}

export function resolvePortalCopyPack(
  id: string | undefined
): PortalCopyPack {
  const key = id?.trim() as PortalCopyPackId
  if (key && key in PORTAL_COPY_PACKS) {
    return PORTAL_COPY_PACKS[key]
  }
  return PORTAL_COPY_PACKS.conversacion_primero
}
