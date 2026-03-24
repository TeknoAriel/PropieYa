#!/usr/bin/env bash
# Verifica que el portal y APIs de producción respondan OK.
# Uso: ./scripts/verificar-produccion.sh

set -e
URL="${URL:-https://propieyaweb.vercel.app}"

echo "=== Verificación de producción ==="
echo "URL: $URL"
echo ""

# Portal
code=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
if [[ "$code" =~ ^2 ]]; then
  echo "✓ Portal: HTTP $code"
else
  echo "✗ Portal: HTTP $code (se esperaba 2xx)"
  exit 1
fi

# Health (200 = OK; 503 = app viva pero DB u otra dependencia caída)
code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/health" 2>/dev/null || echo "000")
if [ "$code" = "200" ]; then
  echo "✓ Health: HTTP 200"
  curl -s "$URL/api/health" | head -c 200
  echo ""
elif [ "$code" = "503" ]; then
  echo "⚠ Health: HTTP 503 (degradado; revisar DATABASE_URL en Vercel)"
  curl -s "$URL/api/health" | head -c 200
  echo ""
else
  echo "✗ Health: HTTP $code"
  exit 1
fi

# Version
echo ""
echo "Versión desplegada:"
curl -s "$URL/api/version" 2>/dev/null | head -c 300 || echo "(no disponible)"
echo ""
echo ""
echo "=== Fin verificación ==="
