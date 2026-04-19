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

print_quota_hints() {
  echo ""
  echo "=== Posibles causas (no asumir solo error de código) ==="
  echo "1. Build o deploy en Vercel en cola o fallido → GitHub Actions (Promote) o Vercel → Deployments del proyecto web."
  echo "2. Cuota plan Hobby (deployments/día, minutos de build/mes) → docs/DEPLOY-CONTEXTO-AGENTES.md § Cuotas y Vercel → Usage."
  echo "   Los correos que citan «25 deploys/día» pueden estar desactualizados; la doc oficial suele indicar 100/día (ver enlace en ese doc)."
  echo "3. Dominio o proyecto incorrecto → docs/33-VERCEL-CONFIG-PROYECTO-WEB.md"
  echo ""
  echo "--- Cabeceras HTTP de / (diagnóstico) ---"
  curl -sS -D - -o /dev/null "$URL" 2>/dev/null | head -n 35 || echo "(curl falló)"
}

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

echo "✗ Portal no respondió 2xx tras la espera inicial y ~8 min de reintentos."
print_quota_hints
exit 1
