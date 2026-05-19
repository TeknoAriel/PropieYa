#!/usr/bin/env bash
# Verifica panel B2B en producción (health + opcional proyecto Vercel).
# Uso: ./scripts/verificar-panel-produccion.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "${ROOT}/scripts/production-canonical.env.sh"

echo "=== Verificación panel producción ==="
echo "URL: ${PROPIEYA_CANONICAL_PANEL_URL}"
echo ""

if [[ -n "${VERCEL_TOKEN:-}" && -n "${VERCEL_PANEL_PROJECT_ID:-}" ]]; then
  echo "--- API Vercel: proyecto panel ---"
  resp="$(curl -fsS -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "https://api.vercel.com/v9/projects/${VERCEL_PANEL_PROJECT_ID}")"
  name="$(echo "$resp" | jq -r '.name // empty')"
  if [[ -z "$name" ]]; then
    echo "ERROR: VERCEL_PANEL_PROJECT_ID inválido."
    exit 1
  fi
  if [[ "$name" != "${PROPIEYA_VERCEL_PANEL_PROJECT_NAME}" ]]; then
    echo "ERROR: ID apunta a '$name'; esperado '${PROPIEYA_VERCEL_PANEL_PROJECT_NAME}'."
    exit 1
  fi
  echo "OK: ${name}"
else
  echo "(Sin VERCEL_TOKEN/VERCEL_PANEL_PROJECT_ID: omitiendo chequeo API)"
fi

echo ""
code_root="$(curl -sS -o /dev/null -w "%{http_code}" "${PROPIEYA_CANONICAL_PANEL_URL}" 2>/dev/null || echo "000")"
echo "GET / → HTTP $code_root"
if [[ ! "$code_root" =~ ^2 ]]; then
  echo "ERROR: panel no responde 2xx (¿DEPLOYMENT_NOT_FOUND? → workflow deploy-panel-production)"
  exit 1
fi

code_h="$(curl -sS -o /dev/null -w "%{http_code}" "${PROPIEYA_CANONICAL_PANEL_URL}/api/health" 2>/dev/null || echo "000")"
echo "GET /api/health → HTTP $code_h"
if [[ ! "$code_h" =~ ^(200|503)$ ]]; then
  echo "ERROR: health inesperado"
  exit 1
fi
curl -sS "${PROPIEYA_CANONICAL_PANEL_URL}/api/health" | head -c 400
echo ""
echo ""
echo "=== Panel OK ==="
