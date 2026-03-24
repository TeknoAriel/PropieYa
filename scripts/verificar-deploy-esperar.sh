#!/usr/bin/env bash
# Espera a que el deploy en Vercel termine y verifica el portal.
# Uso: ./scripts/verificar-deploy-esperar.sh [--wait MIN]
# El agente ejecuta esto tras push a deploy/infra para saber cuándo terminó.

set -e
URL="${URL:-https://propieyaweb.vercel.app}"
WAIT_MIN=3

if [[ "$1" == "--wait" && -n "$2" ]]; then
  WAIT_MIN="$2"
  shift 2
fi

echo "=== Verificación de deploy (portal: $URL) ==="
echo "Esperando ${WAIT_MIN} min para que Vercel construya..."
sleep $((WAIT_MIN * 60))

for i in 1 2 3 4 5 6 7 8 9 10; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^2 ]]; then
    echo "✓ Portal responde HTTP $code"
    code_h=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/health" 2>/dev/null || echo "000")
    if [ "$code_h" = "200" ] || [ "$code_h" = "503" ]; then
      echo "✓ Health responde HTTP $code_h (503 = degradado, app desplegada)"
    fi
    echo ""
    echo "Versión:"
    curl -s "$URL/api/version" 2>/dev/null | head -c 200 || true
    echo ""
    echo "=== Deploy verificado OK ==="
    exit 0
  fi
  echo "Intento $i/10: HTTP $code, esperando 30s..."
  sleep 30
done

echo "✗ Portal no respondió 2xx tras ~8 min"
echo "Revisar Vercel: proyecto, rama main, Root Directory apps/web"
exit 1
