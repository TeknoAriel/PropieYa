#!/usr/bin/env bash
# Schema local: Drizzle push + parches SQL idempotentes (docs/sql/manifest.txt).
# Requiere DATABASE_URL (p. ej. en .env raíz apuntando a localhost:5433).
# Uso: pnpm db:schema:local
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -z "${DATABASE_URL:-}" ] && [ ! -f .env ]; then
  echo "[db-schema-local] Definí DATABASE_URL en el entorno o creá .env desde .env.example (Docker: puerto 5433)." >&2
  exit 1
fi

echo "[db-schema-local] drizzle-kit push (schema Drizzle)…"
pnpm --filter @propieya/database db:push

echo "[db-schema-local] parches docs/sql (manifest)…"
pnpm exec tsx scripts/apply-docs-sql.ts

echo "[db-schema-local] listo."
