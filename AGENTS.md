# Agentes / IA

- El **propietario no revisa** el repo ni Actions: solo ve el producto y la URL pública.
- El **agente** ejecuta lint/typecheck (y build si aplica) **antes de push**, corrige CI sin pedir revisión, y documenta bloqueos externos en `docs/REGISTRO-BLOQUEOS.md`.
- Flujo: `deploy/infra` → **Promote** → `main` → Vercel.

**Reglas Cursor:** `automacion-propietario.mdc`, `control-produccion.mdc`.

**GitHub bypass (una vez):** `docs/12-bypass-github-actions.md`.
