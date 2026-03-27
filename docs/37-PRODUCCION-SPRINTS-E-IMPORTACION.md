# Producción: sprints completados, panel e importación

**Objetivo:** que agentes y revisiones sepan qué está en código, qué debe verse en la URL pública y qué variables hacen falta. Fuente de tareas: `docs/24-sprints-y-hitos.md` (Sprints 1–9 marcados completos).

---

## 0. Causa #1 de “portal básico” o sin datos (2026-03-27)

- **`DATABASE_URL` no está definida en el proyecto Vercel `propie-ya-web` (Production).** El código de los sprints **sí** está en el deploy; el servidor no puede leer PostgreSQL.
- **Comprobar:** `curl -s https://propieyaweb.vercel.app/api/health` → si `status` es `degraded` y el error de `database` menciona `DATABASE_URL`, hay que **copiar la variable** desde Neon (o desde el proyecto Vercel anterior si aún existe) y **Redeploy**.
- Sin DB: no hay propiedades en home/buscar, fallan tRPC que consultan DB, registro/login pueden fallar, import/cron no persisten datos.
- **No confundir** con pérdida de código: revisar `git log` y `/api/version`; el commit desplegado incluye toda la app.

### GitHub: commits con “X” roja

- En PRs `deploy/infra` → `main`, a veces fallan checks del **Vercel GitHub App** (build duplicado o preview) mientras el **workflow Promote** en `deploy/infra` ya desplegó bien. Mirar **qué check** falló (Actions vs Vercel). El criterio de producción operativa es: `GET /` = 200 y `GET /api/health` = 200 tras configurar env.

---

## 1. Git vs lo que ves en el navegador

| Concepto | Detalle |
|----------|---------|
| **Portal web** (`propieyaweb.vercel.app`) | Se despliega con **GitHub Actions** al hacer push a **`deploy/infra`** (Vercel CLI desde la raíz del monorepo). Ver `docs/DEPLOY-CONTEXTO-AGENTES.md`. |
| **Rama `main`** | Debe **mantenerse al día** con `deploy/infra` (merge o PR). El workflow **no** fusiona solo a `main`; si `main` queda atrás, CI y clones no reflejan el último deploy del portal. |
| **Commit desplegado** | `curl -s https://propieyaweb.vercel.app/api/version` → `commit` / `branch`. |
| **Panel B2B** | Proyecto Vercel **aparte** (Root `apps/panel`). Suele construirse por **integración Git** con `main`. Si el panel “no tiene” Sprint 8 u otras mejoras, suele ser **panel sin redeploy** o `main` desactualizado. |

---

## 2. Sprints 1–9: qué validar en producción

| Sprint | Área | Comprobación rápida | Env crítico |
|--------|------|---------------------|-------------|
| 1 | Portal | `/buscar`, ficha propiedad, home: imágenes sin warnings | — |
| 2–3 | Vigencia + emails | Panel: renovar aviso; emails si Resend configurado | `DATABASE_URL`, jobs/cron, `RESEND_API_KEY`, `EMAIL_FROM` |
| 4 | Búsqueda | `/buscar` con ES; si no hay ES, fallback SQL | `ELASTICSEARCH_URL` (opcional) |
| 5–6 | Leads | Ficha → contacto; panel `/leads`; email al publicador | DB, `RESEND_*` |
| 7 | Conversacional | Home: input “contale a Propieya”; resultados | `OPENAI_API_KEY` (sin key hay fallback heurístico) |
| 8 | Panel | `/dashboard` stats, `/propiedades` badges vigencia | — |
| 9 | Demanda | `/buscar` motivos de coincidencia; `/perfil-demanda` con sesión | JWT/cookies en web |

Si falta **solo** configuración (DB, ES, OpenAI, email), la UI puede verse “incompleta” aunque el código esté desplegado.

---

## 3. Importación de propiedades (Yumblin / Kiteprop)

### Automático (cron)

- **Ruta:** `GET /api/cron/import-yumblin`
- **Definición:** `apps/web/vercel.json` (y `vercel.json` en raíz si aplica) — schedule **0 6 \* \* \*** (UTC).
- **Auth:** header `Authorization: Bearer <CRON_SECRET>` si `CRON_SECRET` está definido (recomendado en producción).
- **Lógica:** `packages/database/src/yumblin-import-sync.ts`, `runYumblinImportSyncAllSources`.
- **Org/publisher:** si no hay `IMPORT_ORGANIZATION_ID` / `IMPORT_PUBLISHER_ID`, el código usa la **primera organización** y un **miembro** de esa org (requiere DB ya sembrada).

### Variables útiles en Vercel (web, Production)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Obligatorio para import y listados |
| `CRON_SECRET` | Protege crons |
| `YUMBLIN_JSON_URL` | Feed (default en código apunta al JSON Kiteprop público) |
| `IMPORT_SYNC_INTERVAL_HOURS` | Evita sync demasiado frecuente |
| `IMPORT_ORGANIZATION_ID` / `IMPORT_PUBLISHER_ID` | Forzar org/usuario publicador |

### Manual (operador / agente con CLI)

- `pnpm import:yumblin` — ver `scripts/import-yumblin-json.ts`
- `./scripts/verificar-ingestion.sh` — flujo completo: env pull, import, publish drafts, sync ES — ver `docs/35-VERIFICACION-INGESTA.md`
- Pipeline detallado: `docs/32-PIPELINE-DEPLOY-COMPLETO.md`

---

## 4. Health y diagnóstico

- `https://propieyaweb.vercel.app/api/health` — **200** si DB OK; **503** “degradado” si falta `DATABASE_URL` u otro servicio (app igual puede estar desplegada).
- `pnpm diagnostico:prod` — script del repo.

---

*Actualizado: 2026-03-27*
