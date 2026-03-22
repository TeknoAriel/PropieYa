#!/usr/bin/env bash
# Verifica estado de producción (Git, API, commit desplegado)
set -e

echo "=== Verificación de producción ==="
echo ""

echo "1. Commit en main (GitHub):"
git fetch origin main 2>/dev/null || true
git log -1 --format="   %h %s" origin/main
echo ""

echo "2. Commit desplegado (API):"
V=$(curl -sf https://propieyaweb.vercel.app/api/version 2>/dev/null | grep -o '"commit":"[^"]*"' | cut -d'"' -f4)
if [ -n "$V" ]; then
  echo "   $V"
else
  echo "   (no se pudo obtener)"
fi
echo ""

echo "3. Health:"
H=$(curl -sf https://propieyaweb.vercel.app/api/health 2>/dev/null | head -c 200)
if echo "$H" | grep -q healthy; then
  echo "   OK"
else
  echo "   $H"
fi
echo ""

MAIN_H=$(git rev-parse --short origin/main 2>/dev/null)
if [ "$MAIN_H" = "$V" ]; then
  echo "✓ main y producción coinciden"
else
  echo "⚠ main ($MAIN_H) y producción ($V) NO coinciden"
  echo "  Ejecutá Promote o mergeá deploy/infra → main"
fi
