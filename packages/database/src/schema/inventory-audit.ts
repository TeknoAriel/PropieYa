import { date, jsonb, pgTable, timestamp } from 'drizzle-orm/pg-core'

/**
 * Snapshot diario de inventario (cron `/api/cron/inventory-audit`).
 * Una fila por día UTC (`snapshot_date`); re-ejecuciones el mismo día hacen upsert.
 */
export const inventoryAuditSnapshots = pgTable('inventory_audit_snapshots', {
  snapshotDate: date('snapshot_date', { mode: 'string' }).primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  metrics: jsonb('metrics').notNull().$type<Record<string, unknown>>(),
  alerts: jsonb('alerts').notNull().$type<string[]>().default([]),
})
