#!/usr/bin/env bash
# Verifica y ejecuta la ingesta de propiedades contra la DB de producción.
#
# Requisitos: vercel CLI logueado, proyecto linkeado a propie-ya-web (ver docs/DEPLOY-CONTEXTO-AGENTES.md)
#
# Uso:
#   ./scripts/verificar-ingestion.sh
#   ./scripts/verificar-ingestion.sh --file=./kiteprop.json
#
# Con --file: importa desde archivo local (útil si el feed remoto falla).

set -e
cd "$(dirname "$0")/.."

ENV_FILE="apps/web/.env.prod.verificar"
FILE_ARG=""

for arg in "$@"; do
  case $arg in
    --file=*) FILE_ARG="$arg" ;;
  esac
done

echo "=== 1. Descargar variables de producción ==="
(cd apps/web && vercel env pull .env.prod.verificar --environment=production --yes) 2>/dev/null || {
  echo "ERROR: vercel env pull falló. ¿Estás linkeado a propie-ya-web?"
  echo "  cd apps/web && vercel link --project propie-ya-web"
  exit 1
}

echo ""
echo "=== 2. Cargar variables ==="
set -a
source "$ENV_FILE"
set +a

echo ""
echo "=== 3. Importar propiedades ==="
if [ -n "$FILE_ARG" ]; then
  echo "Desde archivo: $FILE_ARG"
  pnpm import:yumblin -- "$FILE_ARG"
else
  echo "Desde feed remoto (YUMBLIN_JSON_URL o default Kiteprop)"
  echo "Si falla, probá: ./scripts/verificar-ingestion.sh --file=./scripts/fixtures/yumblin-test.json"
  pnpm import:yumblin -- --force-full-fetch || {
    echo "Feed remoto falló. Usando archivo de prueba..."
    pnpm import:yumblin -- --file=./scripts/fixtures/yumblin-test.json
  }
fi

echo ""
echo "=== 4. Publicar drafts importados ==="
pnpm publish:imported

echo ""
echo "=== 5. Indexar en Elasticsearch ==="
SYNC_OK=false
if [ -n "$CRON_SECRET" ]; then
  RESP=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $CRON_SECRET" \
    https://propieyaweb.vercel.app/api/cron/sync-search 2>/dev/null || echo "000")
  CODE=$(echo "$RESP" | tail -1)
  if [ "$CODE" = "200" ]; then
    echo "sync-search (remoto) OK: $(echo "$RESP" | head -n -1)"
    SYNC_OK=true
  fi
fi
if [ "$SYNC_OK" = false ] && [ -n "$ELASTICSEARCH_URL" ]; then
  echo "Intentando sync local..."
  ENV_FILE="$ENV_FILE" pnpm sync-search:local && SYNC_OK=true || true
fi
if [ "$SYNC_OK" = false ]; then
  echo "AVISO: No se pudo indexar en ES. Las propiedades están en la DB."
  echo "  Búsqueda usará fallback SQL. Para indexar: curl -H 'Authorization: Bearer \$CRON_SECRET' https://propieyaweb.vercel.app/api/cron/sync-search"
fi

echo ""
echo "=== 6. Limpiar archivo temporal ==="
rm -f apps/web/.env.prod.verificar

echo ""
echo "=== Listo ==="
echo "Verificá: https://propieyaweb.vercel.app/buscar"
echo "Si el portal da 404, revisá el dominio en Vercel (Settings → Domains)."
