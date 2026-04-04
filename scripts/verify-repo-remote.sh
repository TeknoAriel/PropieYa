#!/usr/bin/env bash
# Verifica que origin apunta al repo operativo TeknoAriel/PropieYa (SSH o HTTPS).
# Copia de auditoría en org kiteprop: remoto `kiteprop` → kiteprop/ia-propieya.
set -euo pipefail

EXPECTED_SSH="git@github.com:TeknoAriel/PropieYa.git"
EXPECTED_HTTPS="https://github.com/TeknoAriel/PropieYa.git"

if ! command -v git >/dev/null 2>&1; then
  echo "verify-repo-remote: git no está instalado" >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "verify-repo-remote: no es un repositorio git" >&2
  exit 1
fi

url="$(git remote get-url origin 2>/dev/null || true)"
if [[ -z "$url" ]]; then
  echo "verify-repo-remote: no hay remote 'origin'" >&2
  exit 1
fi

# Normalizar variantes (sin .git, con trailing slash)
norm="${url%.git}"
norm="${norm%/}"

ok=0
case "$norm" in
  "$EXPECTED_SSH"|"${EXPECTED_SSH%.git}"|"${EXPECTED_HTTPS%.git}"|"$EXPECTED_HTTPS")
    ok=1
    ;;
  git@github.com:TeknoAriel/PropieYa|https://github.com/TeknoAriel/PropieYa)
    ok=1
    ;;
esac

if [[ "$ok" -ne 1 ]]; then
  echo "verify-repo-remote: origin debe ser TeknoAriel/PropieYa" >&2
  echo "  actual: $url" >&2
  echo "  esperado (ej.): $EXPECTED_SSH o $EXPECTED_HTTPS" >&2
  echo "  copia auditoría: git remote add kiteprop git@github.com:kiteprop/ia-propieya.git" >&2
  exit 1
fi

echo "verify-repo-remote: OK — origin = TeknoAriel/PropieYa"
