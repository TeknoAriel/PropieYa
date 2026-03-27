# Agentes / IA

- El **propietario no revisa** el repo ni Actions: solo ve el producto y la URL pública.
- El **agente** ejecuta lint/typecheck (y build si aplica) **antes de push**, corrige CI sin pedir revisión, documenta bloqueos en `docs/REGISTRO-BLOQUEOS.md`.
- **Tras push a deploy/infra:** el agente ejecuta `pnpm verificar:deploy` y, si hace falta, `pnpm diagnostico:prod`. El workflow Promote **falla** si producción no responde (no se asume éxito). Bloqueos: `docs/REGISTRO-BLOQUEOS.md` — sin pedir al propietario revisar Vercel en bucle (ver `.cursor/rules/deploy-infra.mdc`).
- Flujo: `deploy/infra` → **Promote** → `main` → Vercel.

**URL portal (pruebas/prod):** https://propieyaweb.vercel.app — `docs/CANONICAL-URLS.md`.

**Deploy (definitivo):** `docs/DEPLOY-PASOS-URIs.md` — pasos y URLs exactas. Seguir ese doc siempre.

**Contexto y reglas duras (no romper deploy):** `docs/DEPLOY-CONTEXTO-AGENTES.md` — proyecto Vercel activo, qué no tocar sin autorización, URLs de dashboard.

**Sprints y hitos:** `docs/24-sprints-y-hitos.md` — ejecutar en orden, sin preguntar cada paso.

**GitHub bypass (una vez):** `docs/12-bypass-github-actions.md`.
