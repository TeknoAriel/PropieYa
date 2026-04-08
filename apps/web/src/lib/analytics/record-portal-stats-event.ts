import type { Database } from '@propieya/database'
import { portalStatsEvents } from '@propieya/database'
import type { PortalStatsTerminalId } from '@propieya/shared'

export type RecordPortalStatsEventInput = {
  terminalId: PortalStatsTerminalId
  organizationId?: string | null
  listingId?: string | null
  userId?: string | null
  /** Sin PII; solo dimensiones técnicas o de producto. */
  payload?: Record<string, unknown>
}

/**
 * Inserta un hecho en `portal_stats_events` sin bloquear la respuesta principal.
 * Fallos se loguean; no relanzan (tabla ausente en DB vieja, etc.).
 */
export function recordPortalStatsEvent(
  db: Database,
  input: RecordPortalStatsEventInput
): void {
  if (process.env.DISABLE_PORTAL_STATS_WRITES === '1') {
    return
  }
  void db
    .insert(portalStatsEvents)
    .values({
      terminalId: input.terminalId,
      organizationId: input.organizationId ?? null,
      listingId: input.listingId ?? null,
      userId: input.userId ?? null,
      payload: input.payload ?? {},
    })
    .then(
      () => {},
      (err: unknown) => {
        console.error('[recordPortalStatsEvent]', input.terminalId, err)
      }
    )
}
