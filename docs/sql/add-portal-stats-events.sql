-- Tabla de hechos para telemetría del portal (doc 49 F2).
-- Alternativa a `pnpm db:push`: ejecutar una vez en Neon SQL Editor.

CREATE TABLE IF NOT EXISTS portal_stats_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations (id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings (id) ON DELETE SET NULL,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_stats_events_terminal_created_idx
  ON portal_stats_events (terminal_id, created_at);

CREATE INDEX IF NOT EXISTS portal_stats_events_org_created_idx
  ON portal_stats_events (organization_id, created_at);

CREATE INDEX IF NOT EXISTS portal_stats_events_listing_created_idx
  ON portal_stats_events (listing_id, created_at);
