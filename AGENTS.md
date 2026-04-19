# Agentes / IA

- El **propietario no revisa** el repo ni Actions: solo ve el producto y la URL pública.
- **GitHub Actions:** el workflow **CI** corre en **todas** las ramas y PRs (lint + typecheck + build). El workflow **Vercel Preview (ramas)** hace deploy Preview + smoke en cada push que no sea `deploy/infra` (producción sigue siendo solo `promote-deploy-infra.yml`). Detalle: `docs/DEPLOY-CONTEXTO-AGENTES.md` §CI y Preview.
- El **agente** ejecuta lint/typecheck (y build si aplica) **antes de push**, corrige CI sin pedir revisión, documenta bloqueos en `docs/REGISTRO-BLOQUEOS.md`. En clones con **Husky** activo, `git push` a `main` o `deploy/infra` dispara `pnpm verify` (`.husky/pre-push`).
- **Tras push a `deploy/infra`:** el agente ejecuta `pnpm verificar:deploy` y, si hace falta, `pnpm diagnostico:prod` o `pnpm verificar:ruta-produccion` (valida URL canónica y, con `VERCEL_TOKEN`+`VERCEL_PROJECT_ID`, que el secret apunte a `propie-ya-web`). El workflow Promote **falla** si producción no responde o si `VERCEL_PROJECT_ID` no es el proyecto web canónico. Si el fallo parece “deploy que no avanza”, revisar **cuotas Vercel Hobby** (`docs/DEPLOY-CONTEXTO-AGENTES.md` § Cuotas: límites de deployments/día y minutos de build; no confundir con bug de código). Bloqueos: `docs/REGISTRO-BLOQUEOS.md` — ver `.cursor/rules/deploy-infra.mdc`.
- **Repositorio GitHub operativo (origin):** `https://github.com/TeknoAriel/PropieYa` — push habitual y **Vercel → Git** enlazado aquí. **Copia auditoría (org):** `kiteprop/ia-propieya` como remoto `kiteprop`; subir solo cuando el propietario pida (`git push kiteprop deploy/infra` / `main` según acuerdo).
- **Flujo portal producción (único):** rama **`deploy/infra`** → workflow **Promote** → Vercel CLI → **`propie-ya-web`**. Tras cada release estable: merge **`deploy/infra` → `main`**, opcional **fast-forward `deploy/infra` a `main`**, push **`origin` + `kiteprop`**, ver `docs/54-FLUJO-PRODUCCION-PORTAL.md`. Constantes: `scripts/production-canonical.env.sh`.

**URL portal (pruebas/prod):** https://propieyaweb.vercel.app — `docs/CANONICAL-URLS.md`.

**Deploy (definitivo):** `docs/DEPLOY-PASOS-URIs.md` — pasos y URLs exactas. Seguir ese doc siempre.

**Contexto y reglas duras (no romper deploy):** `docs/DEPLOY-CONTEXTO-AGENTES.md` — proyecto Vercel activo, qué no tocar sin autorización, URLs de dashboard.

**Sprints y hitos:** `docs/24-sprints-y-hitos.md` — ejecutar en orden, sin preguntar cada paso.

**Ritmo producción (búsqueda a escala, asistente, medición, mandato anti-retraso):** `docs/47-RITMO-PRODUCCION-BUSQUEDA-Y-ASISTENTE.md` — el agente prioriza entregas medibles y máximo ritmo autónomo dentro de `pnpm verify` y deploy documentado.

**Estabilidad buscador / listado público (ES + fallback SQL, regresiones):** `docs/50-BUSCADOR-PORTAL-ESTABILIDAD-Y-FALLBACK.md` — reglas para no romper `/buscar`, `/venta`, `/alquiler`; regla Cursor `.cursor/rules/buscador-portal-estable.mdc`.

**Ingesta Properstar/Kiteprop (cron, webhook, bajas, tipo de aviso):** `docs/48-INGEST-PROPERSTAR-POLITICA-CRON-PUSH-Y-NEGOCIO.md` — resumen operativo en `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md` §3.

**API key de Kiteprop (MCP + REST + properties, misma secret; MCP en cabecera `X-API-Key`):** `docs/58-KITEPROP-API-KEY-UNICA-MCP-Y-REST.md` — no confundir con `KITEPROP_INGEST_WEBHOOK_SECRET` del webhook al portal; regla Cursor `.cursor/rules/kiteprop-api-key-unificada.mdc`.

**Panel de estadísticas / telemetría:** `docs/49-ARQUITECTURA-PANEL-ESTADISTICAS-Y-TELEMETRIA.md` — capas hechos → agregados → API; terminales canónicos `PORTAL_STATS_TERMINALS` en `@propieya/shared`.

**Directiva de producto (anti-Frankenstein, capas, prioridades):** `docs/42-DIRECTIVA-OPERATIVA-PROPIEYA.md`. **Matriz y backlog:** `docs/43-ANEXO-MASTERPLAN-MEJORAS-INTEGRABLES.md`. **Norte corto portal:** `docs/41-PROPUESTA-VALOR-PORTAL.md`.

**GitHub bypass (una vez):** `docs/12-bypass-github-actions.md`.
