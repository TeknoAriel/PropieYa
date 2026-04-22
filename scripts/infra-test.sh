#!/usr/bin/env bash
# Test de infraestructura completo — valida que deploy funcione.
# Uso: pnpm run infra:test
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() {
  echo -e "${RED}❌ FAIL: $1${NC}" >&2
  exit 1
}

ok() {
  echo -e "${GREEN}✓ $1${NC}"
}

step() {
  echo -e "\n${YELLOW}▶ $1${NC}"
}

# ---------------------------------------------------------------------------
step "1. Verificar Docker"
# ---------------------------------------------------------------------------
if ! command -v docker &>/dev/null; then
  fail "Docker no está instalado o no está en PATH"
fi
if ! docker info &>/dev/null; then
  fail "Docker no está corriendo (ejecutá Docker Desktop)"
fi
ok "Docker OK"

# ---------------------------------------------------------------------------
step "2. Levantar servicios (docker compose)"
# ---------------------------------------------------------------------------
docker compose up -d
ok "Contenedores iniciados"

# ---------------------------------------------------------------------------
step "3. Esperar health de PostgreSQL"
# ---------------------------------------------------------------------------
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U postgres &>/dev/null; then
    ok "PostgreSQL listo"
    break
  fi
  if [ $i -eq 30 ]; then
    fail "PostgreSQL no respondió en 30 intentos"
  fi
  sleep 2
done

# ---------------------------------------------------------------------------
step "4. Verificar .env"
# ---------------------------------------------------------------------------
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    ok "Copiado .env desde .env.example"
  else
    fail "No existe .env ni .env.example"
  fi
fi
# Asegurar DATABASE_URL con puerto correcto para docker-compose
if ! grep -q "DATABASE_URL.*5433" .env 2>/dev/null; then
  echo -e "${YELLOW}⚠ Verificá que DATABASE_URL use localhost:5433 (puerto de postgres en docker-compose)${NC}"
fi
ok ".env presente"

# ---------------------------------------------------------------------------
step "5. Instalar dependencias"
# ---------------------------------------------------------------------------
pnpm install --frozen-lockfile
ok "Dependencias instaladas"

# ---------------------------------------------------------------------------
step "6. Typecheck"
# ---------------------------------------------------------------------------
pnpm typecheck || fail "Typecheck falló"
ok "Typecheck OK"

# ---------------------------------------------------------------------------
step "7. Schema local (db:push + parches docs/sql)"
# ---------------------------------------------------------------------------
pnpm db:schema:local || fail "db:schema:local falló"
ok "Schema Drizzle + parches SQL aplicados"

# ---------------------------------------------------------------------------
step "8. Build de apps"
# ---------------------------------------------------------------------------
pnpm build || fail "Build falló"
ok "Build OK"

# ---------------------------------------------------------------------------
step "9. Health check (web)"
# ---------------------------------------------------------------------------
# Asegurar que la app web tenga .env (Next.js carga desde su directorio)
if [ ! -f apps/web/.env ] && [ -f .env ]; then
  cp .env apps/web/.env
  ok ".env copiado a apps/web para runtime"
fi
PORT="${PORT:-3999}"
export PORT
# Iniciar servidor en background
pnpm --filter @propieya/web start &
WEB_PID=$!
HEALTH_URL="http://localhost:$PORT/api/health"
# Esperar arranque + health (hasta 60s)
HEALTH_OK=0
for i in {1..30}; do
  if ! kill -0 $WEB_PID 2>/dev/null; then
    break
  fi

  HTTP_CODE=$(curl -s -o /tmp/health.json -w "%{http_code}" "$HEALTH_URL" || true)
  if [ "$HTTP_CODE" = "200" ]; then
    STATUS=$(grep -o '"status":"[^"]*"' /tmp/health.json | head -1 || true)
    if echo "$STATUS" | grep -q "healthy"; then
      ok "Health check OK (status: healthy)"
      HEALTH_OK=1
      break
    fi
  fi
  sleep 2
done

if [ "$HEALTH_OK" -ne 1 ]; then
  echo -e "${YELLOW}Última respuesta health (si hubo): $(cat /tmp/health.json 2>/dev/null || echo 'sin respuesta')${NC}"
  kill $WEB_PID 2>/dev/null || true
  fail "Health check falló (curl a $HEALTH_URL)"
fi
kill $WEB_PID 2>/dev/null || true
ok "Servidor detenido"

# ---------------------------------------------------------------------------
echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Infra test completado correctamente  ${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"
