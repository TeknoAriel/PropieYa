-- Columna para sync incremental del feed (Properstar: last_update).
-- Alternativa a `pnpm db:push` contra Neon: ejecutar una vez en SQL Editor de Neon.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS import_source_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN listings.import_source_updated_at IS
  'Última fecha de modificación reportada por el feed para este external_id; evita reprocesar si no cambió.';
