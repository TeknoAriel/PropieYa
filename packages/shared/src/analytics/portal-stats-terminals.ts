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
