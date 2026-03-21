# Agentes / IA

- El **propietario no ejecuta** comandos: solo prueba en la URL pública.
- El **agente** automatiza git, CI, merge a `main` y deja deploy listo.
- Flujo: cambios en `deploy/infra` → workflow **Promote deploy/infra → main** → `main` actualizado → Vercel.

Si el merge automático falla por reglas de GitHub, ver `docs/12-bypass-github-actions.md` (configuración única en el repo).
