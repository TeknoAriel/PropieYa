/**
 * Identificadores estables para terminales de telemetría orientadas al panel de estadísticas.
 * No sustituyen tablas de negocio (leads, search_history); complementan o unifican naming.
 *
 * @see docs/49-ARQUITECTURA-PANEL-ESTADISTICAS-Y-TELEMETRIA.md
 */

export const PORTAL_STATS_TERMINALS = {
  /** Ejecución exitosa del listado (portal); alinear con persistencia en search_history si hay sesión. */
  LISTING_SEARCH_EXECUTED: 'listing.search.executed',
  /** Primera pasada devolvió 0 y la relajación o SQL devolvió resultados. */
  LISTING_SEARCH_ZERO_PRIMARY_RESOLVED: 'listing.search.zero_primary_resolved',
  /** Se aplicó al menos un paso de relajación de filtros (payload: stepIds, tier). */
  LISTING_SEARCH_RELAXATION_USED: 'listing.search.relaxation_used',
  /** Vista de ficha pública (antes de incrementar view_count / ES). */
  LISTING_FICHA_VIEW: 'listing.ficha.view',
  /**
   * Clic desde resultado de búsqueda (lista o mapa) hacia la ficha.
   * Payload sugerido: `{ from?: 'list' | 'map' | 'similar', position?: number }` — sin PII.
   */
  LISTING_SEARCH_RESULT_CLICK: 'listing.search.result_click',
  /**
   * Usuario abrió el flujo de contacto (CTA principal), antes de enviar lead.
   * Embudo monetización / conversión; payload mínimo.
   */
  LISTING_CONTACT_CTA_CLICK: 'listing.contact.cta_click',
  /**
   * Se mostró el bloque de sugerencia / CTA inteligente en ficha (sin abrir modal aún).
   * Payload sugerido: `{ reason?: string }` — sin PII.
   */
  LISTING_CONTACT_PROMPT_SHOWN: 'listing.contact.prompt_shown',
  /** Lead enviado desde ficha u otro CTA. */
  LEAD_SUBMITTED: 'lead.submitted',
  /** Aviso agregado al comparador. */
  LISTING_COMPARE_ADD: 'listing.compare.add',
  /** Usuario abrió la página de comparación. */
  LISTING_COMPARE_VIEW: 'listing.compare.view',
  /** Mensaje de usuario al asistente. */
  ASSISTANT_MESSAGE_SENT: 'assistant.message.sent',
  /** El asistente disparó una búsqueda de listings. */
  ASSISTANT_SEARCH_TRIGGERED: 'assistant.search.triggered',
  /** Actualización de perfil de demanda. */
  DEMAND_PROFILE_UPDATED: 'demand.profile.updated',
  /** Nueva alerta guardada. */
  SEARCH_ALERT_CREATED: 'search.alert.created',
  /** Login exitoso (portal o panel); evaluar PII / volumen antes de activar. */
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  /** Fin de pipeline de ingest (payload con counts opcional). */
  INGEST_RUN_COMPLETED: 'ingest.run.completed',
} as const

export type PortalStatsTerminalId =
  (typeof PORTAL_STATS_TERMINALS)[keyof typeof PORTAL_STATS_TERMINALS]

/** Etiquetas cortas para panel B2B / informes. */
export const PORTAL_STATS_TERMINAL_LABELS: Record<PortalStatsTerminalId, string> = {
  [PORTAL_STATS_TERMINALS.LISTING_SEARCH_EXECUTED]: 'Búsqueda en listado',
  [PORTAL_STATS_TERMINALS.LISTING_SEARCH_ZERO_PRIMARY_RESOLVED]:
    'Búsqueda: 0 exactos resueltos con relajación',
  [PORTAL_STATS_TERMINALS.LISTING_SEARCH_RELAXATION_USED]:
    'Búsqueda: relajación de filtros aplicada',
  [PORTAL_STATS_TERMINALS.LISTING_FICHA_VIEW]: 'Vista de ficha pública',
  [PORTAL_STATS_TERMINALS.LISTING_SEARCH_RESULT_CLICK]:
    'Clic en resultado hacia ficha',
  [PORTAL_STATS_TERMINALS.LISTING_CONTACT_CTA_CLICK]:
    'Clic en contactar (inicio flujo)',
  [PORTAL_STATS_TERMINALS.LISTING_CONTACT_PROMPT_SHOWN]:
    'Ficha: sugerencia de contacto mostrada',
  [PORTAL_STATS_TERMINALS.LEAD_SUBMITTED]: 'Lead enviado',
  [PORTAL_STATS_TERMINALS.LISTING_COMPARE_ADD]: 'Aviso al comparador',
  [PORTAL_STATS_TERMINALS.LISTING_COMPARE_VIEW]: 'Página comparar',
  [PORTAL_STATS_TERMINALS.ASSISTANT_MESSAGE_SENT]: 'Mensaje al asistente',
  [PORTAL_STATS_TERMINALS.ASSISTANT_SEARCH_TRIGGERED]: 'Búsqueda vía asistente',
  [PORTAL_STATS_TERMINALS.DEMAND_PROFILE_UPDATED]: 'Perfil de demanda',
  [PORTAL_STATS_TERMINALS.SEARCH_ALERT_CREATED]: 'Alerta creada',
  [PORTAL_STATS_TERMINALS.AUTH_LOGIN_SUCCESS]: 'Inicio de sesión',
  [PORTAL_STATS_TERMINALS.INGEST_RUN_COMPLETED]: 'Ingesta de catálogo',
}

export function portalStatsTerminalLabel(terminalId: string): string {
  return (
    PORTAL_STATS_TERMINAL_LABELS[terminalId as PortalStatsTerminalId] ??
    terminalId
  )
}
