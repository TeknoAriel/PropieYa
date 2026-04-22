-- Propieya: columnas de monetización / control de acceso en `leads` (portal + panel).
--
-- Motivación:
-- - Evitar `drizzle-kit push` interactivo en prod (prompts / no-TTY).
-- - Alinear Postgres con `packages/database/src/schema/leads.ts` de forma idempotente.
--
-- Ejecutar en Neon / Postgres (prod) con un rol con permisos DDL sobre `public`.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS message_generated_by_system BOOLEAN;

UPDATE leads
SET message_generated_by_system = false
WHERE message_generated_by_system IS NULL;

ALTER TABLE leads
  ALTER COLUMN message_generated_by_system SET DEFAULT false;

ALTER TABLE leads
  ALTER COLUMN message_generated_by_system SET NOT NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS enrichment JSONB;

UPDATE leads
SET enrichment = '{}'::jsonb
WHERE enrichment IS NULL;

ALTER TABLE leads
  ALTER COLUMN enrichment SET DEFAULT '{}'::jsonb;

ALTER TABLE leads
  ALTER COLUMN enrichment SET NOT NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS quality_score INTEGER;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS access_status VARCHAR(20);

UPDATE leads
SET access_status = 'activated'
WHERE access_status IS NULL;

ALTER TABLE leads
  ALTER COLUMN access_status SET DEFAULT 'activated';

ALTER TABLE leads
  ALTER COLUMN access_status SET NOT NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS activation_mode VARCHAR(30);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS intent_level VARCHAR(20);

UPDATE leads
SET intent_level = 'medium'
WHERE intent_level IS NULL;

ALTER TABLE leads
  ALTER COLUMN intent_level SET DEFAULT 'medium';

ALTER TABLE leads
  ALTER COLUMN intent_level SET NOT NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source VARCHAR(50);

UPDATE leads
SET source = 'listing_contact'
WHERE source IS NULL;

ALTER TABLE leads
  ALTER COLUMN source SET DEFAULT 'listing_contact';

ALTER TABLE leads
  ALTER COLUMN source SET NOT NULL;

CREATE INDEX IF NOT EXISTS leads_access_status_idx
  ON leads (access_status);

-- Backfill conservador para filas existentes:
-- - Si la org está en plan pago → acceso activado (coherente con `lead.create` actual).
-- - Si la org está en plan free → pendiente de activación (coherente con gating del panel).
UPDATE leads l
SET
  access_status = CASE WHEN o.plan_type = 'free' THEN 'pending' ELSE 'activated' END,
  activated_at = CASE WHEN o.plan_type = 'free' THEN NULL ELSE COALESCE(l.activated_at, now()) END,
  activation_mode = CASE
    WHEN o.plan_type = 'free' THEN NULL
    ELSE COALESCE(l.activation_mode, 'plan')
  END,
  updated_at = now()
FROM listings li
JOIN organizations o ON o.id = li.organization_id
WHERE l.listing_id = li.id
  AND l.access_status = 'activated'
  AND l.activated_at IS NULL
  AND l.activation_mode IS NULL;
