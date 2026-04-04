import { getTableColumns } from 'drizzle-orm'

import { listings } from './schema/listings'

/**
 * Columnas de `listings` para SELECT público sin `import_source_updated_at`.
 * Evita error en Postgres si la columna aún no existe (migración pendiente en Neon).
 * Tras `pnpm db:push` o `docs/sql/add-import-source-updated-at.sql`, el esquema queda alineado.
 */
const full = getTableColumns(listings)
const { importSourceUpdatedAt: _unusedImportSourceUpdatedAt, ...listingsSelectPublic } =
  full
void _unusedImportSourceUpdatedAt

export { listingsSelectPublic }
