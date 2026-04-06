#!/usr/bin/env bash
# Reindex de listings hacia OpenSearch (p. ej. Bonsai).
# Requiere DATABASE_URL + ELASTICSEARCH_URL (misma URL que en Vercel).
# Con URL *.bonsai.io no hace falta USE_OPENSEARCH; este script lo fuerza por si el host es otro OpenSearch.
#
#   ENV_FILE=apps/web/.env.prod.verificar ./scripts/reindex-bonsai.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export USE_OPENSEARCH="${USE_OPENSEARCH:-1}"
exec pnpm exec tsx scripts/sync-search-local.ts
