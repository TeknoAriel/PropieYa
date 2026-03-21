#!/usr/bin/env bash
# P1 — Aplicar schema Drizzle contra la DATABASE_URL que elijas (ej. Neon producción).
# Uso: DATABASE_URL="postgresql://..." ./scripts/db-push-remote.sh
set -euo pipefail
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Definí DATABASE_URL (misma que usa Vercel web/panel)."
  echo "Ejemplo: DATABASE_URL=\"postgresql://...\" pnpm db:push"
  exit 1
fi
cd "$(dirname "$0")/.."
pnpm exec turbo db:push --filter=@propieya/database
