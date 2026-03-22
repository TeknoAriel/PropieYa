# Control de calidad (agente, no el propietario)

## Reglas

- **Pre-push:** `pnpm lint` + `pnpm typecheck` (y `pnpm build` si aplica).
- **CI:** `.github/workflows/ci.yml` en `main` y PRs.
- **Promote:** `.github/workflows/promote-deploy-infra.yml` tras push a `deploy/infra`.

## Errores

- Fallos de CI: el agente corrige y vuelve a subir.
- Bloqueos externos: `docs/REGISTRO-BLOQUEOS.md`.

## Cursor

- `.cursor/rules/automacion-propietario.mdc` — sin pasos manuales del usuario.
- `.cursor/rules/control-produccion.mdc` — control y manejo de errores.
- `.cursor/rules/produccion-escala.mdc` — URL canónica, Vercel, monorepo, escalado.

## URLs

- `docs/CANONICAL-URLS.md` — portal **https://propieyaweb.vercel.app**
