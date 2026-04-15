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
    title: 'Por qué aparece cada aviso',
    description:
      'Te mostramos en simple qué coincide con tu búsqueda antes de contactar.',
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
    assistantBadge: 'Escribí en simple y encontramos por vos',
    assistantPitch: 'Mismo buscador que mapa y filtros.',
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
    line1: 'Encontrá propiedades',
    line2Accent: 'con la claridad de un portal serio',
    subtitle:
      'Buscá en una frase o explorá por tipo y zona. Refiná después con mapa y filtros, sin perder el hilo.',
    placeholder:
      'Zona, ambientes, presupuesto… Escribí lo que buscás y seguí en el buscador.',
    filterLink: 'Ir al buscador con mapa y filtros',
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
    assistantBadge: 'Escribí en simple y encontramos por vos',
    assistantPitch: 'Mismo buscador que mapa y filtros.',
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
  buscarTitle: 'Buscador',
  /** Una línea; sin explicar el motor en la cabecera. */
  buscarSubtitle: 'Elegí zona, tipo y ajustá si querés.',
  /** Chip sobre el bloque conversacional en /buscar */
  buscarAssistantBadge: 'Escribí en simple y encontramos por vos',
  /** Resumen colapsable del bloque conversacional (cuando hay resultados). */
  buscarAssistantCollapseTitle: 'Escribí en simple y encontramos por vos',
  ventaTitle: 'Propiedades en venta',
  ventaSubtitle:
    'Avisos en venta. Podés refinar con mapa y filtros.',
  alquilerTitle: 'Propiedades en alquiler',
  alquilerSubtitle:
    'Alquiler tradicional o temporal. Misma búsqueda que en el resto del portal.',

  hintAdvancedLead: 'Abrí',
  hintAdvancedStrong: 'Más filtros',
  hintAdvancedTail: 'para barrio, amenities y medidas.',

  saveProfile: 'Guardar filtros en mi perfil',
  saveProfilePending: 'Guardando…',
  createAlert: 'Crear alerta con estos filtros',
  createAlertPending: 'Creando…',
  /** Mis alertas → búsqueda guardada. */
  savedAlertOpenSearch: 'Abrir búsqueda',

  allOperations: 'Todas las operaciones',
  homeLink: 'Inicio',

  profileSaved: 'Perfil actualizado con estos filtros.',
  alertSaved: 'Alerta creada. Podés verla en Mis alertas.',

  keywordPlaceholder: 'Palabras clave (título, descripción)',

  /** Etiquetas fijas encima de cada control (el placeholder solo ayuda vacío). */
  buscarFieldKeywords: 'Palabras clave',
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
  mainFiltersTitle: 'Filtros',
  mainFiltersSubtitle:
    'Operación, tipo, zona y números. El resto va en capas abajo.',
  buscarLayer1Kicker: '1 · Lo principal',
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
  searchV2TotalSummary: 'En total hay {n} avisos (las tres listas juntas).',
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
    'No pudimos interpretar la búsqueda en este momento. Podés intentar de nuevo en unos segundos o usar los filtros y el mapa: el resultado suele ser el mismo.',
  conversationalRelaxedAmenitiesNote:
    'Ampliamos la búsqueda: los amenities pasan a ser preferencia para mostrarte más opciones.',
  conversationalRelaxedOperationNote:
    'Incluimos venta y alquiler para maximizar coincidencias con lo que buscás.',
  searchSqlFallbackCountNote:
    'Contamos avisos desde la base de datos porque el índice de búsqueda no devolvió coincidencias con estos criterios.',
  searchEsUnderfillNote:
    'El índice de búsqueda devolvió pocas coincidencias; mostramos el listado alineado con la base de datos (mismos filtros).',
  searchSqlFallbackRowsNote:
    'Mostramos coincidencias desde la base de datos porque el índice de búsqueda no devolvió filas con estos criterios.',
  searchPaginationIndexSoft:
    'No pudimos cargar la página siguiente en este momento. Volvé al inicio del listado o refrescá la página; el índice puede estar actualizándose.',

  conversationalRateLimitSoft:
    'Llegaste al límite de búsquedas por minuto. Esperá un momento e intentá de nuevo; también podés usar los filtros debajo.',
  conversationalDbSoft:
    'No pudimos conectar con la base de datos por un instante. Intentá de nuevo en unos segundos o usá los filtros clásicos debajo del buscador.',

  mapHelp:
    'Solo se marcan avisos con ubicación. El filtro por mapa aplica con el mapa abierto: opción «Actualizar resultados al mover el mapa», o un clic en «Buscar en esta zona», o polígono de 3+ vértices. Con ciudad o barrio, el listado se ordena por cercanía al centro de esa zona (sin recortar). Sin zona, el mapa puede abrir cerca de tu ubicación si el navegador lo permite.',

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
    'Mismo motor que arriba; tocá y refinás después.',

  /** Bloque conversacional (home + /buscar): intención sin formulario. */
  conversationalBlockTitle: 'Contanos qué buscás',
  conversationalBlockSubtitle:
    'Escribí o dictá: lo pasamos a filtros con el mismo motor que mapa y filtros.',
  /** Versión más corta (bloque compacto en /buscar). */
  conversationalBlockSubtitleCompact:
    'Escribí en simple; refiná después con filtros o mapa.',
  conversationalVoiceStart: 'Dictar',
  conversationalVoiceStop: 'Detener',
  conversationalVoiceListening: 'Escuchando…',
  conversationalVoiceUnsupported:
    'Este navegador no permite dictado por voz; podés escribir en el campo.',
  conversationalInterpretedTitle: 'Lo que entendimos',
  conversationalResultsPrefix: 'Propiedades encontradas',
  conversationalRelaxedCountNote:
    'Incluye coincidencias ampliadas: el listado abajo respeta la misma lógica.',
  conversationalNextTitle: 'Siguiente paso',
  conversationalNextMap: 'Afinar en el mapa',
  conversationalNextFilters: 'Filtros avanzados (capa 3)',
  conversationalNextAgain:
    'Si querés otra intención, usá de nuevo la búsqueda con frase o ajustá los filtros.',
  conversationalScrollResults: 'Ver resultados',
  /** Continuidad de búsqueda (multi-turno, mismo motor). */
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

  /** /buscar — alineado al “Cómo funciona” de la home (versión compacta). */
  buscarFlowTitle: 'Cómo buscás en Propieya',
  buscarFlowStep1: 'Contanos en una frase qué imaginás.',
  buscarFlowStep2: 'Lo pasamos al mismo motor de búsqueda.',
  buscarFlowStep3: 'Si querés, mapa o filtros — sin perder contexto.',
  buscarFlowStep4: 'En cada aviso te decimos por qué encaja.',

  /** Filtros clásicos: ocultos por defecto para no abrumar. */
  filtersOptionalExpand: 'Mostrar filtros para afinar',
  filtersOptionalCollapse: 'Ocultar filtros',
  essentialsFriendlyTitle: 'Afinar con criterios',
  essentialsFriendlySubtitle:
    'Opcional — mismo motor que la búsqueda por frase. Tocá «Más filtros» para ir más al detalle.',
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
  buscarFlowLinkInline: '¿Cómo funciona la búsqueda?',
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

/** Ficha de propiedad: contacto y confianza (Sprint 28.8, voseo). */
export const PORTAL_LISTING_UX_COPY = {
  contactButton: 'Quiero que me contacten',
  contactPrimaryCta: 'Quiero que me contacten',
  contactScheduleCta: 'Pedir visita',
  sidebarTitle: '¿Te interesa esta propiedad?',
  sidebarLead:
    'Dejanos tus datos: el equipo te contacta por este canal. No publicamos teléfono ni email del publicador en la ficha.',
  trustNote:
    'Los avisos pasan por el mismo motor de búsqueda que el resto del portal; si ves algo raro, avisanos.',
  contactSmartTitle: '¿Te llevamos un paso más cerca?',
  contactSmartBodyViews:
    'Esta propiedad encaja con lo que estás mirando. ¿Querés que te contacten por esta opción?',
  contactSmartBodyReturn:
    'Volviste a ver este aviso: suele ser señal de interés. ¿Querés que te escriban?',
  contactSmartBodyCompare:
    'La guardaste para comparar: es buen momento para pedir info sin compromiso.',
  modalTitle: 'Te contactamos por esta propiedad',
  modalDescriptionIdle:
    'Completá el formulario: es el canal interno de Propieya; el publicador recibe tu consulta sin exponer su mail acá. Referencia del aviso:',
  contactModalInternalNote:
    'No mostramos teléfono ni email del publicador en la web: la respuesta llega por el equipo o por mail a vos.',
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
    'Indica qué tan completos están texto, fotos y datos. Si falta algo, pedí más detalle con el botón de contacto.',
  sourceImport:
    'Origen: sincronizado desde el feed de socios (mismo inventario que usa la inmobiliaria).',
  sourceManual: 'Origen: publicación gestionada en Propieya.',
  /** Línea opcional cuando hay `external_id` (solo referencia acotada). */
  sourceImportRefPrefix: 'Referencia de inventario:',
  expiringSoonBadge: 'Por vencer',

  /** Sprint 32 — ampliar zona / mismo criterio en el buscador */
  relatedSearchesTitle: 'Búsquedas relacionadas',
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
