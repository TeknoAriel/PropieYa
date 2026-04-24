-- Tamaño del último feed completo considerado confiable (anti retiro masivo ante JSON truncado).
-- Alinear con `packages/database/src/schema/import-feeds.ts`; alternativa: `pnpm db:push`.
ALTER TABLE import_feed_sources
  ADD COLUMN IF NOT EXISTS last_trusted_full_feed_item_count INTEGER;

COMMENT ON COLUMN import_feed_sources.last_trusted_full_feed_item_count IS
  'Cantidad de ítems parseados en el último sync completo donde se aplicó política de bajas sin guard de caída brusca; usada por IMPORT_WITHDRAW_SHRINK_GUARD.';
