# Agentes / IA

- El **propietario no revisa** el repo ni Actions: solo ve el producto y la URL pública.
- El **agente** ejecuta lint/typecheck (y build si aplica) **antes de push**, corrige CI sin pedir revisión, documenta bloqueos en `docs/REGISTRO-BLOQUEOS.md`.
- **Tras push a `deploy/infra`:** el agente ejecuta `pnpm verificar:deploy` y, si hace falta, `pnpm diagnostico:prod` o `pnpm verificar:ruta-produccion` (valida URL canónica y, con `VERCEL_TOKEN`+`VERCEL_PROJECT_ID`, que el secret apunte a `propie-ya-web`). El workflow Promote **falla** si producción no responde o si `VERCEL_PROJECT_ID` no es el proyecto web canónico. Bloqueos: `docs/REGISTRO-BLOQUEOS.md` — ver `.cursor/rules/deploy-infra.mdc`.
- **Repositorio GitHub oficial:** `https://github.com/kiteprop/ia-propieya` (remoto `origin` en clones nuevos).
- **Flujo portal producción (único):** un solo repo monorepo; rama **`deploy/infra`** → workflow **Promote** → Vercel CLI → proyecto **`propie-ya-web`**. Alinear **`main`** con PR/merge aparte (no lo hace el Promote). Constantes: `scripts/production-canonical.env.sh`.

**URL portal (pruebas/prod):** https://propieyaweb.vercel.app — `docs/CANONICAL-URLS.md`.

**Deploy (definitivo):** `docs/DEPLOY-PASOS-URIs.md` — pasos y URLs exactas. Seguir ese doc siempre.

**Contexto y reglas duras (no romper deploy):** `docs/DEPLOY-CONTEXTO-AGENTES.md` — proyecto Vercel activo, qué no tocar sin autorización, URLs de dashboard.

**Sprints y hitos:** `docs/24-sprints-y-hitos.md` — ejecutar en orden, sin preguntar cada paso.

**Ritmo producción (búsqueda a escala, asistente, medición, mandato anti-retraso):** `docs/47-RITMO-PRODUCCION-BUSQUEDA-Y-ASISTENTE.md` — el agente prioriza entregas medibles y máximo ritmo autónomo dentro de `pnpm verify` y deploy documentado.

**Directiva de producto (anti-Frankenstein, capas, prioridades):** `docs/42-DIRECTIVA-OPERATIVA-PROPIEYA.md`. **Matriz y backlog:** `docs/43-ANEXO-MASTERPLAN-MEJORAS-INTEGRABLES.md`. **Norte corto portal:** `docs/41-PROPUESTA-VALOR-PORTAL.md`.

**GitHub bypass (una vez):** `docs/12-bypass-github-actions.md`.
