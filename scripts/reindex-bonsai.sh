#!/usr/bin/env bash
# Reindex de listings hacia OpenSearch (p. ej. Bonsai).
# Siempre hace cd a la raíz del repo antes de ejecutar.
#
# Variables: DATABASE_URL y ELASTICSEARCH_URL deben estar en el entorno o en un .env.
# ENV_FILE (opcional): ruta relativa a la raíz del repo; `scripts/sync-search-local.ts`
#   carga ese archivo con dotenv (misma convención que en el comentario de uso del script TS).
# Ejemplo:
#   ENV_FILE=apps/web/.env.prod.verificar ./scripts/reindex-bonsai.sh
#
# USE_OPENSEARCH=1 por defecto (export USE_OPENSEARCH=0 para desactivar). Con host *.bonsai.io
# el portal ya auto-detecta OpenSearch; este script fuerza el cliente OpenSearch por si el cluster es otro.
set -euo pipefail
cd "$(dirname "$0")/.."
export USE_OPENSEARCH="${USE_OPENSEARCH:-1}"
exec pnpm exec tsx scripts/sync-search-local.ts
