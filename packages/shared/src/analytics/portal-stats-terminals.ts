/**
 * Identificadores estables para terminales de telemetría orientadas al panel de estadísticas.
 * No sustituyen tablas de negocio (leads, search_history); complementan o unifican naming.
 *
 * @see docs/49-ARQUITECTURA-PANEL-ESTADISTICAS-Y-TELEMETRIA.md
 */

export const PORTAL_STATS_TERMINALS = {
  /** Ejecución exitosa del listado (portal); alinear con persistencia en search_history si hay sesión. */
  LISTING_SEARCH_EXECUTED: 'listing.search.executed',
  /** Vista de ficha pública (antes de incrementar view_count / ES). */
  LISTING_FICHA_VIEW: 'listing.ficha.view',
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
  [PORTAL_STATS_TERMINALS.LISTING_FICHA_VIEW]: 'Vista de ficha pública',
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
