-- Una vez en producción (Neon SQL Editor o psql con DATABASE_URL de prod).
-- Habilita la columna que el sprint 26.8 asumía tras `pnpm db:push`.
-- Tras aplicar: opcional `pnpm dedup:apply` + reindex ES si se reactiva el filtrado en código.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS dedup_canonical_id uuid;

CREATE INDEX IF NOT EXISTS listings_dedup_canonical_idx
  ON listings (dedup_canonical_id);
