# Agentes / IA

- El **propietario no revisa** el repo ni Actions: solo ve el producto y la URL pública.
- El **agente** ejecuta lint/typecheck (y build si aplica) **antes de push**, corrige CI sin pedir revisión, y documenta bloqueos externos en `docs/REGISTRO-BLOQUEOS.md`.
- Flujo: `deploy/infra` → **Promote** → `main` → Vercel.

**URL portal (pruebas/prod):** https://propieyaweb.vercel.app — `docs/CANONICAL-URLS.md`.

**Deploy resumen:** `docs/14-deploy-y-url-canonical.md`.

**Reglas Cursor:** `automacion-propietario.mdc`, `control-produccion.mdc`, `produccion-escala.mdc`.

**Sprints y hitos:** `docs/24-sprints-y-hitos.md` — ejecutar en orden, sin preguntar cada paso.

**GitHub bypass (una vez):** `docs/12-bypass-github-actions.md`.
