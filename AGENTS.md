# Agentes / IA

- El **propietario no revisa** el repo ni Actions: solo ve el producto y la URL pública.
- El **agente** ejecuta lint/typecheck (y build si aplica) **antes de push**, corrige CI sin pedir revisión, y documenta bloqueos externos en `docs/REGISTRO-BLOQUEOS.md`.
- Flujo: `deploy/infra` → **Promote** → `main` → Vercel.

**URL portal (pruebas/prod):** https://propieyaweb.vercel.app — `docs/CANONICAL-URLS.md`.

**Deploy (definitivo):** `docs/DEPLOY-PASOS-URIs.md` — pasos y URLs exactas. Seguir ese doc siempre.

**Sprints y hitos:** `docs/24-sprints-y-hitos.md` — ejecutar en orden, sin preguntar cada paso.

**GitHub bypass (una vez):** `docs/12-bypass-github-actions.md`.
