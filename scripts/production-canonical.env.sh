# shellcheck shell=bash
# Fuente única de valores canónicos del portal en producción.
# Mantener alineado con docs/CANONICAL-URLS.md y docs/DEPLOY-CONTEXTO-AGENTES.md
#
# Uso: source scripts/production-canonical.env.sh

export PROPIEYA_CANONICAL_PORTAL_URL="${PROPIEYA_CANONICAL_PORTAL_URL:-https://propieyaweb.vercel.app}"
export PROPIEYA_VERCEL_WEB_PROJECT_NAME="${PROPIEYA_VERCEL_WEB_PROJECT_NAME:-propie-ya-web}"
export PROPIEYA_CANONICAL_PANEL_URL="${PROPIEYA_CANONICAL_PANEL_URL:-https://propieya-panel.vercel.app}"
export PROPIEYA_DEPLOY_BRANCH="${PROPIEYA_DEPLOY_BRANCH:-deploy/infra}"
