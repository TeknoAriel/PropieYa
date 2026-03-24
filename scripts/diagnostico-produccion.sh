#!/usr/bin/env bash
# Diagnóstico rápido del portal (HTTP, headers Vercel). Sin credenciales.
# Uso: ./scripts/diagnostico-produccion.sh [URL]

set -e
URL="${1:-${URL:-https://propieyaweb.vercel.app}}"

echo "=== Diagnóstico producción ==="
echo "URL: $URL"
echo ""

echo "--- GET / (primeras líneas de cabecera) ---"
curl -sS -D - -o /dev/null "$URL" | head -n 25 || true

echo ""
echo "--- GET /api/health ---"
code_h=$(curl -sS -o /dev/null -w "%{http_code}" "$URL/api/health" 2>/dev/null || echo "000")
echo "HTTP $code_h"

echo ""
echo "--- GET /api/version (cuerpo) ---"
curl -sS "$URL/api/version" 2>/dev/null | head -c 400 || echo "(sin cuerpo)"
echo ""
echo ""
echo "Interpretación:"
echo "  - x-vercel-error: NOT_FOUND → el dominio no tiene despliegue (proyecto Vercel / Git / Root Directory)."
echo "  - 2xx en / y 200 en /api/health → OK."
echo "Documentación: docs/DEPLOY-PASOS-URIs.md y docs/33-VERCEL-CONFIG-PROYECTO-WEB.md"
