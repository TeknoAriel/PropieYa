#!/usr/bin/env bash
# Diagnóstico rápido del portal (HTTP, headers Vercel). Sin credenciales.
# Uso: ./scripts/diagnostico-produccion.sh [URL]

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "${ROOT}/scripts/production-canonical.env.sh"
URL="${1:-${URL:-${PROPIEYA_CANONICAL_PORTAL_URL}}}"

echo "=== Diagnóstico producción ==="
echo "URL: $URL"
echo ""

echo "--- GET / (primeras líneas de cabecera) ---"
curl -sS -D - -o /dev/null "$URL" | head -n 25 || true

echo ""
echo "--- GET /api/health ---"
code_h=$(curl -sS -o /dev/null -w "%{http_code}" "$URL/api/health" 2>/dev/null || echo "000")
echo "HTTP $code_h"
health_body=$(curl -sS "$URL/api/health" 2>/dev/null || true)
echo "$health_body" | head -c 800
echo ""
if echo "$health_body" | grep -q 'DATABASE_URL'; then
  echo ""
  echo ">>> Falta DATABASE_URL en Vercel (Production) del proyecto web."
  echo "    https://vercel.com/teknoariels-projects/propie-ya-web/settings/environment-variables"
  echo "    Ver: docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md y docs/REGISTRO-BLOQUEOS.md"
fi

echo ""
echo "--- GET /api/version (cuerpo) ---"
curl -sS "$URL/api/version" 2>/dev/null | head -c 400 || echo "(sin cuerpo)"
echo ""
echo ""
echo "Interpretación:"
echo "  - x-vercel-error: NOT_FOUND → el dominio no tiene despliegue (proyecto Vercel / Git / Root Directory)."
echo "  - 2xx en / y 200 en /api/health → OK."
echo "  - 503 en /api/health con DATABASE_URL → copiar env desde Neon u otro proyecto Vercel."
echo "Documentación: docs/DEPLOY-PASOS-URIs.md y docs/33-VERCEL-CONFIG-PROYECTO-WEB.md"
