# Contexto y reglas duras — Deploy (para agentes y humanos)

**Última actualización:** 2026-04-04. Este archivo es la **hoja de contexto** cuando haya dudas sobre Vercel, dominios o CI. No duplicar reglas contradictorias en otros docs: enlazar aquí.

---

## Estado actual (fuente de verdad)

| Qué | Valor |
|-----|--------|
| **URL pública del portal** | `https://propieyaweb.vercel.app` (ver `docs/CANONICAL-URLS.md`) |
| **Proyecto Vercel activo (web)** | `propie-ya-web` (team `teknoariels-projects`) |
| **Dominio Vercel del proyecto** | `propie-ya-web.vercel.app` (alias interno; el canónico de producto es `propieyaweb.vercel.app`) |
| **Repositorio** | `kiteprop/ia-propieya` |
| **Root Directory en Vercel** | `apps/web` |
| **Rama de integración deploy** | Push a `deploy/infra` → workflow → **Vercel CLI** (portal). **`main` debe fusionarse con `deploy/infra`** para mantener el repo y el deploy del panel (Git) alineados; el workflow **no** mergea solo. |
| **Secretos GitHub** | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` deben apuntar al proyecto **`propie-ya-web`** (el workflow Promote **falla** si el ID no resuelve a ese nombre vía API Vercel). |
| **`/api/version` en deploy CLI** | El paso `vercel deploy --prod` del workflow inyecta `BUILD_COMMIT_SHA` y `BUILD_GIT_REF` (`GITHUB_SHA` / `GITHUB_REF_NAME`) para que el portal no quede mostrando un commit viejo de integración Git. `GET /api/version` prioriza esas variables sobre `VERCEL_GIT_*`. |
| **Fuente única de constantes** | `scripts/production-canonical.env.sh` — URL canónica, nombre del proyecto web, rama de deploy. Scripts: `pnpm verificar:ruta-produccion`. |
| **Variables Vercel (web, Production)** | Mínimo: `DATABASE_URL`, `JWT_SECRET`, `TRUSTED_PANEL_ORIGINS`. [Environment Variables →](https://vercel.com/teknoariels-projects/propie-ya-web/settings/environment-variables) |

**Proyecto obsoleto (no usar):** `propieya_web` — quedó en estado inconsistente; puede **eliminarse** del dashboard Vercel cuando no haya dependencias. No volver a vincular el dominio canónico a ese proyecto.

---

## Reglas duras (obligatorias)

1. **No modificar** sin **autorización explícita del propietario** y **actualización de este documento**:
   - Workflow `.github/workflows/promote-deploy-infra.yml` (pasos, URLs, smoke tests).
   - `vercel.json` en **raíz del repo** y `apps/web/vercel.json` (comandos install/build, crons).
   - Variables de entorno de **Production** en Vercel del proyecto web (especialmente las que afectan build o runtime crítico).
   - **Root Directory**, **Build Command**, **Install Command**, **Output** en Vercel.
   - Asignación del dominio **`propieyaweb.vercel.app`** (solo un proyecto web; no duplicar en panel u otro proyecto).

2. **No crear** un segundo “proyecto web” en Vercel sin actualizar `docs/CANONICAL-URLS.md`, este archivo y `docs/33-VERCEL-CONFIG-PROYECTO-WEB.md`.

3. **Un solo flujo de producción:** un solo repositorio (`kiteprop/ia-propieya`); cambios al portal en `deploy/infra`, `pnpm verify`, push, workflow Promote + Vercel CLI al proyecto **`propie-ya-web`**. Después, **fusionar `deploy/infra` → `main`** (PR o merge) para alinear clones y el panel. Verificación: `pnpm verificar:deploy` y/o `pnpm verificar:ruta-produccion`. Lista de sprints: `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md`.

4. **Antes de cualquier push** que dispare CI/deploy: `pnpm verify` (lint + typecheck + build).

5. **Cambios permitidos sin reunión** (siempre con tests verdes):
   - Código de aplicación en `apps/web`, `apps/panel`, `packages/*`.
   - Fixes de bugs que no toquen los archivos listados en la regla 1.

---

## URLs rápidas (dónde mirar)

| Objetivo | URL |
|----------|-----|
| Portal producción | https://propieyaweb.vercel.app |
| Health | https://propieyaweb.vercel.app/api/health |
| Version | https://propieyaweb.vercel.app/api/version |
| Proyecto web Vercel (settings) | https://vercel.com/teknoariels-projects/propie-ya-web/settings |
| Dominios del proyecto web | https://vercel.com/teknoariels-projects/propie-ya-web/settings/domains |
| Secretos GitHub Actions | https://github.com/kiteprop/ia-propieya/settings/secrets/actions |
| Workflow deploy | https://github.com/kiteprop/ia-propieya/actions/workflows/promote-deploy-infra.yml |

---

## Archivos de configuración deploy (quién manda)

- **`apps/web/vercel.json`:** configuración para builds cuando el **Root Directory** del proyecto es `apps/web` (install/build relativos al monorepo, crons).
- **`vercel.json` (raíz):** usado por flujos que ejecutan Vercel CLI desde la **raíz del repositorio**; no debe contradecir el build del paquete `@propieya/web`. Cualquier cambio debe revisarse impacto en `.github/workflows/promote-deploy-infra.yml`.

**Excepción documentada (propietario, 2026-03-31):** en ambos archivos, el cron `GET /api/cron/import-yumblin` pasó a **`*/30 * * * *`** (ingesta Properstar/Kiteprop cada 30 min en Production). Contexto y variables: `docs/48-INGEST-PROPERSTAR-POLITICA-CRON-PUSH-Y-NEGOCIO.md`.

---

## Limpieza (operativa)

### Vercel

- **Eliminar** proyecto `propieya_web` si ya no tiene dominios ni despliegues necesarios: [Dashboard proyectos](https://vercel.com/teknoariels-projects) → proyecto `propieya_web` → Settings → General → Delete Project (solo si el dominio canónico ya está en `propie-ya-web`).

### Git

- Ramas esperadas: `main`, `deploy/infra`. Ramas de feature antiguas sin uso: eliminar en remoto con `git push origin --delete <rama>` tras confirmar que no hay PR abierto que las necesite.

---

## Si algo vuelve a fallar

1. `pnpm diagnostico:prod` y `curl -I https://propieyaweb.vercel.app/`.
2. Revisar que `VERCEL_PROJECT_ID` sea el de **`propie-ya-web`**.
3. Si el fallo es externo a código: una línea en `docs/REGISTRO-BLOQUEOS.md` con fecha y un solo paso de desbloqueo.
