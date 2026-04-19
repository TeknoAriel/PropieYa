/**
 * Packs de copy del portal para pruebas A/B y reglas de lenguaje.
 * Activar con NEXT_PUBLIC_PORTAL_COPY_PACK=<id> (ver PORTAL_COPY_PACK_IDS).
 *
 * Voz canónica: voseo rioplatense, tono inmobiliario claro y amable; primera capa
 * simple (encontrar → decidir → descubrir más si el usuario quiere).
 */

export const PORTAL_VOICE_CTA = {
  login: 'Iniciá sesión',
  loginSubmit: 'Ingresá',
  loginSubmitPending: 'Ingresando…',
  publish: 'Publicá',
} as const

/** Pie de portal: marca y confianza, sin mecánica interna. */
export const PORTAL_BRAND_FOOTER_TAGLINE =
  'Propiedades en venta y alquiler, con una búsqueda clara y herramientas extra cuando las necesités.'

/** Meta description y referencias SEO del sitio público. */
export const PORTAL_SITE_DESCRIPTION =
  'Encontrá propiedades en venta y alquiler: empezá simple y refiná con mapa, filtros o asistente cuando quieras.'

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
    /** Una línea: búsqueda en lenguaje natural. */
    assistantLine?: string
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
    title: 'Empezá por lo esencial',
    description:
      'Zona, operación y lo que te importa: decilo en una frase o entrá al buscador y elegí filtros paso a paso.',
  },
  {
    title: 'Mirá opciones ordenadas',
    description:
      'Te mostramos resultados para comparar con calma, sin perder el foco en lo que pediste.',
  },
  {
    title: 'Afiná cuando quieras',
    description:
      'Mapa y filtros avanzados están a mano; los abrís solo si necesitás más precisión.',
  },
  {
    title: 'Decidí con confianza',
    description:
      'En cada aviso ves por qué encaja antes de escribirle al publicador.',
  },
]

function howItWorksProposal(): PortalCopyPack['howItWorks'] {
  return {
    sectionTitle: 'Cómo te acompañamos',
    sectionSubtitle:
      'Primero encontrar, después decidir. Lo potente queda disponible, no delante de lo básico.',
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
    line1: 'Encontrá propiedades',
    line2Accent: 'con claridad y buen ritmo',
    subtitle:
      'Escribí zona o entrá a venta o alquiler por ciudad; refinás con el buscador cuando quieras.',
    placeholder: 'Zona, ambientes, presupuesto…',
    filterLink: 'Abrir buscador',
    assistantBadge: 'Describí lo que buscás',
    assistantPitch: 'Mapa y filtros siguen disponibles cuando los necesités.',
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
    subtitle: 'Un adelanto del inventario; el buscador es la puerta principal para ver todo.',
    viewAll: 'Ver todas',
    viewAllMobile: 'Ver todas las propiedades',
  },
  howItWorks: howItWorksProposal(),
}

/** Variante B — más inductivo en hero; nav igual de funcional */
/**
 * Pack por defecto (Sprint 23): conversación y buscador conviven; primera capa simple.
 */
const conversacionPrimero: PortalCopyPack = {
  id: 'conversacion_primero',
  title: 'Conversación primero — baseline portal',
  ruleSummary:
    'Hero directo; sección “Cómo te acompañamos” y CTAs compartidos con el resto de packs (voseo, foco búsqueda).',
  hero: {
    line1: 'Encontrá propiedades',
    line2Accent: 'sin rodeos',
    subtitle:
      'Escribí lo que buscás o entrá a venta o alquiler por ciudad; refinás con mapa o filtros cuando quieras.',
    placeholder: 'Zona, ambientes, presupuesto…',
    filterLink: 'Abrir buscador',
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
    title: 'Avisos para explorar',
    subtitle: 'Un adelanto del listado; venta y alquiler tienen la misma búsqueda con más contexto.',
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
    line2Accent: 'empezá por lo esencial',
    subtitle:
      'Contanos qué buscás en simple; después seguí por mapa, filtros o asistente, al ritmo que prefieras.',
    placeholder: 'Contanos qué imaginas: zona, ambientes, presupuesto…',
    filterLink: 'Abrir buscador',
    assistantBadge: 'Describí lo que buscás',
    assistantPitch: 'Lo avanzado queda a un clic cuando lo necesités.',
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
    subtitle: 'Ideas para mirar; el buscador concentra todo el listado filtrable.',
    viewAll: 'Ver todas',
    viewAllMobile: 'Ver todas las propiedades',
  },
  howItWorks: howItWorksProposal(),
}

/**
 * Copy de /buscar (y variantes venta/alquiler): tono claro, sin jerga de sistema.
 */
export const PORTAL_SEARCH_UX_COPY = {
  buscarTitle: 'Buscá propiedades',
  /** Una línea; sin explicar el motor en la cabecera. */
  buscarSubtitle: 'Palabras, zona y tipo: refiná cuando quieras.',
  /** Barra principal arriba del todo (palabra clave). */
  buscarMainSearchLabel: 'Búsqueda por palabras',
  buscarMainSearchPlaceholder: 'Ej. luminoso, cochera, Palermo…',
  buscarMainSearchCta: 'Buscar',
  /** Chip sobre el bloque conversacional en /buscar */
  buscarAssistantBadge: 'Describí lo que buscás',
  /** Panel colapsable bajo resultados: mapa, avanzados, recientes, acciones guiadas. */
  buscarSecondaryToolsSummary: 'Mapa, más filtros y ayudas',
  /** Resumen colapsable del bloque conversacional (cuando hay resultados). */
  buscarAssistantCollapseTitle: 'Asistente: describí lo que buscás',
  /** Una línea bajo el summary del asistente (no repetir el título). */
  buscarAssistantPanelHint: 'Te ayudamos a encontrar opciones.',
  /** Ayuda larga del mapa (colapsable). */
  mapHelpAccordionTitle: 'Más detalle sobre el mapa',
  /** H1 por defecto en /venta (sin ?ciudad=); tono orientado a descubrimiento. */
  ventaTitle: 'Casas y departamentos en venta',
  ventaSubtitle:
    'Avisos para explorar ya; ciudad, tipo y precio los ajustás abajo o en el mapa.',
  /** H1 por defecto en /alquiler. */
  alquilerTitle: 'Alquileres y temporarios',
  alquilerSubtitle:
    'Departamentos y casas publicadas; refiná zona y condiciones cuando quieras.',

  /** Fila opcional de atajos por ciudad (solo landings; sin API). */
  landingQuickCitiesAriaLabel: 'Ciudades frecuentes',
  landingQuickCitiesLead: 'También podés empezar por:',

  hintAdvancedLead: 'Abrí',
  hintAdvancedStrong: 'Más filtros',
  hintAdvancedTail: 'para barrio, amenities y medidas.',

  saveProfile: 'Guardar estos filtros en mi perfil',
  saveProfilePending: 'Guardando…',
  createAlert: 'Avisarme si aparecen avisos nuevos',
  createAlertPending: 'Creando alerta…',
  /** Mis alertas → búsqueda guardada. */
  savedAlertOpenSearch: 'Abrir búsqueda',
  /** Debajo del título de /buscar si el usuario no está logueado. */
  buscarPersistLoginCta: 'Ingresá',
  buscarPersistLoginHint:
    'para guardar filtros en tu perfil y recibir alertas con lo que estás buscando.',

  allOperations: 'Todas las operaciones',
  homeLink: 'Inicio',

  profileSaved: 'Listo: estos filtros quedaron en tu perfil.',
  alertSaved: 'Te avisamos si hay novedades. Revisalo en Mis alertas.',

  /** Página /mis-alertas (usuario logueado, cabecera). */
  misAlertasPageSubtitle:
    'Búsquedas guardadas y avisos: retomás donde dejaste, sin rearmar todo a mano.',
  /** Estado vacío con enlace a /buscar. */
  misAlertasEmptyBody:
    'Creá una alerta desde el buscador (menú «Más» cuando iniciás sesión) y te avisamos si hay avisos nuevos con tus filtros.',
  /** Visitante sin sesión. */
  misAlertasGuestLead: 'Alertas y filtros guardados quedan en tu cuenta.',

  keywordPlaceholder: 'Palabras que quieras que aparezcan en el aviso',

  /** Etiquetas fijas encima de cada control (el placeholder solo ayuda vacío). */
  buscarFieldKeywords: 'Refinar por palabras',
  buscarFieldOperation: 'Operación',
  buscarFieldPropertyType: 'Tipo de propiedad',
  buscarFieldCity: 'Ciudad',
  buscarFieldNeighborhood: 'Barrio',
  buscarLocalityCatalogButton: 'Elegir del catálogo',
  buscarLocalityCatalogTitle: 'Zonas del catálogo',
  buscarLocalityCatalogHint:
    'Las que tienen número suman avisos activos con esa ciudad/barrio; «Sugerida» son zonas frecuentes que aún pueden no tener publicaciones. Siempre podés escribir a mano en los campos.',
  buscarLocalityCatalogPlaceholder: 'Filtrar por nombre…',
  buscarLocalityCatalogEmpty: 'No hay coincidencias. Probá otra palabra o escribí la zona a mano.',
  buscarLocalityCatalogLoading: 'Cargando catálogo…',
  /** Modal localidades: badge cuando hay un solo aviso en el agregado. */
  buscarLocalityCatalogBadgeOneListing: '1 aviso',
  /** Modal localidades: badge cuando hay varios ({n} = número). */
  buscarLocalityCatalogBadgeListings: '{n} avisos',
  /** Modal localidades: fila solo sugerida (count 0), sin coincidencias en inventario. */
  buscarLocalityCatalogBadgeSuggested: 'Sugerida',
  buscarFieldMinPrice: 'Precio mínimo',
  buscarFieldMaxPrice: 'Precio máximo',
  buscarFieldMinBedrooms: 'Dormitorios mínimos',
  buscarFieldMinSurface: 'Superficie mínima (m²)',
  buscarFieldMinBathrooms: 'Baños mínimos',
  buscarFieldMinGarages: 'Cocheras mínimas',
  buscarFieldMaxSurface: 'Superficie máxima (m²)',
  buscarFieldFloorMin: 'Piso desde',
  buscarFieldFloorMax: 'Piso hasta',
  buscarFieldEscalera: 'Escalera o entrada',
  buscarFieldOrientation: 'Orientación',
  buscarFieldMinSurfaceCovered: 'Superficie cubierta mín. (m²)',
  buscarFieldMaxSurfaceCovered: 'Superficie cubierta máx. (m²)',
  buscarFieldMinTotalRooms: 'Ambientes mínimos',

  showMap: 'Ver mapa',
  /** CTA en primera pantalla de /buscar (junto a filtros / afinar). */
  buscarOpenMapCta: 'Buscar en mapa',
  moreFilters: 'Más filtros',
  hideAdvanced: 'Ocultar filtros avanzados',

  advancedSectionLocation: 'Ubicación y superficie',

  /** Encabezado del card de filtros (tres capas). */
  mainFiltersTitle: 'Zona, tipo y precio',
  mainFiltersSubtitle: 'Ajustá lo esencial; el resto queda en opciones avanzadas.',
  buscarLayer1Kicker: '',
  buscarPreferMapCta: 'Prefiero en mapa',
  buscarLayer2Title: '2 · Afinado guiado',
  buscarLayer2Subtitle:
    'Pocas decisiones que ordenan mejor los resultados. Por defecto los amenities afinan sin bloquear opciones similares.',
  buscarLayer2ExpandCta: 'Mostrar afinado guiado',
  buscarLayer2CollapseCta: 'Ocultar afinado guiado',
  buscarLayer2Teaser:
    'Cuando ya tengas operación, tipo y zona, abrí esta capa: te sugerimos chips según el rubro y números clave.',
  buscarLayer2QuickChipsHint:
    'Sugerencias rápidas (máx. 6; el catálogo completo está en la capa 3).',
  /** Capa 2 con tipo terreno: sin duplicar superficie ni números poco útiles. */
  buscarLayer2LandHint:
    'Para terrenos, la superficie va en lo principal. Refiná la zona con el mapa o abrí la capa 3 para preferencias puntuales.',
  buscarLayer3Title: '3 · Más filtros y catálogo completo',
  buscarLayer3Subtitle:
    'Orientación, piso, superficie cubierta, escalera y la lista completa de amenities. Para búsquedas muy precisas.',
  buscarOpenLayer3Cta: 'Más filtros y catálogo…',
  buscarCloseLayer3Cta: 'Ocultar más filtros',
  buscarLayer3TechnicalTitle: 'Medidas y orientación',
  buscarLayer3AmenitiesTitle: 'Amenities y preferencias (lista única)',
  locationBlockTitle: 'Ubicación',
  mapIntegratedTitle: 'Mapa y zona',
  /** Buscador v2: confirmar bbox/polígono como filtro de sesión. */
  buscarMapCommitCta: 'Buscar en esta zona',
  buscarMapCommittedHint:
    'Zona confirmada: el listado y el mapa muestran las mismas propiedades. Mové el mapa y volvé a confirmar para actualizar.',
  buscarMapReleaseFilter: 'Dejar de filtrar por el mapa',
  searchV2SuggestedActions: 'Te proponemos esto',
  searchV2TotalSummary: '{n} avisos en esta búsqueda.',
  /** Buscador v2: texto bajo el título del bucket ampliado (colapsable). */
  searchV2WidenedExplainer:
    'Misma operación y tipo que pediste: acá relajamos un solo criterio extra (superficie, dormitorios o precio), sin mezclar resultados fuera de tu ciudad ni precios desorbitados.',
  searchV2WidenedTeaser: 'Hay {n} opciones más si ampliás un poquito.',
  searchV2WidenedTeaserOne: 'Hay una opción más si ampliás un poquito.',
  searchV2WidenedToggleShow: 'Ver',
  searchV2WidenedToggleHide: 'Ocultar',
  searchV2NearToggleShow: 'Ver',
  searchV2NearToggleHide: 'Ocultar',
  searchV2NearTeaser: 'Hay {n} más en tu ciudad.',
  searchV2NearTeaserOne: 'Hay una más en tu ciudad.',
  searchV2WidenedMapHint:
    'En el mapa aparecen cuando abrís esta lista (no se mezclan con los resultados principales).',
  searchV2BucketTitleStrong: 'Propiedades encontradas',
  searchV2BucketTitleNear: 'Más opciones',
  searchV2BucketTitleWidened: 'Otras alternativas',
  searchV2BucketCountStrong: '{n} opciones',
  searchV2BucketCountNear: '{n} en la ciudad',
  searchV2BucketCountWidened: '{n} extra',
  searchV2SmartSuggestionsTitle: '¿Probamos una vuelta de rosca?',
  searchV2SmartSuggestionsHint: 'Solo tocá: ajustamos el filtro por vos.',
  searchV2SmartPool: '¿Querés ver opciones con pileta?',
  searchV2SmartWiderZone: '¿Te interesa ampliar la zona?',
  searchV2SmartPayMore: '¿Preferís pagar un poco más y sumar avisos?',
  searchV2SmartPayLess: '¿Preferís ajustar el precio y ver más?',
  searchV2SmartGarage: '¿Sumamos cochera al filtro?',
  searchV2ResultsHeading: 'Resultados',
  searchV2BucketEmpty: 'Todavía no hay avisos en esta lista.',

  /** Barra de sesión v2 (chips) */
  searchV2SessionBarTitle: 'Tu búsqueda',
  searchV2SessionBarHint: 'Tocá un chip y listo, sin empezar de cero.',
  searchV2ChipOperation: 'Operación',
  searchV2ChipLocation: 'Ubicación',
  searchV2ChipType: 'Tipo',
  searchV2ChipPrice: 'Precio',
  searchV2ChipBedrooms: 'Dormitorios',
  searchV2ChipAny: 'Cualquiera',
  searchV2ChipApply: 'Listo',
  searchV2ChipCatalog: 'Catálogo de zonas',
  searchV2WhySee: 'Por qué aparece',
  /** Card de resultado /buscar: CTA explícita (toda la card sigue siendo clicable). */
  listingCardCta: 'Ver ficha',
  /** Una línea bajo la acción de comparar en cards de resultado (misma lógica que siempre). */
  listingCardCompareMicro: 'Hasta 3 avisos en este dispositivo para decidir tranquilo/a.',
  /**
   * Señales breves en cards (texto del aviso, dirección o datos ya expuestos).
   * Sin “verificado” ni claims que el sistema no respalde.
   */
  listingSignalGoodLocation: 'Ubicación detallada',
  listingSignalInterestingOption: 'Encaje amplio',
  listingSignalOutdoor: 'Espacio exterior',
  listingSignalMoveInReady: 'Listo o a estrenar',
  listingSignalGarage: 'Cochera o estacionamiento',
  /** Solo si el listado trae coordenadas publicadas. */
  listingSignalMapReference: 'Ubicación en mapa',
  searchV2BucketWhyStrong: 'Coincide con tu zona, tipo y números.',
  searchV2BucketWhyNear: 'Cerca de lo que buscás: toda la ciudad, sin el barrio.',
  searchV2BucketWhyWidened: 'Un criterio un poco más flexible; misma operación y tipo.',
  searchV2GuidedActionsLabel: 'Siguiente paso',
  searchV2CtaMoreOptions: 'Ver opciones extra',
  searchV2CtaWiderPrice: 'Aflojar el precio',
  searchV2CtaWholeCity: 'Buscar en toda la ciudad',
  searchV2CtaRemoveFilterMenu: 'Quitar filtro',
  searchV2CtaRemovePrice: 'Quitar precio',
  searchV2CtaRemoveNeighborhood: 'Quitar barrio',
  searchV2CtaRemoveType: 'Quitar tipo',
  searchV2CtaOpenFilters: 'Todos los filtros',
  searchV2EmptyTitle: 'No hay resultados con estos criterios',
  searchV2EmptyLine1: 'Probá otra zona o aflojá precio.',
  searchV2EmptyLine2: 'Con mapa: confirmá la zona o soltá el recorte.',
  searchV2EmptyLine3: 'Quitá tipo o amenities obligatorios.',
  /** Sin ciudad/barrio/q/mapa confirmado: mensaje único. */
  buscarNoAnchorMessage:
    'Elegí una zona o contanos qué estás buscando',
  buscarNoAnchorMapCta: 'Usar mapa',
  buscarNoAnchorFocusInput: 'Escribí acá',
  searchV2CtaReleaseMap: 'Soltar recorte del mapa',
  searchV2CtaRemoveAmenities: 'Quitar amenities del filtro',

  advancedFiltersTitle: 'Filtros avanzados',
  advancedComfortTitle: 'Confort y condiciones',
  refineLayerTitle: 'Afinar más opciones',
  refineLayerSubtitle:
    'Amenities y detalles: por defecto favorecen resultados compatibles sin vaciar el listado.',
  facetChipsHintRefine:
    'Atajos del mismo catálogo que las casillas; se combinan con lo que elijas abajo.',
  strictAmenitiesLabel: 'Amenities obligatorios',
  strictAmenitiesHint:
    'Si está marcado, cada amenity elegido debe figurar en el aviso; si no, actúan como preferencia (más arriba quien cumple más).',
  refineCatalogTitle: 'Más amenities',
  moreRefineLayer: 'Afinado guiado',
  hideRefineLayer: 'Ocultar afinado',

  matchWhyTitle: 'Por qué aparece',

  loadError: 'No pudimos cargar los resultados.',
  loadErrorDbHint:
    'Revisá que DATABASE_URL esté definida en Vercel (proyecto web, Production).',
  loadErrorRetry: 'Intentá de nuevo más tarde.',

  emptyResults:
    'No encontramos avisos con lo que elegiste. Podés relajar filtros o probar otra zona; más abajo tenés herramientas para afinar.',

  /** Relajación progresiva (ES) — tono claro y respetuoso */
  searchRelaxBroadenedLead:
    'No encontramos coincidencias con todos los criterios tan afinados. Para poder ofrecerte opciones útiles en la zona, fuimos flexibilizando preferencias — siempre empezando por lo más opcional (pileta, chimenea, aire acondicionado, etc.) y recién después otros requisitos.',
  searchRelaxWhatWeDidPrefix: 'Lo que ajustamos, en orden:',
  searchRelaxMapNote:
    'Cuando aplica, también ampliamos el área si tenías un recorte muy chico en el mapa.',
  searchEmptyAfterFullRelaxTitle: 'No hay avisos que se acerquen a esta búsqueda',
  searchEmptyAfterFullRelaxBody:
    'En esta zona u operación no aparecen propiedades ni con una búsqueda bien amplia. Te sugerimos, con calma, probar otra ciudad o barrio, cambiar venta por alquiler (o al revés), o ampliar precio desde los filtros. Gracias por la paciencia.',
  searchFewExactWithMoreTitle: 'Encontramos pocas coincidencias exactas',
  searchFewExactWithMoreBody:
    'Te mostramos primero las que cumplen todo lo que pediste y sumamos otras muy parecidas, relajando solo detalles secundarios (orientación, piso, superficie cubierta, etc.).',
  searchFewExactOnly: 'Encontramos pocas opciones que cumplen todos los criterios afinados.',
  searchMidCountAmenitiesNote:
    'Algunos amenities se usan como preferencia para no dejarte sin resultados: los más cercanos a tu búsqueda aparecen primero.',
  searchUnexpectedSoft:
    'Tuvimos un inconveniente momentáneo al buscar. Podés intentar de nuevo en unos segundos; los filtros de abajo suelen funcionar sin problema.',
  searchLoadErrorSoftTitle: 'No pudimos completar la búsqueda',
  searchLoadErrorSoftBody:
    'Probá actualizar en un momento o usá los filtros clásicos más abajo. Si el problema continúa, puede ser un tema de conexión temporal.',

  conversationalAssistantDegraded:
    'No pudimos interpretar la búsqueda ahora. Probá de nuevo en unos segundos o usá los filtros y el mapa.',
  conversationalRelaxedAmenitiesNote:
    'Ampliamos la búsqueda: los amenities pasan a ser preferencia para mostrarte más opciones.',
  conversationalRelaxedOperationNote:
    'Incluimos venta y alquiler para mostrarte más opciones.',
  searchSqlFallbackCountNote:
    'Mostramos avisos con los mismos criterios usando una vía alternativa.',
  searchEsUnderfillNote:
    'Hay pocas coincidencias exactas; el listado refleja lo disponible con tus filtros.',
  searchSqlFallbackRowsNote:
    'Mostramos avisos con los mismos criterios usando una vía alternativa.',
  searchPaginationIndexSoft:
    'No pudimos cargar la página siguiente en este momento. Volvé al inicio del listado o refrescá la página; el índice puede estar actualizándose.',

  conversationalRateLimitSoft:
    'Llegaste al límite de búsquedas por minuto. Esperá un momento e intentá de nuevo; también podés usar los filtros debajo.',
  conversationalDbSoft:
    'No pudimos conectar con la base de datos por un instante. Intentá de nuevo en unos segundos o usá los filtros clásicos debajo del buscador.',

  mapHelp:
    'Solo aparecen pins en avisos con ubicación. Podés mover el mapa y actualizar la zona, dibujar un polígono de tres o más puntos, o buscar en el rectángulo visible. Con ciudad o barrio, el listado se ordena por cercanía a esa zona.',

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
  hideMap: 'Ocultar mapa',
  amenitiesSectionTitle: 'Más opciones (amenities)',

  /** Sprint 26.6 — búsqueda progresiva */
  essentialsSectionTitle: 'Esenciales',
  essentialsSectionSubtitle:
    'Zona, operación y números clave. Podés abrir el mapa cuando lo necesites.',
  facetChipsTitle: 'Sugerencias rápidas',
  facetChipsHint: 'Del catálogo de amenities; podés afinar la lista completa en «Más filtros».',

  /** Sprint 28.9 — historial (usuarios logueados) */
  recentSearchesTitle: 'Tus búsquedas recientes',
  recentSearchesEmpty:
    'Cuando busques con tu cuenta iniciada, acá vas a ver un resumen de tus últimas búsquedas.',
  recentSearchesHint:
    'Solo vos ves esta lista; cada fila resume filtros y cantidad de resultados en ese momento.',

  /** Sprint 32 — descubrimiento inductivo (mismos params que /buscar). */
  inductiveExploreTitle: 'Búsquedas para arrancar',
  inductiveExploreSubtitle: 'Ideas para arrancar; refinás después.',

  /** Bloque conversacional (home + /buscar): intención sin formulario. */
  conversationalBlockTitle: 'Contanos qué buscás',
  conversationalBlockSubtitle: 'Escribí o dictá; refiná después con filtros o mapa.',
  /** Versión más corta (bloque compacto en /buscar). */
  conversationalBlockSubtitleCompact: 'Escribí en simple; refiná cuando quieras.',
  conversationalVoiceStart: 'Dictar',
  conversationalVoiceStop: 'Detener',
  conversationalVoiceListening: 'Escuchando…',
  conversationalVoiceUnsupported:
    'Este navegador no permite dictado por voz; podés escribir en el campo.',
  conversationalInterpretedTitle: 'Lo que entendimos',
  conversationalResultsPrefix: 'Propiedades encontradas',
  conversationalRelaxedCountNote:
    'Incluye opciones parecidas a lo que pediste.',
  conversationalNextTitle: 'Siguiente paso',
  conversationalNextMap: 'Afinar en el mapa',
  conversationalNextFilters: 'Más filtros',
  conversationalNextAgain:
    'Si querés arrancar de nuevo, escribí otra búsqueda o tocá los filtros.',
  conversationalScrollResults: 'Ver resultados',
  /** Continuidad de búsqueda (multi-turno). */
  conversationalContextBanner:
    'Seguimos desde tu última búsqueda: podés afinar con una frase corta o tocá una idea abajo.',
  conversationalContextSummaryPrefix: 'Criterios activos:',
  /** Sin repetir el resumen largo: ya está en «Tu búsqueda ahora» y en la tarjeta de abajo. */
  conversationalContextShortHint:
    'El detalle de criterios aparece debajo; acá solo seguís la conversación.',
  conversationalClearContext: 'Empezar de cero',
  conversationalResultsZero:
    'No encontramos avisos con los criterios actuales, ni ampliando un poco la búsqueda. Te sugerimos probar otra zona, otra operación o ampliar precio desde los filtros, con calma.',
  conversationalChipCheaper: 'Más barato',
  conversationalChipOtherArea: 'Otro barrio o zona',
  conversationalChipParking: 'Con cochera',
  conversationalChipMoreBedrooms: 'Más dormitorios',

  /** /buscar — guía breve alineada a la home. */
  buscarFlowTitle: 'Pasos de búsqueda',
  buscarFlowStep1: 'Contanos en una frase qué imaginás.',
  buscarFlowStep2: 'Te llevamos al listado con esos criterios.',
  buscarFlowStep3: 'Si querés, mapa o filtros — sin perder contexto.',
  buscarFlowStep4: 'En cada aviso te decimos por qué encaja.',

  /** Filtros clásicos: ocultos por defecto para no abrumar. */
  filtersOptionalExpand: 'Mostrar filtros para afinar',
  filtersOptionalCollapse: 'Ocultar filtros',
  essentialsFriendlyTitle: 'Afinar con criterios',
  essentialsFriendlySubtitle:
    'Opcional: tocá «Más filtros» cuando quieras precisión extra.',
  buscarPageGentleHint:
    'Los resultados se actualizan al cambiar criterios.',
  /** Encabezado opcional del bloque conversacional (si se muestra aparte del título del componente). */
  buscarOptionalNlpSummary: 'Búsqueda asistida con frase o voz',
  buscarOptionalNlpHint:
    'Primero describí lo que buscás; si querés, después afinás con filtros o mapa.',
  /** Resumen visible de criterios activos (encima del formulario). */
  buscarActiveSummaryLabel: 'Tu búsqueda ahora',
  buscarActiveSummaryEmpty:
    'Sin criterios todavía: describí en una frase lo que buscás arriba o abrí los filtros para afinar.',
  buscarClearSearch: 'Limpiar búsqueda',
  buscarLoadMore: 'Cargar más resultados',
  buscarLoadingMore: 'Cargando…',
  buscarShowingCount: 'Mostrando {shown} de {total}',

  buscarFlowDialogOpen: 'Cómo buscar en Propieya',
  buscarFlowDialogDontShowAgain: 'No volver a mostrar esta guía',
  buscarFlowDialogConfirm: 'Listo',
  buscarFlowLinkInline: '¿Cómo buscar en Propieya?',
  buscarFlowBannerTeaser:
    'Arrancá con una frase en el asistente; después afinás con filtros o mapa si hace falta.',
  buscarFlowBannerSeeSteps: 'Ver pasos',
  buscarFlowBannerDismiss: 'No volver a mostrar',
  mapViewportUpdatesResults:
    'Ciudad o barrio: mapa y orden por proximidad a esa zona. Sin zona: centro cercano a tu ubicación si aceptás permisos. Filtrar por rectángulo solo con «Buscar en esta zona».',

  /** Sprint 36 — mapa abierto sin bbox/polígono: el listado no sigue la ventana. */
  buscarMapFilterHintTitle: 'Listado y mapa',
  buscarMapFilterHintBody:
    'Sin «Actualizar al mover el mapa», mover la ventana no cambia el listado. Tocá «Buscar en esta zona», activá la opción de seguimiento abajo o dibujá un polígono de al menos 3 puntos.',
  buscarMapFilterActiveHint:
    'Los resultados están acotados al rectángulo o polígono elegido en el mapa.',

  /** Sprint 37 — lista ↔ mapa (hover y clic en pin). */
  buscarMapListSyncHint:
    'Con avisos en el mapa: pasá el mouse por una tarjeta que tenga ubicación para centrar el mapa; tocá un punto azul para resaltar ese aviso en la lista.',
  polygonSelfIntersectHint:
    'Así el área quedaría cruzada o partida (no es una sola figura cerrada). Tocá otro lugar o borrá el trazo y empezá de nuevo.',

  /** Sprint 40 — viewport en vivo (doc 38 AA). */
  mapLiveViewportLabel: 'Actualizar resultados al mover el mapa',
  mapLiveViewportHint:
    'Aplica el rectángulo visible con una pausa corta al panear o hacer zoom. Desactivalo si preferís solo el botón «Buscar en esta zona».',
  mapLiveViewportDisabledHint:
    'Seguimiento del mapa desactivado mientras dibujás un polígono o hay vértices en el trazo.',

  /** Sprint 41 — capa 4 contextual (doc 38 §Z). */
  contextualOpenAdvancedButton: 'Ir a más filtros',
} as const

/** Normaliza un query param repetido o array de Next. */
export function portalPickSingleSearchParam(
  value: string | string[] | undefined
): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    const first = value.find((x) => typeof x === 'string' && x.trim().length > 0)
    return typeof first === 'string' ? first.trim() : ''
  }
  return ''
}

/**
 * Convierte un segmento de URL (/venta/rosario) en etiqueta de ciudad para ?ciudad=.
 * Sin geocodificar ni validar contra inventario (solo entrada amigable).
 */
export function portalCityPathSlugToLabel(slug: string): string {
  const raw = (() => {
    try {
      return decodeURIComponent(slug.trim())
    } catch {
      return slug.trim()
    }
  })()
  if (!raw) return ''
  return raw
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Atajos estáticos para landings (Argentina); enlazan a ?ciudad= sin backend. */
export const PORTAL_LANDING_QUICK_CITIES_ARGENTINA = [
  'CABA',
  'Rosario',
  'Córdoba',
  'Mendoza',
  'Mar del Plata',
  'La Plata',
] as const

export function portalVentaLandingH1(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) return PORTAL_SEARCH_UX_COPY.ventaTitle
  return `Casas y departamentos en venta en ${c}`
}

export function portalVentaLandingLead(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) return PORTAL_SEARCH_UX_COPY.ventaSubtitle
  return `Lo que hay publicado en ${c}. Seguí con filtros o mapa para afinar.`
}

export function portalVentaDocumentTitle(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) return 'Casas y departamentos en venta'
  return `Casas y departamentos en venta en ${c}`
}

export function portalVentaMetaDescription(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) {
    return 'Casas, departamentos y más en venta. Explorá avisos y refiná por zona, tipo y precio en Propieya.'
  }
  return `Casas y departamentos en venta en ${c}. Explorá avisos y refiná con filtros o mapa en Propieya.`
}

export function portalAlquilerLandingH1(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) return PORTAL_SEARCH_UX_COPY.alquilerTitle
  return `Alquileres en ${c}`
}

export function portalAlquilerLandingLead(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) return PORTAL_SEARCH_UX_COPY.alquilerSubtitle
  return `Avisos de alquiler en ${c}. Ajustá tipo, precio o barrio cuando quieras.`
}

export function portalAlquilerDocumentTitle(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) return 'Alquileres y temporarios'
  return `Alquileres en ${c} · departamentos y casas`
}

export function portalAlquilerMetaDescription(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) {
    return 'Departamentos y casas en alquiler o temporario. Explorá avisos y refiná por zona en Propieya.'
  }
  return `Alquileres y temporarios en ${c}. Explorá avisos y refiná con filtros o mapa en Propieya.`
}

export function portalBuscarLandingH1(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) return PORTAL_SEARCH_UX_COPY.buscarTitle
  return `Propiedades en ${c}`
}

export function portalBuscarLandingLead(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) return PORTAL_SEARCH_UX_COPY.buscarSubtitle
  return `Resultados y filtros para ${c}. Sumá palabras o tipo si hace falta.`
}

export function portalBuscarDocumentTitle(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) return 'Buscá propiedades'
  return `Propiedades en ${c}`
}

export function portalBuscarMetaDescription(ciudad: string): string {
  const c = ciudad.trim()
  if (!c) {
    return 'Buscá casas y departamentos en venta o alquiler. Palabras, zona y filtros en Propieya.'
  }
  return `Propiedades en ${c}: venta y alquiler. Refiná con filtros o mapa en Propieya.`
}

/** Ficha de propiedad: contacto y confianza (Sprint 28.8, voseo). */
export const PORTAL_LISTING_UX_COPY = {
  contactButton: 'Consultar esta propiedad',
  contactPrimaryCta: 'Consultar ahora',
  contactScheduleCta: 'Pedir visita',
  /** Encima del título del bloque de contacto (ficha). */
  listingContactEyebrow: 'Publicador activo en este aviso',
  sidebarTitle: 'Pedí información al publicador',
  sidebarLead:
    'Nombre, mail y un mensaje corto alcanzan. La consulta llega a quien publica; la respuesta suele llegar por mail (revisá spam o promociones).',
  trustNote:
    'Datos y fotos son los del aviso en Propieya o del inventario del socio.',
  /** Línea breve según origen del aviso (solo copy; el dato ya existe en la ficha). */
  listingContactListingOriginImport:
    'Inventario del socio: mismo origen que usa la inmobiliaria.',
  listingContactListingOriginManual: 'Publicación gestionada en Propieya.',
  /** Misma acción que “Consultar”; evita duda de doble camino técnico. */
  listingContactScheduleHint:
    'Abrimos el mismo formulario: aclará si querés coordinar una visita.',
  /** Bloque secundario: comparar (intención persistente, sin competir con consultar). */
  listingContactCompareSectionLabel: 'Guardá y compará',
  listingContactCompareSectionLead:
    'Hasta 3 avisos en este equipo; abrís la tabla cuando quieras y ves precio y zona al lado.',
  contactSmartTitle: '¿Te quedó alguna duda?',
  contactSmartBodyViews:
    'Este aviso suma interés: pedí disponibilidad o detalle y lo cerrás con quien publica.',
  contactSmartBodyReturn:
    'Volviste a este aviso: si querés condiciones, precio o visita, mandá una consulta corta.',
  contactSmartBodyCompare:
    'Ya está en comparar: una consulta ayuda a decidir sin salir de la ficha.',
  modalTitle: 'Consultá en un minuto',
  modalDescriptionIdle:
    'Completá los tres campos. Tu mensaje llega al publicador y al equipo de Propieya para que te respondan.',
  /** Expectativa explícita sin prometer plazos inventados. */
  modalExpectationLine:
    'La respuesta suele llegar por mail; si no ves nada, revisá spam o promociones.',
  contactModalInternalNote:
    'Usamos tu mail solo para esta consulta, sin listas de difusión.',
  modalSuccessTitle: 'Listo, enviamos tu consulta',
  modalSuccessBody:
    'El publicador o el equipo de Propieya la va a ver en breve. Mirá tu correo (incluido spam o promociones) para la respuesta.',
  modalNameLabel: 'Tu nombre',
  modalNamePlaceholder: 'Cómo te llamamos',
  modalEmailLabel: 'Email',
  modalEmailPlaceholder: 'donde te escriban de vuelta',
  modalMessageLabel: 'Mensaje',
  modalMessagePlaceholder: 'Ej.: disponibilidad, expensas, si podés visitarlo…',
  modalCancel: 'Cerrar',
  modalSubmit: 'Enviar consulta',
  modalSubmitPending: 'Enviando…',
  modalSentOk: 'Consulta enviada',

  /** P1 confianza — ficha (vigencia, completitud, origen) */
  trustCardTitle: 'Acerca de este aviso',
  trustCardIntro:
    'Fechas y origen son los mismos datos que usa el portal para mostrar el listado; la completitud resume texto, fotos y campos clave.',
  completenessLabel: 'Completitud de la ficha',
  completenessHint:
    'Un aviso más completo suele ser más fácil de evaluar. Si algo no queda claro, pedí precisión en la consulta.',
  sourceImport:
    'Sincronizado con el inventario del socio (misma base que la inmobiliaria).',
  sourceManual: 'Cargado y editado en Propieya.',
  /** Línea opcional cuando hay `external_id` (solo referencia acotada). */
  sourceImportRefPrefix: 'Ref. interna de inventario:',
  expiringSoonBadge: 'Vence pronto',

  /** Sprint 32 — ampliar zona / mismo criterio en el buscador */
  relatedSearchesTitle: 'Búsquedas relacionadas',

  /** Ficha — mapa (evitar jerga técnica del proveedor de tiles) */
  listingLocationMapHint: 'Ubicación aproximada en mapa (referencia).',

  /** Continuidad ficha ↔ /buscar (misma búsqueda, regreso con contexto). */
  listingFlowBreadcrumbHome: 'Inicio',
  listingFlowBreadcrumbSearch: 'Tu búsqueda',
  listingFlowBreadcrumbBuscar: 'Buscar',
  listingFlowBackToResults: 'Volver a resultados',
  listingFlowBackToBuscar: 'Ir al buscador',
  listingFlowNextStepsHint:
    'Los mismos filtros quedan guardados: al volver seguís en tu lista.',
  /** Anclas suaves en ficha: consulta, similares, sin repetir el botón principal de regreso. */
  listingFlowActionContact: 'Consultar',
  listingFlowActionExploreSimilar: 'Ver parecidas',
  /** Continuidad: búsqueda viva en cuenta. */
  listingFlowActionMyAlerts: 'Mis alertas',
  listingSimilarSectionTitle: 'Seguí explorando desde esta propiedad',
  listingSimilarSectionLead:
    'Misma operación y tipo, con precio o zona parecidos. Son avisos activos del catálogo, con el mismo criterio de publicación.',

  /** Resumen liviano desde `returnTo` (/buscar?...) debajo del banner de flujo. */
  searchContextSummaryBadge: 'Tu búsqueda',
  searchContextSummarySeparator: ' · ',
  /** Texto libre del campo «q» en /buscar (búsqueda en lenguaje natural). */
  searchContextSummaryNatural: 'Texto: «{q}»',
  searchContextSummaryLocationPrefix: 'en',
  searchContextSummaryPriceFrom: 'desde',
  searchContextSummaryPriceUpTo: 'hasta',
  searchContextSummaryBedrooms: '{n}+ dormitorios',
  searchContextSummarySurface: '{n} m² o más',
  searchContextSummaryAmenitiesHint: 'con extras marcados en el buscador',

  /** Heurística cliente: encaje vs filtros (sin scoring numérico). */
  fitInsightMultiMainCriteria: 'Coincide con varios de tus criterios principales.',
  fitInsightLocationWithinSearch: 'Se destaca por ubicación dentro de tu búsqueda.',
  fitInsightOutdoorAmplitude:
    'Buena opción si priorizás espacios al aire libre y amplitud.',
  fitInsightPriceBand: 'Encaja en la franja de precio que filtraste.',
  fitInsightAmenitiesOverlap: 'Reuní varios de los extras que marcaste en el buscador.',
  fitInsightPairCriteria: 'Encaja con parte de lo que pediste: vale la pena compararla.',

  /** Etiquetas en cards de similares (máx. 2 por card en UI). */
  similarTagCheaper: 'Más económica',
  similarTagLargerSurface: 'Mayor superficie',
  similarTagBetterLocation: 'Mejor ubicación',
  similarTagNew: 'Nueva',

  /** Regreso desde ficha con hash #buscar-listing-{id}. */
  buscarReturnFromFichaBadge: 'La estabas viendo',
} as const

/** Etiquetas para enlaces «Búsquedas relacionadas» (jerarquía zona + precio). Sprint 43. */
export const PORTAL_LISTING_RELATED_SEARCH_LABELS = {
  allTypesInCity(city: string, opLower: string) {
    return `Todo en ${city} — ${opLower}`
  },
  allTypesInNeighborhood(neighborhood: string, opLower: string) {
    return `Todo en ${neighborhood} — ${opLower}`
  },
  similarPriceInCity(opLower: string, city: string) {
    return `Precio similar (${opLower}) en ${city}`
  },
} as const

/** Comparador de avisos (Sprint 33 — centro de decisión v0). */
export const PORTAL_COMPARE_COPY = {
  pageTitle: 'Comparar avisos',
  pageSubtitle:
    'Misma información que en cada ficha, en una tabla para decidir con calma (hasta 3 avisos activos).',
  addToCompare: 'Guardar para comparar',
  /** Botón compacto (ficha móvil / cards angostas). */
  addToCompareCompact: 'Guardar',
  removeFromCompare: 'Quitar de la lista',
  removeFromCompareCompact: 'En lista',
  inCompareShort: 'En lista',
  compareOpen: 'Abrir tabla',
  compareBarTitle: 'Tu lista para comparar',
  /** `{n}` = cantidad de avisos. */
  compareBarCount: '{n} guardados',
  compareBarHint: 'Misma info que en la ficha, sin consultar todavía.',
  compareClear: 'Vaciar lista',
  compareNeedTwo:
    'Elegí al menos dos avisos guardados. Sumalos desde el buscador o la ficha con «Guardar para comparar».',
  compareTooFewLoaded:
    'Algunos avisos ya no están activos. Agregá otros desde el listado o vaciá la lista.',
  compareMaxReached: 'Máximo 3 avisos en la lista. Quitá uno para sumar otro.',
  addToCompareAria:
    'Guardar este aviso en la lista de comparación. Podés sumar hasta tres propiedades en este dispositivo.',
  removeFromCompareAria: 'Quitar este aviso de la lista de comparación.',
  tableProperty: 'Propiedad',
  tablePrice: 'Precio',
  tableSurface: 'Superficie',
  tableRooms: 'Dorm.',
  tableBaths: 'Baños',
  tableZone: 'Zona',
  tablePricePerM2: 'Precio / m²',
  tableGarages: 'Cocheras',
  tableExpenses: 'Expensas',
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
