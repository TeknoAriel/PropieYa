#!/usr/bin/env bash
# Aplica el schema Drizzle a la base de datos de producción (Neon).
# Necesitás DATABASE_URL de Vercel → propieya-web → Settings → Environment Variables.
#
# Uso:
#   1. Copiá DATABASE_URL desde Vercel
#   2. DATABASE_URL="postgresql://..." ./scripts/db-push-produccion.sh
#
# O si tenés .env con DATABASE_URL de producción:
#   source .env && ./scripts/db-push-produccion.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ Definí DATABASE_URL (la misma que usa Vercel en propie-ya-web)"
  echo ""
  echo "Dónde conseguirla:"
  echo "  https://vercel.com/teknoariels-projects/propie-ya-web/settings/environment-variables"
  echo ""
  echo "Ejecutá:"
  echo '  DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" ./scripts/db-push-produccion.sh'
  exit 1
fi

echo "▶ Aplicando schema a la base de datos..."
pnpm exec turbo db:push --filter=@propieya/database

echo ""
echo "✓ Listo. Probá de nuevo el registro en https://propieyaweb.vercel.app/registro"
