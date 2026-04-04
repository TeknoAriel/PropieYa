#!/usr/bin/env bash
# Comprueba integridad de la ruta de producción del portal (un solo repo, un proyecto web).
# 1) URL canónica responde.
# 2) Si hay VERCEL_TOKEN + VERCEL_PROJECT_ID, valida que el ID apunte al proyecto Vercel esperado.
#
# Uso:
#   ./scripts/verificar-ruta-produccion.sh
#   VERCEL_TOKEN=... VERCEL_PROJECT_ID=... ./scripts/verificar-ruta-produccion.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "${ROOT}/scripts/production-canonical.env.sh"

echo "=== Verificación ruta de producción (portal) ==="
echo "Repositorio operativo: TeknoAriel/PropieYa (copia org: kiteprop/ia-propieya)"
echo "Rama de deploy: ${PROPIEYA_DEPLOY_BRANCH}"
echo "URL canónica: ${PROPIEYA_CANONICAL_PORTAL_URL}"
echo "Proyecto Vercel web esperado: ${PROPIEYA_VERCEL_WEB_PROJECT_NAME}"
echo ""

if [[ -n "${VERCEL_TOKEN:-}" && -n "${VERCEL_PROJECT_ID:-}" ]]; then
  echo "--- API Vercel: nombre del proyecto para VERCEL_PROJECT_ID ---"
  resp="$(curl -fsS -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}")"
  name="$(echo "$resp" | jq -r '.name // empty')"
  if [[ -z "$name" ]]; then
    echo "ERROR: no se pudo leer .name del proyecto (token o ID inválido)."
    exit 1
  fi
  echo "Proyecto resuelto: $name"
  if [[ "$name" != "${PROPIEYA_VERCEL_WEB_PROJECT_NAME}" ]]; then
    echo "ERROR: VERCEL_PROJECT_ID apunta a '$name'; debe ser '${PROPIEYA_VERCEL_WEB_PROJECT_NAME}'."
    echo "Ver docs/DEPLOY-CONTEXTO-AGENTES.md y secretos en GitHub Actions."
    exit 1
  fi
  echo "OK: secret alinea con proyecto canónico."
else
  echo "(Sin VERCEL_TOKEN/VERCEL_PROJECT_ID: se omite chequeo de API; usar en CI o con env local)"
fi

echo ""
echo "--- HTTP portal ---"
code_root="$(curl -sS -o /dev/null -w "%{http_code}" "${PROPIEYA_CANONICAL_PORTAL_URL}" || echo "000")"
echo "GET / → HTTP $code_root"
if [[ ! "$code_root" =~ ^2 ]]; then
  echo "ERROR: la URL canónica no responde 2xx."
  exit 1
fi

code_h="$(curl -sS -o /dev/null -w "%{http_code}" "${PROPIEYA_CANONICAL_PORTAL_URL}/api/health" || echo "000")"
echo "GET /api/health → HTTP $code_h"
if [[ ! "$code_h" =~ ^(200|503)$ ]]; then
  echo "ERROR: /api/health inesperado (esperado 200 o 503 degradado)."
  exit 1
fi

echo ""
echo "--- /api/version ---"
curl -sS "${PROPIEYA_CANONICAL_PORTAL_URL}/api/version" | head -c 500
echo ""
echo ""
echo "=== OK: ruta de producción coherente con valores canónicos ==="
