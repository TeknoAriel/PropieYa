import { sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/**
 * Eventos crudos de webhooks de pasarelas (Mercado Pago, etc.).
 * Permite idempotencia y auditoría antes de implementar cobros completos.
 */
export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 32 }).notNull(),
    /** ID del evento en el proveedor (cuando exista) para deduplicar */
    externalEventId: varchar('external_event_id', { length: 128 }),
    eventType: varchar('event_type', { length: 64 }),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdx: index('payment_webhook_events_provider_idx').on(table.provider),
    /** Idempotencia fuerte ante carreras: un solo evento por (proveedor, id externo). */
    providerExternalUnique: uniqueIndex('payment_webhook_provider_external_uidx')
      .on(table.provider, table.externalEventId)
      .where(sql`${table.externalEventId} is not null`),
  })
)
