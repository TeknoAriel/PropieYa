-- Propieya: trazabilidad de ciclo de vida de avisos + marca de actualización de contenido.
-- Ejecutar en Neon / Postgres tras deploy del esquema Drizzle o en paralelo a `pnpm db:push`.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS last_content_updated_at TIMESTAMPTZ;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS renewal_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS listing_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source VARCHAR(40) NOT NULL,
  actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  previous_status VARCHAR(50) NOT NULL,
  new_status VARCHAR(50) NOT NULL,
  reason_code VARCHAR(80) NOT NULL,
  reason_message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  kiteprop_payload JSONB NOT NULL,
  kiteprop_webhook_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  kiteprop_webhook_error TEXT,
  kiteprop_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS listing_lifecycle_events_listing_idx
  ON listing_lifecycle_events (listing_id);

CREATE INDEX IF NOT EXISTS listing_lifecycle_events_pending_webhook_idx
  ON listing_lifecycle_events (kiteprop_webhook_status, created_at);
